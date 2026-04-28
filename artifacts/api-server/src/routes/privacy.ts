import { Router } from "express";
import { db } from "@workspace/db";
import { contacts, leads } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { z } from "zod";

const router = Router();

// ── GET /api/privacy-policy ─────────────────────────────────────────────────
// Public endpoint — no login required
router.get("/privacy-policy", (_req, res) => {
  res.json({
    version: "1.1",
    effectiveDate: "2026-04-19",
    operator: {
      name: "Edubee.Co",
      address: "Suite 804, 343 Little Collins Street, Melbourne VIC 3000, Australia",
      email: "privacy@edubee.co",
      phone: "+61 3 9000 0000",
    },
    summary: "Edubee collects and manages personal information in accordance with the Australian Privacy Act 1988 (Cth) and the 13 Australian Privacy Principles (APPs).",
    dataCollected: [
      "Personal identification (full name, email address, phone number, date of birth)",
      "Government identifiers (passport number, visa number) — stored with AES-256 encryption",
      "Health and medical information (where voluntarily provided, e.g., dietary needs, medical conditions)",
      "Financial information (payment records, invoice history)",
      "Usage data (login timestamps, IP address, user agent for security purposes)",
    ],
    purposeOfCollection: [
      "Providing education agency and migration-related services",
      "Processing applications and managing bookings",
      "Sending service-related communications",
      "Complying with Australian legal and regulatory obligations",
    ],
    sensitiveInformation: {
      note: "Where sensitive information (health, passport details) is collected, it is used only for the primary purpose of providing our services and is stored with encryption.",
      minorPolicy: "For individuals under 18 years of age, parental or guardian consent is required before collecting sensitive personal information such as medical conditions or passport details.",
    },
    thirdPartyDisclosure: [
      {
        name: "Stripe Inc.",
        country: "United States",
        purpose: "Payment processing for subscription and service fees",
        safeguard: "Standard Contractual Clauses (APP 8 compliant)",
        privacyPolicy: "https://stripe.com/privacy",
      },
      {
        name: "Resend Inc.",
        country: "United States",
        purpose: "Transactional email communications (confirmations, notifications)",
        safeguard: "Standard Contractual Clauses (APP 8 compliant)",
        privacyPolicy: "https://resend.com/privacy",
      },
      {
        name: "Google LLC (Gemini AI / Cloud Storage)",
        country: "United States / Multiple regions",
        purpose: "AI-assisted document processing and secure file storage",
        safeguard: "Google Cloud Data Processing Addendum (APP 8 compliant)",
        privacyPolicy: "https://policies.google.com/privacy",
      },
    ],
    crossBorderDisclosure: "By using our services, you acknowledge that your personal information may be transferred to and processed in countries outside Australia. We take reasonable steps to ensure overseas recipients handle your information in accordance with the APPs.",
    dataRetention: "Personal information is retained for a minimum of 7 years in accordance with Australian tax and record-keeping obligations, unless a shorter period is required by law or you request earlier deletion.",
    yourRights: [
      "Access: You may request access to the personal information we hold about you (APP 12).",
      "Correction: You may request correction of inaccurate personal information (APP 13).",
      "Erasure: You may request deletion of your personal information, subject to legal retention requirements.",
      "Complaint: You may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at www.oaic.gov.au.",
    ],
    contactForPrivacy: "For privacy enquiries, data access requests, or complaints, contact: privacy@edubee.co",
    notifiableDataBreaches: "In the event of an eligible data breach, Edubee will notify affected individuals and the OAIC as required under the Notifiable Data Breaches (NDB) Scheme.",
  });
});

// ── POST /api/privacy-consent ────────────────────────────────────────────────
// Record privacy consent (authentication required)
const ConsentSchema = z.object({
  entityType: z.enum(["contact", "lead"]),
  entityId: z.string().uuid(),
  consentType: z.enum(["privacy", "marketing", "both"]),
  consentGiven: z.boolean(),
});

router.post("/privacy-consent", authenticate, async (req, res) => {
  try {
    const parsed = ConsentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const { entityType, entityId, consentType, consentGiven } = parsed.data;

    if (entityType === "contact") {
      const updates: Record<string, any> = {};
      if (consentType === "privacy" || consentType === "both") updates.privacyConsent = consentGiven;
      if (consentType === "marketing" || consentType === "both") updates.marketingConsent = consentGiven;
      await db.update(contacts).set(updates).where(eq(contacts.id, entityId));
    } else if (entityType === "lead") {
      const updates: Record<string, any> = {};
      if (consentType === "privacy" || consentType === "both") updates.privacyConsent = consentGiven;
      if (consentType === "marketing" || consentType === "both") updates.marketingConsent = consentGiven;
      await db.update(leads).set(updates).where(eq(leads.id, entityId));
    }

    return res.json({
      success: true,
      message: `Consent (${consentType}) recorded for ${entityType} ${entityId}`,
      consentGiven,
      recordedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[POST /privacy-consent]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/privacy-consent/:entityType/:entityId ──────────────────────────
router.get("/privacy-consent/:entityType/:entityId", authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params as Record<string, string>;
    if (!["contact", "lead"].includes(entityType)) {
      return res.status(400).json({ error: "entityType must be 'contact' or 'lead'" });
    }

    if (entityType === "contact") {
      const [row] = await db
        .select({ privacyConsent: contacts.privacyConsent, marketingConsent: contacts.marketingConsent })
        .from(contacts).where(eq(contacts.id, entityId)).limit(1);
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    } else {
      const [row] = await db
        .select({ privacyConsent: (leads as any).privacyConsent, marketingConsent: (leads as any).marketingConsent })
        .from(leads).where(eq(leads.id, entityId)).limit(1);
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    }
  } catch (err) {
    console.error("[GET /privacy-consent]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
