/**
 * Camp Application Email Service
 *
 * Generates a PDF of the camp application and emails it to:
 *  1. The org admin (from organisations.email)
 *  2. The referring partner (from applicationFormPartners.partnerEmailOverride or accounts.email)
 *     — only if emailNotification is "both" or "partner"
 *
 * Called non-blocking from the public submit endpoint.
 */

import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
  renderToBuffer, Image,
} from "@react-pdf/renderer";
import { Resend } from "resend";
import { db } from "@workspace/db";
import {
  organisations, accounts, users,
  applicationFormPartners, applicationForms,
  packageGroups, packages,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getLogoDataUri } from "./brandingService.js";
import { getResendConfig } from "../mailer.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function val(v: string | null | undefined) { return v ?? "—"; }

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return d.toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return v; }
}

const today = () => new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });

// ─── PDF Styles ────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page:           { fontFamily: "Helvetica", fontSize: 10, color: "#1C1917", padding: "36 48", backgroundColor: "#FFFFFF" },
  // Header
  headerRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  logoBox:        { flexDirection: "column" },
  logoText:       { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#F5821F" },
  logoSub:        { fontSize: 8, color: "#57534E", marginTop: 2 },
  appTitle:       { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1C1917", textAlign: "right" },
  appRef:         { fontSize: 9, color: "#57534E", textAlign: "right", marginTop: 3 },
  // Divider
  divider:        { height: 2, backgroundColor: "#F5821F", marginBottom: 18 },
  thinDivider:    { height: 0.5, backgroundColor: "#E8E6E2", marginVertical: 12 },
  // Section
  sectionTitle:   { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#F5821F", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  // Field grid
  fieldGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  fieldBox:       { width: "48%", marginBottom: 6 },
  fieldBoxFull:   { width: "100%", marginBottom: 6 },
  fieldLabel:     { fontSize: 7.5, color: "#78716C", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  fieldValue:     { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1C1917" },
  // Table
  tableHeader:    { flexDirection: "row", backgroundColor: "#FAFAF9", borderBottomWidth: 1, borderBottomColor: "#E8E6E2", paddingVertical: 5, paddingHorizontal: 8 },
  tableHeaderCell:{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#57534E", textTransform: "uppercase" },
  tableRow:       { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#E8E6E2" },
  tableCell:      { fontSize: 9.5, color: "#1C1917" },
  tableCellSm:    { fontSize: 8.5, color: "#57534E" },
  // Badge
  badge:          { backgroundColor: "#FEF0E3", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText:      { fontSize: 7.5, color: "#C2410C", fontFamily: "Helvetica-Bold" },
  // Footer
  footer:         { position: "absolute", bottom: 28, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: "#E8E6E2", paddingTop: 7, flexDirection: "row", justifyContent: "space-between" },
  footerText:     { fontSize: 7.5, color: "#A8A29E" },
  // Signature
  sigBox:         { borderWidth: 1, borderColor: "#E8E6E2", borderRadius: 4, padding: 8, marginTop: 4 },
  sigLabel:       { fontSize: 7.5, color: "#78716C", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampAppEmailData {
  applicationNumber: string;
  packageGroupId: string;
  packageId?: string;
  applicantFirstName: string;
  applicantLastName: string;
  applicantPhone?: string;
  applicantEmail?: string | null;
  preferredStartDate?: string;
  specialRequests?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  signatureImage?: string;
  signatureDate?: string;
  referralAgentCode?: string;
  referralSource?: string;
  primaryLanguage?: string;
  participants: Array<{
    participantType: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    passportNumber?: string;
    passportExpiry?: string;
    grade?: string;
    schoolName?: string;
    englishLevel?: string;
    medicalConditions?: string;
    dietaryRequirements?: string;
    specialNeeds?: string;
    relationshipToStudent?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    isEmergencyContact?: boolean;
  }>;
  // Resolved names (filled during send)
  programName?: string;
  packageName?: string;
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

function CampApplicationDocument({
  data,
  logoDataUri,
}: {
  data: CampAppEmailData;
  logoDataUri: string;
}) {
  const ce = React.createElement;

  const students = data.participants.filter(
    p => p.participantType === "child" || p.participantType === "primary_student"
  );
  const adults = data.participants.filter(p => p.participantType === "adult");

  const field = (label: string, value: string, full = false) =>
    ce(View, { style: full ? S.fieldBoxFull : S.fieldBox },
      ce(Text, { style: S.fieldLabel }, label),
      ce(Text, { style: S.fieldValue }, value),
    );

  return ce(Document, { title: `Camp Application ${data.applicationNumber}` },
    ce(Page, { size: "A4", style: S.page },

      // ── Header ──────────────────────────────────────────────────────────────
      ce(View, { style: S.headerRow },
        ce(View, { style: S.logoBox },
          logoDataUri
            ? ce(Image, { src: logoDataUri, style: { height: 34, maxWidth: 140, marginBottom: 4 } } as any)
            : ce(Text, { style: S.logoText }, "Edubee"),
          ce(Text, { style: S.logoSub }, "Educational Camp Platform"),
        ),
        ce(View, null,
          ce(Text, { style: S.appTitle }, "CAMP APPLICATION"),
          ce(Text, { style: S.appRef }, data.applicationNumber),
          ce(Text, { style: [S.appRef, { marginTop: 2 }] }, `Submitted: ${today()}`),
        ),
      ),

      // ── Orange divider ───────────────────────────────────────────────────────
      ce(View, { style: S.divider }),

      // ── Program Info ─────────────────────────────────────────────────────────
      ce(Text, { style: S.sectionTitle }, "Program Details"),
      ce(View, { style: S.fieldGrid },
        field("Program", val(data.programName)),
        field("Package", val(data.packageName)),
        field("Preferred Start Date", fmtDate(data.preferredStartDate)),
        field("Referral Agent Code", val(data.referralAgentCode)),
      ),

      ce(View, { style: S.thinDivider }),

      // ── Main Applicant ───────────────────────────────────────────────────────
      ce(Text, { style: S.sectionTitle }, "Main Applicant (Contact Person)"),
      ce(View, { style: S.fieldGrid },
        field("First Name", val(data.applicantFirstName)),
        field("Last Name", val(data.applicantLastName)),
        field("Phone", val(data.applicantPhone)),
        field("Email", val(data.applicantEmail)),
      ),

      ce(View, { style: S.thinDivider }),

      // ── Students ─────────────────────────────────────────────────────────────
      students.length > 0 && ce(View, null,
        ce(Text, { style: S.sectionTitle }, `Students (${students.length})`),
        ce(View, { style: S.tableHeader },
          ce(Text, { style: [S.tableHeaderCell, { flex: 2 }] }, "Name"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 1 }] }, "DOB"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 1 }] }, "Gender"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 1 }] }, "Nationality"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 1 }] }, "Grade"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 2 }] }, "School"),
        ),
        ...students.map((s, i) =>
          ce(View, { key: `s${i}`, style: S.tableRow },
            ce(Text, { style: [S.tableCell, { flex: 2 }] }, `${s.firstName} ${s.lastName}`),
            ce(Text, { style: [S.tableCellSm, { flex: 1 }] }, fmtDate(s.dateOfBirth)),
            ce(Text, { style: [S.tableCellSm, { flex: 1 }] }, val(s.gender)),
            ce(Text, { style: [S.tableCellSm, { flex: 1 }] }, val(s.nationality)),
            ce(Text, { style: [S.tableCellSm, { flex: 1 }] }, val(s.grade)),
            ce(Text, { style: [S.tableCellSm, { flex: 2 }] }, val(s.schoolName)),
          )
        ),
        // Medical/dietary notes per student
        ...students.filter(s => s.medicalConditions || s.dietaryRequirements || s.specialNeeds).map((s, i) =>
          ce(View, { key: `sm${i}`, style: { paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "#FEF9F3" } },
            ce(Text, { style: { fontSize: 8, color: "#C2410C", fontFamily: "Helvetica-Bold", marginBottom: 2 } },
              `${s.firstName} ${s.lastName} — Special Requirements`),
            s.medicalConditions ? ce(Text, { style: { fontSize: 8, color: "#1C1917" } }, `Medical: ${s.medicalConditions}`) : null,
            s.dietaryRequirements ? ce(Text, { style: { fontSize: 8, color: "#1C1917" } }, `Dietary: ${s.dietaryRequirements}`) : null,
            s.specialNeeds ? ce(Text, { style: { fontSize: 8, color: "#1C1917" } }, `Special Needs: ${s.specialNeeds}`) : null,
          )
        ),
        ce(View, { style: S.thinDivider }),
      ),

      // ── Accompanying Adults ──────────────────────────────────────────────────
      adults.length > 0 && ce(View, null,
        ce(Text, { style: S.sectionTitle }, `Accompanying Adults (${adults.length})`),
        ce(View, { style: S.tableHeader },
          ce(Text, { style: [S.tableHeaderCell, { flex: 2 }] }, "Name"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 1.5 }] }, "Relationship"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 2 }] }, "Phone"),
          ce(Text, { style: [S.tableHeaderCell, { flex: 1 }] }, "Emerg.Contact"),
        ),
        ...adults.map((a, i) =>
          ce(View, { key: `a${i}`, style: S.tableRow },
            ce(Text, { style: [S.tableCell, { flex: 2 }] }, `${a.firstName} ${a.lastName}`),
            ce(Text, { style: [S.tableCellSm, { flex: 1.5 }] }, val(a.relationshipToStudent)),
            ce(Text, { style: [S.tableCellSm, { flex: 2 }] }, val(a.phone)),
            ce(Text, { style: [S.tableCellSm, { flex: 1 }] }, a.isEmergencyContact ? "✓ Yes" : ""),
          )
        ),
        ce(View, { style: S.thinDivider }),
      ),

      // ── Emergency Contact ────────────────────────────────────────────────────
      (data.emergencyContactName || data.emergencyContactPhone) && ce(View, null,
        ce(Text, { style: S.sectionTitle }, "Emergency Contact"),
        ce(View, { style: S.fieldGrid },
          field("Name", val(data.emergencyContactName)),
          field("Phone", val(data.emergencyContactPhone)),
        ),
        ce(View, { style: S.thinDivider }),
      ),

      // ── Special Requests ─────────────────────────────────────────────────────
      data.specialRequests && ce(View, null,
        ce(Text, { style: S.sectionTitle }, "Special Requests / Notes"),
        ce(Text, { style: { fontSize: 9.5, color: "#1C1917", lineHeight: 1.5 } }, data.specialRequests),
        ce(View, { style: S.thinDivider }),
      ),

      // ── Signature ────────────────────────────────────────────────────────────
      ce(View, null,
        ce(Text, { style: S.sectionTitle }, "Agreement & Signature"),
        ce(View, { style: { flexDirection: "row", gap: 16 } },
          ce(View, { style: { flex: 1 } },
            ce(View, { style: S.sigBox },
              data.signatureImage
                ? ce(Image, { src: data.signatureImage, style: { height: 48 } } as any)
                : ce(Text, { style: { fontSize: 9, color: "#A8A29E", fontStyle: "italic" } }, "Signed electronically"),
              ce(Text, { style: [S.sigLabel, { marginTop: 6 }] }, `Date: ${fmtDate(data.signatureDate)}`),
            ),
          ),
          ce(View, { style: { flex: 1, paddingTop: 4 } },
            ce(Text, { style: { fontSize: 8.5, color: "#57534E", lineHeight: 1.5 } },
              "By signing this form, the applicant confirms that all information provided is accurate and agrees to the Terms & Conditions of the program."
            ),
          ),
        ),
      ),

      // ── Footer ──────────────────────────────────────────────────────────────
      ce(View, { style: S.footer },
        ce(Text, { style: S.footerText }, `${data.applicationNumber} · Edubee Camp Platform`),
        ce(Text, { style: S.footerText }, `Generated: ${today()}`),
      ),
    )
  );
}

