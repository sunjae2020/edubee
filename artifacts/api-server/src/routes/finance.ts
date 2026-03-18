import { Router } from "express";
import { db } from "@workspace/db";
import { invoices, transactions, exchangeRates, receipts } from "@workspace/db/schema";
import { eq, and, count, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${random}`;
}

// Invoices
router.get("/invoices", authenticate, async (req, res) => {
  try {
    const { contractId, status, invoiceType, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (contractId) conditions.push(eq(invoices.contractId, contractId));
    if (status) conditions.push(eq(invoices.status, status));
    if (invoiceType) conditions.push(eq(invoices.invoiceType, invoiceType));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(invoices).where(whereClause);
    const data = await db.select().from(invoices).where(whereClause).limit(limitNum).offset(offset).orderBy(invoices.createdAt);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/invoices", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const body = req.body;
    body.invoiceNumber = generateInvoiceNumber();
    body.createdBy = req.user!.id;
    const [invoice] = await db.insert(invoices).values(body).returning();
    return res.status(201).json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invoices/:id", authenticate, async (req, res) => {
  try {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, req.params.id)).limit(1);
    if (!invoice) return res.status(404).json({ error: "Not Found" });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/invoices/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [invoice] = await db.update(invoices).set({ ...req.body, updatedAt: new Date() })
      .where(eq(invoices.id, req.params.id)).returning();
    if (!invoice) return res.status(404).json({ error: "Not Found" });
    return res.json(invoice);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Transactions
router.get("/transactions", authenticate, async (req, res) => {
  try {
    const { contractId, invoiceId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (contractId) conditions.push(eq(transactions.contractId, contractId));
    if (invoiceId) conditions.push(eq(transactions.invoiceId, invoiceId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(transactions).where(whereClause);
    const data = await db.select().from(transactions).where(whereClause).limit(limitNum).offset(offset).orderBy(transactions.createdAt);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/transactions", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const body = { ...req.body, createdBy: req.user!.id };
    const [transaction] = await db.insert(transactions).values(body).returning();
    return res.status(201).json(transaction);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Exchange Rates
router.get("/exchange-rates", authenticate, async (req, res) => {
  try {
    const data = await db.select().from(exchangeRates).orderBy(exchangeRates.effectiveDate);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/exchange-rates", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const body = { ...req.body, createdBy: req.user!.id };
    const [rate] = await db.insert(exchangeRates).values(body).returning();
    return res.status(201).json(rate);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Receipts ─────────────────────────────────────────────────
router.get("/receipts", authenticate, async (req, res) => {
  try {
    const { invoiceId, status } = req.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (invoiceId) conditions.push(eq(receipts.invoiceId, invoiceId));
    if (status) conditions.push(eq(receipts.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const data = await db.select().from(receipts).where(whereClause).orderBy(receipts.createdAt);
    return res.json({ data, total: data.length });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/receipts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    function generateReceiptNumber() {
      const now = new Date();
      return `RCP-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
    }
    const body = { ...req.body, receiptNumber: req.body.receiptNumber || generateReceiptNumber(), createdBy: req.user!.id };
    const [receipt] = await db.insert(receipts).values(body).returning();
    return res.status(201).json(receipt);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

