import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// ── Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:          { fontFamily: "Helvetica", fontSize: 10, color: "#1C1917", padding: "40 50", backgroundColor: "#FFFFFF" },
  headerRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  logoBox:       { flexDirection: "column" },
  logoText:      { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#F5821F" },
  logoSub:       { fontSize: 8, color: "#57534E", marginTop: 2 },
  titleText:     { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1C1917", textAlign: "right" },
  titleRef:      { fontSize: 9, color: "#57534E", textAlign: "right", marginTop: 2 },
  divider:       { height: 1.5, backgroundColor: "#F5821F", marginBottom: 18 },
  thinDivider:   { height: 0.5, backgroundColor: "#E8E6E2", marginVertical: 10 },
  section:       { marginBottom: 16 },
  sectionTitle:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#57534E", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  twoCol:        { flexDirection: "row", gap: 24 },
  col:           { flex: 1 },
  label:         { fontSize: 8, color: "#A8A29E", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  value:         { fontSize: 10, color: "#1C1917" },
  valueBold:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1C1917" },
  metaRow:       { flexDirection: "row", marginBottom: 4 },
  metaLabel:     { fontSize: 9, color: "#57534E", width: 110 },
  metaValue:     { fontSize: 9, color: "#1C1917", flex: 1 },
  tableHeader:   { flexDirection: "row", backgroundColor: "#FAFAF9", borderBottomWidth: 1, borderBottomColor: "#E8E6E2", paddingVertical: 6, paddingHorizontal: 10, marginTop: 8 },
  tableHeaderTxt:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#57534E", textTransform: "uppercase" },
  tableRow:      { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: "#E8E6E2" },
  tableCell:     { fontSize: 10, color: "#1C1917" },
  totalBox:      { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, paddingHorizontal: 10 },
  totalLabel:    { fontSize: 10, color: "#57534E", width: 130, textAlign: "right", marginRight: 16 },
  totalValue:    { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#F5821F", width: 100, textAlign: "right" },
  noteBox:       { marginTop: 16, padding: "10 14", backgroundColor: "#FAFAF9", borderLeftWidth: 2, borderLeftColor: "#F5821F" },
  noteText:      { fontSize: 9, color: "#57534E", marginBottom: 3 },
  footer:        { position: "absolute", bottom: 30, left: 50, right: 50, borderTopWidth: 0.5, borderTopColor: "#E8E6E2", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText:    { fontSize: 8, color: "#A8A29E" },
  gstBadge:      { borderWidth: 1, borderColor: "#D1FAE5", borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5, alignSelf: "flex-start" },
  gstBadgeTxt:   { fontSize: 8, color: "#059669" },
  gstFreeBadge:  { borderWidth: 1, borderColor: "#E8E6E2", borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5, alignSelf: "flex-start" },
  gstFreeBadgeTxt: { fontSize: 8, color: "#78716C" },
});

function fmtAud(val: string | number | null | undefined) {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `A$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
}

export interface TaxInvoicePdfData {
  invoiceRef:          string;
  invoiceDate:         string;
  invoiceType:         "net" | "gross";
  programName:         string;
  studentName:         string;
  courseStartDate:     string | null;
  courseEndDate:       string | null;
  commissionAmount:    string;
  gstAmount:           string;
  totalAmount:         string;
  isGstFree:           boolean;
  dueDate:             string | null;
  agencyName:          string;
  agencyAbn:           string | null;
  agencyAbnName:       string | null;
  agencyAddress:       string | null;
  agencyBankDetails:   string | null;
  schoolName:          string;
  schoolAddress:       string | null;
  bankReference:       string | null;
  apPaidDate:          string | null;
}

function el(type: any, props: any, ...children: any[]) {
  return React.createElement(type, props, ...children);
}

function TaxInvoiceDocument({ d }: { d: TaxInvoicePdfData }) {
  const isNet   = d.invoiceType === "net";
  const hasGst  = !d.isGstFree && parseFloat(d.gstAmount) > 0;
  const dueDate = d.dueDate
    ? fmtDate(d.dueDate)
    : fmtDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  return el(Document, { title: `Tax Invoice ${d.invoiceRef}` },
    el(Page, { size: "A4", style: S.page },

      // ── Header ──────────────────────────────────────────────────────────
      el(View, { style: S.headerRow },
        el(View, { style: S.logoBox },
          el(Text, { style: S.logoText }, d.agencyName),
          el(Text, { style: S.logoSub  }, "Educational Camp Marketplace"),
        ),
        el(View, null,
          el(Text, { style: S.titleText }, "TAX INVOICE"),
          el(Text, { style: S.titleRef  }, d.invoiceRef),
        ),
      ),

      // ── Orange divider ──────────────────────────────────────────────────
      el(View, { style: S.divider }),

      // ── From / To section ───────────────────────────────────────────────
      el(View, { style: [S.section, S.twoCol] },
        // From
        el(View, { style: S.col },
          el(Text, { style: S.sectionTitle }, "FROM"),
          el(Text, { style: S.valueBold }, d.agencyName),
          d.agencyAbn && el(Text, { style: S.value }, `ABN: ${d.agencyAbn}`),
          d.agencyAbnName && el(Text, { style: S.value }, d.agencyAbnName),
          d.agencyAddress && el(Text, { style: [S.value, { marginTop: 3 }] }, d.agencyAddress),
        ),
        // To
        el(View, { style: S.col },
          el(Text, { style: S.sectionTitle }, "TO"),
          el(Text, { style: S.valueBold }, d.schoolName),
          d.schoolAddress && el(Text, { style: S.value }, d.schoolAddress),
        ),
      ),

      // ── Invoice meta ────────────────────────────────────────────────────
      el(View, { style: S.thinDivider }),
      el(View, { style: [S.section, { marginTop: 8 }] },
        el(View, { style: S.metaRow },
          el(Text, { style: S.metaLabel }, "Invoice No"),
          el(Text, { style: S.metaValue }, d.invoiceRef),
        ),
        el(View, { style: S.metaRow },
          el(Text, { style: S.metaLabel }, "Invoice Date"),
          el(Text, { style: S.metaValue }, fmtDate(d.invoiceDate)),
        ),
        el(View, { style: S.metaRow },
          el(Text, { style: S.metaLabel }, "Payment Terms"),
          el(Text, { style: S.metaValue }, "30 days"),
        ),
        el(View, { style: S.metaRow },
          el(Text, { style: S.metaLabel }, "Remittance Type"),
          el(Text, { style: [S.metaValue, { fontFamily: "Helvetica-Bold" }] }, isNet ? "NET (Pre-deduct)" : "GROSS (Full Remit)"),
        ),
      ),

      // ── Line items table ────────────────────────────────────────────────
      el(View, { style: S.thinDivider }),
      el(View, { style: S.tableHeader },
        el(Text, { style: [S.tableHeaderTxt, { flex: 4 }] }, "Description"),
        el(Text, { style: [S.tableHeaderTxt, { flex: 1, textAlign: "right" }] }, "Amount"),
      ),
      el(View, { style: S.tableRow },
        el(View, { style: { flex: 4 } },
          el(Text, { style: S.tableCell }, `${d.programName} — ${d.studentName}`),
          el(Text, { style: [S.tableCell, { color: "#57534E", marginTop: 2 }] }, "Recruitment / Marketing Service"),
          el(Text, { style: [S.tableCell, { color: "#57534E", marginTop: 2 }] },
            d.courseStartDate || d.courseEndDate
              ? `Course Period: ${fmtDate(d.courseStartDate)} ~ ${fmtDate(d.courseEndDate)}`
              : ""
          ),
        ),
        el(Text, { style: [S.tableCell, { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }] }, fmtAud(d.commissionAmount)),
      ),

      // GST row
      hasGst
        ? el(View, { style: S.tableRow },
            el(View, { style: { flex: 4, flexDirection: "row", alignItems: "center", gap: 6 } },
              el(Text, { style: S.tableCell }, "GST (10%)"),
              el(View, { style: S.gstBadge }, el(Text, { style: S.gstBadgeTxt }, "GST INCLUSIVE")),
            ),
            el(Text, { style: [S.tableCell, { flex: 1, textAlign: "right" }] }, fmtAud(d.gstAmount)),
          )
        : el(View, { style: S.tableRow },
            el(View, { style: { flex: 4, flexDirection: "row", alignItems: "center", gap: 6 } },
              el(Text, { style: S.tableCell }, "GST"),
              el(View, { style: S.gstFreeBadge }, el(Text, { style: S.gstFreeBadgeTxt }, "GST-FREE (EXPORT)")),
            ),
            el(Text, { style: [S.tableCell, { flex: 1, textAlign: "right" }] }, "A$0.00"),
          ),

      // Total
      el(View, { style: S.totalBox },
        el(Text, { style: S.totalLabel }, "TOTAL"),
        el(Text, { style: S.totalValue }, fmtAud(d.totalAmount)),
      ),

      // ── Notes box ───────────────────────────────────────────────────────
      el(View, { style: [S.noteBox, { marginTop: 20 }] },
        isNet
          ? el(React.Fragment, null,
              el(Text, { style: S.noteText }, "* This amount has been deducted from remittance."),
              d.apPaidDate  && el(Text, { style: S.noteText }, `* Remittance Date:  ${fmtDate(d.apPaidDate)}`),
              d.bankReference && el(Text, { style: S.noteText }, `* Bank Reference:   ${d.bankReference}`),
            )
          : el(React.Fragment, null,
              el(Text, { style: S.noteText }, "* Please remit commission to:"),
              d.agencyBankDetails
                ? el(Text, { style: [S.noteText, { marginLeft: 10 }] }, d.agencyBankDetails)
                : el(Text, { style: [S.noteText, { marginLeft: 10 }] }, "Please contact us for bank details."),
              el(Text, { style: S.noteText }, `* Due Date: ${dueDate}`),
            ),
      ),

      // ── Footer ─────────────────────────────────────────────────────────
      el(View, { style: S.footer },
        el(Text, { style: S.footerText }, "Edubee.Co · info@edubee.co"),
        el(Text, { style: S.footerText }, "This is a Tax Invoice issued under Australian GST legislation."),
      ),
    ),
  );
}

export async function renderTaxInvoicePdf(data: TaxInvoicePdfData): Promise<Buffer> {
  const element = React.createElement(TaxInvoiceDocument, { d: data });
  const buffer  = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
