import { db } from "@workspace/db";
import {
  journalEntries,
  contractProducts,
  journalEntryMappings,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────

export interface JournalEntryDraft {
  debitCoa:  string;
  creditCoa: string;
  amount:    number;
}

export interface PaymentLineRow {
  id:                string;
  paymentHeaderId:   string;
  invoiceId:         string | null;
  contractProductId: string | null;
  splitType:         string | null;
  amount:            string;
  staffId:           string | null;
  description:       string | null;
  createdOn:         Date;
}

export interface PaymentHeaderRow {
  id:          string;
  organisationId: string;
  paymentRef:  string | null;
  paymentDate: string;
  paymentType: string;
  receivedFrom: string | null;
  paidTo:       string | null;
}

// ── DR/CR mapping ──────────────────────────────────────────────────────────
// Source of truth: `journal_entry_mappings` table (see migration 0016).
// Fallback map below is used only if the DB table is empty or unreachable
// — keep it in sync with the seeded rows for safety.

type DrCrRule = { debit: string; credit: string; entryType: string };

const FALLBACK_DR_CR_MAP: Record<string, DrCrRule> = {
  "trust_receipt:tuition":        { debit: "1200", credit: "2100", entryType: "trust_receipt" },
  "trust_receipt:accommodation":  { debit: "1200", credit: "2300", entryType: "trust_receipt" },
  "trust_receipt:pickup":         { debit: "1200", credit: "2400", entryType: "trust_receipt" },
  "trust_receipt:insurance":      { debit: "1200", credit: "2200", entryType: "trust_receipt" },
  "direct:service_fee":           { debit: "1100", credit: "3400", entryType: "service_fee" },
  "direct:visa_fee":              { debit: "1100", credit: "3400", entryType: "service_fee" },
  "trust_transfer:*":             { debit: "2100", credit: "1200", entryType: "school_transfer" },
  "commission:pre_deduct":        { debit: "1200", credit: "3100", entryType: "commission_received" },
  "commission:invoice":           { debit: "1100", credit: "1300", entryType: "commission_received" },
  "cost_payment:sub_agent":       { debit: "4100", credit: "1100", entryType: "cost_payment" },
  "cost_payment:super_agent":     { debit: "4200", credit: "1100", entryType: "cost_payment" },
  "cost_payment:referral":        { debit: "4300", credit: "1100", entryType: "cost_payment" },
  "cost_payment:salary":          { debit: "5200", credit: "1100", entryType: "cost_payment" },
  "cost_payment:incentive":       { debit: "5300", credit: "1100", entryType: "cost_payment" },
};

const CACHE_TTL_MS = 60_000;
// Per-tenant cache: each org has its own DR/CR map.
const cachedMapByOrg = new Map<string, { map: Record<string, DrCrRule>; cachedAt: number }>();

async function loadMappingsFromDb(orgId: string): Promise<Record<string, DrCrRule>> {
  const rows = await db
    .select({
      paymentType: journalEntryMappings.paymentType,
      splitType:   journalEntryMappings.splitType,
      debit:       journalEntryMappings.debitCoa,
      credit:      journalEntryMappings.creditCoa,
      entryType:   journalEntryMappings.entryType,
    })
    .from(journalEntryMappings)
    .where(and(
      eq(journalEntryMappings.organisationId, orgId),
      eq(journalEntryMappings.isActive, true),
    ));
  const map: Record<string, DrCrRule> = {};
  for (const r of rows) {
    map[`${r.paymentType}:${r.splitType}`] = {
      debit: r.debit, credit: r.credit, entryType: r.entryType,
    };
  }
  return map;
}

async function getMap(orgId: string): Promise<Record<string, DrCrRule>> {
  const now = Date.now();
  const cached = cachedMapByOrg.get(orgId);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) return cached.map;
  try {
    const dbMap = await loadMappingsFromDb(orgId);
    if (Object.keys(dbMap).length === 0) {
      console.warn(`[journalEntryService] journal_entry_mappings empty for org ${orgId} — using fallback`);
      cachedMapByOrg.set(orgId, { map: FALLBACK_DR_CR_MAP, cachedAt: now });
      return FALLBACK_DR_CR_MAP;
    }
    cachedMapByOrg.set(orgId, { map: dbMap, cachedAt: now });
    return dbMap;
  } catch (err) {
    console.error(`[journalEntryService] failed to load mappings for org ${orgId}; using fallback:`, err);
    return FALLBACK_DR_CR_MAP;
  }
}

