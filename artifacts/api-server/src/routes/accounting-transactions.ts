import { Router } from "express";
import { db } from "@workspace/db";
import { transactions, paymentHeaders, journalEntries } from "@workspace/db/schema";
import { eq, ilike, and, desc, SQL, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// ─── LIST ─────────────────────────────────────────────────────────────────────

router.get("/transactions", authenticate, async (req, res) => {
  try {
    const { search, transactionType, status } = req.query as Record<string, string>;
    const page  = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
    const limit = Math.min(100, parseInt((req.query.limit as string) ?? "20", 10));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (req.tenant) conditions.push(eq(transactions.organisationId, req.tenant.id));
    if (status)          conditions.push(eq(transactions.status, status));
    if (transactionType) conditions.push(eq(transactions.transactionType, transactionType));
    if (search)          conditions.push(ilike(transactions.description, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select({
        id:              transactions.id,
        transactionType: transactions.transactionType,
        amount:          transactions.amount,
        creditAmount:    transactions.creditAmount,
        currency:        transactions.currency,
        description:     transactions.description,
        bankReference:   transactions.bankReference,
        transactionDate: transactions.transactionDate,
        invoiceId:       transactions.invoiceId,
        contractId:      transactions.contractId,
        accountId:       transactions.accountId,
        contactId:       transactions.contactId,
        paymentInfoId:   transactions.paymentInfoId,
        costCenterCode:  transactions.costCenterCode,
        status:          transactions.status,
        createdAt:       transactions.createdAt,
        createdBy:       transactions.createdBy,
      })
        .from(transactions)
        .where(where)
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(where),
    ]);

    res.json({ data: rows, meta: { total: countResult[0]?.count ?? 0, page, limit } });
  } catch (err) {
    console.error("[GET /transactions]", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ─── CREATE ───────────────────────────────────────────────────────────────────

router.post("/transactions", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const {
      accountId, contactId, invoiceId, paymentInfoId, costCenterCode,
      transactionType, creditAmount, description,
      currency = "AUD", transactionDate, bankReference,
    } = req.body;

    if (!transactionType) return res.status(400).json({ error: "transactionType is required" });

    const [row] = await db
      .insert(transactions)
      .values({
        transactionType,
        accountId:      accountId  || null,
        contactId:      contactId  || null,
        invoiceId:      invoiceId  || null,
        paymentInfoId:  paymentInfoId || null,
        costCenterCode: costCenterCode || null,
        creditAmount:   creditAmount || null,
        amount:         creditAmount || null,
        currency,
        description,
        bankReference:  bankReference || null,
        transactionDate: transactionDate || null,
        createdBy:      (req as any).user?.id || null,
        status:         "pending",
        organisationId: req.tenant?.id ?? null,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    console.error("[POST /transactions]", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// ─── GET ONE ──────────────────────────────────────────────────────────────────

router.get("/transactions/:id", authenticate, async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, req.params.id as string));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[GET /transactions/:id]", err);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

router.put("/transactions/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const {
      accountId, contactId, invoiceId, paymentInfoId, costCenterCode,
      transactionType, creditAmount, description, currency, transactionDate, bankReference, status,
    } = req.body;

    const [row] = await db
      .update(transactions)
      .set({
        transactionType, accountId, contactId, invoiceId,
        paymentInfoId, costCenterCode, creditAmount,
        amount: creditAmount, description, currency,
        transactionDate, bankReference, status,
      })
      .where(eq(transactions.id, req.params.id as string))
      .returning();

    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("[PUT /transactions/:id]", err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// ─── POST TO JOURNAL ──────────────────────────────────────────────────────────

router.post("/transactions/:id/post", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, req.params.id as string));
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    if (tx.status === "posted") return res.status(400).json({ error: "Already posted to journal" });

    const amount = parseFloat((tx.creditAmount ?? tx.amount) as string ?? "0");
    if (amount <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });

    const coaCode = tx.costCenterCode;
    if (!coaCode) return res.status(400).json({ error: "Cost Center Code is required. Please edit the transaction and set a Cost Center before posting." });

    // credit (IN): DR 1100 operating account / CR costCenterCode (revenue)
    // debit  (OUT): DR costCenterCode (expense) / CR 1100 operating account
    const isCredit = tx.transactionType === "credit";
    const debitCoa  = isCredit ? "1100" : coaCode;
    const creditCoa = isCredit ? coaCode : "1100";
    const entryType = isCredit ? "service_fee" : "cost_payment";
    const today = new Date().toISOString().split("T")[0];
    const userId = (req as any).user?.id ?? "00000000-0000-0000-0000-000000000000";

    const [je] = await db.insert(journalEntries).values({
      entryDate:     tx.transactionDate ?? today,
      debitCoa,
      creditCoa,
      amount:        String(amount.toFixed(2)),
      description:   tx.description ?? `Transaction post: ${tx.transactionType}`,
      entryType,
      invoiceId:     tx.invoiceId ?? null,
      contractId:    tx.contractId ?? null,
      autoGenerated: false,
      createdBy:     userId,
    }).returning();

    const [updated] = await db
      .update(transactions)
      .set({ status: "posted" })
      .where(eq(transactions.id, req.params.id as string))
      .returning();

    res.json({ transaction: updated, journalEntry: je });
  } catch (err) {
    console.error("[POST /transactions/:id/post]", err);
    res.status(500).json({ error: "Failed to post transaction to journal" });
  }
});

// ─── DEACTIVATE (+ cascade void linked payment header) ───────────────────────

router.delete("/transactions/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db
      .update(transactions)
      .set({ status: "Inactive" })
      .where(eq(transactions.id, req.params.id as string))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });

    // Cascade: void the linked payment_header if one exists
    if (row.paymentInfoId) {
      try {
        const [ph] = await db
          .select({ id: paymentHeaders.id, status: paymentHeaders.status })
          .from(paymentHeaders)
          .where(eq(paymentHeaders.id, row.paymentInfoId));
        if (ph && ph.status !== "Void") {
          await db
            .update(paymentHeaders)
            .set({ status: "Void", modifiedOn: new Date() })
            .where(eq(paymentHeaders.id, ph.id));
        }
      } catch (cascadeErr) {
        console.error("[DELETE /transactions/:id] cascade void payment header failed:", cascadeErr);
      }
    }

    res.json(row);
  } catch (err) {
    console.error("[DELETE /transactions/:id]", err);
    res.status(500).json({ error: "Failed to deactivate transaction" });
  }
});