// ─── Generate PDF Buffer ──────────────────────────────────────────────────────

async function generateCampApplicationPdf(data: CampAppEmailData): Promise<Buffer> {
  const logoDataUri = await getLogoDataUri();
  const element = React.createElement(CampApplicationDocument, { data, logoDataUri });
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}

// ─── Email HTML ───────────────────────────────────────────────────────────────

function buildNotificationHtml(data: CampAppEmailData, recipientType: "admin" | "partner") {
  const studentCount = data.participants.filter(p => p.participantType !== "adult").length;
  const adultCount   = 1 + data.participants.filter(p => p.participantType === "adult").length;
  const applicantName = `${data.applicantFirstName} ${data.applicantLastName}`.trim();

  const greeting = recipientType === "admin"
    ? "A new camp application has been submitted through your platform."
    : `A new camp application has been submitted via your partner link.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>New Camp Application</title></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;overflow:hidden;">

      <!-- Header -->
      <tr><td style="background:#F5821F;padding:28px 40px;text-align:left;">
        <div style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">Edubee</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">Camp Application Platform</div>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:36px 40px;">
        <div style="display:inline-block;background:#FEF0E3;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;color:#C2410C;margin-bottom:16px;">
          📋 New Application — ${data.applicationNumber}
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1C1917;">${applicantName}</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#57534E;">${greeting}</p>

        <!-- Summary Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF9;border-radius:8px;border:1px solid #E8E6E2;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;width:140px;">Application No</td>
                <td style="font-size:12px;font-weight:700;color:#1C1917;padding-bottom:10px;">${data.applicationNumber}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Applicant</td>
                <td style="font-size:12px;font-weight:700;color:#1C1917;padding-bottom:10px;">${applicantName}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Phone</td>
                <td style="font-size:12px;color:#1C1917;padding-bottom:10px;">${data.applicantPhone ?? "—"}</td>
              </tr>
              ${data.applicantEmail ? `<tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Email</td>
                <td style="font-size:12px;color:#1C1917;padding-bottom:10px;">${data.applicantEmail}</td>
              </tr>` : ""}
              <tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Program</td>
                <td style="font-size:12px;font-weight:700;color:#F5821F;padding-bottom:10px;">${data.programName ?? "—"}</td>
              </tr>
              ${data.packageName ? `<tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Package</td>
                <td style="font-size:12px;color:#1C1917;padding-bottom:10px;">${data.packageName}</td>
              </tr>` : ""}
              <tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Students</td>
                <td style="font-size:12px;color:#1C1917;padding-bottom:10px;">${studentCount} student${studentCount !== 1 ? "s" : ""}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Adults</td>
                <td style="font-size:12px;color:#1C1917;padding-bottom:10px;">${adultCount} adult${adultCount !== 1 ? "s" : ""}</td>
              </tr>
              ${data.emergencyContactName ? `<tr>
                <td style="font-size:12px;color:#78716C;padding-bottom:10px;">Emergency Contact</td>
                <td style="font-size:12px;color:#1C1917;padding-bottom:10px;">${data.emergencyContactName} · ${data.emergencyContactPhone ?? ""}</td>
              </tr>` : ""}
              ${data.referralAgentCode ? `<tr>
                <td style="font-size:12px;color:#78716C;">Referral Code</td>
                <td style="font-size:12px;color:#1C1917;">${data.referralAgentCode}</td>
              </tr>` : ""}
            </table>
          </td></tr>
        </table>

        <p style="margin:0;font-size:13px;color:#57534E;line-height:1.6;">
          📎 <strong>The full application is attached as a PDF.</strong><br>
          Please review and respond to the applicant within 2 business days.
        </p>

        ${data.specialRequests ? `
        <div style="background:#FEF9F3;border-left:3px solid #F5821F;border-radius:0 6px 6px 0;padding:12px 16px;margin-top:20px;">
          <div style="font-size:11px;font-weight:700;color:#C2410C;text-transform:uppercase;margin-bottom:4px;">Special Requests</div>
          <div style="font-size:13px;color:#1C1917;line-height:1.5;">${data.specialRequests}</div>
        </div>` : ""}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#F4F3F1;padding:16px 40px;border-top:1px solid #E8E6E2;text-align:center;">
        <p style="margin:0;font-size:11px;color:#A8A29E;">© 2026 Edubee Camp · Automated notification · Do not reply to this email</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function sendCampApplicationEmails(data: CampAppEmailData): Promise<void> {
  const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== "false";
  if (!EMAIL_ENABLED) {
    console.log("[CampEmail] EMAIL_ENABLED=false — skipping");
    return;
  }

  // Resolve API key: DB config takes priority, then env vars
  let apiKey    = process.env.RESEND_API_KEY ?? "";
  let fromEmail = process.env.RESEND_FROM ?? process.env.FROM_EMAIL ?? "noreply@edubee.co";
  const fromName = "Edubee Camp";

  try {
    const cfg = await getResendConfig();
    if (cfg["resend.apiKey"]) apiKey    = cfg["resend.apiKey"];
    if (cfg["resend.from"])   fromEmail = cfg["resend.from"];
  } catch { /* ignore */ }

  if (!apiKey) {
    console.warn("[CampEmail] Resend API key not configured — skipping email notifications");
    return;
  }

  // ── Resolve program & package names ────────────────────────────────────────
  try {
    const [pgRow] = await db.select({ name: packageGroups.nameEn })
      .from(packageGroups).where(eq(packageGroups.id, data.packageGroupId));
    data.programName = pgRow?.name ?? undefined;

    if (data.packageId) {
      const [pkgRow] = await db.select({ name: packages.name })
        .from(packages).where(eq(packages.id, data.packageId));
      data.packageName = pkgRow?.name ?? undefined;
    }
  } catch (err) {
    console.warn("[CampEmail] Failed to resolve program/package names:", err);
  }

  // ── Resolve admin email ─────────────────────────────────────────────────────
  let adminEmail: string | null = null;
  try {
    const [pgRow] = await db.select({ orgId: packageGroups.organisationId })
      .from(packageGroups).where(eq(packageGroups.id, data.packageGroupId));

    if (pgRow?.orgId) {
      const [org] = await db.select({ email: organisations.email, companyEmail: organisations.companyEmail })
        .from(organisations).where(eq(organisations.id, pgRow.orgId));
      adminEmail = org?.email ?? org?.companyEmail ?? null;

      if (!adminEmail) {
        const [adminUser] = await db.select({ email: users.email })
          .from(users)
          .where(and(eq(users.organisationId, pgRow.orgId), eq(users.role, "admin")));
        adminEmail = adminUser?.email ?? null;
      }
    }
  } catch (err) {
    console.warn("[CampEmail] Failed to resolve admin email:", err);
  }

  // ── Resolve partner email ───────────────────────────────────────────────────
  let partnerEmail: string | null = null;
  let emailNotification = "both";
  if (data.referralAgentCode) {
    try {
      const [partnerRow] = await db
        .select({
          partnerEmailOverride: applicationFormPartners.partnerEmailOverride,
          emailNotification: applicationFormPartners.emailNotification,
          accountId: applicationFormPartners.partnerAccountId,
        })
        .from(applicationFormPartners)
        .where(eq(applicationFormPartners.partnerParameter, data.referralAgentCode));

      if (partnerRow) {
        emailNotification = partnerRow.emailNotification ?? "both";
        if (partnerRow.partnerEmailOverride) {
          partnerEmail = partnerRow.partnerEmailOverride;
        } else if (partnerRow.accountId) {
          const [acc] = await db.select({ email: accounts.email })
            .from(accounts).where(eq(accounts.id, partnerRow.accountId));
          partnerEmail = acc?.email ?? null;
        }
      }
    } catch (err) {
      console.warn("[CampEmail] Failed to resolve partner email:", err);
    }
  }

  // ── Generate PDF ────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateCampApplicationPdf(data);
  } catch (err) {
    console.error("[CampEmail] PDF generation failed:", err);
  }

  const subject = `New Camp Application — ${data.applicantFirstName} ${data.applicantLastName} (${data.applicationNumber})`;
  const attachments = pdfBuffer
    ? [{ filename: `${data.applicationNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
    : [];

  const resend = new Resend(apiKey);

  // ── Send to admin ───────────────────────────────────────────────────────────
  const shouldNotifyAdmin = emailNotification !== "partner";
  if (adminEmail && shouldNotifyAdmin) {
    try {
      const res = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: adminEmail,
        subject,
        html: buildNotificationHtml(data, "admin"),
        attachments,
      } as any);
      if (res.error) throw new Error(res.error.message);
      console.log(`[CampEmail] Admin email sent → ${adminEmail} (${res.data?.id})`);
    } catch (err) {
      console.error("[CampEmail] Admin email failed:", err);
    }
  } else {
    console.log(`[CampEmail] Admin email skipped — adminEmail=${adminEmail}, notify=${emailNotification}`);
  }

  // ── Send to partner ─────────────────────────────────────────────────────────
  const shouldNotifyPartner = emailNotification === "both" || emailNotification === "partner";
  if (partnerEmail && shouldNotifyPartner) {
    try {
      const res = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: partnerEmail,
        subject,
        html: buildNotificationHtml(data, "partner"),
        attachments,
      } as any);
      if (res.error) throw new Error(res.error.message);
      console.log(`[CampEmail] Partner email sent → ${partnerEmail} (${res.data?.id})`);
    } catch (err) {
      console.error("[CampEmail] Partner email failed:", err);
    }
  } else if (data.referralAgentCode) {
    console.log(`[CampEmail] Partner email skipped — partnerEmail=${partnerEmail}, notify=${emailNotification}`);
  }
}
