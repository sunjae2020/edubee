import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoices, taxInvoices, contracts, users, contractProducts, accounts,
} from "@workspace/db/schema";
import { eq, desc, and, or, ilike, SQL, inArray, count } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF = ["super_admin", "admin", "camp_coordinator"];
const ADMIN = ["super_admin", "admin"];

// ─── GET /invoices/health (Debug route) ────────────────────────────────
router.get("/health", (req, res) => {
  res.json({ status: "invoices router loaded", timestamp: new Date().toISOString() });
});

// ─── GET / (Unified List) ────────────────────────────────────
router.get(
  "/",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      console.log("[GET /invoices] Request received");
      
      const rows = await db.select().from(invoices);
      console.log("[GET /invoices] Fetched rows:", rows.length);
      
      return res.json({
        data: rows,
        total: rows.length,
      });
    } catch (err) {
      console.error("[GET /invoices] Caught error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ error: "Internal Server Error", details: String(err) });
    }
  }
);

// ─── GET /api/invoices/:id (Detail) ──────────────────────────────────────
router.get(
  "/invoices/:id",
  authenticate,
  async (req, res) => {
    try {
      const [invoice] = await db.select().from(invoices)
        .where(eq(invoices.id, req.params.id)).limit(1);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // If it's a tax invoice, join with tax_invoices table
      let enriched = invoice;
      if (invoice.invoiceType === "tax_invoice" && invoice.invoiceRef) {
        const [taxInv] = await db.select().from(taxInvoices)
          .where(eq(taxInvoices.invoiceRef, invoice.invoiceRef)).limit(1);
        
        if (taxInv) {
          enriched = { ...invoice, ...taxInv };
        }
      }

      return res.json(enriched);
    } catch (err) {
      console.error("GET /invoices/:id error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── POST /api/invoices (Create) ─────────────────────────────────────────
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
        gstAmount,
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
      } = req.body;

      // Create invoice record in invoices table
      const [newInvoice] = await db.insert(invoices).values({
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        invoiceRef,
        invoiceType,
        contractId,
        recipientId,
        totalAmount,
        taxAmount: gstAmount || taxAmount,
        status: status || "draft",
        issuedAt,
        dueDate,
        notes,
        createdBy: createdBy || req.user?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return res.status(201).json(newInvoice);
    } catch (err) {
      console.error("POST /invoices error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── PUT /api/invoices/:id (Update) ──────────────────────────────────────
router.put(
  "/invoices/:id",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const [existing] = await db.select().from(invoices)
        .where(eq(invoices.id, req.params.id)).limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const updates = req.body;
      const [updated] = await db.update(invoices)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, req.params.id))
        .returning();

      // If it's a tax invoice and we're updating tax-specific fields, also update tax_invoices
      if (existing.invoiceType === "tax_invoice" && existing.invoiceRef) {
        const taxUpdates: any = {};
        if (updates.gstAmount !== undefined) taxUpdates.gstAmount = updates.gstAmount;
        if (updates.totalAmount !== undefined) taxUpdates.totalAmount = updates.totalAmount;
        if (updates.status !== undefined) taxUpdates.status = updates.status;
        if (updates.pdfUrl !== undefined) taxUpdates.pdfUrl = updates.pdfUrl;
        if (updates.sentToEmail !== undefined) taxUpdates.sentToEmail = updates.sentToEmail;
        if (updates.sentAt !== undefined) taxUpdates.sentAt = updates.sentAt;

        if (Object.keys(taxUpdates).length > 0) {
          taxUpdates.modifiedOn = new Date();
          await db.update(taxInvoices)
            .set(taxUpdates)
            .where(eq(taxInvoices.invoiceRef, existing.invoiceRef));
        }
      }

      return res.json(updated);
    } catch (err) {
      console.error("PUT /invoices/:id error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ─── DELETE /api/invoices/:id ────────────────────────────────────────────
router.delete(
  "/invoices/:id",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const [existing] = await db.select().from(invoices)
        .where(eq(invoices.id, req.params.id)).limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // If it's a tax invoice, delete the tax invoice record too
      if (existing.invoiceType === "tax_invoice" && existing.invoiceRef) {
        await db.delete(taxInvoices)
          .where(eq(taxInvoices.invoiceRef, existing.invoiceRef));
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
