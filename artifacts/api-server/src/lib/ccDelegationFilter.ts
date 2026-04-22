/**
 * CC Delegation Contract Filter
 * camp_coordinator 가 접근할 수 있는 Contract ID 목록을 반환.
 * 위임된 Package Group → campApplications/applications → contracts 경로로 탐색.
 */
import { db, pool } from "@workspace/db";
import { contracts, campApplications, applications } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * CC org의 위임된 packageGroupId 목록 반환 (public 스키마 직접 조회)
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
 * - campApplications.packageGroupId IN delegatedPgIds
 * - applications.packageGroupId IN delegatedPgIds
 * 빈 배열 반환 시 → 해당 CC는 접근 가능한 Contract 없음.
 */
export async function getCCDelegatedContractIds(coordinatorOrgId: string): Promise<string[]> {
  const pgIds = await getCCDelegatedPackageGroupIds(coordinatorOrgId);
  if (pgIds.length === 0) return [];

  // Path 1: contracts via campApplications
  const campAppContracts = await db
    .select({ id: contracts.id })
    .from(contracts)
    .innerJoin(campApplications, eq(campApplications.id, contracts.campApplicationId))
    .where(inArray(campApplications.packageGroupId, pgIds));

  // Path 2: contracts via general applications
  const appContracts = await db
    .select({ id: contracts.id })
    .from(contracts)
    .innerJoin(applications, eq(applications.id, contracts.applicationId))
    .where(inArray(applications.packageGroupId, pgIds));

  const ids = new Set([
    ...campAppContracts.map(c => c.id),
    ...appContracts.map(c => c.id),
  ]);
  return [...ids];
}
