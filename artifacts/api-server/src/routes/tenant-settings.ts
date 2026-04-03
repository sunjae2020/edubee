import { Router } from "express";
import { db } from "@workspace/db";
import { organisations, tenantInvitations, platformPlans, domainConfigs } from "@workspace/db/schema";
import { eq, and, ne, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import dns from "dns/promises";
import { isReservedSubdomain } from "../utils/reservedSubdomains.js";
import { sendInvitationEmail } from "../services/emailService.js";
import { createCheckoutSession, createPortalSession } from "../services/stripeService.js";

const router = Router();

// Only admin/super_admin can access settings
const settingsAccess = [authenticate, requireRole("super_admin", "admin")];
const anyUser        = [authenticate];

// ── Helper: get the single organisation (MVP: single-tenant) ─────────────────
async function getOrg() {
  const rows = await db.select().from(organisations).orderBy(asc(organisations.createdOn)).limit(1);
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Company Profile
// ─────────────────────────────────────────────────────────────────────────────

router.get("/company", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });
    return res.json(org);
  } catch (err) {
    console.error("GET /api/settings/company", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/company", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const {
      name, tradingName, abn, phone, companyEmail, websiteUrl, description,
      addressLine1, addressLine2, city, state, postcode, country,
      bankName, bankAccName, bankBsb, bankAccNumber, bankSwift,
      timezone, defaultCurrency, defaultLanguage,
    } = req.body;

    const [updated] = await db
      .update(organisations)
      .set({
        ...(name            !== undefined && { name }),
        ...(tradingName     !== undefined && { tradingName }),
        ...(abn             !== undefined && { abn }),
        ...(phone           !== undefined && { phone }),
        ...(companyEmail    !== undefined && { companyEmail }),
        ...(websiteUrl      !== undefined && { websiteUrl }),
        ...(description     !== undefined && { description }),
        ...(addressLine1    !== undefined && { addressLine1 }),
        ...(addressLine2    !== undefined && { addressLine2 }),
        ...(city            !== undefined && { city }),
        ...(state           !== undefined && { state }),
        ...(postcode        !== undefined && { postcode }),
        ...(country         !== undefined && { country }),
        ...(bankName        !== undefined && { bankName }),
        ...(bankAccName     !== undefined && { bankAccName }),
        ...(bankBsb         !== undefined && { bankBsb }),
        ...(bankAccNumber   !== undefined && { bankAccNumber }),
        ...(bankSwift       !== undefined && { bankSwift }),
        ...(timezone        !== undefined && { timezone }),
        ...(defaultCurrency !== undefined && { defaultCurrency }),
        ...(defaultLanguage !== undefined && { defaultLanguage }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, org.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/settings/company", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────

router.get("/branding", ...anyUser, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });
    return res.json({
      logoUrl:        org.logoUrl,
      faviconUrl:     org.faviconUrl,
      primaryColor:   org.primaryColor,
      secondaryColor: org.secondaryColor,
      accentColor:    org.accentColor,
      customCss:      org.customCss,
    });
  } catch (err) {
    console.error("GET /api/settings/branding", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/branding", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const { logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, customCss } = req.body;

    const [updated] = await db
      .update(organisations)
      .set({
        ...(logoUrl        !== undefined && { logoUrl }),
        ...(faviconUrl     !== undefined && { faviconUrl }),
        ...(primaryColor   !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor    !== undefined && { accentColor }),
        ...(customCss      !== undefined && { customCss }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, org.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/settings/branding", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Domain & Access
// ─────────────────────────────────────────────────────────────────────────────

router.get("/domain", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });
    return res.json({
      subdomain:    org.subdomain,
      customDomain: org.customDomain,
      planType:     org.planType,
      dnsStatus:    org.dnsStatus   ?? null,
      sslStatus:    org.sslStatus   ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/domain", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const { subdomain, customDomain } = req.body;
    const [updated] = await db
      .update(organisations)
      .set({
        ...(subdomain    !== undefined && { subdomain }),
        ...(customDomain !== undefined && { customDomain }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, org.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/domain/check", ...settingsAccess, async (req, res) => {
  try {
    const { subdomain } = req.body as { subdomain: string };
    if (!subdomain) return res.status(400).json({ error: "subdomain required" });

    if (isReservedSubdomain(subdomain)) {
      return res.json({
        available: false,
        reason: "reserved",
        message: "시스템에서 사용 중인 예약어입니다.",
      });
    }

    const org = await getOrg();
    const rows = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(
        org
          ? and(eq(organisations.subdomain, subdomain), ne(organisations.id, org.id))
          : eq(organisations.subdomain, subdomain)
      )
      .limit(1);

    return res.json({ available: rows.length === 0, subdomain });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Plan & Billing
// ─────────────────────────────────────────────────────────────────────────────

router.get("/plan", ...anyUser, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const userCount = await db.execute(
      sql`SELECT COUNT(*)::int AS cnt FROM users WHERE status = 'active' OR status IS NULL`
    );
    const r = (x: any) => x.rows ?? (x as any[]);
    const cnt = parseInt(r(userCount)[0]?.cnt ?? "0");

    return res.json({
      planType:       org.planType,
      planStatus:     org.planStatus,
      trialEndsAt:    org.trialEndsAt,
      subscriptionId: org.subscriptionId,
      maxUsers:       org.maxUsers,
      maxStudents:    org.maxStudents,
      features:       org.features,
      currentUsers:   cnt,
    });
  } catch (err) {
    console.error("GET /api/settings/plan", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/plans/available", ...anyUser, async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.isActive, true))
      .orderBy(platformPlans.priceMonthly);
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Users & Invitations
// ─────────────────────────────────────────────────────────────────────────────

router.get("/users", ...settingsAccess, async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, full_name, email, role, is_active, created_at, last_login_at
          FROM users ORDER BY full_name`
    );
    const r = (x: any) => x.rows ?? (x as any[]);
    return res.json(r(rows));
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invitations", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const invs = await db
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.organisationId, org.id))
      .orderBy(tenantInvitations.createdOn);

    return res.json(invs);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/invitations", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const { email, role } = req.body as { email: string; role: string };
    if (!email || !role) return res.status(400).json({ error: "email and role are required" });

    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [inv] = await db
      .insert(tenantInvitations)
      .values({
        organisationId: org.id,
        email:          email.toLowerCase().trim(),
        role,
        token,
        invitedBy:      (req as any).user?.id ?? null,
        expiresAt,
        status:         "Pending",
      })
      .returning();

    // Send invitation email — failure does NOT rollback the invitation record
    const emailResult = await sendInvitationEmail({
      toEmail:     email.toLowerCase().trim(),
      inviterName: (req as any).user?.fullName ?? 'Admin',
      companyName: org.name ?? 'Edubee CRM',
      role,
      inviteToken: token,
      subdomain:   org.subdomain ?? null,
      expiresAt,
    }).catch((err) => {
      console.error('[EMAIL] Invitation email exception:', err);
      return { success: false as const, error: String(err) };
    });

    return res.status(201).json({
      ...inv,
      emailSent:  emailResult.success,
      emailError: emailResult.success ? undefined : emailResult.error,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "An invitation for this email already exists" });
    }
    console.error("POST /api/settings/invitations", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/invitations/:id", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    await db
      .delete(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.id, req.params.id),
          eq(tenantInvitations.organisationId, org.id)
        )
      );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// BRANDING UPLOAD — Fix 14~15
// Base64 → DB 직접 저장 (Replit PostgreSQL Helium / GCS 차단)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Fix 14 — POST /branding/logo : 로고 업로드
// Body: { logoBase64: "data:image/png;base64,..." }
// ─────────────────────────────────────────────────────────────
router.post("/branding/logo", ...settingsAccess, async (req, res) => {
  try {
    const { logoBase64 } = req.body;
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "Organisation not found" });

    if (!logoBase64) {
      return res.status(400).json({ message: "로고 이미지 데이터가 없습니다." });
    }

    const base64Regex = /^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,/;
    if (!base64Regex.test(logoBase64)) {
      return res.status(400).json({
        message: "PNG, JPG, SVG, WEBP 형식의 이미지만 업로드 가능합니다.",
      });
    }

    const base64Data    = logoBase64.split(",")[1] ?? "";
    const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
    const MAX_BYTES     = 2 * 1024 * 1024; // 2MB

    if (estimatedBytes > MAX_BYTES) {
      return res.status(400).json({
        message: "로고 파일은 2MB 이하여야 합니다.",
        estimatedSize: `${(estimatedBytes / 1024).toFixed(0)}KB`,
      });
    }

    await db
      .update(organisations)
      .set({ logoUrl: logoBase64, modifiedOn: new Date() })
      .where(eq(organisations.id, org.id));

    return res.json({ success: true, logoUrl: logoBase64, message: "로고가 저장됐습니다." });
  } catch (err) {
    console.error("[POST /branding/logo]", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 15 — POST /branding/favicon : 파비콘 업로드
// Body: { faviconBase64: "data:image/png;base64,..." }
// ─────────────────────────────────────────────────────────────
router.post("/branding/favicon", ...settingsAccess, async (req, res) => {
  try {
    const { faviconBase64 } = req.body;
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "Organisation not found" });

    if (!faviconBase64) {
      return res.status(400).json({ message: "파비콘 이미지 데이터가 없습니다." });
    }

    const base64Regex = /^data:image\/(x-icon|vnd\.microsoft\.icon|png);base64,/;
    if (!base64Regex.test(faviconBase64)) {
      return res.status(400).json({
        message: "ICO 또는 PNG 형식의 파비콘만 업로드 가능합니다.",
      });
    }

    const base64Data     = faviconBase64.split(",")[1] ?? "";
    const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
    const MAX_BYTES      = 500 * 1024; // 500KB

    if (estimatedBytes > MAX_BYTES) {
      return res.status(400).json({
        message: "파비콘 파일은 500KB 이하여야 합니다.",
        estimatedSize: `${(estimatedBytes / 1024).toFixed(0)}KB`,
      });
    }

    await db
      .update(organisations)
      .set({ faviconUrl: faviconBase64, modifiedOn: new Date() })
      .where(eq(organisations.id, org.id));

    return res.json({ success: true, faviconUrl: faviconBase64, message: "파비콘이 저장됐습니다." });
  } catch (err) {
    console.error("[POST /branding/favicon]", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ═══════════════════════════════════════════════════════════════
// DOMAIN API — Fix 8~13
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Fix 8 — PUT /domain/subdomain : 서브도메인 저장
// ─────────────────────────────────────────────────────────────
router.put("/domain/subdomain", ...settingsAccess, async (req, res) => {
  try {
    const { subdomain } = req.body;
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "Organisation not found" });

    if (!subdomain) {
      return res.status(400).json({ message: "서브도메인을 입력해 주세요." });
    }

    if (!/^[a-z0-9-]{3,50}$/.test(subdomain)) {
      return res.status(400).json({
        message: "서브도메인은 소문자, 숫자, 하이픈만 사용 가능하며 3~50자여야 합니다.",
      });
    }

    if (isReservedSubdomain(subdomain)) {
      return res.status(400).json({
        available: false,
        reason: "reserved",
        message: "시스템에서 사용 중인 예약어입니다.",
      });
    }

    const duplicate = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(and(eq(organisations.subdomain, subdomain), ne(organisations.id, org.id)))
      .limit(1);

    if (duplicate.length > 0) {
      return res.status(409).json({ available: false, message: "이미 사용 중인 서브도메인입니다." });
    }

    await db
      .update(organisations)
      .set({ subdomain, modifiedOn: new Date() })
      .where(eq(organisations.id, org.id));

    return res.json({ success: true, subdomain, fullDomain: `${subdomain}.edubee.co` });
  } catch (err) {
    console.error("[PUT /domain/subdomain]", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 9 — PUT /domain/custom : 커스텀 도메인 등록
// ─────────────────────────────────────────────────────────────
router.put("/domain/custom", ...settingsAccess, async (req, res) => {
  try {
    const { customDomain } = req.body;
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "테넌트를 찾을 수 없습니다." });

    if (!customDomain) {
      return res.status(400).json({ message: "도메인을 입력해 주세요." });
    }

    if (org.planType === "starter" || org.planType === "solo") {
      return res.status(403).json({
        message: "커스텀 도메인은 Growth 플랜 이상에서 사용 가능합니다.",
        currentPlan: org.planType,
      });
    }

    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(customDomain)) {
      return res.status(400).json({ message: "유효하지 않은 도메인 형식입니다." });
    }

    const txtToken  = `edubee-verify-${Math.random().toString(36).slice(2, 12)}`;
    const dnsTarget = org.subdomain ? `${org.subdomain}.edubee.co` : "app.edubee.co";

    await db
      .insert(domainConfigs)
      .values({
        organisationId:       org.id,
        customDomain,
        dnsRecordType:        "CNAME",
        dnsRecordName:        "@",
        dnsRecordValue:       dnsTarget,
        dnsVerificationToken: txtToken,
        dnsStatus:            "pending",
        sslStatus:            "pending",
        status:               "Active",
        checkAttempts:        0,
        errorMessage:         null,
        dnsVerifiedAt:        null,
      })
      .onConflictDoUpdate({
        target: domainConfigs.organisationId,
        set: {
          customDomain,
          dnsRecordValue:       dnsTarget,
          dnsVerificationToken: txtToken,
          dnsStatus:            "pending",
          sslStatus:            "pending",
          status:               "Active",
          checkAttempts:        0,
          errorMessage:         null,
          dnsVerifiedAt:        null,
          modifiedOn:           new Date(),
        },
      });

    await db
      .update(organisations)
      .set({ customDomain, modifiedOn: new Date() })
      .where(eq(organisations.id, org.id));

    return res.json({
      success: true,
      customDomain,
      dnsTarget,
      txtVerificationToken: txtToken,
      message: "커스텀 도메인이 등록됐습니다. DNS 레코드 설정 후 인증을 진행해 주세요.",
    });
  } catch (err) {
    console.error("[PUT /domain/custom]", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 10 — GET /domain/dns-instructions : DNS 레코드 설정 안내
// ─────────────────────────────────────────────────────────────
router.get("/domain/dns-instructions", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "Organisation not found" });

    const [cfg] = await db
      .select()
      .from(domainConfigs)
      .where(
        and(
          eq(domainConfigs.organisationId, org.id),
          eq(domainConfigs.status, "Active"),
        ),
      )
      .limit(1);

    if (!cfg) {
      return res.status(404).json({ message: "등록된 커스텀 도메인이 없습니다." });
    }

    return res.json({
      subdomain: {
        description: "서브도메인은 Edubee가 자동으로 관리합니다. 별도 DNS 설정이 필요하지 않습니다.",
        currentUrl:  org.subdomain ? `${org.subdomain}.edubee.co` : null,
      },
      customDomain: {
        domain: cfg.customDomain,
        cnameRecord: {
          type:  "CNAME",
          host:  cfg.dnsRecordName ?? "@",
          value: cfg.dnsRecordValue,
          ttl:   3600,
        },
        txtRecord: {
          type:  "TXT",
          host:  "_edubee-verify",
          value: cfg.dnsVerificationToken,
          ttl:   3600,
        },
        providerGuides: {
          cloudflare:   "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/",
          godaddy:      "https://www.godaddy.com/help/add-a-cname-record-19236",
          namecheap:    "https://www.namecheap.com/support/knowledgebase/article.aspx/9646/",
          route53:      "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html",
          crazyDomains: "https://www.crazydomains.com.au/help/cname-records/",
          melbourneIT:  "https://help.melbourneit.com.au",
        },
        propagationNote: "DNS 변경 사항이 전 세계에 전파되는 데 최대 48시간이 소요될 수 있습니다.",
      },
    });
  } catch (err) {
    console.error("[GET /domain/dns-instructions]", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 11 — POST /domain/custom/verify : DNS 인증 실행
// ─────────────────────────────────────────────────────────────
router.post("/domain/custom/verify", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "Organisation not found" });

    const [cfg] = await db
      .select()
      .from(domainConfigs)
      .where(
        and(
          eq(domainConfigs.organisationId, org.id),
          eq(domainConfigs.status, "Active"),
        ),
      )
      .limit(1);

    if (!cfg || !cfg.customDomain) {
      return res.status(404).json({ message: "등록된 커스텀 도메인이 없습니다." });
    }

    const now = new Date();

    let txtVerified = false;
    try {
      const txtRecords = await dns.resolveTxt(`_edubee-verify.${cfg.customDomain}`);
      txtVerified = txtRecords.some((record) =>
        record.join("").includes(cfg.dnsVerificationToken ?? ""),
      );
    } catch {
      txtVerified = false;
    }

    let cnameVerified = false;
    try {
      const cnameRecords = await dns.resolveCname(cfg.customDomain);
      cnameVerified = cnameRecords.some((r) => r.includes(cfg.dnsRecordValue ?? ""));
    } catch {
      cnameVerified = false;
    }

    const verified    = txtVerified && cnameVerified;
    const newAttempts = (cfg.checkAttempts ?? 0) + 1;

    await db
      .update(domainConfigs)
      .set({
        dnsStatus:     verified ? "verified" : "failed",
        dnsVerifiedAt: verified ? now : null,
        sslStatus:     "pending",
        checkAttempts: newAttempts,
        lastCheckedAt: now,
        errorMessage:  verified
          ? null
          : `TXT: ${txtVerified ? "확인됨" : "미확인"}  CNAME: ${cnameVerified ? "확인됨" : "미확인"}`,
        modifiedOn: now,
      })
      .where(eq(domainConfigs.id, cfg.id));

    if (verified) {
      await db
        .update(organisations)
        .set({ dnsStatus: "verified", dnsVerifiedAt: now, modifiedOn: now })
        .where(eq(organisations.id, org.id));
    }

    return res.json({
      success:            verified,
      verificationStatus: verified ? "verified" : "failed",
      txtVerified,
      cnameVerified,
      checkAttempts:      newAttempts,
      checkedAt:          now,
      message: verified
        ? "도메인 인증이 완료됐습니다. SSL 인증서 발급을 진행합니다."
        : "DNS 레코드를 확인할 수 없습니다. 설정 후 최대 48시간이 소요될 수 있습니다.",
    });
  } catch (err) {
    console.error("[POST /domain/custom/verify]", err);
    return res.status(500).json({ message: "DNS 조회 중 오류가 발생했습니다." });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 12 — GET /domain/custom/status : 인증·SSL 상태 폴링
// ─────────────────────────────────────────────────────────────
router.get("/domain/custom/status", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "Organisation not found" });

    const [cfg] = await db
      .select()
      .from(domainConfigs)
      .where(
        and(
          eq(domainConfigs.organisationId, org.id),
          eq(domainConfigs.status, "Active"),
        ),
      )
      .limit(1);

    if (!cfg) {
      return res.status(404).json({ message: "등록된 커스텀 도메인이 없습니다." });
    }

    return res.json({
      domain:             cfg.customDomain,
      verificationStatus: cfg.dnsStatus,
      verifiedAt:         cfg.dnsVerifiedAt,
      sslStatus:          cfg.sslStatus,
      sslIssuedAt:        cfg.sslIssuedAt,
      sslExpiresAt:       cfg.sslExpiresAt,
      lastCheckedAt:      cfg.lastCheckedAt,
      checkAttempts:      cfg.checkAttempts,
      errorMessage:       cfg.errorMessage,
    });
  } catch (err) {
    console.error("[GET /domain/custom/status]", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ─────────────────────────────────────────────────────────────
// Fix 13 — DELETE /domain/custom : 커스텀 도메인 제거
// ─────────────────────────────────────────────────────────────
router.delete("/domain/custom", ...settingsAccess, async (_req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ message: "Organisation not found" });

    await db
      .update(domainConfigs)
      .set({ status: "Inactive", modifiedOn: new Date() })
      .where(eq(domainConfigs.organisationId, org.id));

    await db
      .update(organisations)
      .set({
        customDomain:  null,
        dnsStatus:     "pending",
        dnsVerifiedAt: null,
        sslStatus:     "pending",
        modifiedOn:    new Date(),
      })
      .where(eq(organisations.id, org.id));

    return res.json({ success: true, message: "커스텀 도메인이 제거됐습니다." });
  } catch (err) {
    console.error("[DELETE /domain/custom]", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /theme — 테넌트 테마 설정 반환 (공개 엔드포인트, 인증 불필요)
// tenantResolver 에서 주입된 req.tenant 사용
// 앱 초기화 시 첫 번째 API 호출로 사용
// ─────────────────────────────────────────────────────────────
router.get("/theme", async (req, res) => {
  try {
    const org = req.tenant;

    if (!org) {
      return res.json(getDefaultTheme());
    }

    return res.json({
      organisationId:  org.id,
      companyName:     org.name,
      logoUrl:         org.logoUrl        ?? null,
      faviconUrl:      org.faviconUrl     ?? null,
      primaryColor:    org.primaryColor   ?? "#F5821F",
      secondaryColor:  org.secondaryColor ?? "#1C1917",
      accentColor:     org.accentColor    ?? "#FEF0E3",
      customCss:       org.customCss      ?? null,
      subdomain:       org.subdomain      ?? null,
      planType:        org.planType       ?? "starter",
      features:        org.features       ?? {},
    });
  } catch (err) {
    console.error("[GET /settings/theme]", err);
    return res.json(getDefaultTheme());
  }
});

function getDefaultTheme() {
  return {
    organisationId:  null,
    companyName:     "Edubee CRM",
    logoUrl:         null,
    faviconUrl:      null,
    primaryColor:    "#F5821F",
    secondaryColor:  "#1C1917",
    accentColor:     "#FEF0E3",
    customCss:       null,
    subdomain:       null,
    planType:        "starter",
    features:        {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Billing
// ─────────────────────────────────────────────────────────────────────────────

// POST /settings/billing/checkout — Create Stripe Checkout Session
router.post("/billing/checkout", ...settingsAccess, async (req, res) => {
  try {
    const { planType, billingCycle } = req.body as { planType: string; billingCycle?: string };
    if (!planType) return res.status(400).json({ error: "planType is required" });

    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const baseUrl = org.subdomain
      ? `https://${org.subdomain}.edubee.co`
      : process.env.APP_URL ?? '';

    const { url, sessionId } = await createCheckoutSession({
      organisationId: org.id,
      planType,
      billingCycle:   (billingCycle ?? 'monthly') as 'monthly' | 'annually',
      successUrl:     `${baseUrl}/admin/settings/plan?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:      `${baseUrl}/admin/settings/plan?cancelled=true`,
      customerEmail:  org.ownerEmail ?? undefined,
    });

    return res.json({ url, sessionId });
  } catch (err) {
    console.error("[POST /settings/billing/checkout]", err);
    return res.status(500).json({ error: "Failed to create checkout session." });
  }
});

// POST /settings/billing/portal — Open Stripe Customer Portal
router.post("/billing/portal", ...settingsAccess, async (req, res) => {
  try {
    const org = await getOrg();
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const customerId = (org as any).stripeCustomerId as string | undefined;
    if (!customerId) {
      return res.status(400).json({
        error: "No billing information found. Please subscribe to a plan first.",
      });
    }

    const baseUrl = org.subdomain
      ? `https://${org.subdomain}.edubee.co`
      : process.env.APP_URL ?? '';

    const portalUrl = await createPortalSession({
      customerId,
      returnUrl: `${baseUrl}/admin/settings/plan`,
    });

    return res.json({ url: portalUrl });
  } catch (err) {
    console.error("[POST /settings/billing/portal]", err);
    return res.status(500).json({ error: "Failed to open billing portal." });
  }
});

export default router;
