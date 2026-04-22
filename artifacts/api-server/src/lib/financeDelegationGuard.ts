/**
 * Finance Delegation Guard
 * camp_coordinator 가 Coordinator Tenant 로 재무 데이터에 쓰기 접근 시
 * manage_finance 위임 권한을 검사하는 유틸리티.
 */
import { Response } from "express";
import { db } from "@workspace/db";
import {
  contracts, campApplications, contractFinanceItems,
  packageGroupCoordinators, tenantAuditLogs,
} from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function resolvePackageGroupIdFromContractId(contractId: string): Promise<string | null> {
  const [contract] = await db
    .select({ campApplicationId: contracts.campApplicationId })
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);
  if (!contract?.campApplicationId) return null;

  const [app] = await db
    .select({ packageGroupId: campApplications.packageGroupId })
    .from(campApplications)
    .where(eq(campApplications.id, contract.campApplicationId))
    .limit(1);
  return app?.packageGroupId ?? null;
}

export async function resolvePackageGroupIdFromFinanceItemId(itemId: string): Promise<string | null> {
  const [item] = await db
    .select({ contractId: contractFinanceItems.contractId })
    .from(contractFinanceItems)
    .where(eq(contractFinanceItems.id, itemId))
    .limit(1);
  if (!item?.contractId) return null;
  return resolvePackageGroupIdFromContractId(item.contractId);
}

/**
 * camp_coordinator 의 위임 재무 권한을 검사.
 * - 위임 레코드가 없으면 true 반환 (Owner 경로로 기존 체크 위임)
 * - 위임 있고 manage_finance=false → 403 + false 반환
 * - 위임 있고 manage_finance=true → action별 권한 체크
 */
export async function assertFinanceDelegation(
  res: Response,
  userOrgId: string,
  userId: string,
  packageGroupId: string,
  action: "view" | "edit" | "soft_delete",
  ipAddress?: string,
): Promise<boolean> {
  const [delegation] = await db
    .select({
      id: packageGroupCoordinators.id,
      permissions: packageGroupCoordinators.permissions,
    })
    .from(packageGroupCoordinators)
    .where(
      and(
        eq(packageGroupCoordinators.packageGroupId, packageGroupId),
        eq(packageGroupCoordinators.coordinatorOrgId, userOrgId),
        eq(packageGroupCoordinators.status, "Active"),
        isNull(packageGroupCoordinators.revokedAt),
      )
    )
    .limit(1);

  if (!delegation) return true; // Owner Tenant → 기존 체크로 위임

  const perms = delegation.permissions as {
    view: boolean; edit: boolean; soft_delete: boolean; manage_finance: boolean;
  };

  if (action === "view") return true;

  if (!perms.manage_finance) {
    db.insert(tenantAuditLogs).values({
      organisationId: userOrgId,
      userId,
      action: "FORBIDDEN_ATTEMPT",
      entityType: "delegation_finance",
      actingOrgId: userOrgId,
      viaDelegation: true,
      newValues: { reason: "manage_finance_required", requestedAction: action, packageGroupId },
      ipAddress: ipAddress ?? null,
    }).catch(err => console.error("[AuditLog] FORBIDDEN_ATTEMPT:", err));

    res.status(403).json({
      success: false,
      code: "FINANCE_PERMISSION_DENIED",
      message: "Finance write access requires manage_finance permission in the delegation",
    });
    return false;
  }

  if (action === "soft_delete" && !perms.soft_delete) {
    res.status(403).json({ success: false, code: "PERMISSION_DENIED", message: "Soft delete is not permitted for this delegation" });
    return false;
  }
  if (action === "edit" && !perms.edit) {
    res.status(403).json({ success: false, code: "PERMISSION_DENIED", message: "Edit is not permitted for this delegation" });
    return false;
  }

  return true;
}
