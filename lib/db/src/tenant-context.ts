/**
 * PostgreSQL Schema-per-Tenant 격리 모듈
 *
 * 설계:
 *   - 각 테넌트는 자신의 PostgreSQL schema를 가짐 (ts, myagency, ...)
 *   - 플랫폼 테이블(organisations, users 등)은 public schema 유지
 *   - 테넌트 요청: search_path = "{tenant}", public
 *   - AsyncLocalStorage로 요청별 db 자동 라우팅 (기존 route 코드 변경 불필요)
 */

import { AsyncLocalStorage } from "async_hooks";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

// ─── 플랫폼 테이블 목록 (public schema에 유지) ───────────────────────────────
export const PLATFORM_TABLES = new Set([
  "organisations",
  "users",
  "refresh_tokens",
  "page_permissions",
  "auth_logs",
  "impersonation_logs",
  "platform_activities",
  "platform_contacts",
  "platform_plans",
  "platform_prospects",
  "platform_settings",
  "tenant_audit_logs",
  "tenant_invitations",
  "domain_configs",
  "menu_categories",
  "menu_items",
  "theme_options",
  "theme_translations",
  "system_settings",
  "system_languages",
  "default_doc_permissions",
]);

// ─── 테넌트 테이블 목록 (84개 — 각 테넌트 schema에 생성됨) ──────────────────
export const TENANT_TABLES = [
  "accommodation_mgt",
  "account_company_profiles",
  "account_contacts",
  "account_homestay_profiles",
  "account_hotel_profiles",
  "account_ledger_entries",
  "account_pickup_profiles",
  "account_school_profiles",
  "account_service_categories",
  "account_tour_profiles",
  "accounts",
  "agent_commission_configs",
  "application_form_partners",
  "application_forms",
  "form_terms_content",
  "application_grade",
  "application_participants",
  "applications",
  "banking",
  "camp_application_contacts",
  "camp_applications",
  "camp_tour_mgt",
  "chart_of_accounts",
  "chat_chunks",
  "chat_documents",
  "commissions",
  "contacts",
  "contract_finance_items",
  "contract_products",
  "contracts",
  "cost_centers",
  "document_access_logs",
  "document_categories",
  "document_extra_categories",
  "document_permissions",
  "documents",
  "enrollment_settings",
  "enrollment_spots",
  "exchange_rates",
  "guardian_mgt",
  "import_history",
  "internship_mgt",
  "interview_schedules",
  "interview_settings",
  "invoices",
  "journal_entries",
  "kpi_targets",
  "lead_activities",
  "leads",
  "notes",
  "notifications",
  "other_services_mgt",
  "package_group_images",
  "package_group_products",
  "package_groups",
  "package_products",
  "packages",
  "payment_headers",
  "payment_infos",
  "payment_lines",
  "payment_statements",
  "pickup_mgt",
  "product_cost_lines",
  "product_groups",
  "product_types",
  "products",
  "program_reports",
  "promotions",
  "quote_products",
  "quotes",
  "receipts",
  "report_sections",
  "settlement_checklist_templates",
  "settlement_mgt",
  "staff_kpi_periods",
  "study_abroad_mgt",
  "task_attachments",
  "task_comments",
  "tasks",
  "tax_invoices",
  "tax_rates",
  "team_kpi_periods",
  "teams",
  "tour_mgt",
  "transactions",
  "user_ledger",
  "visa_services_mgt",
] as const;

// ─── Schema 이름 안전성 검증 ─────────────────────────────────────────────────
// PostgreSQL identifier 패턴 (소문자/숫자/하이픈/언더스코어만 허용).
// search_path / "schema".table 같은 SQL identifier 보간 전에 반드시 호출하여
// SQL injection을 차단해야 함.
const SAFE_SCHEMA_RE = /^[a-z0-9_-]+$/i;

export function assertSafeSchemaName(name: string): string {
  if (typeof name !== "string" || name.length === 0 || name.length > 63 || !SAFE_SCHEMA_RE.test(name)) {
    throw new Error(`Invalid schema name: ${JSON.stringify(name)}`);
  }
  return name;
}

