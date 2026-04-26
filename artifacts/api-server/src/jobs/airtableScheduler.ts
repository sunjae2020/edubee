import cron from "node-cron";
import { db } from "@workspace/db";
import { organisations, platformSettings } from "@workspace/db/schema";
import { eq, asc, like } from "drizzle-orm";
import { syncAllBases } from "../services/airtableService.js";

// Runs 4x daily: 00:00, 06:00, 12:00, 18:00 (Australia/Sydney)
const SCHEDULE = "0 0,6,12,18 * * *";

async function runScheduledSync() {
  console.log("[AirtableScheduler] Starting scheduled sync...");

  // Find all orgs that have an Airtable token configured (org-scoped keys)
  const tokenRows = await db.select({ key: platformSettings.key })
    .from(platformSettings)
    .where(like(platformSettings.key, "airtable.token.%"));

  if (tokenRows.length === 0) {
    console.log("[AirtableScheduler] No orgs with Airtable token, skipping.");
    return;
  }

  // Extract org IDs from keys like "airtable.token.{orgId}"
  const orgIds = tokenRows.map(r => r.key.replace("airtable.token.", ""));

  // Fetch org names for logging
  const orgs = await db.select({ id: organisations.id, name: organisations.name })
    .from(organisations)
    .where(eq(organisations.status, "Active"))
    .orderBy(asc(organisations.createdOn));

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));

  for (const orgId of orgIds) {
    // Only sync if the org is active
    if (!orgMap[orgId]) {
      console.log(`[AirtableScheduler] Skipping inactive/unknown org: ${orgId}`);
      continue;
    }

    console.log(`[AirtableScheduler] Syncing org: ${orgMap[orgId]} (${orgId})`);
    try {
      const results = await syncAllBases(orgId);
      for (const r of results) {
        if (r.success) {
          console.log(`[AirtableScheduler] ✅ ${r.baseName}: ${JSON.stringify(r.details)} (${r.elapsed}ms)`);
        } else {
          console.error(`[AirtableScheduler] ❌ ${r.baseName}: ${r.error}`);
        }
      }
    } catch (err) {
      console.error(`[AirtableScheduler] Error syncing org ${orgMap[orgId]}:`, err);
    }
  }

  console.log("[AirtableScheduler] Scheduled sync complete.");
}

export function startAirtableScheduler() {
  cron.schedule(SCHEDULE, runScheduledSync, { timezone: "Australia/Sydney" });
  console.log(`[AirtableScheduler] Scheduled: ${SCHEDULE} (Australia/Sydney)`);
}
