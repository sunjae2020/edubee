import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { db } from "@workspace/db";
import { receipts, invoices, contracts, users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendMail } from "../mailer.js";
import fs from "fs";
import path from "path";

// ── Resolve logo path ─────────────────────────────────────────────────────
// Use process.cwd() so this works in both ESM dev (tsx) and CJS prod (esbuild)
let LOGO_DATA_URI = "";
try {
  const logoPath = path.join(process.cwd(), "attached_assets/edubee_logo_800x310b_1773796715563.png");
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    LOGO_DATA_URI = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  }
} catch { /* logo not found — PDF will use text fallback */ }

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1C1917",
    padding: "40 50",
    backgroundColor: "#FFFFFF",
  },
  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  logoBox: { flexDirection: "column" },
  logoText: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#F5821F", letterSpacing: 0.5 },
  logoSub: { fontSize: 8, color: "#57534E", marginTop: 2 },
  receiptTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1C1917", textAlign: "right" },
  receiptTitleSub: { fontSize: 9, color: "#57534E", textAlign: "right", marginTop: 2 },
  // Divider
  divider: { height: 1.5, backgroundColor: "#F5821F", marginBottom: 20 },
  thinDivider: { height: 0.5, backgroundColor: "#E8E6E2", marginVertical: 10 },
  // Fields
  fieldsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 8 },
  fieldBox: { width: "48%", marginBottom: 6 },
  fieldLabel: { fontSize: 8, color: "#57534E", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  fieldValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1C1917" },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#FAFAF9", borderBottomWidth: 1, borderBottomColor: "#E8E6E2", paddingVertical: 6, paddingHorizontal: 10, marginTop: 8 },
  tableHeaderCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#57534E", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: "#E8E6E2" },
  tableCell: { fontSize: 10, color: "#1C1917" },
  // Totals
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, paddingHorizontal: 10 },
  totalLabel: { fontSize: 10, color: "#57534E", width: 120, textAlign: "right", marginRight: 16 },
  totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#F5821F", width: 100, textAlign: "right" },
  // Payment info
  paymentRow: { flexDirection: "row", marginTop: 10, paddingHorizontal: 10 },
  paymentLabel: { fontSize: 8, color: "#57534E", textTransform: "uppercase", width: 100 },
  paymentValue: { fontSize: 9, color: "#1C1917", flex: 1 },
  // Stamp box
  stampBox: { borderWidth: 1.5, borderColor: "#16A34A", borderRadius: 4, padding: "6 14", marginLeft: "auto", marginTop: 14 },
  stampText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#16A34A", textAlign: "center" },
  // Footer
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, borderTopWidth: 0.5, borderTopColor: "#E8E6E2", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#A8A29E" },
});

