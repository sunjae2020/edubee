import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoices, taxInvoices, contracts, users, contractProducts, accounts,
} from "@workspace/db/schema";
import { eq, desc, and, ilike, count } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF = ["super_admin", "admin", "camp_coordinator"];
const ADMIN = ["super_admin", "admin"];

// ─── GET /invoices/health (Debug route) ────────────────────────────────
router.get("/health", (req, res) => {
  res.json({ status: "invoices router loaded", timestamp: new Date().toISOString() });
});

// ─── GET / (Unified List with filtering + pagination) ────────────────────────────────────
router.get(
  "/",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const { invoiceType, status, search } = req.query as Record<string, string>;
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions: any[] = [];
      if (req.tenant) conditions.push(eq(invoices.organisationId, req.tenant.id));
      if (invoiceType) {
        conditions.push(eq(invoices.invoiceType, invoiceType));
      }
      if (status) {
        conditions.push(eq(invoices.status, status));
      }
      if (search) {
        conditions.push(ilike(invoices.invoiceNumber, `%${search}%`));
      }

      const baseQuery = conditions.length > 0 ? and(...conditions) : undefined;

      // Run queries
      const [rows, [countResult]] = await Promise.all([
        baseQuery
          ? db.select().from(invoices).where(baseQuery).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset)
          : db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset),
        baseQuery
          ? db.select({ count: count() }).from(invoices).where(baseQuery)
          : db.select({ count: count() }).from(invoices),
      ]);

      const total = Number(countResult.count);

      return res.json({
        data: rows,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error("[GET /invoices] error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ error: "Internal Server Error", details: String(err) });
    }
  }
);

// ─── GET /:id (Detail) ──────────────────────────────────────
router.get(
  "/:id",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const [invoice] = await db.select().from(invoices)
        .where(eq(invoices.id, req.params.id)).limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      return res.json(invoice);
    } catch (err) {
      console.error("GET /invoices/:id error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── POST / (Create) ─────────────────────────────────────────
router.post(
  "/",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const {
        invoiceNumber,
        invoiceRef,
        invoiceType,
        contractId,
        recipientId,
        totalAmount,
        taxAmount,
        subtotal,
        status,
        issuedAt,
        dueDate,
        notes,
        // Tax invoice specific fields
        schoolAccountId,
        studentAccountId,
        programName,
        studentName,
        courseStartDate,
        courseEndDate,
        isGstFree,
        pdfUrl,
        sentToEmail,
        contractProductId,
        createdBy,
        lineItems,
        currency,
      } = req.body;

      const [newInvoice] = await db.insert(invoices).values({
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        invoiceRef,
        invoiceType,
        contractId,
        recipientId,
        totalAmount,
        taxAmount,
        subtotal,
        status: status || "draft",
        issuedAt: issuedAt ? new Date(issuedAt) : undefined,
        dueDate,
        notes,
        schoolAccountId,
        studentAccountId,
        programName,
        studentName,
        courseStartDate,
        courseEndDate,
        isGstFree: isGstFree ?? false,
        pdfUrl,
        sentToEmail,
        contractProductId,
        createdBy: createdBy || req.user?.id,
        lineItems,
        currency: currency || "AUD",
        createdAt: new Date(),
        updatedAt: new Date(),
        organisationId: req.tenant?.id ?? null,
      }).returning();

      return res.status(201).json(newInvoice);
    } catch (err) {
      console.error("POST /invoices error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ error: "Internal Server Error", details: String(err) });
    }
  }
);

// ─── PUT /:id (Update) ──────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const [existing] = await db.select().from(invoices)
        .where(eq(invoices.id, req.params.id)).limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const updates = { ...req.body, updatedAt: new Date() };
      const [updated] = await db.update(invoices)
        .set(updates)
        .where(eq(invoices.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("PUT /invoices/:id error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── DELETE /:id ────────────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const [existing] = await db.select().from(invoices)
        .where(eq(invoices.id, req.params.id)).limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      await db.delete(invoices)
        .where(eq(invoices.id, req.params.id));

      return res.json({ message: "Invoice deleted" });
    } catch (err) {
      console.error("DELETE /invoices/:id error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
