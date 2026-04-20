import { Router } from "express";
import { db } from "@workspace/db";
import { transactions, paymentHeaders } from "@workspace/db/schema";
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
        status:         "Active",
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

router.get("/transactions-lookup/accounts", authenticate, async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, name FROM accounts WHERE status = 'Active' ORDER BY name LIMIT 200`
    );
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
