/**
 * 테넌트 PostgreSQL Schema 프로비저닝
 *
 * 신규 테넌트 가입 시 자동 실행:
 *   1. CREATE SCHEMA IF NOT EXISTS "{slug}"
 *   2. 84개 테넌트 테이블을 public schema 구조 기반으로 생성
 *      (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES)
 *
 * 플랫폼 테이블(organisations, users 등)은 public에 그대로 유지.
 */

import { pool } from "@workspace/db";
import { TENANT_TABLES, invalidateSchemaCacheFor } from "@workspace/db/tenant-context";

/**
 * 테넌트 slug에 대한 PostgreSQL schema를 프로비저닝.
 * 이미 schema가 존재하면 새 테이블만 추가 (idempotent).
 */
export async function provisionTenantSchema(tenantSlug: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Schema 생성
    await client.query(
      `CREATE SCHEMA IF NOT EXISTS "${tenantSlug}"`
    );

    // 2. 각 테넌트 테이블을 public 구조 기반으로 생성
    //    INCLUDING DEFAULTS: 기본값 복사
    //    INCLUDING INDEXES: 인덱스 복사 (PK, UNIQUE 포함)
    //    FK 제약조건은 의도적으로 제외 (cross-schema FK는 별도 처리)
    for (const tableName of TENANT_TABLES) {
      // public 테이블이 존재하는지 먼저 확인
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      if ((tableCheck.rowCount ?? 0) === 0) continue;

      await client.query(`
        CREATE TABLE IF NOT EXISTS "${tenantSlug}"."${tableName}"
        (LIKE public."${tableName}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)
      `);
    }

    await client.query("COMMIT");

    // schema 존재 캐시 초기화
    invalidateSchemaCacheFor(tenantSlug);

    console.log(`[Provision] Schema "${tenantSlug}" provisioned with ${TENANT_TABLES.length} tables`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 기존 테넌트 데이터를 public → tenant schema로 이전.
 * organisation_id가 있는 테이블만 이전 (HAS_ORG_ID 테이블 20개).
 *
 * @param tenantSlug   테넌트 slug (예: 'ts')
 * @param orgId        organisations 테이블의 UUID
 */
export async function migrateTenantDataFromPublic(
  tenantSlug: string,
  orgId: string
): Promise<{ table: string; rowsMigrated: number }[]> {
  const client = await pool.connect();
  const results: { table: string; rowsMigrated: number }[] = [];

  // organisation_id 컬럼이 있는 테이블 목록 조회
  const orgIdTables = await client.query<{ table_name: string }>(
    `SELECT DISTINCT table_name FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'organisation_id'
     AND table_name = ANY($1::text[])`,
    [TENANT_TABLES as unknown as string[]]
  );

  try {
    await client.query("BEGIN");

    for (const row of orgIdTables.rows) {
      const tbl = row.table_name;

      // tenant schema에 해당 테이블이 존재하는지 확인
      const tblCheck = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = $2`,
        [tenantSlug, tbl]
      );
      if ((tblCheck.rowCount ?? 0) === 0) continue;

      // 기존 데이터 중복 방지: 이미 이전된 레코드 제외 (id 기준)
      const res = await client.query(
        `INSERT INTO "${tenantSlug}"."${tbl}"
         SELECT * FROM public."${tbl}"
         WHERE organisation_id = $1
         ON CONFLICT (id) DO NOTHING`,
        [orgId]
      );

      results.push({ table: tbl, rowsMigrated: res.rowCount ?? 0 });
    }

    await client.query("COMMIT");
    console.log(`[Migrate] Tenant "${tenantSlug}" data migrated from public schema`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return results;
}

/**
 * 테넌트 schema가 존재하는지 확인 (캐시 없이 직접 DB 조회)
 */
export async function checkTenantSchemaExists(tenantSlug: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM pg_namespace WHERE nspname = $1",
    [tenantSlug]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * 모든 테넌트 schema 목록 조회
 */
export async function listTenantSchemas(): Promise<string[]> {
  const systemSchemas = new Set([
    "public", "pg_catalog", "information_schema", "pg_toast",
    "pg_temp_1", "pg_toast_temp_1",
  ]);
  const result = await pool.query<{ nspname: string }>(
    "SELECT nspname FROM pg_namespace ORDER BY nspname"
  );
  return result.rows
    .map((r) => r.nspname)
    .filter((n) => !systemSchemas.has(n) && !n.startsWith("pg_"));
}
