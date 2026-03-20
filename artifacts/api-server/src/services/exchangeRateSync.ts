import { db } from "@workspace/db";
import { exchangeRates } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const EXTERNAL_API = "https://open.er-api.com/v6/latest/AUD";

export interface SyncResult {
  success: boolean;
  date: string;
  updated: string[];
  skipped: string[];
  error?: string;
}

/**
 * Fetch latest AUD-based rates from external free API.
 */
async function fetchExternalRates(): Promise<Record<string, number>> {
  const resp = await fetch(EXTERNAL_API);
  if (!resp.ok) throw new Error(`External API error: ${resp.status}`);
  const json = (await resp.json()) as { result: string; rates: Record<string, number> };
  if (json.result !== "success") throw new Error("External API returned failure");
  return json.rates; // e.g. { KRW: 950, JPY: 100, USD: 0.64, ... }
}

/**
 * Get the unique currency pairs tracked in the DB (AUD→X direction only).
 * These are the currencies the admin has manually configured.
 */
async function getTrackedCurrencies(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ toCurrency: exchangeRates.toCurrency })
    .from(exchangeRates)
    .where(eq(exchangeRates.fromCurrency, "AUD"));
  return rows.map(r => r.toCurrency).filter(c => c !== "AUD");
}

/**
 * Main sync function.
 * Inserts today's AUD→X rate for each tracked currency (from external API).
 * Skips if today's entry already exists (unique constraint: from+to+date).
 */
export async function syncExchangeRates(): Promise<SyncResult> {
  const today = new Date().toISOString().slice(0, 10);
  const result: SyncResult = { success: true, date: today, updated: [], skipped: [] };

  try {
    const [tracked, externalRates] = await Promise.all([
      getTrackedCurrencies(),
      fetchExternalRates(),
    ]);

    if (tracked.length === 0) {
      console.log("[ExchangeRateSync] No tracked currencies found in DB — skipping sync.");
      return result;
    }

    console.log(`[ExchangeRateSync] Syncing ${tracked.length} currencies for ${today}: ${tracked.join(", ")}`);

    for (const ccy of tracked) {
      const externalRate = externalRates[ccy];
      if (externalRate == null) {
        console.warn(`[ExchangeRateSync] No rate found for ${ccy} in external API`);
        result.skipped.push(ccy);
        continue;
      }

      try {
        await db
          .insert(exchangeRates)
          .values({
            fromCurrency: "AUD",
            toCurrency: ccy,
            rate: String(externalRate),
            source: "auto",
            effectiveDate: today,
          })
          .onConflictDoUpdate({
            target: [exchangeRates.fromCurrency, exchangeRates.toCurrency, exchangeRates.effectiveDate],
            set: {
              rate: String(externalRate),
              source: "auto",
            },
          });

        result.updated.push(ccy);
        console.log(`[ExchangeRateSync] ✓ AUD→${ccy} = ${externalRate}`);
      } catch (err: any) {
        console.error(`[ExchangeRateSync] Failed for ${ccy}:`, err.message);
        result.skipped.push(ccy);
      }
    }

    console.log(`[ExchangeRateSync] Done. Updated: ${result.updated.join(", ") || "none"}. Skipped: ${result.skipped.join(", ") || "none"}`);
  } catch (err: any) {
    result.success = false;
    result.error = err.message;
    console.error("[ExchangeRateSync] Sync failed:", err.message);
  }

  return result;
}

/**
 * Returns info about the last auto-sync (latest 'auto' source entry).
 */
export async function getLastSyncInfo(): Promise<{ lastSyncedAt: string | null; lastSyncedDate: string | null }> {
  try {
    const rows = await db
      .select({ createdAt: exchangeRates.createdAt, effectiveDate: exchangeRates.effectiveDate })
      .from(exchangeRates)
      .where(eq(exchangeRates.source, "auto"))
      .orderBy(desc(exchangeRates.createdAt))
      .limit(1);
    if (rows.length === 0) return { lastSyncedAt: null, lastSyncedDate: null };
    return {
      lastSyncedAt: rows[0].createdAt?.toISOString() ?? null,
      lastSyncedDate: rows[0].effectiveDate ?? null,
    };
  } catch {
    return { lastSyncedAt: null, lastSyncedDate: null };
  }
}
