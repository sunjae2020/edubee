import cron from "node-cron";
import { db } from "@workspace/db";
import { organisations, platformSettings } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { syncAllBases } from "../services/airtableService.js";

// Runs 4x daily: 00:00, 06:00, 12:00, 18:00 (server time)
const SCHEDULE = "0 0,6,12,18 * * *";

async function runScheduledSync() {
  console.log("[AirtableScheduler] Starting scheduled sync...");

  // Check if token is configured
  const tokenRow = await db.select().from(platformSettings)
    .where(eq(platformSettings.key, "airtable.token")).limit(1);
  if (!tokenRow[0]?.value) {
    console.log("[AirtableScheduler] No token configured, skipping.");
    return;
  }

  // Get all active organisations
  const orgs = await db.select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(eq(organisations.status, "Active"))
    .orderBy(asc(organisations.createdOn));

  for (const org of orgs) {
    console.log(`[AirtableScheduler] Syncing org: ${org.name} (${org.id})`);
    try {
      const results = await syncAllBases(org.id);
      for (const r of results) {
        if (r.success) {
          console.log(`[AirtableScheduler] ✅ ${r.baseName}: ${JSON.stringify(r.details)} (${r.elapsed}ms)`);
        } else {
          console.error(`[AirtableScheduler] ❌ ${r.baseName}: ${r.error}`);
        }
      }
    } catch (err) {
      console.error(`[AirtableScheduler] Error syncing org ${org.name}:`, err);
    }
  }

  console.log("[AirtableScheduler] Scheduled sync complete.");
}

export function startAirtableScheduler() {
  cron.schedule(SCHEDULE, runScheduledSync, { timezone: "Australia/Sydney" });
  console.log(`[AirtableScheduler] Scheduled: ${SCHEDULE} (Australia/Sydney)`);
}
