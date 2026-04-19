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

const server = app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await importDevDataIfNeeded();
  seedUsersIfEmpty();
  seedChartOfAccounts();
  seedMenuAllocation();
  markOverdueArItems();
  startTaxInvoiceScheduler();
  startKpiScheduler();
  // 모든 테넌트 schema를 public 기준으로 자동 동기화 (배포 시 스키마 변경 자동 반영)
  syncAllTenantSchemas().catch(err =>
    console.error("[SchemaSync] Fatal error:", err)
  );
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
