/**
 * 테넌트 PostgreSQL Schema 프로비저닝 + 자동 동기화
 *
 * 신규 테넌트 가입 시:
 *   1. CREATE SCHEMA IF NOT EXISTS "{slug}"
 *   2. 84개 테넌트 테이블을 public schema 구조 기반으로 생성
 *      (LIKE public.{table} INCLUDING DEFAULTS INCLUDING INDEXES)
 *
 * 서버 시작 시 (syncAllTenantSchemas):
 *   - 신규 테이블 → CREATE TABLE IF NOT EXISTS (from public)
 *   - 신규 컬럼   → ALTER TABLE ADD COLUMN IF NOT EXISTS
 *   - 완전 idempotent: 변경 없으면 아무것도 하지 않음
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
 * organisation_id 없이 전체 이전 대상인 테넌트 테이블.
 * 이 테이블들은 공유 데이터로 생성되므로 organisation_id 없이 public → tenant 이전.
 * (신규 테넌트에는 해당하지 않고, legacy single-tenant public 데이터 이전 전용)
 */
const FULL_COPY_TABLES = ["package_groups", "package_group_images", "packages", "camp_applications", "camp_application_contacts"] as const;

/**
 * 기존 테넌트 데이터를 public → tenant schema로 이전.
 * - organisation_id가 있는 테이블: orgId로 필터링하여 이전
 * - organisation_id가 없는 FULL_COPY_TABLES: 전체 행을 이전 (ON CONFLICT DO NOTHING)
 *
 * @param tenantSlug   테넌트 slug (예: 'ts')
 * @param orgId        organisations 테이블의 UUID
 */
