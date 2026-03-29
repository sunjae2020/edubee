import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoices, taxInvoices, contracts, users, contractProducts, accounts,
} from "@workspace/db/schema";
import { eq, desc, and, or, ilike, SQL, inArray } from "drizzle-orm";
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
      const { type, status, contractId, invoiceType } = req.query as Record<string, string>;
      const conds: SQL[] = [];

      if (type) conds.push(eq(invoices.invoiceType, type));
      if (status) conds.push(eq(invoices.status, status));
      if (contractId) conds.push(eq(invoices.contractId, contractId));
      if (invoiceType) conds.push(eq(invoices.invoiceType, invoiceType));

      const whereClause = conds.length > 0 
        ? conds.length === 1 
          ? conds[0] 
          : and(...conds)
        : undefined;

      // Get invoices from main invoices table
      let query = db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceRef: invoices.invoiceRef,
        invoiceType: invoices.invoiceType,
        contractId: invoices.contractId,
        recipientId: invoices.recipientId,
        totalAmount: invoices.totalAmount,
        gstAmount: invoices.gstAmount,
        status: invoices.status,
        issuedAt: invoices.issuedAt,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        programName: invoices.programName,
        studentName: invoices.studentName,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
        .from(invoices);

      if (whereClause) {
        query = query.where(whereClause);
      }

      let rows = await query.orderBy(desc(invoices.createdAt));

      // Fallback: If invoices table is empty, read from tax_invoices for backward compatibility
      if (rows.length === 0) {
        const taxConds: SQL[] = [];
        if (type || invoiceType) taxConds.push(eq(taxInvoices.invoiceType, type || invoiceType));
        if (status) taxConds.push(eq(taxInvoices.status, status));
        if (contractId) taxConds.push(eq(taxInvoices.contractId, contractId));

        const taxWhere = taxConds.length > 0
          ? taxConds.length === 1
            ? taxConds[0]
            : and(...taxConds)
          : undefined;

        const taxRows = await db.select({
          id: taxInvoices.id,
          invoiceNumber: taxInvoices.invoiceRef,
          invoiceRef: taxInvoices.invoiceRef,
          invoiceType: taxInvoices.invoiceType,
          contractId: taxInvoices.contractId,
          recipientId: null,
          totalAmount: taxInvoices.totalAmount,
          gstAmount: taxInvoices.gstAmount,
          status: taxInvoices.status,
          issuedAt: taxInvoices.invoiceDate,
          dueDate: taxInvoices.dueDate,
          paidAt: taxInvoices.paidAt,
          programName: taxInvoices.programName,
          studentName: taxInvoices.studentName,
          createdAt: taxInvoices.createdOn,
          updatedAt: taxInvoices.modifiedOn,
        })
          .from(taxInvoices)
          .where(taxWhere)
          .orderBy(desc(taxInvoices.createdOn));

        rows = taxRows as any;
      }

      return res.json({
        data: rows,
        total: rows.length,
      });
    } catch (err) {
      console.error("GET /invoices error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
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
  "/invoices",
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
        gstAmount,
        status: status || "draft",
        issuedAt,
        dueDate,
        notes,
        schoolAccountId,
        studentAccountId,
        programName,
        studentName,
        courseStartDate,
        courseEndDate,
        isGstFree,
        pdfUrl,
        sentToEmail,
        createdBy: createdBy || req.user?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // If it's a tax invoice, also create a tax invoice record
      if (invoiceType === "tax_invoice" && contractProductId) {
        const [taxInv] = await db.insert(taxInvoices).values({
          invoiceId: newInvoice.id,
          invoiceRef: invoiceRef || `TAX-${Date.now()}`,
          invoiceDate: new Date(),
          invoiceType,
          contractProductId,
          contractId,
          schoolAccountId,
          studentAccountId,
          programName,
          studentName,
          courseStartDate,
          courseEndDate,
          gstAmount,
          totalAmount,
          isGstFree,
          status: status || "draft",
          dueDate,
          pdfUrl,
          sentToEmail,
          createdBy: createdBy || req.user?.id,
          createdOn: new Date(),
          modifiedOn: new Date(),
        }).returning();

        return res.status(201).json({
          invoice: newInvoice,
          taxInvoice: taxInv,
        });
      }

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
