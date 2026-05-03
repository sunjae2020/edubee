/**
 * One-off: propagate public schema column additions to every tenant schema.
 *
 * Bypasses the production fence in src/index.ts because we explicitly need
 * to run this against production after applying migrations 0019/0020/0021.
 *
 * Usage:
 *   env $(grep -v '^#' ../../.env | xargs) tsx src/scripts/sync-tenant-schemas-now.ts
 */

import { syncAllTenantSchemas } from "../seeds/provision-tenant.js";

(async () => {
  console.log("[sync-now] Starting tenant schema sync against current DATABASE_URL");
  try {
    await syncAllTenantSchemas();
    console.log("[sync-now] Done");
    process.exit(0);
  } catch (err) {
    console.error("[sync-now] Failed:", err);
    process.exit(1);
  }
})();
