import { Router } from "express";
import { db } from "@workspace/db";
import { taxInvoices, accounts, contractProducts, contracts } from "@workspace/db/schema";
import { eq, desc, and, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendTaxInvoiceByEmail } from "../services/taxInvoiceService.js";
import fs from "fs";

const router  = Router();
const STAFF   = ["super_admin", "admin", "camp_coordinator"];
const ADMIN   = ["super_admin", "admin"];

// ─── GET /api/tax-invoices ────────────────────────────────────────────────
router.get(
  "/tax-invoices",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const { type, status } = req.query as Record<string, string>;
      const conds: SQL[] = [];
      if (type)   conds.push(eq(taxInvoices.invoiceType, type));
      if (status) conds.push(eq(taxInvoices.status, status));

      const rows = await db
        .select({
          id:               taxInvoices.id,
          invoiceRef:       taxInvoices.invoiceRef,
          invoiceDate:      taxInvoices.invoiceDate,
          invoiceType:      taxInvoices.invoiceType,
          programName:      taxInvoices.programName,
          studentName:      taxInvoices.studentName,
          commissionAmount: taxInvoices.commissionAmount,
          gstAmount:        taxInvoices.gstAmount,
          totalAmount:      taxInvoices.totalAmount,
          isGstFree:        taxInvoices.isGstFree,
          status:           taxInvoices.status,
          sentAt:           taxInvoices.sentAt,
          sentToEmail:      taxInvoices.sentToEmail,
          dueDate:          taxInvoices.dueDate,
          paidAt:           taxInvoices.paidAt,
          schoolName:       accounts.name,
          courseStartDate:  taxInvoices.courseStartDate,
          courseEndDate:    taxInvoices.courseEndDate,
          contractProductId: taxInvoices.contractProductId,
          paymentHeaderId:  taxInvoices.paymentHeaderId,
          createdOn:        taxInvoices.createdOn,
        })
        .from(taxInvoices)
        .leftJoin(accounts, eq(taxInvoices.schoolAccountId, accounts.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(taxInvoices.createdOn))
        .limit(500);

      return res.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/tax-invoices]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/tax-invoices/by-contract-product/:cpId ─────────────────────
router.get(
  "/tax-invoices/by-contract-product/:cpId",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const rows = await db
        .select()
        .from(taxInvoices)
        .where(eq(taxInvoices.contractProductId, req.params.cpId))
        .orderBy(desc(taxInvoices.createdOn));
      return res.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/tax-invoices/by-contract-product]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/tax-invoices/:id/pdf ────────────────────────────────────────
router.get(
  "/tax-invoices/:id/pdf",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const [inv] = await db
        .select({ pdfUrl: taxInvoices.pdfUrl, invoiceRef: taxInvoices.invoiceRef })
        .from(taxInvoices)
        .where(eq(taxInvoices.id, req.params.id))
        .limit(1);

      if (!inv || !inv.pdfUrl || !fs.existsSync(inv.pdfUrl)) {
        return res.status(404).json({ error: "PDF not found" });
      }

      const pdfBuffer = fs.readFileSync(inv.pdfUrl);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${inv.invoiceRef}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error("[GET /api/tax-invoices/:id/pdf]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/tax-invoices/:id/send ─────────────────────────────────────
router.post(
  "/tax-invoices/:id/send",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const [inv] = await db
        .select({
          id:          taxInvoices.id,
          invoiceRef:  taxInvoices.invoiceRef,
          pdfUrl:      taxInvoices.pdfUrl,
          schoolAccountId: taxInvoices.schoolAccountId,
          sentToEmail: taxInvoices.sentToEmail,
        })
        .from(taxInvoices)
        .where(eq(taxInvoices.id, req.params.id))
        .limit(1);

      if (!inv) return res.status(404).json({ error: "Tax invoice not found" });

      const [school] = await db
        .select({ name: accounts.name, email: accounts.email })
        .from(accounts)
        .where(eq(accounts.id, inv.schoolAccountId))
        .limit(1);

      const toEmail = req.body.email ?? school?.email ?? inv.sentToEmail;
      if (!toEmail) return res.status(400).json({ error: "No email address available" });

      await sendTaxInvoiceByEmail(
        inv.id,
        toEmail,
        null,
        inv.invoiceRef,
        school?.name ?? "School"
      );

      return res.json({ success: true, sentTo: toEmail });
    } catch (err) {
      console.error("[POST /api/tax-invoices/:id/send]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/tax-invoices/:id/mark-paid ────────────────────────────────
router.post(
  "/tax-invoices/:id/mark-paid",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const [inv] = await db
        .select({ id: taxInvoices.id, invoiceType: taxInvoices.invoiceType, contractProductId: taxInvoices.contractProductId })
        .from(taxInvoices)
        .where(eq(taxInvoices.id, req.params.id))
        .limit(1);

      if (!inv) return res.status(404).json({ error: "Tax invoice not found" });

      const now = new Date();
      await db.update(taxInvoices)
        .set({ status: "paid", paidAt: now, modifiedOn: now })
        .where(eq(taxInvoices.id, inv.id));

      if (inv.invoiceType === "gross") {
        await db.update(contractProducts)
          .set({ commissionArStatus: "received" })
          .where(eq(contractProducts.id, inv.contractProductId));
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("[POST /api/tax-invoices/:id/mark-paid]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
