import { Request, Response, NextFunction } from "express";
import { staticDb, db } from "@workspace/db";
import { packageGroupCoordinators, packageGroups, campPackages, campApplications, tenantAuditLogs } from "@workspace/db/schema";
import { eq, and, isNull, or, inArray } from "drizzle-orm";

const REVOKED_GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

// Resource types subject to delegation access control
export type DelegatedResource =
  | "camp_package_group"
  | "camp_package"
  | "camp_application"
  | "contract"
  | "invoice"
  | "settlement_mgt"
  | string;

// Action types that can be performed
export type DelegatedAction = "view" | "edit" | "soft_delete" | "finalise";

interface DelegatedAccessOptions {
  resource: DelegatedResource;
  action: DelegatedAction;
  // Function to extract package_group_id from the request (default: req.params.id)
  resolvePackageGroupId?: (req: Request) => Promise<string | null>;
}

/**
 * Camp Coordinator Cross-Tenant Delegation access control middleware
 *
 * Validation order (_rules/CAMP_COORDINATOR_DELEGATION.md §6.2):
 *   1. Check req.user.organisationId
 *   2. Extract package_group_id from resource
 *   3. If Owner Tenant, delegate to existing requireRole system (next)
 *   4. Look up Coordinator delegation record
 *   5. If not found, return 403
 *   6. Check action against permissions JSONB
 *   7. On pass, set X-Delegated-Access: true header
 */
export function requireDelegatedOrOwnerAccess(opts: DelegatedAccessOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // ── 1. Verify user authentication ────────────────────────────────────────────
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
        return;
      }

      const userOrgId = user.organisationId;
      if (!userOrgId) {
        // super_admin has full access without an organisation
        if (user.role?.toLowerCase() === "super_admin") {
          return next();
        }
        res.status(403).json({ success: false, code: "NO_ORG", message: "No organisation associated with user" });
        return;
      }

      // ── 2. Extract package_group_id ───────────────────────────────────────────
      let packageGroupId: string | null = null;

      if (opts.resolvePackageGroupId) {
        packageGroupId = await opts.resolvePackageGroupId(req);
      } else {
        packageGroupId = await resolvePackageGroupIdDefault(req, opts.resource);
      }

      if (!packageGroupId) {
        // Cannot determine package_group_id — treat as Owner access → next
        return next();
      }

      // ── 3. Check Owner Tenant ──────────────────────────────────────────────
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
        // Owner Tenant → delegate to existing role-based system
        return next();
      }

      // ── 4. Look up Coordinator delegation record (Active + Revoked within grace period) ─────────
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

      // ── 5. No delegation found → 403 ────────────────────────────────────────────────
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

      // ── 5b. Check Revoked grace period ────────────────────────────────────────
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

        // Within grace period → enforce view-only access
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

      // ── 6. Check permissions JSONB ──────────────────────────────────────────
      const perms = delegation.permissions as {
        view: boolean;
        edit: boolean;
        soft_delete: boolean;
        manage_finance: boolean;
      };

      // finalise is always Owner-only
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

      // Finance resource edit/soft_delete → check manage_finance flag
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

      // Verify permission for the requested action
      const actionMap: Record<DelegatedAction, keyof typeof perms> = {
        view: "view",
        edit: "edit",
        soft_delete: "soft_delete",
        finalise: "view", // already blocked above
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

      // ── 7. Passed — set Delegated Access header ──────────────────────────────
      res.setHeader("X-Delegated-Access", "true");
      res.setHeader("X-Delegated-Owner-Org", group.organisationId ?? "");

      // Pass delegation context on req (used by routes for audit logging)
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

// ── Default package_group_id extraction logic ──────────────────────────────────────────
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
        // contract, invoice etc. must provide a resolvePackageGroupId function from the caller
        return null;
    }
  } catch {
    return null;
  }
}

// Delegation context type attached to req (imported and used in routes)
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