function fmtAud(val: string | number | null, ccy = "AUD") {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  const sym: Record<string, string> = { AUD: "A$", USD: "$", KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱", SGD: "S$", GBP: "£" };
  return `${sym[ccy] ?? ccy}${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(val: string | Date | null | undefined) {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
}

// ── React PDF Document ─────────────────────────────────────────────────────
function ReceiptDocument({ data }: { data: ReceiptData }) {
  return React.createElement(
    Document,
    { title: `Receipt ${data.receiptNumber}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Header
      React.createElement(View, { style: styles.headerRow },
        React.createElement(View, { style: styles.logoBox },
          React.createElement(Text, { style: styles.logoText }, "Edubee Camp"),
          React.createElement(Text, { style: styles.logoSub }, "Educational Camp Marketplace"),
        ),
        React.createElement(View, null,
          React.createElement(Text, { style: styles.receiptTitle }, "OFFICIAL RECEIPT"),
          React.createElement(Text, { style: styles.receiptTitleSub }, data.receiptNumber),
        ),
      ),

      // Orange divider
      React.createElement(View, { style: styles.divider }),

      // Fields grid
      React.createElement(View, { style: styles.fieldsGrid },
        React.createElement(View, { style: styles.fieldBox },
          React.createElement(Text, { style: styles.fieldLabel }, "Receipt No"),
          React.createElement(Text, { style: styles.fieldValue }, data.receiptNumber),
        ),
        React.createElement(View, { style: styles.fieldBox },
          React.createElement(Text, { style: styles.fieldLabel }, "Date"),
          React.createElement(Text, { style: styles.fieldValue }, fmtDate(data.receiptDate)),
        ),
        React.createElement(View, { style: styles.fieldBox },
          React.createElement(Text, { style: styles.fieldLabel }, "Received From"),
          React.createElement(Text, { style: styles.fieldValue }, data.payerName ?? "—"),
        ),
        React.createElement(View, { style: styles.fieldBox },
          React.createElement(Text, { style: styles.fieldLabel }, "Contract No"),
          React.createElement(Text, { style: styles.fieldValue }, data.contractNumber ?? "—"),
        ),
        React.createElement(View, { style: styles.fieldBox },
          React.createElement(Text, { style: styles.fieldLabel }, "Program"),
          React.createElement(Text, { style: styles.fieldValue }, data.program ?? "—"),
        ),
        React.createElement(View, { style: styles.fieldBox },
          React.createElement(Text, { style: styles.fieldLabel }, "Currency"),
          React.createElement(Text, { style: styles.fieldValue }, data.currency ?? "AUD"),
        ),
      ),

      React.createElement(View, { style: styles.thinDivider }),

      // Table
      React.createElement(View, { style: styles.tableHeader },
        React.createElement(Text, { style: [styles.tableHeaderCell, { flex: 3 }] }, "Description"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { flex: 1, textAlign: "right" }] }, "Amount"),
      ),
      React.createElement(View, { style: styles.tableRow },
        React.createElement(Text, { style: [styles.tableCell, { flex: 3 }] }, data.description ?? data.label ?? "Payment"),
        React.createElement(Text, { style: [styles.tableCell, { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }] }, fmtAud(data.amount, data.currency)),
      ),

      // Total
      React.createElement(View, { style: styles.totalRow },
        React.createElement(Text, { style: styles.totalLabel }, "TOTAL PAID"),
        React.createElement(Text, { style: styles.totalValue }, fmtAud(data.amount, data.currency)),
      ),

      // Payment method & reference
      React.createElement(View, { style: styles.paymentRow },
        React.createElement(Text, { style: styles.paymentLabel }, "Payment Method"),
        React.createElement(Text, { style: styles.paymentValue }, data.paymentMethod ?? "—"),
      ),
      data.notes && React.createElement(View, { style: [styles.paymentRow, { marginTop: 4 }] },
        React.createElement(Text, { style: styles.paymentLabel }, "Reference No"),
        React.createElement(Text, { style: styles.paymentValue }, data.notes),
      ),

      // Paid stamp
      React.createElement(View, { style: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16, paddingHorizontal: 10 } },
        React.createElement(View, { style: styles.stampBox },
          React.createElement(Text, { style: styles.stampText }, "✓  PAYMENT CONFIRMED"),
        ),
      ),

      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, "Edubee.Co · info@edubee.co"),
        React.createElement(Text, { style: styles.footerText }, "This is an official receipt issued by Edubee Camp."),
      ),
    ),
  );
}

interface ReceiptData {
  receiptNumber: string;
  receiptDate: string | null;
  payerName?: string;
  contractNumber?: string;
  program?: string;
  currency: string;
  amount: string;
  description?: string;
  label?: string;
  paymentMethod?: string;
  notes?: string;
}

// ── Build receipt data from DB ─────────────────────────────────────────────
export async function buildReceiptData(receiptId: string): Promise<ReceiptData> {
  const [rcpt] = await db
    .select({
      id: receipts.id,
      receiptNumber: receipts.receiptNumber,
      receiptDate: receipts.receiptDate,
      amount: receipts.amount,
      currency: receipts.currency,
      paymentMethod: receipts.paymentMethod,
      notes: receipts.notes,
      payerId: receipts.payerId,
      financeItemId: receipts.financeItemId,
    })
    .from(receipts)
    .where(eq(receipts.id, receiptId))
    .limit(1);

  if (!rcpt) throw new Error("Receipt not found");

  // Payer name
  let payerName = "Client";
  if (rcpt.payerId) {
    const [payer] = await db.select({ fullName: users.fullName, email: users.email })
      .from(users).where(eq(users.id, rcpt.payerId)).limit(1);
    if (payer) payerName = payer.fullName ?? payer.email ?? "Client";
  }

  // Contract & program from invoice / finance item
  let contractNumber: string | undefined;
  let program: string | undefined;
  let description: string | undefined;
  let label: string | undefined;

  if (rcpt.financeItemId) {
    const { contractFinanceItems } = await import("@workspace/db/schema");
    const [fi] = await db.select().from(contractFinanceItems)
      .where(eq(contractFinanceItems.id, rcpt.financeItemId)).limit(1);
    if (fi) {
      label = fi.label ?? undefined;
      description = fi.notes ?? undefined;
      if (fi.contractId) {
        const [ctx] = await db.select({ contractNumber: contracts.contractNumber })
          .from(contracts).where(eq(contracts.id, fi.contractId)).limit(1);
        contractNumber = ctx?.contractNumber ?? undefined;
      }
    }
  }

  return {
    receiptNumber: rcpt.receiptNumber ?? `RCP-${new Date().getFullYear()}-????`,
    receiptDate: rcpt.receiptDate,
    payerName,
    contractNumber,
    program,
    currency: rcpt.currency ?? "AUD",
    amount: rcpt.amount ?? "0",
    description,
    label,
    paymentMethod: rcpt.paymentMethod ?? undefined,
    notes: rcpt.notes ?? undefined,
  };
}

