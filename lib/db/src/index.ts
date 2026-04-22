import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
import { _tenantDbStorage } from "./tenant-context.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Ensure staticDb always uses public schema (pgBouncer transaction mode can leak search_path)
pool.on("connect", (client: any) => {
  client.query("SET search_path = public");
});

// ─── 기본 DB (public schema — 플랫폼 라우트, 마이그레이션 용) ─────────────────
export const staticDb = drizzle(pool, { schema });

// ─── 테넌트 프록시 DB ─────────────────────────────────────────────────────────
// 라우트에서 `import { db } from "@workspace/db"` 그대로 사용.
// 테넌트 요청 context에서는 자동으로 tenant schema DB로 라우팅됨.
// 테넌트 context가 없으면 staticDb(public schema) 사용.
export const db = new Proxy(staticDb, {
  get(target, prop) {
    const tenantDb = _tenantDbStorage.getStore();
    const source = tenantDb ?? target;
    const value = (source as any)[prop];
    if (typeof value === "function") return value.bind(source);
    return value;
  },
}) as NodePgDatabase<typeof schema>;

export * from "./schema/index.js";
export * from "./tenant-context.js";
