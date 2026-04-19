import { Router } from "express";
import { db } from "@workspace/db";
import { contacts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { authenticatePortal } from "../middleware/authenticatePortal.js";
import { maskPassport } from "../lib/crypto.js";
import { z } from "zod";

const router = Router();

// ── 인증: staff 또는 portal 토큰 모두 허용 ──────────────────────────────────
function authAny(req: any, res: any, next: any) {
  authenticate(req, res, (staffErr?: any) => {
    if (!staffErr && req.user) return next();
    authenticatePortal(req, res, (portalErr?: any) => {
      if (!portalErr && req.user) return next();
      return res.status(401).json({ error: "Unauthorized" });
    });
  });
}

// ── GET /api/my-data — APP 12: 자기 개인정보 열람 ───────────────────────────
router.get("/my-data", authAny, async (req, res) => {
  try {
    const user = req.user as any;
    const email = user.email;

    // 연락처 정보 조회 (이메일 기준)
    const [contact] = email
      ? await db.select({
          id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName,
          fullName: contacts.fullName, email: contacts.email, phone: contacts.phone,
          dob: contacts.dob, nationality: contacts.nationality,
          passportNo: contacts.passportNo,
          privacyConsent: contacts.privacyConsent, marketingConsent: contacts.marketingConsent,
          createdAt: contacts.createdAt,
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
    console.error("[GET /my-data]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/my-data/correction-request — APP 13: 데이터 수정 요청 ─────────
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

    // 실제 운영에서는 correction_requests 테이블에 저장 + 이메일 발송
    console.log(`[DATA CORRECTION REQUEST] ${requestId}`, {
      requester: user.email,
      fieldName, currentValue, requestedValue, reason,
    });

    return res.json({
      success: true,
      requestId,
      message: "Your correction request has been received and will be reviewed within 30 days as required by APP 13.",
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[POST /my-data/correction-request]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/my-data/export — 전체 데이터 다운로드 (Data Portability) ────────
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
    console.error("[GET /my-data/export]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