// ─── 테넌트별 Connection Pool 캐시 ───────────────────────────────────────────
// 각 테넌트마다 search_path가 설정된 소형 pool (max: 5)
const _tenantPools = new Map<string, InstanceType<typeof Pool>>();
const _tenantDbs   = new Map<string, NodePgDatabase<typeof schema>>();

// Symbol used to mark pg clients that have already been patched.
// pg Pool recycles clients — without this guard, each pool.connect() call
// would wrap the already-wrapped query method, causing exponential nesting.
const ORIG_QUERY = Symbol("origQuery");

// Per-tenant Node-side concurrency cap. pgBouncer multiplexes the actual DB
// connections, so this is mostly an in-process queue depth knob. Override with
// TENANT_POOL_MAX env var if a tenant routinely runs many concurrent queries
// (e.g. background syncs running alongside user traffic).
const TENANT_POOL_MAX = Math.max(1, parseInt(process.env.TENANT_POOL_MAX ?? "10", 10));
const TENANT_POOL_IDLE_MS = Math.max(1000, parseInt(process.env.TENANT_POOL_IDLE_MS ?? "30000", 10));

function getTenantPool(tenantSlug: string): InstanceType<typeof Pool> {
  assertSafeSchemaName(tenantSlug);
  if (!_tenantPools.has(tenantSlug)) {
    const p = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: TENANT_POOL_MAX,
      idleTimeoutMillis: TENANT_POOL_IDLE_MS,
    });

    // pgBouncer transaction mode: SET search_path on connect is unreliable because
    // each transaction may land on a different backend connection.
    //
    // Strategy: patch each pg PoolClient's query() method so every SQL statement
    // is automatically wrapped in BEGIN / SET LOCAL search_path / query / COMMIT.
    //
    // pg-pool.connect() is called two ways:
    //   1. Promise-style: pool.connect() — used by Drizzle db.transaction()
    //   2. Callback-style: pool.connect(cb) — used internally by pool.query(),
    //      which Drizzle's db.execute() calls.
    //
    // Our override must support BOTH call styles.  A pure async function ignores
    // the callback argument and hangs pool.query() forever.
    const originalConnect = (p as any).connect.bind(p);

    // Extracts the client-patching logic so it can be shared by both call paths.
    const patchClient = (client: any) => {
      // Reset transaction-depth counter on each checkout so stale state
      // from a previous request doesn't bleed into the next one.
      client._inTx = 0;

      // Patch only once per pg PoolClient instance to avoid double-wrapping.
      // pg Pool recycles client objects across checkouts.
      if (!client[ORIG_QUERY]) {
        const origQuery = client.query.bind(client);
        client[ORIG_QUERY] = origQuery;

        // pg-pool calls client.query(text, values, callback) with a 3rd callback
        // argument internally (from pool.query).  Drizzle calls client.query(text, values)
        // returning a Promise.  Our wrapper must support BOTH call styles.
        client.query = function (text: any, values?: any, cb?: any): any {
          // Normalise 2-arg callback shorthand: query(text, cb)
          if (typeof values === "function") { cb = values; values = undefined; }

          const sqlText: string = typeof text === "string" ? text : (text?.text ?? "");

          // Control statements: pass through, tracking transaction depth.
          if (/^\s*BEGIN\b/i.test(sqlText)) {
            client._inTx = (client._inTx ?? 0) + 1;
            return typeof cb === "function"
              ? origQuery(text, values, cb)
              : origQuery(text, values);
          }
          if (/^\s*(COMMIT|ROLLBACK)\b/i.test(sqlText)) {
            client._inTx = Math.max(0, (client._inTx ?? 0) - 1);
            return typeof cb === "function"
              ? origQuery(text, values, cb)
              : origQuery(text, values);
          }
          if (/^\s*(SAVEPOINT|RELEASE|SET\s)/i.test(sqlText)) {
            return typeof cb === "function"
              ? origQuery(text, values, cb)
              : origQuery(text, values);
          }

          // Core wrapping logic — returns a Promise.
          const doQuery = async (): Promise<any> => {
            if ((client._inTx ?? 0) > 0) {
              await origQuery(`SET LOCAL search_path = "${tenantSlug}", public`);
              return origQuery(text, values);
            }
            await origQuery("BEGIN");
            await origQuery(`SET LOCAL search_path = "${tenantSlug}", public`);
            try {
              const result = await origQuery(text, values);
              await origQuery("COMMIT");
              return result;
            } catch (err) {
              await origQuery("ROLLBACK").catch(() => undefined);
              throw err;
            }
          };

          if (typeof cb === "function") {
            // Callback style: fire and pipe result/error to cb.
            // pg-pool ignores the return value in this code path.
            doQuery().then((r) => cb(null, r)).catch((e) => cb(e));
            return;
          }

          // Promise style (Drizzle db.execute / direct usage).
          return doQuery();
        };
      }

      return client;
    };

    // Override pool.connect to intercept both call styles.
    (p as any).connect = function connectOverride(cb?: Function): any {
      if (typeof cb === "function") {
        // Callback style — pool.query() calls this.connect(cb) internally.
        // We must honour the callback so pool.query() can complete.
        originalConnect((err: any, client: any, release: any) => {
          if (err) return cb(err, null, release);
          try { patchClient(client); } catch { /* ignore patch errors */ }
          cb(null, client, release);
        });
        // pool.query() ignores the return value in callback mode.
        return;
      }
      // Promise style — Drizzle db.transaction() uses await pool.connect().
      return originalConnect().then((client: any) => patchClient(client));
    };

    _tenantPools.set(tenantSlug, p);
  }
  return _tenantPools.get(tenantSlug)!;
}

