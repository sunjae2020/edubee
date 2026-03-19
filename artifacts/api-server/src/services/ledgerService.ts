import { db } from "@workspace/db";
import { accountLedgerEntries } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

type LedgerParams = {
  accountId: string;
  sourceType: string;
  sourceId: string;
  contractId?: string;
  entryType: "debit" | "credit";
  amount: number;
  currency?: string;
  originalAmount?: number;
  originalCurrency?: string;
  audEquivalent?: number;
  exchangeRateToAud?: number;
  status?: string;
  description?: string;
  entryDate: string;
  createdBy?: string;
};

export async function createLedgerEntry(params: LedgerParams) {
  try {
    const [entry] = await db
      .insert(accountLedgerEntries)
      .values({
        accountId:         params.accountId,
        sourceType:        params.sourceType,
        sourceId:          params.sourceId,
        contractId:        params.contractId,
        entryType:         params.entryType,
        amount:            params.amount.toString(),
        currency:          params.currency ?? "AUD",
        originalAmount:    params.originalAmount?.toString(),
        originalCurrency:  params.originalCurrency,
        audEquivalent:     params.audEquivalent?.toString() ?? params.amount.toString(),
        exchangeRateToAud: params.exchangeRateToAud?.toString(),
        status:            params.status ?? "pending",
        description:       params.description,
        entryDate:         params.entryDate,
        createdBy:         params.createdBy,
      })
      .returning();
    return entry;
  } catch (e: any) {
    console.error("createLedgerEntry error:", e.message);
    throw new Error(`Ledger entry failed: ${e.message}`);
  }
}

export async function confirmLedgerEntry(entryId: string) {
  try {
    await db
      .update(accountLedgerEntries)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(accountLedgerEntries.id, entryId));
  } catch (e: any) {
    console.error("confirmLedgerEntry error:", e.message);
    throw e;
  }
}

export async function confirmLedgerEntriesBySource(
  sourceType: string,
  sourceId: string
) {
  try {
    await db
      .update(accountLedgerEntries)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(
        and(
          eq(accountLedgerEntries.sourceType, sourceType),
          eq(accountLedgerEntries.sourceId, sourceId)
        )
      );
  } catch (e: any) {
    console.error("confirmLedgerEntriesBySource error:", e.message);
    throw e;
  }
}

export async function reverseLedgerEntry(
  originalEntryId: string,
  reason: string,
  createdBy?: string
) {
  try {
    const [original] = await db
      .select()
      .from(accountLedgerEntries)
      .where(eq(accountLedgerEntries.id, originalEntryId))
      .limit(1);
    if (!original) throw new Error("Ledger entry not found");

    const [reversal] = await db
      .insert(accountLedgerEntries)
      .values({
        accountId:         original.accountId,
        sourceType:        original.sourceType,
        sourceId:          original.sourceId,
        contractId:        original.contractId ?? undefined,
        entryType:         original.entryType === "debit" ? "credit" : "debit",
        amount:            original.amount,
        currency:          original.currency ?? "AUD",
        audEquivalent:     original.audEquivalent ?? undefined,
        exchangeRateToAud: original.exchangeRateToAud ?? undefined,
        status:            "confirmed",
        description:       `REVERSAL: ${original.description ?? ""} — ${reason}`,
        entryDate:         new Date().toISOString().split("T")[0],
        createdBy,
      })
      .returning();

    await db
      .update(accountLedgerEntries)
      .set({ status: "reversed", updatedAt: new Date() })
      .where(eq(accountLedgerEntries.id, originalEntryId));

    return { originalEntryId, reversalEntryId: reversal.id };
  } catch (e: any) {
    console.error("reverseLedgerEntry error:", e.message);
    throw e;
  }
}

export async function getAccountBalance(userId: string) {
  try {
    const rows = await db
      .select({
        entryType: accountLedgerEntries.entryType,
        totalAud:  sql<string>`SUM(aud_equivalent)`,
      })
      .from(accountLedgerEntries)
      .where(
        and(
          eq(accountLedgerEntries.accountId, userId),
          sql`${accountLedgerEntries.status} IN ('pending', 'confirmed')`
        )
      )
      .groupBy(accountLedgerEntries.entryType);

    const credits = rows.find((r) => r.entryType === "credit");
    const debits  = rows.find((r) => r.entryType === "debit");
    const c = parseFloat(credits?.totalAud ?? "0");
    const d = parseFloat(debits?.totalAud  ?? "0");
    return { totalCredits: c, totalDebits: d, netBalance: c - d };
  } catch (e: any) {
    console.error("getAccountBalance error:", e.message);
    throw e;
  }
}

export async function reverseAllPendingForContract(
  contractId: string,
  reason: string,
  createdBy?: string
) {
  try {
    const pending = await db
      .select()
      .from(accountLedgerEntries)
      .where(
        and(
          eq(accountLedgerEntries.contractId, contractId),
          eq(accountLedgerEntries.status, "pending")
        )
      );
    for (const entry of pending) {
      await reverseLedgerEntry(entry.id, reason, createdBy);
    }
    return { reversed: pending.length };
  } catch (e: any) {
    console.error("reverseAllPendingForContract error:", e.message);
    throw e;
  }
}
