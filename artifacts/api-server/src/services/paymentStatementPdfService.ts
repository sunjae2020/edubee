import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Image } from "@react-pdf/renderer";
import { getLogoDataUri } from "./brandingService.js";

// ── Helpers ───────────────────────────────────────────────────────────────
function el(type: any, props: any, ...children: any[]) {
  return React.createElement(type, props, ...children);
}

function fmtAud(val: string | number | null | undefined) {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `A$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(val: string | Date | null | undefined) {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function splitTypeLabel(splitType: string | null): string {
  const map: Record<string, string> = {
    tuition:      "Tuition Fee",
    service_fee:  "Service Fee",
    visa_fee:     "Visa Fee",
    accommodation:"Accommodation",
    pickup:       "Airport Pickup",
    insurance:    "Insurance / OSHC",
    other:        "Other",
  };
  return map[splitType ?? ""] ?? splitType ?? "Payment";
}

// ── Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:          { fontFamily: "Helvetica", fontSize: 10, color: "#1C1917", padding: "36 48", backgroundColor: "#FFFFFF" },
  // Header
  headerRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  logoText:      { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#F5821F" },
  logoSub:       { fontSize: 8, color: "#57534E", marginTop: 2 },
  titleText:     { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1C1917", textAlign: "right" },
  titleMeta:     { fontSize: 8, color: "#57534E", textAlign: "right", marginTop: 3 },
  divider:       { height: 1.5, backgroundColor: "#F5821F", marginBottom: 16 },
  thinDivider:   { height: 0.5, backgroundColor: "#E8E6E2", marginBottom: 12 },
  // Agency / Student info blocks
  infoRow:       { flexDirection: "row", gap: 20, marginBottom: 14 },
  infoBlock:     { flex: 1, borderWidth: 0.5, borderColor: "#E8E6E2", borderRadius: 4, padding: "10 12" },
  blockTitle:    { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#F5821F", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  fieldRow:      { flexDirection: "row", marginBottom: 3 },
  fieldLabel:    { fontSize: 8, color: "#A8A29E", width: 68 },
  fieldValue:    { fontSize: 8, color: "#1C1917", flex: 1, fontFamily: "Helvetica-Bold" },
  // Contract block
  contractBlock: { borderWidth: 0.5, borderColor: "#E8E6E2", borderRadius: 4, padding: "10 12", marginBottom: 14, backgroundColor: "#FAFAF9" },
  contractRow:   { flexDirection: "row", gap: 20 },
  // Section heading
  sectionHead:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#57534E", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  // Table
  tableHeader:   { flexDirection: "row", backgroundColor: "#FAFAF9", borderBottomWidth: 1, borderBottomColor: "#E8E6E2", paddingVertical: 6, paddingHorizontal: 10 },
  tableHeaderTxt:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#57534E", textTransform: "uppercase" },
  tableRow:      { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: "#E8E6E2" },
  tableCell:     { fontSize: 9, color: "#1C1917" },
  // Subtotals
  subTotalRow:   { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 10, marginTop: 6 },
  subTotalLabel: { fontSize: 9, color: "#57534E", width: 160, textAlign: "right", marginRight: 14 },
  subTotalValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1C1917", width: 90, textAlign: "right" },
  // Summary box
  summaryBox:    { borderWidth: 0.5, borderColor: "#E8E6E2", borderRadius: 4, padding: "12 16", marginTop: 14, backgroundColor: "#FAFAF9" },
  summaryRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  summaryLabel:  { fontSize: 9, color: "#57534E" },
  summaryValue:  { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1C1917" },
  summaryDivider:{ height: 0.5, backgroundColor: "#E8E6E2", marginVertical: 6 },
  // Footer note
  footerNote:    { marginTop: 14, padding: "8 12", borderLeftWidth: 2, borderLeftColor: "#F5821F", backgroundColor: "#FFFBF5" },
  footerNoteText:{ fontSize: 8, color: "#57534E", lineHeight: 1.5 },
  // Auth line
  authRow:       { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  authLabel:     { fontSize: 8, color: "#57534E" },
  authValue:     { fontSize: 8, color: "#1C1917", fontFamily: "Helvetica-Bold" },
  // Page footer
  pageFooter:    { position: "absolute", bottom: 28, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: "#E8E6E2", paddingTop: 7, flexDirection: "row", justifyContent: "space-between" },
  pageFooterTxt: { fontSize: 8, color: "#A8A29E" },
});

// ── Data types ────────────────────────────────────────────────────────────
export interface PaymentHistoryLine {
  paymentDate:  string;
  splitType:    string | null;
  description:  string | null;
  receiptRef:   string;
  amount:       string;
  productName:  string | null;
}

export interface OutstandingLine {
  arDueDate:   string | null;
  productName: string | null;
  arAmount:    string;
  arStatus:    string;
}

export interface StatementPdfData {
  statementRef:         string;
  statementDate:        string;
  statementScope:       "contract" | "student";
  issueReason:          string | null;
  issuedByName:         string;
  // Agency
  agencyName:           string;
  agencyAbn:            string | null;
  agencyAbnName:        string | null;
  agencyAddress:        string | null;
  agencyPhone:          string | null;
  agencyEmail:          string | null;
  // Student
  studentName:          string;
  studentEmail:         string | null;
  studentPhone:         string | null;
  // Contract (optional at student scope)
  contractNumber:       string | null;
  schoolName:           string | null;
  programName:          string | null;
  courseStartDate:      string | null;
  courseEndDate:        string | null;
  // Amounts
  totalContractAmount:  string;
  totalPaid:            string;
  totalOutstanding:     string;
  // Lines
  paidLines:            PaymentHistoryLine[];
  outstandingLines:     OutstandingLine[];
}

// ── PDF document ──────────────────────────────────────────────────────────
function StatementDocument({ d, logoDataUri }: { d: StatementPdfData; logoDataUri?: string }) {
  const hasContract = d.statementScope === "contract" && d.contractNumber;

  return el(Document, { title: `Payment Statement ${d.statementRef}` },
    el(Page, { size: "A4", style: S.page },

      // ── Header ─────────────────────────────────────────────────────────
      el(View, { style: S.headerRow },
        el(View, null,
          logoDataUri
            ? el(Image, { src: logoDataUri, style: { height: 38, maxWidth: 160 } } as any)
            : el(Text, { style: S.logoText }, "Edubee Camp"),
          el(Text, { style: S.logoSub  }, "Educational Camp Marketplace"),
        ),
        el(View, null,
          el(Text, { style: S.titleText }, "PAYMENT HISTORY STATEMENT"),
          el(Text, { style: S.titleMeta }, `Ref: ${d.statementRef}`),
          el(Text, { style: S.titleMeta }, `Issued: ${fmtDate(d.statementDate)}`),
          d.issueReason && el(Text, { style: S.titleMeta }, `Purpose: ${d.issueReason}`),
        ),
      ),
      el(View, { style: S.divider }),

      // ── Agency + Student info blocks ────────────────────────────────────
      el(View, { style: S.infoRow },
        // Agency
        el(View, { style: S.infoBlock },
          el(Text, { style: S.blockTitle }, "Issued By (Agency)"),
          el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Agency"),
            el(Text, { style: S.fieldValue }, d.agencyName),
          ),
          d.agencyAbn && el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "ABN"),
            el(Text, { style: S.fieldValue }, d.agencyAbn),
          ),
          d.agencyAddress && el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Address"),
            el(Text, { style: S.fieldValue }, d.agencyAddress),
          ),
          d.agencyEmail && el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Email"),
            el(Text, { style: S.fieldValue }, d.agencyEmail),
          ),
          d.agencyPhone && el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Phone"),
            el(Text, { style: S.fieldValue }, d.agencyPhone),
          ),
          el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Staff"),
            el(Text, { style: S.fieldValue }, d.issuedByName),
          ),
        ),
        // Student
        el(View, { style: S.infoBlock },
          el(Text, { style: S.blockTitle }, "Student Information"),
          el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Name"),
            el(Text, { style: S.fieldValue }, d.studentName || "—"),
          ),
          d.studentEmail && el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Email"),
            el(Text, { style: S.fieldValue }, d.studentEmail),
          ),
          d.studentPhone && el(View, { style: S.fieldRow },
            el(Text, { style: S.fieldLabel }, "Phone"),
            el(Text, { style: S.fieldValue }, d.studentPhone),
          ),
        ),
      ),

      // ── Contract block (contract scope only) ────────────────────────────
      hasContract && el(View, { style: S.contractBlock },
        el(Text, { style: S.blockTitle }, "Contract Information"),
        el(View, { style: S.contractRow },
          el(View, { style: { flex: 1 } },
            el(View, { style: S.fieldRow },
              el(Text, { style: S.fieldLabel }, "Contract No"),
              el(Text, { style: S.fieldValue }, d.contractNumber ?? "—"),
            ),
            el(View, { style: S.fieldRow },
              el(Text, { style: S.fieldLabel }, "School"),
              el(Text, { style: S.fieldValue }, d.schoolName ?? "—"),
            ),
            el(View, { style: S.fieldRow },
              el(Text, { style: S.fieldLabel }, "Program"),
              el(Text, { style: S.fieldValue }, d.programName ?? "—"),
            ),
          ),
          el(View, { style: { flex: 1 } },
            el(View, { style: S.fieldRow },
              el(Text, { style: S.fieldLabel }, "Start Date"),
              el(Text, { style: S.fieldValue }, fmtDate(d.courseStartDate)),
            ),
            el(View, { style: S.fieldRow },
              el(Text, { style: S.fieldLabel }, "End Date"),
              el(Text, { style: S.fieldValue }, fmtDate(d.courseEndDate)),
            ),
            el(View, { style: S.fieldRow },
              el(Text, { style: S.fieldLabel }, "Total Contract"),
              el(Text, { style: S.fieldValue }, fmtAud(d.totalContractAmount)),
            ),
          ),
        ),
      ),

      // ── Payment History section ─────────────────────────────────────────
      el(Text, { style: S.sectionHead }, "Payment History"),
      el(View, { style: S.tableHeader },
        el(Text, { style: [S.tableHeaderTxt, { width: 62 }] }, "Date"),
        el(Text, { style: [S.tableHeaderTxt, { flex: 2 }] }, "Description"),
        el(Text, { style: [S.tableHeaderTxt, { width: 80 }] }, "Receipt Ref"),
        el(Text, { style: [S.tableHeaderTxt, { width: 75, textAlign: "right" }] }, "Amount"),
      ),
      ...(d.paidLines.length > 0
        ? d.paidLines.map((line, i) =>
            el(View, { key: String(i), style: S.tableRow },
              el(Text, { style: [S.tableCell, { width: 62 }] }, fmtDate(line.paymentDate)),
              el(View, { style: { flex: 2 } },
                el(Text, { style: S.tableCell }, splitTypeLabel(line.splitType)),
                line.productName && el(Text, { style: { fontSize: 8, color: "#A8A29E", marginTop: 1 } }, line.productName),
              ),
              el(Text, { style: [S.tableCell, { width: 80, color: "#57534E" }] }, line.receiptRef),
              el(Text, { style: [S.tableCell, { width: 75, textAlign: "right", fontFamily: "Helvetica-Bold" }] }, fmtAud(line.amount)),
            )
          )
        : [el(View, { key: "empty-paid", style: { padding: "12 10" } },
            el(Text, { style: { fontSize: 9, color: "#A8A29E" } }, "No payments recorded yet.")
          )]
      ),
      el(View, { style: S.subTotalRow },
        el(Text, { style: S.subTotalLabel }, "Total Paid to Date"),
        el(Text, { style: [S.subTotalValue, { color: "#16A34A" }] }, fmtAud(d.totalPaid)),
      ),

      // ── Outstanding Balance section ─────────────────────────────────────
      el(Text, { style: [S.sectionHead, { marginTop: 12 }] }, "Outstanding Balance"),
      el(View, { style: S.tableHeader },
        el(Text, { style: [S.tableHeaderTxt, { width: 72 }] }, "Due Date"),
        el(Text, { style: [S.tableHeaderTxt, { flex: 2 }] }, "Description"),
        el(Text, { style: [S.tableHeaderTxt, { width: 72 }] }, "Status"),
        el(Text, { style: [S.tableHeaderTxt, { width: 75, textAlign: "right" }] }, "Amount"),
      ),
      ...(d.outstandingLines.length > 0
        ? d.outstandingLines.map((line, i) =>
            el(View, { key: String(i), style: S.tableRow },
              el(Text, { style: [S.tableCell, { width: 72 }] }, fmtDate(line.arDueDate)),
              el(Text, { style: [S.tableCell, { flex: 2 }] }, line.productName ?? "—"),
              el(Text, { style: [S.tableCell, { width: 72, color: "#DC2626" }] },
                line.arStatus.charAt(0).toUpperCase() + line.arStatus.slice(1)
              ),
              el(Text, { style: [S.tableCell, { width: 75, textAlign: "right", fontFamily: "Helvetica-Bold" }] }, fmtAud(line.arAmount)),
            )
          )
        : [el(View, { key: "empty-out", style: { padding: "12 10" } },
            el(Text, { style: { fontSize: 9, color: "#A8A29E" } }, "No outstanding balance.")
          )]
      ),
      el(View, { style: S.subTotalRow },
        el(Text, { style: S.subTotalLabel }, "Total Outstanding"),
        el(Text, { style: [S.subTotalValue, { color: "#DC2626" }] }, fmtAud(d.totalOutstanding)),
      ),

      // ── Summary box ─────────────────────────────────────────────────────
      el(View, { style: S.summaryBox },
        el(Text, { style: [S.blockTitle, { marginBottom: 8 }] }, "Summary"),
        el(View, { style: S.summaryRow },
          el(Text, { style: S.summaryLabel }, "Total Contract Amount"),
          el(Text, { style: S.summaryValue }, fmtAud(d.totalContractAmount)),
        ),
        el(View, { style: S.summaryRow },
          el(Text, { style: S.summaryLabel }, "Total Paid to Date"),
          el(Text, { style: [S.summaryValue, { color: "#16A34A" }] }, fmtAud(d.totalPaid)),
        ),
        el(View, { style: S.summaryRow },
          el(Text, { style: S.summaryLabel }, "Total Outstanding"),
          el(Text, { style: [S.summaryValue, { color: "#DC2626" }] }, fmtAud(d.totalOutstanding)),
        ),
        el(View, { style: S.summaryDivider }),
        el(View, { style: S.authRow },
          el(Text, { style: S.authLabel }, `Authorised by: ${d.issuedByName}`),
          el(Text, { style: S.authLabel }, `Date: ${fmtDate(d.statementDate)}`),
        ),
      ),

      // ── Footer note ─────────────────────────────────────────────────────
      el(View, { style: S.footerNote },
        el(Text, { style: S.footerNoteText },
          `This statement is issued by ${d.agencyName} as an official record of payments received. ` +
          `For enquiries please contact ${d.agencyEmail ?? ""}${d.agencyPhone ? " / " + d.agencyPhone : ""}.`
        ),
      ),

      // ── Page footer ─────────────────────────────────────────────────────
      el(View, { style: S.pageFooter },
        el(Text, { style: S.pageFooterTxt }, "Edubee.Co · info@edubee.co"),
        el(Text, { style: S.pageFooterTxt }, `${d.statementRef} · Confidential`),
      ),
    ),
  );
}

// ── Export render function ────────────────────────────────────────────────
export async function renderStatementPdf(data: StatementPdfData): Promise<Buffer> {
  const logoDataUri = await getLogoDataUri();
  const element = React.createElement(StatementDocument, { d: data, logoDataUri });
  const buffer  = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
