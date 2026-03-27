import { Router } from "express";
import { db } from "@workspace/db";
import {
  taxInvoices, accounts, contractProducts, contracts, organisations,
} from "@workspace/db/schema";
import { eq, desc, and, ilike, or, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  sendTaxInvoiceByEmail,
  buildInvoiceRef,
  calculateGst,
} from "../services/taxInvoiceService.js";
import { renderTaxInvoicePdf } from "../services/taxInvoicePdfService.js";
import fs from "fs";
import path from "path";

const router  = Router();
const STAFF   = ["super_admin", "admin", "camp_coordinator"];
const ADMIN   = ["super_admin", "admin"];

function pdfStoragePath(invoiceRef: string): string {
  const dir = path.join(process.cwd(), "generated_pdfs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${invoiceRef}.pdf`);
}

// ─── GET /api/tax-invoices ────────────────────────────────────────────────
router.get(
  "/tax-invoices",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const { type, status, contractId } = req.query as Record<string, string>;
      const conds: SQL[] = [];
      if (type)       conds.push(eq(taxInvoices.invoiceType, type));
      if (status)     conds.push(eq(taxInvoices.status, status));
      if (contractId) conds.push(eq(taxInvoices.contractId, contractId));

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
          schoolEmail:      accounts.email,
          courseStartDate:  taxInvoices.courseStartDate,
          courseEndDate:    taxInvoices.courseEndDate,
          contractProductId: taxInvoices.contractProductId,
          contractId:       taxInvoices.contractId,
          schoolAccountId:  taxInvoices.schoolAccountId,
          paymentHeaderId:  taxInvoices.paymentHeaderId,
          createdOn:        taxInvoices.createdOn,
          pdfUrl:           taxInvoices.pdfUrl,
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

// ─── GET /api/tax-invoices/contract-products/search ──────────────────────
// Search contract products for the New Tax Invoice picker
router.get(
  "/tax-invoices/contract-products/search",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim();
      const conds: SQL[] = [];
      if (q) {
        conds.push(
          or(
            ilike(contracts.studentName, `%${q}%`),
            ilike(contracts.contractNumber, `%${q}%`),
            ilike(contractProducts.name, `%${q}%`)
          ) as SQL
        );
      }

      const rows = await db
        .select({
          id:               contractProducts.id,
          name:             contractProducts.name,
          commissionAmount: contractProducts.commissionAmount,
          remittanceMethod: contractProducts.remittanceMethod,
          isGstFree:        contractProducts.isGstFree,
          contractId:       contractProducts.contractId,
          studentName:      contracts.studentName,
          contractNumber:   contracts.contractNumber,
          courseStartDate:  contracts.courseStartDate,
          courseEndDate:    contracts.courseEndDate,
        })
        .from(contractProducts)
        .innerJoin(contracts, eq(contractProducts.contractId, contracts.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(contracts.createdAt))
        .limit(50);

      return res.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/tax-invoices/contract-products/search]", err);
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

// ─── POST /api/tax-invoices ───────────────────────────────────────────────
// Manual creation of a tax invoice
router.post(
  "/tax-invoices",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      const {
        contractProductId,
        schoolAccountId,
        invoiceType,
        commissionAmount: rawCommission,
        isGstFree: rawGstFree,
        dueDate,
      } = req.body as {
        contractProductId: string;
        schoolAccountId: string;
        invoiceType: "net" | "gross";
        commissionAmount: number | string;
        isGstFree?: boolean;
        dueDate?: string;
      };

      if (!contractProductId || !schoolAccountId || !invoiceType) {
        return res.status(400).json({ error: "contractProductId, schoolAccountId, invoiceType are required" });
      }

      // Load contract product
      const [cp] = await db
        .select({
          id:         contractProducts.id,
          contractId: contractProducts.contractId,
          name:       contractProducts.name,
          isGstFree:  contractProducts.isGstFree,
        })
        .from(contractProducts)
        .where(eq(contractProducts.id, contractProductId))
        .limit(1);

      if (!cp) return res.status(404).json({ error: "Contract product not found" });

      // Load contract
      const [ctr] = await db
        .select({
          studentName:     contracts.studentName,
          courseStartDate: contracts.courseStartDate,
          courseEndDate:   contracts.courseEndDate,
          contractNumber:  contracts.contractNumber,
        })
        .from(contracts)
        .where(eq(contracts.id, cp.contractId!))
        .limit(1);

      if (!ctr) return res.status(404).json({ error: "Contract not found" });

      // Load school account
      const [school] = await db
        .select({ id: accounts.id, name: accounts.name, email: accounts.email, address: accounts.address })
        .from(accounts)
        .where(eq(accounts.id, schoolAccountId))
        .limit(1);

      if (!school) return res.status(404).json({ error: "School account not found" });

      // Load org info
      const [org] = await db.select().from(organisations).limit(1);

      // Calculate amounts
      const commissionAmt = parseFloat(String(rawCommission ?? "0"));
      const gstFree = rawGstFree ?? cp.isGstFree ?? false;
      const gstAmt   = calculateGst(commissionAmt, gstFree);
      const totalAmt = parseFloat((commissionAmt + gstAmt).toFixed(2));

      const today      = new Date().toISOString().slice(0, 10);
      const invoiceRef = await buildInvoiceRef();

      // Insert
      const [inv] = await db
        .insert(taxInvoices)
        .values({
          invoiceRef,
          invoiceDate:       today,
          invoiceType,
          contractProductId,
          contractId:        cp.contractId!,
          schoolAccountId,
          programName:       cp.name ?? "Education Program",
          studentName:       ctr.studentName ?? "Student",
          courseStartDate:   ctr.courseStartDate ?? null,
          courseEndDate:     ctr.courseEndDate ?? null,
          commissionAmount:  String(commissionAmt.toFixed(2)),
          gstAmount:         String(gstAmt.toFixed(2)),
          totalAmount:       String(totalAmt.toFixed(2)),
          isGstFree:         gstFree,
          status:            "draft",
          dueDate:           dueDate ?? null,
          createdBy:         (req as any).user?.id,
        })
        .returning();

      // Try to generate PDF (non-blocking — ignore failure)
      try {
        const pdfData = {
          invoiceRef,
          invoiceDate:       today,
          invoiceType,
          contractProductId,
          contractId:        cp.contractId!,
          schoolAccountId,
          programName:       cp.name ?? "Education Program",
          studentName:       ctr.studentName ?? "Student",
          courseStartDate:   ctr.courseStartDate ?? null,
          courseEndDate:     ctr.courseEndDate ?? null,
          commissionAmount:  String(commissionAmt.toFixed(2)),
          gstAmount:         String(gstAmt.toFixed(2)),
          totalAmount:       String(totalAmt.toFixed(2)),
          isGstFree:         gstFree,
          agencyName:        org?.name ?? "Edubee Camp",
          agencyAbn:         org?.abn ?? null,
          agencyAbnName:     org?.abnName ?? null,
          agencyAddress:     org?.address ?? null,
          agencyBankDetails: org?.bankAccountDetails ?? null,
          schoolName:        school.name,
          schoolAddress:     school.address ?? null,
          bankReference:     null,
          apPaidDate:        null,
          status:            "draft",
          dueDate:           dueDate ?? null,
          createdBy:         (req as any).user?.id,
          paymentHeaderId:   null,
        };
        const pdfBuffer = await renderTaxInvoicePdf(pdfData);
        const pdfPath   = pdfStoragePath(invoiceRef);
        fs.writeFileSync(pdfPath, pdfBuffer);
        await db.update(taxInvoices)
          .set({ pdfUrl: pdfPath })
          .where(eq(taxInvoices.id, inv.id));
        inv.pdfUrl = pdfPath;
      } catch (pdfErr) {
        console.warn("[POST /api/tax-invoices] PDF generation skipped:", pdfErr);
      }

      return res.status(201).json({ data: { ...inv, schoolName: school.name } });
    } catch (err) {
      console.error("[POST /api/tax-invoices]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/tax-invoices/:id ────────────────────────────────────────────
router.get(
  "/tax-invoices/:id",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const [row] = await db
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
          schoolEmail:      accounts.email,
          courseStartDate:  taxInvoices.courseStartDate,
          courseEndDate:    taxInvoices.courseEndDate,
          contractProductId: taxInvoices.contractProductId,
          contractId:       taxInvoices.contractId,
          schoolAccountId:  taxInvoices.schoolAccountId,
          paymentHeaderId:  taxInvoices.paymentHeaderId,
          pdfUrl:           taxInvoices.pdfUrl,
          createdOn:        taxInvoices.createdOn,
        })
        .from(taxInvoices)
        .leftJoin(accounts, eq(taxInvoices.schoolAccountId, accounts.id))
        .where(eq(taxInvoices.id, req.params.id))
        .limit(1);

      if (!row) return res.status(404).json({ error: "Not found" });

      // Also fetch contract number
      let contractNumber: string | null = null;
      if (row.contractId) {
        const [c] = await db
          .select({ contractNumber: contracts.contractNumber })
          .from(contracts)
          .where(eq(contracts.id, row.contractId))
          .limit(1);
        contractNumber = c?.contractNumber ?? null;
      }

      return res.json({ data: { ...row, contractNumber } });
    } catch (err) {
      console.error("[GET /api/tax-invoices/:id]", err);
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

// ─── PATCH /api/tax-invoices/:id ─────────────────────────────────────────────
router.patch(
  "/tax-invoices/:id",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      const { status, dueDate } = req.body as { status?: string; dueDate?: string | null };
      const now = new Date();
      const updatePayload: Record<string, unknown> = { modifiedOn: now };
      if (status !== undefined) updatePayload.status = status;
      if (dueDate !== undefined) updatePayload.dueDate = dueDate ? new Date(dueDate) : null;

      const [updated] = await db
        .update(taxInvoices)
        .set(updatePayload)
        .where(eq(taxInvoices.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Tax invoice not found" });

      return res.json({ data: updated });
    } catch (err) {
      console.error("[PATCH /api/tax-invoices/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
