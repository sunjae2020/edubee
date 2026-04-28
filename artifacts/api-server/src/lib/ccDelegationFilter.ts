/**
 * CC Delegation Contract Filter
 * Returns a list of Contract IDs accessible to a camp_coordinator.
 * Traverses: delegated Package Group → campApplications in owner schema → contracts.
 *
 * Note: Since the middleware (routes/index.ts) routes CC requests to the owner schema,
 * db.select() already runs in the owner schema. This function uses pool (raw SQL) with
 * explicit schema names to safely return contract IDs.
 */
import { pool } from "@workspace/db";

/**
 * Returns the list of delegated packageGroupIds for a CC org + owner subdomain (queries public schema directly)
 */
export async function getCCDelegatedPackageGroupIds(coordinatorOrgId: string): Promise<string[]> {
  const result = await pool.query<{ package_group_id: string }>(
    `SELECT package_group_id
     FROM public.package_group_coordinators
     WHERE coordinator_org_id = $1
       AND status = 'Active'
       AND revoked_at IS NULL`,
    [coordinatorOrgId]
  );
  return result.rows.map(r => r.package_group_id).filter(Boolean);
}

/**
 * Returns the list of Contract IDs accessible to a CC.
 * Queries the owner schema directly to support cross-tenant access.
 */
export async function getCCDelegatedContractIds(coordinatorOrgId: string): Promise<string[]> {
  // Get delegated PG IDs + owner subdomain in one query
  const delegResult = await pool.query<{ package_group_id: string; owner_subdomain: string }>(
    `SELECT pgc.package_group_id, o.subdomain as owner_subdomain
     FROM public.package_group_coordinators pgc
     JOIN public.package_groups pg ON pg.id = pgc.package_group_id
     JOIN public.organisations o ON o.id = pg.organisation_id
     WHERE pgc.coordinator_org_id = $1
       AND pgc.status = 'Active'
       AND pgc.revoked_at IS NULL`,
    [coordinatorOrgId]
  );

  if (delegResult.rows.length === 0) return [];

  // Group PG IDs by owner schema
  const byOwner = new Map<string, string[]>();
  for (const row of delegResult.rows) {
    const schema = row.owner_subdomain;
    if (!byOwner.has(schema)) byOwner.set(schema, []);
    byOwner.get(schema)!.push(row.package_group_id);
  }

  const contractIds = new Set<string>();

  for (const [ownerSchema, pgIds] of byOwner) {
    // Path 1: contracts via camp_applications.contract_id
    const campRes = await pool.query<{ contract_id: string }>(
      `SELECT DISTINCT contract_id
       FROM "${ownerSchema}".camp_applications
       WHERE package_group_id = ANY($1::uuid[])
         AND contract_id IS NOT NULL`,
      [pgIds]
    );
    campRes.rows.forEach(r => { if (r.contract_id) contractIds.add(r.contract_id); });

    // Path 2: contracts.camp_application_id → camp_applications.package_group_id
    const contractRes = await pool.query<{ id: string }>(
      `SELECT c.id
       FROM "${ownerSchema}".contracts c
       JOIN "${ownerSchema}".camp_applications ca ON ca.id = c.camp_application_id
       WHERE ca.package_group_id = ANY($1::uuid[])`,
      [pgIds]
    );
    contractRes.rows.forEach(r => contractIds.add(r.id));

    // Path 3: contracts via general applications
    const appRes = await pool.query<{ id: string }>(
      `SELECT c.id
       FROM "${ownerSchema}".contracts c
       JOIN "${ownerSchema}".applications a ON a.id = c.application_id
       WHERE a.package_group_id = ANY($1::uuid[])`,
      [pgIds]
    ).catch(() => ({ rows: [] as { id: string }[] }));
    appRes.rows.forEach(r => contractIds.add(r.id));
  }

  return [...contractIds];
}