// ── Generate PDF buffer ────────────────────────────────────────────────────
export async function generateReceiptPdf(receiptId: string): Promise<Buffer> {
  const data = await buildReceiptData(receiptId);
  const element = React.createElement(ReceiptDocument, { data });
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}

// ── Send receipt email ─────────────────────────────────────────────────────
export async function emailReceipt(receiptId: string) {
  try {
    const data = await buildReceiptData(receiptId);
    if (!data.payerName) return;

    // Get payer email
    const [rcpt] = await db.select({ payerId: receipts.payerId }).from(receipts)
      .where(eq(receipts.id, receiptId)).limit(1);
    if (!rcpt?.payerId) return;
    const [payer] = await db.select({ email: users.email, fullName: users.fullName })
      .from(users).where(eq(users.id, rcpt.payerId)).limit(1);
    if (!payer?.email) return;

    const pdfBuffer = await generateReceiptPdf(receiptId);

    await sendMail({
      to: payer.email,
      subject: `Payment Confirmed — ${data.receiptNumber}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; color: #1C1917;">
          <div style="background: #F5821F; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Edubee Camp</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Educational Camp Marketplace</p>
          </div>
          <div style="padding: 28px 32px;">
            <h2 style="color: #16A34A; margin: 0 0 8px;">✓ Payment Confirmed</h2>
            <p style="color: #57534E; margin: 0 0 20px;">Dear ${payer.fullName ?? "Valued Client"},</p>
            <p style="margin: 0 0 20px;">Your payment has been successfully confirmed. Please find your receipt details below:</p>
            <table style="width: 100%; border-collapse: collapse; background: #FAFAF9; border-radius: 8px; overflow: hidden;">
              <tr><td style="padding: 10px 16px; color: #57534E; font-size: 13px; border-bottom: 1px solid #E8E6E2;">Receipt No</td><td style="padding: 10px 16px; font-weight: bold; border-bottom: 1px solid #E8E6E2;">${data.receiptNumber}</td></tr>
              <tr><td style="padding: 10px 16px; color: #57534E; font-size: 13px; border-bottom: 1px solid #E8E6E2;">Date</td><td style="padding: 10px 16px; border-bottom: 1px solid #E8E6E2;">${data.receiptDate ? new Date(data.receiptDate).toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</td></tr>
              ${data.contractNumber ? `<tr><td style="padding: 10px 16px; color: #57534E; font-size: 13px; border-bottom: 1px solid #E8E6E2;">Contract No</td><td style="padding: 10px 16px; border-bottom: 1px solid #E8E6E2;">${data.contractNumber}</td></tr>` : ""}
              <tr><td style="padding: 10px 16px; color: #57534E; font-size: 13px;">Amount Paid</td><td style="padding: 10px 16px; font-weight: bold; color: #F5821F; font-size: 16px;">${data.currency ?? "AUD"} ${parseFloat(data.amount ?? "0").toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td></tr>
            </table>
            <p style="margin: 20px 0 0; color: #57534E; font-size: 13px;">The official PDF receipt is attached to this email.</p>
          </div>
          <div style="background: #F4F3F1; padding: 16px 32px; text-align: center;">
            <p style="color: #A8A29E; font-size: 12px; margin: 0;">Edubee.Co · info@edubee.co</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `${data.receiptNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }] as any,
    } as any);

  } catch (err) {
    console.error("[RECEIPT EMAIL FAILED — non-blocking]", String(err));
  }
}