// ─── LOOKUP HELPERS ───────────────────────────────────────────────────────────

router.get("/transactions-lookup/accounts", authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim() ?? "";
    const rows = await db.execute(sql`
      SELECT
        a.id,
        a.name,
        a.account_type    AS "accountType",
        a.email,
        a.phone_number    AS "phone",
        a.country,
        a.primary_contact_id AS "primaryContactId",
        c.first_name || ' ' || c.last_name AS "primaryContactName"
      FROM accounts a
      LEFT JOIN contacts c ON c.id = a.primary_contact_id
      WHERE a.status = 'Active'
        ${q ? sql`AND (a.name ILIKE ${"%" + q + "%"} OR a.email ILIKE ${"%" + q + "%"})` : sql``}
      ORDER BY a.name
      LIMIT 100
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error("[GET /transactions-lookup/accounts]", err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/transactions-lookup/contacts", authenticate, async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, first_name || ' ' || last_name AS name FROM contacts WHERE status = 'Active' ORDER BY first_name LIMIT 200`
    );
    res.json(rows.rows);
  } catch (err) {
    console.error("[GET /transactions-lookup/contacts]", err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/transactions-lookup/invoices", authenticate, async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, invoice_number AS name FROM invoices WHERE status NOT IN ('cancelled','void') ORDER BY invoice_number LIMIT 200`
    );
    res.json(rows.rows);
  } catch (err) {
    console.error("[GET /transactions-lookup/invoices]", err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/transactions-lookup/payment-infos", authenticate, async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, COALESCE(payment_ref, id::text) AS name FROM payment_headers WHERE status = 'Active' ORDER BY payment_date DESC LIMIT 200`
    );
    res.json(rows.rows);
  } catch (err) {
    console.error("[GET /transactions-lookup/payment-infos]", err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/transactions-lookup/cost-centers", authenticate, async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT code AS id, code || ' — ' || name AS name FROM chart_of_accounts WHERE is_active = true ORDER BY code LIMIT 200`
    );
    res.json(rows.rows);
  } catch (err) {
    console.error("[GET /transactions-lookup/cost-centers]", err);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
