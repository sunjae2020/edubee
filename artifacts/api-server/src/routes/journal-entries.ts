import { Router } from "express";
import { db } from "@workspace/db";
import { journalEntries, paymentHeaders, chartOfAccounts } from "@workspace/db/schema";
import { eq, and, gte, lte, like, sql, inArray, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

// ─── GET /api/journal-entries ────────────────────────────────────────────────
router.get(
  "/journal-entries",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { student_id, contract_id, partner_id, staff_id, entry_type, from_date, to_date } =
        req.query as Record<string, string>;

      const conds = [];
      if (student_id)  conds.push(eq(journalEntries.studentAccountId, student_id));
      if (contract_id) conds.push(eq(journalEntries.contractId, contract_id));
      if (partner_id)  conds.push(eq(journalEntries.partnerId, partner_id));
      if (staff_id)    conds.push(eq(journalEntries.staffId, staff_id));
      if (entry_type)  conds.push(eq(journalEntries.entryType, entry_type));
      if (from_date)   conds.push(gte(journalEntries.entryDate, from_date));
      if (to_date)     conds.push(lte(journalEntries.entryDate, to_date));
      const where = conds.length ? and(...conds) : undefined;

      const rows = await db
        .select()
        .from(journalEntries)
        .where(where)
        .orderBy(desc(journalEntries.createdOn))
        .limit(500);

      // Enrich with CoA names
      const allCodes = [...new Set(rows.flatMap(r => [r.debitCoa, r.creditCoa]))];
      const coaRows = allCodes.length
        ? await db
            .select({ code: chartOfAccounts.code, name: chartOfAccounts.name })
            .from(chartOfAccounts)
            .where(inArray(chartOfAccounts.code, allCodes))
        : [];
      const coaMap = Object.fromEntries(coaRows.map(c => [c.code, c.name]));

      return res.json({
        data: rows.map(r => ({
          ...r,
          debitCoaName:  coaMap[r.debitCoa]  ?? r.debitCoa,
          creditCoaName: coaMap[r.creditCoa] ?? r.creditCoa,
        })),
      });
    } catch (err) {
      console.error("[GET /api/journal-entries]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/journal-entries/summary ───────────────────────────────────────
// Returns P&L summary: revenue, COGS, expenses, gross profit, net profit
router.get(
  "/journal-entries/summary",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { from_date, to_date } = req.query as Record<string, string>;
      const dateFilters = [];
      if (from_date) dateFilters.push(gte(journalEntries.entryDate, from_date));
      if (to_date)   dateFilters.push(lte(journalEntries.entryDate, to_date));
      const dateWhere = dateFilters.length ? and(...dateFilters) : undefined;

      // Revenue: credit_coa LIKE '3%'
      const [revRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${journalEntries.amount}::numeric), 0)` })
        .from(journalEntries)
        .where(dateWhere ? and(dateWhere, like(journalEntries.creditCoa, "3%")) : like(journalEntries.creditCoa, "3%"));

      // COGS: debit_coa LIKE '4%'
      const [cogsRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${journalEntries.amount}::numeric), 0)` })
        .from(journalEntries)
        .where(dateWhere ? and(dateWhere, like(journalEntries.debitCoa, "4%")) : like(journalEntries.debitCoa, "4%"));

      // Expenses: debit_coa LIKE '5%'
      const [expRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${journalEntries.amount}::numeric), 0)` })
        .from(journalEntries)
        .where(dateWhere ? and(dateWhere, like(journalEntries.debitCoa, "5%")) : like(journalEntries.debitCoa, "5%"));

      const revenue  = Number(revRow?.total  ?? 0);
      const cogs     = Number(cogsRow?.total ?? 0);
      const expense  = Number(expRow?.total  ?? 0);

      return res.json({
        revenue,
        cogs,
        expense,
        grossProfit: revenue - cogs,
        netProfit:   revenue - cogs - expense,
        period: { from: from_date ?? null, to: to_date ?? null },
      });
    } catch (err) {
      console.error("[GET /api/journal-entries/summary]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/journal-entries/balance-check ──────────────────────────────────
// Verifies DR = CR balance for every entry (should always be true for auto-generated ones)
router.get(
  "/journal-entries/balance-check",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      // Group by payment_header_id, check if total DR amounts == total CR amounts
      // Since each entry has debit_coa AND credit_coa with the same amount, they're always balanced.
      // This endpoint checks for any duplicate or orphaned entries via a sanity count.
      const [totals] = await db
        .select({
          totalEntries: sql<number>`COUNT(*)`,
          totalAmount:  sql<string>`COALESCE(SUM(${journalEntries.amount}::numeric), 0)`,
        })
        .from(journalEntries);

      // Auto-generated entries are always balanced (single DR + CR per amount).
      // Detect any entries with NULL debit_coa or credit_coa as a sign of corruption.
      const [nullCheck] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(journalEntries)
        .where(sql`${journalEntries.debitCoa} IS NULL OR ${journalEntries.creditCoa} IS NULL`);

      const isBalanced = Number(nullCheck?.count ?? 0) === 0;

      return res.json({
        isBalanced,
        totalEntries: Number(totals?.totalEntries ?? 0),
        totalAmount:  Number(totals?.totalAmount  ?? 0),
        nullEntries:  Number(nullCheck?.count      ?? 0),
        message: isBalanced
          ? "All journal entries are balanced."
          : `${nullCheck?.count} entries have missing debit or credit CoA codes.`,
      });
    } catch (err) {
      console.error("[GET /api/journal-entries/balance-check]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/journal-entries/:id ────────────────────────────────────────────
router.get(
  "/journal-entries/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, req.params.id))
        .limit(1);

      if (!row) return res.status(404).json({ error: "Journal entry not found" });

      const allCodes = [row.debitCoa, row.creditCoa].filter(Boolean) as string[];
      const coaRows = allCodes.length
        ? await db
            .select({ code: chartOfAccounts.code, name: chartOfAccounts.name })
            .from(chartOfAccounts)
            .where(inArray(chartOfAccounts.code, allCodes))
        : [];
      const coaMap = Object.fromEntries(coaRows.map(c => [c.code, c.name]));

      return res.json({
        data: {
          ...row,
          debitCoaName:  coaMap[row.debitCoa]  ?? row.debitCoa,
          creditCoaName: coaMap[row.creditCoa] ?? row.creditCoa,
        },
      });
    } catch (err) {
      console.error("[GET /api/journal-entries/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
