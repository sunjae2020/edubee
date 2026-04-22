import { Request, Response, NextFunction } from "express";
import { staticDb, db } from "@workspace/db";
import { packageGroupCoordinators, packageGroups, campPackages, campApplications, tenantAuditLogs } from "@workspace/db/schema";
import { eq, and, isNull, or, inArray } from "drizzle-orm";

const REVOKED_GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30일

async function logForbiddenAttempt(params: {
  organisationId: string;
  userId?: string;
  entityId?: string;
  reason: string;
  ipAddress?: string;
}) {
  try {
    if (!params.organisationId) return;
    await db.insert(tenantAuditLogs).values({
      organisationId: params.organisationId,
      userId: params.userId ?? null,
      action: "FORBIDDEN_ATTEMPT",
      entityType: "delegation_access",
      entityId: params.entityId ?? null,
      actingOrgId: params.organisationId,
      viaDelegation: false,
      newValues: { reason: params.reason },
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write FORBIDDEN_ATTEMPT:", err);
  }
}

// 위임 접근이 적용되는 리소스 종류
export type DelegatedResource =
  | "camp_package_group"
  | "camp_package"
  | "camp_application"
  | "contract"
  | "invoice"
  | "settlement_mgt"
  | string;

// 수행하려는 액션 종류
export type DelegatedAction = "view" | "edit" | "soft_delete" | "finalise";

interface DelegatedAccessOptions {
  resource: DelegatedResource;
  action: DelegatedAction;
  // 요청에서 package_group_id 를 추출하는 함수 (기본값: req.params.id)
  resolvePackageGroupId?: (req: Request) => Promise<string | null>;
}

/**
 * Camp Coordinator Cross-Tenant Delegation 접근 제어 미들웨어
 *
 * 검증 순서 (_rules/CAMP_COORDINATOR_DELEGATION.md §6.2):
 *   1. req.user.organisationId 확인
 *   2. 리소스 → package_group_id 추출
 *   3. Owner Tenant 이면 기존 requireRole 체계로 위임 (next)
 *   4. Coordinator 위임 레코드 조회
 *   5. 없으면 403
 *   6. permissions JSONB 로 action 검사
 *   7. 통과 시 X-Delegated-Access: true 헤더 부여
 */
export function requireDelegatedOrOwnerAccess(opts: DelegatedAccessOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // ── 1. 사용자 인증 확인 ────────────────────────────────────────────────
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
        return;
      }

      const userOrgId = user.organisationId;
      if (!userOrgId) {
        // super_admin 은 organisation 소속 없이 전체 접근 허용
        if (user.role?.toLowerCase() === "super_admin") {
          return next();
        }
        res.status(403).json({ success: false, code: "NO_ORG", message: "No organisation associated with user" });
        return;
      }

      // ── 2. package_group_id 추출 ───────────────────────────────────────────
      let packageGroupId: string | null = null;

      if (opts.resolvePackageGroupId) {
        packageGroupId = await opts.resolvePackageGroupId(req);
      } else {
        packageGroupId = await resolvePackageGroupIdDefault(req, opts.resource);
      }

      if (!packageGroupId) {
        // package_group_id 를 특정할 수 없으면 Owner 접근으로 간주 → next
        return next();
      }

      // ── 3. Owner Tenant 확인 ──────────────────────────────────────────────
      const [group] = await staticDb
        .select({ organisationId: packageGroups.organisationId })
        .from(packageGroups)
        .where(eq(packageGroups.id, packageGroupId))
        .limit(1);

      if (!group) {
        res.status(404).json({ success: false, code: "NOT_FOUND", message: "Package group not found" });
        return;
      }

      if (group.organisationId === userOrgId) {
        // Owner Tenant → 기존 role 기반 체계로 위임
        return next();
      }

      // ── 4. Coordinator 위임 레코드 조회 (Active + Revoked 유예 포함) ─────────
      const [delegation] = await staticDb
        .select()
        .from(packageGroupCoordinators)
        .where(
          and(
            eq(packageGroupCoordinators.packageGroupId, packageGroupId),
            eq(packageGroupCoordinators.coordinatorOrgId, userOrgId),
            inArray(packageGroupCoordinators.status, ["Active", "Revoked"])
          )
        )
        .limit(1);

      // ── 5. 위임 없음 → 403 ────────────────────────────────────────────────
      if (!delegation) {
        await logForbiddenAttempt({
          organisationId: userOrgId,
          userId: user.id,
          reason: "no_active_delegation",
          ipAddress: req.ip,
        });
        res.status(403).json({
          success: false,
          code: "DELEGATION_NOT_FOUND",
          message: "Access denied: no active delegation for this package group",
        });
        return;
      }

      // ── 5b. Revoked 유예 기간 체크 ────────────────────────────────────────
      if (delegation.status === "Revoked") {
        const revokedAt = delegation.revokedAt ? new Date(delegation.revokedAt).getTime() : 0;
        const isInGrace = Date.now() - revokedAt < REVOKED_GRACE_MS;

        if (!isInGrace) {
          await logForbiddenAttempt({
            organisationId: userOrgId,
            userId: user.id,
            entityId: delegation.id,
            reason: "delegation_expired_after_grace",
            ipAddress: req.ip,
          });
          res.status(403).json({
            success: false,
            code: "DELEGATION_EXPIRED",
            message: "Delegation has been revoked and the 30-day grace period has ended",
          });
          return;
        }

        // 유예 기간 내 → View 전용 강제
        if (opts.action !== "view") {
          await logForbiddenAttempt({
            organisationId: userOrgId,
            userId: user.id,
            entityId: delegation.id,
            reason: "revoked_grace_readonly",
            ipAddress: req.ip,
          });
          res.status(403).json({
            success: false,
            code: "DELEGATION_REVOKED_READONLY",
            message: "Delegation has been revoked. Only read access is allowed during the 30-day grace period.",
          });
          return;
        }
      }

      // ── 6. permissions JSONB 검사 ──────────────────────────────────────────
      const perms = delegation.permissions as {
        view: boolean;
        edit: boolean;
        soft_delete: boolean;
        manage_finance: boolean;
      };

      // finalise 는 항상 Owner 전용
      if (opts.action === "finalise") {
        await logForbiddenAttempt({
          organisationId: userOrgId,
          userId: user.id,
          entityId: delegation.id,
          reason: "finalise_owner_only",
          ipAddress: req.ip,
        });
        res.status(403).json({
          success: false,
          code: "OWNER_ONLY",
          message: "Finalise action is restricted to owner tenant",
        });
        return;
      }

      // Finance 리소스 edit/soft_delete → manage_finance 플래그 확인
      const financeResources = ["invoice", "settlement_mgt"];
      if (
        financeResources.includes(opts.resource) &&
        (opts.action === "edit" || opts.action === "soft_delete") &&
        !perms.manage_finance
      ) {
        await logForbiddenAttempt({
          organisationId: userOrgId,
          userId: user.id,
          entityId: delegation.id,
          reason: "finance_permission_denied",
          ipAddress: req.ip,
        });
        res.status(403).json({
          success: false,
          code: "FINANCE_PERMISSION_DENIED",
          message: "Finance management permission is not granted for this delegation",
        });
        return;
      }

      // 해당 action 권한 확인
      const actionMap: Record<DelegatedAction, keyof typeof perms> = {
        view: "view",
        edit: "edit",
        soft_delete: "soft_delete",
        finalise: "view", // 위에서 이미 차단됨
      };

      if (!perms[actionMap[opts.action]]) {
        await logForbiddenAttempt({
          organisationId: userOrgId,
          userId: user.id,
          entityId: delegation.id,
          reason: `permission_denied_${opts.action}`,
          ipAddress: req.ip,
        });
        res.status(403).json({
          success: false,
          code: "PERMISSION_DENIED",
          message: `Action '${opts.action}' is not permitted for this delegation`,
        });
        return;
      }

      // ── 7. 통과 — Delegated Access 헤더 부여 ──────────────────────────────
      res.setHeader("X-Delegated-Access", "true");
      res.setHeader("X-Delegated-Owner-Org", group.organisationId ?? "");

      // req 에 위임 컨텍스트 전달 (라우트에서 감사 로그 기록에 활용)
      (req as any).delegationContext = {
        isDelegated: true,
        delegationId: delegation.id,
        ownerOrgId: group.organisationId,
        coordinatorOrgId: userOrgId,
        packageGroupId,
        permissions: perms,
      };

      next();
    } catch (err) {
      console.error("[requireDelegatedOrOwnerAccess]", err);
      next(err);
    }
  };
}

