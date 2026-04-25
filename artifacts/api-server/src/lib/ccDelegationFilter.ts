/**
 * CC Delegation Contract Filter
 * camp_coordinator가 접근할 수 있는 Contract ID 목록을 반환.
 * 위임된 Package Group → owner 스키마의 campApplications → contracts 경로로 탐색.
 *
 * Note: 미들웨어(routes/index.ts)가 CC 요청을 owner 스키마로 라우팅하므로
 * db.select()는 이미 owner 스키마에서 실행됨. 이 함수는 pool(raw SQL)로
 * 명시적 스키마를 사용하여 안전하게 contract ID를 반환.
 */
import { pool } from "@workspace/db";

/**
 * CC org의 위임된 packageGroupId 목록 + owner subdomain 반환 (public 스키마 직접 조회)
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
 * CC가 접근 가능한 Contract ID 목록 반환.
 * owner 스키마에서 직접 조회하여 cross-tenant 접근을 지원.
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