function getTenantDb(tenantSlug: string): NodePgDatabase<typeof schema> {
  if (!_tenantDbs.has(tenantSlug)) {
    const pool = getTenantPool(tenantSlug);
    _tenantDbs.set(tenantSlug, drizzle(pool, { schema }));
  }
  return _tenantDbs.get(tenantSlug)!;
}

// ─── AsyncLocalStorage — 현재 요청의 테넌트 DB ───────────────────────────────
export const _tenantDbStorage = new AsyncLocalStorage<NodePgDatabase<typeof schema>>();

/**
 * 지정된 테넌트 schema context에서 fn을 실행.
 * 내부의 모든 db.select/insert/update/delete는 자동으로 tenant schema를 사용.
 * async callback을 지원하며 Promise를 반환.
 *
 * @param tenantSlug  테넌트 slug (예: 'ts', 'myagency')
 * @param fn          실행할 콜백 (동기/비동기 모두 지원)
 */
export function runWithTenantSchema(
  tenantSlug: string,
  fn: () => unknown | Promise<unknown>,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tenantDb = getTenantDb(tenantSlug);
    _tenantDbStorage.run(tenantDb, () => {
      try {
        const result = fn();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * 현재 AsyncLocalStorage context에서 테넌트 DB를 가져옴.
 * context가 없으면 null (공용 DB 사용).
 */
export function getCurrentTenantDb(): NodePgDatabase<typeof schema> | null {
  return _tenantDbStorage.getStore() ?? null;
}

// ─── 테넌트 schema 존재 여부 캐시 ────────────────────────────────────────────
const _schemaExistenceCache = new Map<string, boolean>();

/**
 * PostgreSQL namespace(schema)가 존재하는지 확인.
 * 결과는 in-memory 캐시됨 (서버 재시작 시 초기화).
 */
export async function tenantSchemaExists(
  tenantSlug: string,
  pool: InstanceType<typeof Pool>,
): Promise<boolean> {
  if (_schemaExistenceCache.has(tenantSlug)) {
    return _schemaExistenceCache.get(tenantSlug)!;
  }
  const result = await pool.query(
    "SELECT 1 FROM pg_namespace WHERE nspname = $1",
    [tenantSlug],
  );
  const exists = result.rowCount !== null && result.rowCount > 0;
  _schemaExistenceCache.set(tenantSlug, exists);
  return exists;
}

/**
 * 테넌트 schema 존재 캐시 무효화 (새 schema 생성 후 호출)
 */
export function invalidateSchemaCacheFor(tenantSlug: string): void {
  _schemaExistenceCache.delete(tenantSlug);
}