// ── 기본 package_group_id 추출 로직 ──────────────────────────────────────────
async function resolvePackageGroupIdDefault(
  req: Request,
  resource: DelegatedResource
): Promise<string | null> {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return null;

  try {
    switch (resource) {
      case "camp_package_group":
      case "package_group":
        return id;

      case "camp_package": {
        const [row] = await staticDb
          .select({ packageGroupId: campPackages.packageGroupId })
          .from(campPackages)
          .where(eq(campPackages.id, id))
          .limit(1);
        return row?.packageGroupId ?? null;
      }

      case "camp_application": {
        const [row] = await staticDb
          .select({ packageGroupId: campApplications.packageGroupId })
          .from(campApplications)
          .where(eq(campApplications.id, id))
          .limit(1);
        return row?.packageGroupId ?? null;
      }

      default:
        // contract, invoice 등은 호출 측에서 resolvePackageGroupId 함수로 직접 제공
        return null;
    }
  } catch {
    return null;
  }
}

// req 에 붙는 위임 컨텍스트 타입 선언 (라우트에서 import 하여 사용)
export interface DelegationContext {
  isDelegated: boolean;
  delegationId: string;
  ownerOrgId: string | null;
  coordinatorOrgId: string;
  packageGroupId: string;
  permissions: {
    view: boolean;
    edit: boolean;
    soft_delete: boolean;
    manage_finance: boolean;
  };
}

declare global {
  namespace Express {
    interface Request {
      delegationContext?: DelegationContext;
    }
  }
}