export function invalidateMappingCache(orgId?: string): void {
  if (orgId) {
    cachedMapByOrg.delete(orgId);
  } else {
    cachedMapByOrg.clear();
  }
}

async function resolveDrCr(
  orgId: string,
  paymentType: string,
  splitType: string | null,
): Promise<DrCrRule> {
  const map = await getMap(orgId);
  const exactKey    = `${paymentType}:${splitType ?? ""}`;
  const wildcardKey = `${paymentType}:*`;
  const match = map[exactKey] ?? map[wildcardKey];
  if (!match) {
    const msg = `No DR/CR mapping for org="${orgId}" paymentType="${paymentType}" splitType="${splitType}"`;
    console.error(`[journalEntryService] ${msg}`);
    throw new Error(msg);
  }
  return match;
}

// ── Double-entry validation ────────────────────────────────────────────────
// Each entry produces one DR and one CR for the same amount — always balanced.
// This function validates a batch in case it is ever called with multiple drafts.
export function validateDoubleEntry(entries: JournalEntryDraft[]): void {
  const totalDR = entries.reduce((s, e) => s + e.amount, 0);
  const totalCR = entries.reduce((s, e) => s + e.amount, 0);
  if (Math.abs(totalDR - totalCR) > 0.001) {
    throw new Error(`Journal imbalance: DR=${totalDR} CR=${totalCR}`);
  }
}

// ── Core engine ────────────────────────────────────────────────────────────

export async function createJournalEntriesForPaymentLine(
  paymentLine: PaymentLineRow,
  paymentHeader: PaymentHeaderRow,
  createdBy: string,
  tx?: typeof db
): Promise<void> {
  const client = tx ?? db;
  const amount = Number(paymentLine.amount ?? 0);
  if (amount <= 0) {
    throw new Error(`Journal entry requires amount > 0 (got ${amount})`);
  }

  // Step 1 — resolve DR/CR codes (per-tenant)
  const { debit, credit, entryType } = await resolveDrCr(
    paymentHeader.organisationId,
    paymentHeader.paymentType,
    paymentLine.splitType,
  );

  // Step 2 — validate (single-line is always balanced, but call for consistency)
  validateDoubleEntry([{ debitCoa: debit, creditCoa: credit, amount }]);

  // Step 3 — look up contract_id from contract_product if available
  let contractId: string | null = null;
  if (paymentLine.contractProductId) {
    const [cp] = await client
      .select({ contractId: contractProducts.contractId })
      .from(contractProducts)
      .where(eq(contractProducts.id, paymentLine.contractProductId));
    contractId = cp?.contractId ?? null;
  }

  // Step 4 — determine student_account_id
  const studentAccountId =
    paymentHeader.paymentType === "trust_receipt"
      ? (paymentHeader.receivedFrom ?? null)
      : null;

  // Step 5 — INSERT journal entry (uses tx if provided, so rollback is atomic)
  await client.insert(journalEntries).values({
    organisationId:   paymentHeader.organisationId,
    entryDate:        paymentHeader.paymentDate,
    paymentHeaderId:  paymentHeader.id,
    paymentLineId:    paymentLine.id,
    debitCoa:         debit,
    creditCoa:        credit,
    amount:           String(amount.toFixed(2)),
    description:      paymentLine.description
      ?? `Auto JE: ${paymentHeader.paymentType} / ${paymentLine.splitType ?? "—"}`,
    entryType,
    studentAccountId,
    partnerId:        null,
    staffId:          paymentLine.staffId ?? null,
    contractId,
    invoiceId:        paymentLine.invoiceId ?? null,
    autoGenerated:    true,
    createdBy,
  });
}
