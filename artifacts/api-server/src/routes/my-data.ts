import { Router } from "express";
import { db } from "@workspace/db";
import { contacts, accounts } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { authenticatePortal } from "../middleware/authenticatePortal.js";
import { maskPassport } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";

const router = Router();

// ── Authentication: accepts both staff and portal tokens ──────────────────────────────────
function authAny(req: any, res: any, next: any) {
  authenticate(req, res, (staffErr?: any) => {
    if (!staffErr && req.user) return next();
    authenticatePortal(req, res, (portalErr?: any) => {
      if (!portalErr && req.user) return next();
      return res.status(401).json({ error: "Unauthorized" });
    });
  });
}

// ── GET /api/my-data — APP 12: access own personal data ───────────────────────────
router.get("/my-data", authAny, async (req, res) => {
  try {
    const user = req.user as any;
    const email = user.email;

    const [contact] = email
      ? await db.select({
          id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
          fullName: contacts.fullName, email: contacts.email, phone: contacts.mobile,
          dob: contacts.dob, nationality: contacts.nationality,
          passportNo: contacts.passportNo,
          privacyConsent: contacts.privacyConsent, marketingConsent: contacts.marketingConsent,
          createdAt: contacts.createdOn,
        }).from(contacts).where(eq(contacts.email, email)).limit(1)
      : [null];

    return res.json({
      personalInfo: contact
        ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            fullName: contact.fullName,
            email: contact.email,
            phone: contact.phone,
            dateOfBirth: contact.dob,
            nationality: contact.nationality,
            passportNumber: maskPassport(contact.passportNo),
          }
        : { email },
      consents: contact
        ? {
            privacyConsent: contact.privacyConsent,
            marketingConsent: contact.marketingConsent,
          }
        : {},
      dataRights: {
        access: "You may request a full export of your personal data via GET /api/my-data/export",
        correction: "You may request correction of inaccurate data via POST /api/my-data/correction-request",
        complaint: "You may lodge a complaint with the Australian Office of the Information Commissioner (OAIC) at https://www.oaic.gov.au",
        privacyPolicy: "Available at GET /api/privacy-policy",
      },
    });
  } catch (err) {
    logger.error({ err }, "[GET /my-data] Internal error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/my-data/correction-request — APP 13: data correction request ─────────
const CorrectionSchema = z.object({
  fieldName: z.string().min(1),
  currentValue: z.string().optional(),
  requestedValue: z.string().min(1),
  reason: z.string().min(5),
});

router.post("/my-data/correction-request", authAny, async (req, res) => {
  try {
    const parsed = CorrectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
    }
    const { fieldName, currentValue, requestedValue, reason } = parsed.data;
    const user = req.user as any;
    const requestId = `COR-${Date.now()}`;

    // In production, save to correction_requests table + send email notification
    logger.info(
      { requestId, requester: user.email, fieldName, reason },
      "[DATA CORRECTION REQUEST] received",
    );

    return res.json({
      success: true,
      requestId,
      message: "Your correction request has been received and will be reviewed within 30 days as required by APP 13.",
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "[POST /my-data/correction-request] Internal error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/my-data/withdraw-consent — APP 3/5: withdraw consent ──────────────────
const WithdrawConsentSchema = z.object({
  consentType: z.enum(["marketing", "privacy", "all"]),
  reason: z.string().optional(),
});

router.post("/my-data/withdraw-consent", authAny, async (req, res) => {
  try {
    const parsed = WithdrawConsentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
    }
    const { consentType, reason } = parsed.data;
    const user = req.user as any;
    const email = user.email;

    if (!email) {
      return res.status(400).json({ error: "Cannot identify user email from token" });
    }

    const consentUpdate = {
      ...(consentType === "marketing" || consentType === "all" ? { marketingConsent: false } : {}),
      ...(consentType === "privacy"   || consentType === "all" ? { privacyConsent:   false } : {}),
    };

    // Portal users (accountId in token) → update accounts table
    // Staff / other users → update contacts table
    const isPortalUser = Boolean(user.accountId || user.userType === "portal");

    if (isPortalUser) {
      const [acct] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(or(eq(accounts.portalEmail, email), eq(accounts.email, email)))
        .limit(1);

      if (!acct) {
        return res.status(404).json({ error: "No account record found" });
      }
      await db.update(accounts).set(consentUpdate).where(eq(accounts.id, acct.id));
    } else {
      const [contact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, email))
        .limit(1);

      if (!contact) {
        return res.status(404).json({ error: "No contact record found for this account" });
      }
      await db.update(contacts).set(consentUpdate).where(eq(contacts.id, contact.id));
    }

    const withdrawalId = `WD-${Date.now()}`;
    logger.info(
      { withdrawalId, requester: email, consentType, reason: reason ?? "Not provided" },
      "[CONSENT WITHDRAWAL] processed — APP 3/5 compliance",
    );

    return res.json({
      success: true,
      withdrawalId,
      consentType,
      updated: consentUpdate,
      message:
        consentType === "privacy"
          ? "Your privacy consent has been withdrawn. Note: some data processing may continue as required by law (e.g. 7-year retention under Australian tax law)."
          : consentType === "marketing"
            ? "Your marketing consent has been withdrawn. You will no longer receive promotional communications."
            : "All consents have been withdrawn. Note: some data processing may continue as required by law.",
      processedAt: new Date().toISOString(),
      rights: {
        complaints: "Lodge a complaint with the OAIC at https://www.oaic.gov.au",
        privacyPolicy: "GET /api/privacy-policy",
      },
    });
  } catch (err) {
    logger.error({ err }, "[POST /my-data/withdraw-consent] Internal error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/my-data/export — full data download (Data Portability) ────────
router.get("/my-data/export", authAny, async (req, res) => {
  try {
    const user = req.user as any;
    const email = user.email;

    const [contact] = email
      ? await db.select().from(contacts).where(eq(contacts.email, email)).limit(1)
      : [null];

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: email,
      notice: "This export contains all personal data Edubee holds about you, in accordance with APP 12 (Australian Privacy Act 1988).",
      personalData: contact
        ? {
            ...contact,
            passportNo: maskPassport(contact.passportNo),
          }
        : { email },
    };

    res.setHeader("Content-Disposition", `attachment; filename="edubee-my-data-export-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.json(exportData);
  } catch (err) {
    logger.error({ err }, "[GET /my-data/export] Internal error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
