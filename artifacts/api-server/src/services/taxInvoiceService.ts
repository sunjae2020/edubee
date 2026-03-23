import { db } from "@workspace/db";
import {
  taxInvoices,
  contractProducts,
  contracts,
  accounts,
  journalEntries,
  paymentHeaders,
  organisations,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { renderTaxInvoicePdf } from "./taxInvoicePdfService.js";
import { sendMail } from "../mailer.js";
import path from "path";
import fs from "fs";

// ── Invoice reference generator ─────────────────────────────────────────────
export async function buildInvoiceRef(): Promise<string> {
  const [{ n }] = await db.execute(
    sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM tax_invoices`
  ) as any;
  const seq = String((Number(n ?? 0) + 1)).padStart(6, "0");
  return `TINV-${seq}`;
}

// ── GST calculation ─────────────────────────────────────────────────────────
export function calculateGst(
  commissionAmount: number,
  isGstFree: boolean
): number {
  if (isGstFree) return 0;
  return parseFloat((commissionAmount * 0.1).toFixed(2));
}

// ── PDF storage path ────────────────────────────────────────────────────────
function pdfStoragePath(invoiceRef: string): string {
  const dir = path.join(process.cwd(), "generated_pdfs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${invoiceRef}.pdf`);
}

// ── Core generator ──────────────────────────────────────────────────────────
export async function generateTaxInvoice(
  contractProductId: string,
  paymentHeaderId: string | null,
  createdByUserId: string
): Promise<string> {
  // 1. Load contract_product with JOIN
  const [cp] = await db
    .select({
      id:               contractProducts.id,
      contractId:       contractProducts.contractId,
      name:             contractProducts.name,
      commissionAmount: contractProducts.commissionAmount,
      remittanceMethod: contractProducts.remittanceMethod,
      isGstFree:        contractProducts.isGstFree,
      apStatus:         contractProducts.apStatus,
      apDueDate:        contractProducts.apDueDate,
    })
    .from(contractProducts)
    .where(eq(contractProducts.id, contractProductId))
    .limit(1);

  if (!cp) throw new Error(`contract_product not found: ${contractProductId}`);
  if (!cp.contractId) throw new Error("contractId missing on contract_product");

  // 2. Load contract
  const [ctr] = await db
    .select({
      id:             contracts.id,
      contractNumber: contracts.contractNumber,
      studentName:    contracts.studentName,
      courseStartDate: contracts.courseStartDate,
      courseEndDate:  contracts.courseEndDate,
      totalApAmount:  contracts.totalApAmount,
    })
    .from(contracts)
    .where(eq(contracts.id, cp.contractId))
    .limit(1);

  if (!ctr) throw new Error(`contract not found: ${cp.contractId}`);

  // 3. Load school account (paidTo from payment header, fallback to partnerId from product_cost_lines)
  let schoolAccountId: string | null = null;
  if (paymentHeaderId) {
    const [ph] = await db
      .select({ paidTo: paymentHeaders.paidTo })
      .from(paymentHeaders)
      .where(eq(paymentHeaders.id, paymentHeaderId))
      .limit(1);
    schoolAccountId = ph?.paidTo ?? null;
  }

  // 4. If school account not resolved from PH, try product_cost_lines
  if (!schoolAccountId) {
    const { productCostLines } = await import("@workspace/db/schema");
    const [pcl] = await db
      .select({ partnerId: productCostLines.partnerId })
      .from(productCostLines)
      .where(eq(productCostLines.contractProductId, contractProductId))
      .limit(1);
    schoolAccountId = pcl?.partnerId ?? null;
  }

  if (!schoolAccountId) throw new Error("Cannot resolve school account for tax invoice");

  // 5. Load school account details
  const [schoolAcct] = await db
    .select({
      id:              accounts.id,
      name:            accounts.name,
      email:           accounts.email,
      address:         accounts.address,
      country:         accounts.country,
      bankAccountType: accounts.bankAccountType,
    })
    .from(accounts)
    .where(eq(accounts.id, schoolAccountId))
    .limit(1);

  if (!schoolAcct) throw new Error(`School account not found: ${schoolAccountId}`);

  // 6. Determine GST-free status
  const isGstFree =
    cp.isGstFree ??
    schoolAcct.bankAccountType === "overseas_fx";

  // 7. Load agency org info
  const [org] = await db
    .select()
    .from(organisations)
    .limit(1);

  // 8. Calculate amounts
  const commissionAmt = parseFloat(cp.commissionAmount ?? "0");
  const gstAmt = calculateGst(commissionAmt, isGstFree);
  const totalAmt = parseFloat((commissionAmt + gstAmt).toFixed(2));

  // 9. Load payment header for bank ref / paid date
  let bankReference: string | null = null;
  let apPaidDate: string | null = null;
  if (paymentHeaderId) {
    const [ph] = await db
      .select({ bankReference: paymentHeaders.bankReference, paymentDate: paymentHeaders.paymentDate })
      .from(paymentHeaders)
      .where(eq(paymentHeaders.id, paymentHeaderId))
      .limit(1);
    bankReference = ph?.bankReference ?? null;
    apPaidDate    = ph?.paymentDate ?? null;
  }

  // 10. Build invoice record
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const invoiceRef = await buildInvoiceRef();
  const invoiceType = (cp.remittanceMethod === "gross") ? "gross" : "net";

  const invoiceData = {
    invoiceRef,
    invoiceDate:       today,
    invoiceType,
    contractProductId,
    contractId:        cp.contractId,
    schoolAccountId,
    programName:       cp.name ?? "Education Program",
    studentName:       ctr.studentName ?? "Student",
    courseStartDate:   ctr.courseStartDate ?? null,
    courseEndDate:     ctr.courseEndDate ?? null,
    commissionAmount:  String(commissionAmt.toFixed(2)),
    gstAmount:         String(gstAmt.toFixed(2)),
    totalAmount:       String(totalAmt.toFixed(2)),
    isGstFree,
    paymentHeaderId,
    status:            "draft" as const,
    dueDate:           invoiceType === "gross" ? dueDate : null,
    createdBy:         createdByUserId,
  };

  // 11. Insert invoice record
  const [inv] = await db
    .insert(taxInvoices)
    .values(invoiceData)
    .returning();

  // 12. Generate PDF
  const pdfData = {
    ...invoiceData,
    agencyName:          org?.name ?? "Edubee Camp",
    agencyAbn:           org?.abn ?? null,
    agencyAbnName:       org?.abnName ?? null,
    agencyAddress:       org?.address ?? null,
    agencyBankDetails:   org?.bankAccountDetails ?? null,
    schoolName:          schoolAcct.name,
    schoolAddress:       schoolAcct.address ?? null,
    bankReference,
    apPaidDate,
  };

  const pdfBuffer = await renderTaxInvoicePdf(pdfData);
  const pdfPath   = pdfStoragePath(invoiceRef);
  fs.writeFileSync(pdfPath, pdfBuffer);

  // 13. Update PDF url
  await db.update(taxInvoices)
    .set({ pdfUrl: pdfPath })
    .where(eq(taxInvoices.id, inv.id));

  // 14. For GROSS: update commission_ar_status to 'pending' + journal entry
  if (invoiceType === "gross") {
    await db.update(contractProducts)
      .set({ commissionArStatus: "pending" })
      .where(eq(contractProducts.id, contractProductId));

    await db.insert(journalEntries).values({
      entryDate:        today,
      paymentHeaderId:  paymentHeaderId ?? undefined,
      debitCoa:         "1300",
      creditCoa:        "3100",
      amount:           String(commissionAmt.toFixed(2)),
      description:      `Commission AR transfer — GROSS remittance — ${invoiceRef}`,
      contractId:       cp.contractId,
      entryType:        "commission_ar_transfer",
      autoGenerated:    true,
      createdBy:        createdByUserId,
    });

    if (!isGstFree && gstAmt > 0) {
      await db.insert(journalEntries).values({
        entryDate:       today,
        paymentHeaderId: paymentHeaderId ?? undefined,
        debitCoa:        "1300",
        creditCoa:       "2500",
        amount:          String(gstAmt.toFixed(2)),
        description:     `GST on commission AR — GROSS — ${invoiceRef}`,
        contractId:      cp.contractId,
        entryType:       "gst_commission_ar",
        autoGenerated:   true,
        createdBy:       createdByUserId,
      });
    }
  }

  // 15. For NET: additional journal entries (commission + GST retained from trust)
  if (invoiceType === "net") {
    await db.insert(journalEntries).values({
      entryDate:        today,
      paymentHeaderId:  paymentHeaderId ?? undefined,
      debitCoa:         "1200",
      creditCoa:        "3100",
      amount:           String(commissionAmt.toFixed(2)),
      description:      `Commission retained from trust — NET remittance — ${invoiceRef}`,
      contractId:       cp.contractId,
      entryType:        "commission_net_deduct",
      autoGenerated:    true,
      createdBy:        createdByUserId,
    });

    if (!isGstFree && gstAmt > 0) {
      await db.insert(journalEntries).values({
        entryDate:       today,
        paymentHeaderId: paymentHeaderId ?? undefined,
        debitCoa:        "1200",
        creditCoa:       "2500",
        amount:          String(gstAmt.toFixed(2)),
        description:     `GST retained from trust — NET remittance — ${invoiceRef}`,
        contractId:      cp.contractId,
        entryType:       "gst_commission_net",
        autoGenerated:   true,
        createdBy:       createdByUserId,
      });
    }

    // 16. NET: auto-send to school email
    if (schoolAcct.email) {
      await sendTaxInvoiceByEmail(inv.id, schoolAcct.email, pdfBuffer, invoiceRef, schoolAcct.name);
    }
  }

  return inv.id;
}

// ── Email sender ────────────────────────────────────────────────────────────
export async function sendTaxInvoiceByEmail(
  taxInvoiceId: string,
  toEmail:       string,
  pdfBuffer:     Buffer | null,
  invoiceRef:    string,
  schoolName:    string
): Promise<void> {
  try {
    if (!pdfBuffer) {
      const [inv] = await db.select({ pdfUrl: taxInvoices.pdfUrl })
        .from(taxInvoices).where(eq(taxInvoices.id, taxInvoiceId)).limit(1);
      if (inv?.pdfUrl && fs.existsSync(inv.pdfUrl)) {
        pdfBuffer = fs.readFileSync(inv.pdfUrl);
      }
    }

    await sendMail({
      to: toEmail,
      subject: `Tax Invoice ${invoiceRef} — Edubee Camp`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; color: #1C1917;">
          <div style="background: #F5821F; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Edubee Camp</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Educational Camp Marketplace</p>
          </div>
          <div style="padding: 28px 32px;">
            <h2 style="margin: 0 0 8px; color: #1C1917;">Tax Invoice — ${invoiceRef}</h2>
            <p style="color: #57534E; margin: 0 0 20px;">Dear ${schoolName},</p>
            <p style="margin: 0 0 20px;">Please find attached the tax invoice for our commission on the above remittance. This invoice is issued in accordance with Australian GST legislation.</p>
          </div>
          <div style="background: #F4F3F1; padding: 16px 32px; text-align: center;">
            <p style="color: #A8A29E; font-size: 12px; margin: 0;">Edubee.Co · info@edubee.co</p>
          </div>
        </div>
      `,
      attachments: pdfBuffer ? [{
        filename: `${invoiceRef}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }] : [],
    } as any);

    await db.update(taxInvoices)
      .set({ sentAt: new Date(), sentToEmail: toEmail, status: "sent" })
      .where(eq(taxInvoices.id, taxInvoiceId));
  } catch (err) {
    console.error("[TAX INVOICE EMAIL FAILED — non-blocking]", String(err));
  }
}