export async function migrateTenantDataFromPublic(
  tenantSlug: string,
  orgId: string
): Promise<{ table: string; rowsMigrated: number }[]> {
  const results: { table: string; rowsMigrated: number }[] = [];

  // 1. organisation_id 컬럼이 있는 테이블 목록 조회 (별도 client)
  const infoClient = await pool.connect();
  let orgIdTableNames: string[] = [];
  try {
    const orgIdTables = await infoClient.query<{ table_name: string }>(
      `SELECT DISTINCT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'organisation_id'
       AND table_name = ANY($1::text[])`,
      [TENANT_TABLES as unknown as string[]]
    );
    orgIdTableNames = orgIdTables.rows.map(r => r.table_name);
  } finally {
    infoClient.release();
  }

  // 2. 데이터 이전 (별도 transaction client)
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 2a. organisation_id 기반 테이블 이전
    for (const tbl of orgIdTableNames) {
      const tblCheck = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = $2`,
        [tenantSlug, tbl]
      );
      if ((tblCheck.rowCount ?? 0) === 0) continue;

      const res = await client.query(
        `INSERT INTO "${tenantSlug}"."${tbl}"
         SELECT * FROM public."${tbl}"
         WHERE organisation_id = $1
         ON CONFLICT (id) DO NOTHING`,
        [orgId]
      );

      results.push({ table: tbl, rowsMigrated: res.rowCount ?? 0 });
    }

    // 2b. organisation_id 없는 테이블 전체 이전 (package_groups, packages, camp_applications)
    for (const tbl of FULL_COPY_TABLES) {
      const tblCheck = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = $2`,
        [tenantSlug, tbl]
      );
      if ((tblCheck.rowCount ?? 0) === 0) continue;

      const res = await client.query(
        `INSERT INTO "${tenantSlug}"."${tbl}"
         SELECT * FROM public."${tbl}"
         ON CONFLICT (id) DO NOTHING`
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
  // Tenant schemas are derived from organisations.subdomain. Anything else
  // (Supabase platform schemas: auth, storage, realtime, vault, extensions,
  // graphql, graphql_public, pgbouncer; or pg_*) must be excluded — otherwise
  // syncAllTenantSchemas will dump tenant tables into them.
  const result = await pool.query<{ subdomain: string }>(
    `SELECT subdomain FROM organisations
      WHERE subdomain IS NOT NULL
        AND subdomain <> ''
      ORDER BY subdomain`
  );
  const subdomains = new Set(result.rows.map((r) => r.subdomain));

  // Cross-check against pg_namespace so we only return schemas that actually exist.
  const ns = await pool.query<{ nspname: string }>(
    `SELECT nspname FROM pg_namespace WHERE nspname = ANY($1::text[])`,
    [Array.from(subdomains)]
  );
  return ns.rows.map((r) => r.nspname);
}

// ─────────────────────────────────────────────────────────────────────────────
// syncAllTenantSchemas — 서버 시작 시 자동 실행
//
// 모든 테넌트 schema를 public 기준으로 동기화.
// 신규 테이블, 신규 컬럼을 자동 감지하여 추가 (완전 idempotent).
// ─────────────────────────────────────────────────────────────────────────────

type ColInfo = {
  table_name: string;
  column_name: string;
  data_type: string;            // format_type() 결과 (예: "character varying(255)")
  column_default: string | null;
  is_nullable: string;          // 'YES' | 'NO'
  is_generated: string;         // 'YES' | 'NO'
};

/**
 * 서버 시작 시 모든 테넌트 schema를 public schema 기준으로 동기화.
 *
 * ① 신규 테이블 → CREATE TABLE IF NOT EXISTS ... LIKE public.{table}
 * ② 신규 컬럼  → ALTER TABLE ADD COLUMN IF NOT EXISTS
 *
 * 변경이 없으면 아무 작업도 하지 않음 (idempotent, 빠름).
 * 에러가 발생해도 다른 테넌트 처리는 계속 진행.
 */
export async function syncAllTenantSchemas(): Promise<void> {
  const tenantSlugs = await listTenantSchemas();
  if (tenantSlugs.length === 0) {
    console.log("[SchemaSync] No tenant schemas found — skipping");
    return;
  }

  const startMs = Date.now();
  console.log(`[SchemaSync] Syncing ${tenantSlugs.length} tenant schema(s)...`);

  // ── 1. public schema의 모든 테넌트 테이블 컬럼 정보를 한 번에 조회 ──────────
  //    pg_attribute + format_type()으로 정확한 타입 문자열 획득
  const pubClient = await pool.connect();
  let publicCols: ColInfo[] = [];
  let publicTableSet: Set<string>;
  try {
    const res = await pubClient.query<ColInfo>(`
      SELECT
        c.relname                                        AS table_name,
        a.attname                                        AS column_name,
        format_type(a.atttypid, a.atttypmod)            AS data_type,
        pg_get_expr(ad.adbin, ad.adrelid)               AS column_default,
        CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
        CASE WHEN a.attgenerated <> ''  THEN 'YES' ELSE 'NO' END AS is_generated
      FROM pg_attribute a
      JOIN pg_class     c  ON c.oid  = a.attrelid
      JOIN pg_namespace n  ON n.oid  = c.relnamespace
      LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
      WHERE n.nspname   = 'public'
        AND c.relname   = ANY($1::text[])
        AND c.relkind   = 'r'
        AND a.attnum    > 0
        AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum
    `, [TENANT_TABLES as unknown as string[]]);
    publicCols    = res.rows;
    publicTableSet = new Set(publicCols.map(r => r.table_name));
  } finally {
    pubClient.release();
  }

  let totalTablesAdded = 0;
  let totalColsAdded   = 0;

  // ── 2. 테넌트별 동기화 ────────────────────────────────────────────────────
  for (const slug of tenantSlugs) {
    const client = await pool.connect();
    try {
      // 2a. 해당 테넌트 schema의 기존 테이블·컬럼 목록을 한 번에 조회
      const tenantRes = await client.query<{ table_name: string; column_name: string }>(`
        SELECT c.relname AS table_name, a.attname AS column_name
        FROM pg_attribute a
        JOIN pg_class     c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1
          AND c.relname = ANY($2::text[])
          AND c.relkind = 'r'
          AND a.attnum  > 0
          AND NOT a.attisdropped
      `, [slug, TENANT_TABLES as unknown as string[]]);

      const tenantColSet   = new Set(tenantRes.rows.map(r => `${r.table_name}.${r.column_name}`));
      const tenantTableSet = new Set(tenantRes.rows.map(r => r.table_name));

      // 2b. 각 테넌트 테이블 처리
      for (const tableName of TENANT_TABLES) {
        if (!publicTableSet.has(tableName)) continue;   // public에 없는 테이블은 건너뜀

        // ── 신규 테이블: public 구조를 복사해서 생성 ──────────────────────────
        if (!tenantTableSet.has(tableName)) {
          await client.query(`
            CREATE TABLE IF NOT EXISTS "${slug}"."${tableName}"
            (LIKE public."${tableName}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)
          `);
          totalTablesAdded++;
          console.log(`[SchemaSync]   + table  "${slug}"."${tableName}"`);
          continue;  // 방금 복사했으므로 컬럼 비교 불필요
        }

        // ── 기존 테이블: 누락 컬럼만 추가 ────────────────────────────────────
        const tableCols = publicCols.filter(r => r.table_name === tableName);
        for (const col of tableCols) {
          if (col.is_generated === "YES") continue;                       // GENERATED 컬럼 제외
          if (tenantColSet.has(`${tableName}.${col.column_name}`)) continue; // 이미 존재

          // 컬럼 DDL 구성
          // - DEFAULT: sequence(nextval) 제외, 나머지는 그대로 복사
          // - NOT NULL: DEFAULT가 있을 때만 적용
          //   (DEFAULT 없이 NOT NULL 추가 시 기존 행 삽입 불가)
          let colDef = `"${col.column_name}" ${col.data_type}`;
          const hasNonSeqDefault =
            col.column_default !== null &&
            !col.column_default.startsWith("nextval(");

          if (hasNonSeqDefault) {
            colDef += ` DEFAULT ${col.column_default}`;
            if (col.is_nullable === "NO") colDef += " NOT NULL";
          }
          // NOT NULL + DEFAULT 없음 → nullable로 추가 (기존 행 보호)

          await client.query(
            `ALTER TABLE "${slug}"."${tableName}" ADD COLUMN IF NOT EXISTS ${colDef}`
          );
          totalColsAdded++;
          console.log(`[SchemaSync]   + column "${slug}"."${tableName}"."${col.column_name}" ${col.data_type}`);
        }
      }
    } catch (err) {
      // 개별 테넌트 오류는 무시하고 다음 테넌트 계속 처리
      console.error(`[SchemaSync] ⚠️  Error syncing "${slug}":`, (err as Error).message);
    } finally {
      client.release();
    }
  }

  const elapsed = Date.now() - startMs;
  if (totalTablesAdded === 0 && totalColsAdded === 0) {
    console.log(`[SchemaSync] ✅ All ${tenantSlugs.length} schemas up-to-date (${elapsed}ms)`);
  } else {
    console.log(
      `[SchemaSync] ✅ Sync complete — +${totalTablesAdded} tables, +${totalColsAdded} columns` +
      ` across ${tenantSlugs.length} tenants (${elapsed}ms)`
    );
  }
}
