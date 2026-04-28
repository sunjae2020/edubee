/**
 * Finance Delegation Guard
 * Utility to check manage_finance delegation permission when a camp_coordinator
 * attempts write access to financial data as a Coordinator Tenant.
 */
import { Response } from "express";
import { db, staticDb, pool } from "@workspace/db";
import {
  contracts, campApplications, contractFinanceItems,
  tenantAuditLogs,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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
 * Checks the delegated finance permission for a camp_coordinator.
 * - If no delegation record exists, returns true (defers to existing Owner path check)
 * - If delegation exists and manage_finance=false → 403 + returns false
 * - If delegation exists and manage_finance=true → checks per-action permissions
 */
export async function assertFinanceDelegation(
  res: Response,
  userOrgId: string,
  userId: string,
  packageGroupId: string,
  action: "view" | "edit" | "soft_delete",
  ipAddress?: string,
): Promise<boolean> {
  // Query directly from public schema (prevents pgBouncer search_path leakage)
  const result = await pool.query<{ id: string; permissions: any }>(
    `SELECT id, permissions FROM public.package_group_coordinators
     WHERE package_group_id = $1 AND coordinator_org_id = $2
       AND status = 'Active' AND revoked_at IS NULL LIMIT 1`,
    [packageGroupId, userOrgId]
  );
  const delegation = result.rows[0] ?? null;

  if (!delegation) return true; // Owner Tenant → defer to existing check

  const perms = delegation.permissions as {
    view: boolean; edit: boolean; soft_delete: boolean; manage_finance: boolean;
  };

  if (action === "view") return true;

  if (!perms.manage_finance) {
    staticDb.insert(tenantAuditLogs).values({
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
