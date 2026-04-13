import React from "react";
import { createElement as ce } from "react";
import {
  Document, Page, Text, View, StyleSheet,
  renderToBuffer, Image, Font,
} from "@react-pdf/renderer";
import { getLogoDataUri } from "./brandingService.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoaSigner {
  role: string;
  name: string;
  email: string;
  required: boolean;
}

export interface LoaSignature {
  role: string;
  name: string;
  signatureImage: string;
  signedAt: string;
}

export interface LoaContractData {
  contractNumber?:  string;
  studentName?:     string;
  clientEmail?:     string;
  packageGroupName?: string;
  packageName?:     string;
  totalAmount?:     string | number;
  currency?:        string;
  startDate?:       string;
  endDate?:         string;
  // Extended fields (if admin passed them)
  issueDate?:       string;
  studentFirstName?: string;
  studentLastName?:  string;
  studentDob?:       string;
  studentGender?:    string;
  studentAddress?:   string;
  guardianFirstName?: string;
  guardianLastName?:  string;
  guardianRelationship?: string;
  guardianPhone?:    string;
  guardianEmail?:    string;
  programDuration?:  string;
  school?:           string;
  accommodation?:    string;
  reservationFee?:   string;
  paymentDays?:      string;
  bankDetailsKorea?: string;
  bankDetailsAus?:   string;
  notes?:            string;
  [key: string]: unknown;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1C1917",
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    backgroundColor: "#FFFFFF",
  },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  logo: { width: 80, height: 28, objectFit: "contain" },
  headerRight: { textAlign: "right" },
  contractRef: { fontSize: 8, color: "#A8A29E" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1C1917", marginBottom: 24, textAlign: "center", letterSpacing: 0.5 },
  // Divider
  divider: { borderBottomWidth: 1.5, borderBottomColor: "#E8E6E2", marginVertical: 10 },
  thinDivider: { borderBottomWidth: 0.5, borderBottomColor: "#E8E6E2", marginVertical: 8 },
  // Section
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#F5821F",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  // Table
  table: { width: "100%", marginBottom: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E8E6E2" },
  tableHeader: { backgroundColor: "#F4F3F1" },
  tableCell: { flex: 1, padding: "5 8", fontSize: 8.5 },
  tableCellLabel: { flex: 1.2, padding: "5 8", fontSize: 8.5, color: "#78716C", fontFamily: "Helvetica-Bold" },
  tableCellValue: { flex: 2.5, padding: "5 8", fontSize: 8.5, color: "#1C1917" },
  // Info box
  infoBox: { backgroundColor: "#FFF8F5", borderRadius: 4, padding: "8 12", marginBottom: 8, border: "1 solid #F5C5A3" },
  // Signature
  sigBox: { border: "1 solid #E8E6E2", borderRadius: 4, padding: "8 10", minHeight: 60, backgroundColor: "#FAFAF9" },
  sigLabel: { fontSize: 7.5, color: "#A8A29E", marginTop: 4 },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: "#A8A29E" },
  pageNum: { fontSize: 7.5, color: "#A8A29E" },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function val(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });
  } catch { return v; }
}

