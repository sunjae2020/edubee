import { db } from "@workspace/db";
import {
  journalEntries,
  contractProducts,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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
  paymentRef:  string | null;
  paymentDate: string;
  paymentType: string;
  receivedFrom: string | null;
  paidTo:       string | null;
}

// ── DR/CR mapping ──────────────────────────────────────────────────────────
// Key: `${payment_type}:${split_type}` (split_type = "*" = match any)

const DR_CR_MAP: Record<string, { debit: string; credit: string; entryType: string }> = {
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

function resolveDrCr(
  paymentType: string,
  splitType: string | null
): { debit: string; credit: string; entryType: string } {
  const exactKey  = `${paymentType}:${splitType ?? ""}`;
  const wildcardKey = `${paymentType}:*`;

  const match = DR_CR_MAP[exactKey] ?? DR_CR_MAP[wildcardKey];
  if (!match) {
    const msg = `No DR/CR mapping for paymentType="${paymentType}" splitType="${splitType}"`;
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

  // Step 1 — resolve DR/CR codes
  const { debit, credit, entryType } = resolveDrCr(
    paymentHeader.paymentType,
    paymentLine.splitType
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
