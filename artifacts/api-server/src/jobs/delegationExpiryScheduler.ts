import cron from "node-cron";
import { db } from "@workspace/db";
import { packageGroupCoordinators, tenantAuditLogs } from "@workspace/db/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";

const GRACE_DAYS = 30;

async function expireRevokedDelegations() {
  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);

  const expired = await db
    .update(packageGroupCoordinators)
    .set({ status: "Expired", modifiedAt: new Date() })
    .where(
      and(
        eq(packageGroupCoordinators.status, "Revoked"),
        isNotNull(packageGroupCoordinators.revokedAt),
        lte(packageGroupCoordinators.revokedAt, cutoff)
      )
    )
    .returning({
      id: packageGroupCoordinators.id,
      ownerOrgId: packageGroupCoordinators.ownerOrgId,
      coordinatorOrgId: packageGroupCoordinators.coordinatorOrgId,
      packageGroupId: packageGroupCoordinators.packageGroupId,
    });

  if (expired.length === 0) return;

  console.log(`[DelegationExpiry] ${expired.length} delegation(s) moved Revoked → Expired`);

  // Batch audit log write
  await db.insert(tenantAuditLogs).values(
    expired.map(row => ({
      organisationId: row.ownerOrgId,
      action: "DELEGATION_EXPIRE" as const,
      entityType: "package_group_coordinators",
      entityId: row.id,
      actingOrgId: null,
      targetOrgId: row.coordinatorOrgId,
      viaDelegation: false,
      newValues: { status: "Expired", packageGroupId: row.packageGroupId },
    }))
  );
}

export function startDelegationExpiryScheduler() {
  // Runs daily at 02:00 UTC
  cron.schedule("0 2 * * *", async () => {
    console.log("[DelegationExpiry] Scheduled run triggered");
    try {
      await expireRevokedDelegations();
    } catch (err) {
      console.error("[DelegationExpiry] Error:", err);
    }
  });
  console.log("[DelegationExpiry] Cron job registered — runs at 02:00 UTC daily");
}