function fmtAmount(amount: string | number | null | undefined, currency = "AUD"): string {
  if (!amount) return "—";
  try {
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${currency} ${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch { return String(amount); }
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return ce(View, { style: S.tableRow },
    ce(Text, { style: S.tableCellLabel }, label),
    ce(Text, { style: S.tableCellValue }, value),
  );
}

// ── LOA PDF Document ──────────────────────────────────────────────────────────

function LoaDocument({ data, signers, signatures, logoDataUri }: {
  data: LoaContractData;
  signers: LoaSigner[];
  signatures: LoaSignature[];
  logoDataUri: string | null;
}) {
  const issueDate = fmtDate(data.issueDate ?? new Date().toISOString());
  const currency  = data.currency ?? "AUD";
  const studentName = data.studentName ?? [data.studentFirstName, data.studentLastName].filter(Boolean).join(" ") ?? "";
  const guardianName = [data.guardianFirstName, data.guardianLastName].filter(Boolean).join(" ");

  return ce(Document, null,
    ce(Page, { size: "A4", style: S.page },
      // ── Header
      ce(View, { style: S.header },
        logoDataUri
          ? ce(Image, { src: logoDataUri, style: S.logo } as any)
          : ce(Text, { style: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#F5821F" } }, "Edubee"),
        ce(View, { style: S.headerRight },
          ce(Text, { style: S.contractRef }, `Ref: ${val(data.contractNumber)}`),
          ce(Text, { style: S.contractRef }, `Issue Date: ${issueDate}`),
        ),
      ),

      ce(Text, { style: S.docTitle }, "LETTER OF OFFER AND ACCEPTANCE AGREEMENT"),
      ce(View, { style: S.divider }),

      // ── Intro text
      ce(View, { style: { marginBottom: 10 } },
        ce(Text, { style: { fontSize: 8.5, color: "#57534E", lineHeight: 1.5 } },
          `We are excited to offer you a place in the ${val(data.packageGroupName)} at ${val(data.school ?? "our campus")}. ` +
          `We are pleased you chose to join this educational and cultural experience. To confirm your participation, ` +
          `please review the details and conditions of this offer below.`
        ),
      ),

      // ── Student Details
      data.studentFirstName || studentName
        ? ce(View, null,
          ce(Text, { style: S.sectionTitle }, "Student Details"),
          ce(View, { style: S.table },
            ce(Row, { label: "Full Name",  value: val(studentName) }),
            ce(Row, { label: "Date of Birth", value: fmtDate(data.studentDob) }),
            ce(Row, { label: "Gender",     value: val(data.studentGender) }),
            ce(Row, { label: "Address",    value: val(data.studentAddress) }),
            ce(Row, { label: "Email",      value: val(data.clientEmail) }),
          ),
          ce(View, { style: S.thinDivider }),
        ) : null,

      // ── Guardian Details
      guardianName
        ? ce(View, null,
          ce(Text, { style: S.sectionTitle }, "Parent / Guardian Details"),
          ce(View, { style: S.table },
            ce(Row, { label: "Full Name",     value: val(guardianName) }),
            ce(Row, { label: "Relationship",  value: val(data.guardianRelationship) }),
            ce(Row, { label: "Mobile Phone",  value: val(data.guardianPhone) }),
            ce(Row, { label: "Email",         value: val(data.guardianEmail) }),
          ),
          ce(View, { style: S.thinDivider }),
        ) : null,

      // ── Program Overview
      ce(View, null,
        ce(Text, { style: S.sectionTitle }, "Program Overview"),
        ce(View, { style: S.table },
          ce(Row, { label: "Program Name", value: val(data.packageGroupName) }),
          ce(Row, { label: "Package",      value: val(data.packageName) }),
          ce(Row, { label: "Start Date",   value: fmtDate(data.startDate) }),
          ce(Row, { label: "End Date",     value: fmtDate(data.endDate) }),
          data.programDuration ? ce(Row, { label: "Duration", value: val(data.programDuration) }) : null,
          data.school          ? ce(Row, { label: "School",   value: val(data.school) }) : null,
          data.accommodation   ? ce(Row, { label: "Accommodation", value: val(data.accommodation) }) : null,
        ),
        ce(View, { style: S.thinDivider }),
      ),

      // ── Program Fee
      ce(View, null,
        ce(Text, { style: S.sectionTitle }, "Program Fee"),
        ce(View, { style: S.table },
          ce(Row, { label: "Package",   value: val(data.packageName) }),
          ce(Row, { label: "Total Fee", value: fmtAmount(data.totalAmount, currency) }),
        ),
        ce(View, { style: { backgroundColor: "#F4F3F1", borderRadius: 4, padding: "6 10", marginBottom: 6 } },
          ce(Text, { style: { fontSize: 8, color: "#57534E", lineHeight: 1.5 } },
            "This fee includes accommodation, daily breakfast, transportation, educational activities and excursions."
          ),
        ),
        ce(View, { style: S.thinDivider }),
      ),

      // ── Cancellation Policy
      ce(View, null,
        ce(Text, { style: S.sectionTitle }, "Cancellation & Refund Policy"),
        ce(View, { style: S.infoBox },
          ce(Text, { style: { fontSize: 8, color: "#57534E", lineHeight: 1.6 } },
            `• Reservation Fee: A non-refundable fee of ${val(data.reservationFee ?? "USD$1,000")} is required to secure your place.\n` +
            `• Payment Schedule: Remaining balance due within ${val(data.paymentDays ?? "14")} days after paying the reservation fee.\n` +
            `• Refund Policy: If you cancel 3 months or more before the program starts, all fees except the reservation fee will be refunded.\n` +
            `• No refunds will be provided if you cancel less than 3 months before the program starts.\n` +
            `• The camp organiser is not responsible for refunds due to circumstances beyond our control.`
          ),
        ),
        ce(View, { style: S.thinDivider }),
      ),

      // ── IP Rights
      ce(View, { style: { marginBottom: 8 } },
        ce(Text, { style: S.sectionTitle }, "Intellectual Property Rights"),
        ce(Text, { style: { fontSize: 8, color: "#57534E", lineHeight: 1.5 } },
          "By accepting this offer, you agree that the copyright of photos and videos taken during the camp belongs to the camp organiser. We reserve the right to post such materials online or offline without objection."
        ),
        ce(View, { style: S.thinDivider }),
      ),

      // ── Signatures
      ce(View, null,
        ce(Text, { style: S.sectionTitle }, "Agreement & Signature"),
        ce(Text, { style: { fontSize: 8.5, color: "#57534E", marginBottom: 10, lineHeight: 1.5 } },
          `By signing below, ${studentName ? `${studentName}` : "the applicant"}${guardianName ? ` (represented by ${guardianName})` : ""} confirms that they have read and understood the terms and conditions outlined in this Letter of Offer and Acceptance Agreement and agree to the payment terms and cancellation policy.`
        ),
        ce(View, { style: { flexDirection: "row", gap: 16 } },
          ...signers.map((signer) => {
            const sig = signatures.find(s => s.role === signer.role);
            return ce(View, { key: signer.role, style: { flex: 1 } },
              ce(Text, { style: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 4 } }, signer.name),
              ce(Text, { style: { fontSize: 7.5, color: "#78716C", marginBottom: 6 } }, signer.role.replace(/_/g, " ").toUpperCase()),
              ce(View, { style: S.sigBox },
                sig?.signatureImage
                  ? ce(Image, { src: sig.signatureImage, style: { height: 44 } } as any)
                  : ce(Text, { style: { fontSize: 8, color: "#A8A29E", fontStyle: "italic" } }, "Awaiting signature"),
              ),
              ce(Text, { style: S.sigLabel }, sig?.signedAt ? `Signed: ${fmtDate(sig.signedAt)}` : "Not yet signed"),
            );
          }),
        ),
      ),

      // ── Notes
      data.notes
        ? ce(View, { style: { marginTop: 10 } },
          ce(Text, { style: S.sectionTitle }, "Additional Notes"),
          ce(Text, { style: { fontSize: 8, color: "#57534E", lineHeight: 1.5 } }, data.notes),
        ) : null,

      // ── Footer
      ce(View, { style: S.footer },
        ce(Text, { style: S.footerText }, "Edubee Camp Platform — Confidential"),
        ce(Text, { style: S.pageNum, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` } as any),
      ),
    ),
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function generateLoaPdf(params: {
  contractData: LoaContractData;
  signers: LoaSigner[];
  signatures: LoaSignature[];
}): Promise<Buffer> {
  const logoDataUri = await getLogoDataUri();
  const element = React.createElement(LoaDocument, {
    data:       params.contractData,
    signers:    params.signers,
    signatures: params.signatures,
    logoDataUri,
  });
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
