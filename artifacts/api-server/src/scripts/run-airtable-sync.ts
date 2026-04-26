import { syncAllBases } from "../services/airtableService.js";

const ORG_ID = "24fafb4c-92d6-4818-9e4d-eef2355199e8";

async function main() {
  console.log("[Sync] Starting Airtable sync for My Agency...");
  const start = Date.now();
  const results = await syncAllBases(ORG_ID);

  for (const r of results) {
    console.log(`\n[${r.baseName}] ${r.success ? "✓ SUCCESS" : "✗ FAILED"} (${r.elapsed}ms)`);
    if (r.error) console.log("  Error:", r.error);
    for (const [table, stats] of Object.entries(r.details)) {
      if (stats) console.log(`  ${table}:`, JSON.stringify(stats));
    }
  }
  console.log(`\n[Sync] Done in ${Date.now() - start}ms`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[Sync] Fatal:", e.message);
  process.exit(1);
});
