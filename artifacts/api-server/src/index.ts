process.env.TZ = "UTC";

import cron from "node-cron";
import app from "./app";
import { syncExchangeRates } from "./services/exchangeRateSync.js";
import { seedChartOfAccounts } from "./seeds/coa-seed.js";
import { markOverdueArItems } from "./seeds/arap-overdue.js";
import { seedUsersIfEmpty } from "./seeds/seed-users.js";
import { seedMenuAllocation } from "./seeds/seed-menu-allocation.js";
import { importDevDataIfNeeded } from "./seeds/import-dev-data.js";
import { startTaxInvoiceScheduler } from "./jobs/taxInvoiceScheduler.js";
import { startKpiScheduler } from "./jobs/kpiScheduler.js";
import { startInvoiceScheduler } from "./jobs/invoiceScheduler.js";
import { startDelegationExpiryScheduler } from "./jobs/delegationExpiryScheduler.js";
import { startAirtableScheduler } from "./jobs/airtableScheduler.js";
import { syncAllTenantSchemas } from "./seeds/provision-tenant.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Startup gates ────────────────────────────────────────────────────────────
// These flags MUST be off in production. They were previously running on every
// API server boot — including against production DB — which corrupted tenant
// data and reset user passwords. Re-enable ONLY against an isolated dev DB.
//
//   RUN_DEV_SEEDS=true      → seedUsers / seedCoA / seedMenu (overwrites data)
//   RUN_SCHEMA_SYNC=true    → applies public schema to every tenant schema
//   FORCE_DEV_DATA_IMPORT   → still respected by importDevDataIfNeeded()
//
// Fence: if DATABASE_URL points at a known production host, refuse to run
// destructive seeds even if the flags are accidentally set.
const PROD_DB_HOST_PATTERNS = [
  "aws-1-ap-northeast-1.pooler.supabase.com",  // current prod
];
const dbUrl = process.env.DATABASE_URL ?? "";
const isProdDb = PROD_DB_HOST_PATTERNS.some(p => dbUrl.includes(p));
if (isProdDb) {
  console.warn("[startup] ⚠️  DATABASE_URL points at PRODUCTION — destructive seeds force-disabled");
}
const RUN_DEV_SEEDS   = !isProdDb && process.env.RUN_DEV_SEEDS    === "true";
const RUN_SCHEMA_SYNC = !isProdDb && process.env.RUN_SCHEMA_SYNC  === "true";

const server = app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);

  if (RUN_DEV_SEEDS) {
    console.log("[startup] RUN_DEV_SEEDS=true — running dev seeds (DB will be modified)");
    await importDevDataIfNeeded();
    seedUsersIfEmpty();
    // Per-tenant CoA — seed for each active organisation
    {
      const { staticDb } = await import("@workspace/db");
      const { organisations } = await import("@workspace/db/schema");
      const { eq } = await import("drizzle-orm");
      const orgs = await staticDb.select({ id: organisations.id })
        .from(organisations)
        .where(eq(organisations.status, "Active"));
      for (const o of orgs) await seedChartOfAccounts(o.id);
    }
    seedMenuAllocation();
  } else {
    console.log("[startup] RUN_DEV_SEEDS not set — dev seeds skipped (safe for production)");
  }

  // Production-safe maintenance tasks (idempotent, read-mostly)
  markOverdueArItems();

  // Schedulers — cron-based, independent of seed gating
  startTaxInvoiceScheduler();
  startKpiScheduler();
  startDelegationExpiryScheduler();
  startAirtableScheduler();
  startInvoiceScheduler();

  // Tenant schema sync — applies platform schema changes to every tenant schema.
  // Risky against prod (can drop columns, alter types). Should be a deploy-time
  // migration step, not an every-boot operation.
  if (RUN_SCHEMA_SYNC) {
    console.log("[startup] RUN_SCHEMA_SYNC=true — syncing tenant schemas now");
    syncAllTenantSchemas().catch(err =>
      console.error("[SchemaSync] Fatal error:", err)
    );
  } else {
    console.log("[startup] RUN_SCHEMA_SYNC not set — schema sync skipped");
  }
});

// CHECK 1.3 — Replit: prevent 120s reverse-proxy hard-cut
server.timeout = 120000;
server.keepAliveTimeout = 121000;
console.log("[FIX APPLIED] server.timeout = 120000ms");

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string) {
  console.log(`[Shutdown] ${signal} received — closing HTTP server gracefully`);
  server.close((err) => {
    if (err) {
      console.error("[Shutdown] Error during server close:", err);
      process.exit(1);
    }
    console.log("[Shutdown] HTTP server closed. Exiting.");
    process.exit(0);
  });
  // Force exit if graceful shutdown takes >10 seconds
  setTimeout(() => {
    console.error("[Shutdown] Forced exit after 10s timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Exchange Rate Auto-Sync ───────────────────────────────────────────────
// Schedule: midnight every day in Australia/Sydney timezone (AEST UTC+10 / AEDT UTC+11)
cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("[ExchangeRateSync] Scheduled run triggered (Australia/Sydney midnight)");
    await syncExchangeRates();
  },
  { timezone: "Australia/Sydney" }
);
console.log("[ExchangeRateSync] Cron job registered — runs at midnight Australia/Sydney time");
