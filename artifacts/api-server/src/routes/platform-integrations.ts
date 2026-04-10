import { Router } from "express";
import { db } from "@workspace/db";
import { organisations } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { superAdminOnly } from "../middleware/superAdminOnly.js";

const router = Router();
const guard  = [authenticate, superAdminOnly];

// ─── GET /api/superadmin/integrations/status ─────────────────────────────────
// 플랫폼 레벨 외부 서비스 연결 상태 반환
router.get("/integrations/status", ...guard, async (_req, res) => {
  try {
    const resendKey     = process.env.RESEND_API_KEY ?? "";
    const fromEmail     = process.env.FROM_EMAIL     ?? "";
    const stripeSecret  = process.env.STRIPE_SECRET_KEY ?? "";
    const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    const s3Bucket      = process.env.S3_BUCKET ?? process.env.R2_BUCKET ?? "";
    const s3Region      = process.env.AWS_REGION ?? "";
    const s3Key         = process.env.AWS_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "";
    const appUrl        = process.env.APP_URL ?? "";

    const mask = (v: string) =>
      v.length > 8 ? v.slice(0, 4) + "••••••••" + v.slice(-4) : v ? "••••••••" : "";

    return res.json({
      resend: {
        connected:   resendKey.length > 0,
        apiKeyMasked: mask(resendKey),
        fromEmail,
        docsUrl: "https://resend.com/docs",
      },
      stripe: {
        connected:         stripeSecret.length > 0,
        webhookConfigured: stripeWebhook.length > 0,
        secretKeyMasked:   mask(stripeSecret),
        webhookUrl: appUrl ? `${appUrl}/api/webhook/stripe` : "/api/webhook/stripe",
        docsUrl: "https://dashboard.stripe.com",
      },
      storage: {
        connected:   s3Key.length > 0,
        bucket:      s3Bucket || null,
        region:      s3Region || null,
        keyMasked:   mask(s3Key),
        docsUrl: "https://developers.cloudflare.com/r2/",
      },
      appUrl,
    });
  } catch (err) {
    console.error("[GET /superadmin/integrations/status]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /api/settings/integrations ─────────────────────────────────────────
// 테넌트 레벨 인테그레이션 설정 반환
router.get("/tenant-integrations", authenticate, async (req, res) => {
  try {
    const org = req.tenant;
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const integrations = (org as any).integrations ?? {};
    return res.json({
      smtp: {
        enabled:   integrations.smtp?.enabled  ?? false,
        host:      integrations.smtp?.host     ?? "",
        port:      integrations.smtp?.port     ?? 587,
        user:      integrations.smtp?.user     ?? "",
        fromEmail: integrations.smtp?.fromEmail ?? "",
        fromName:  integrations.smtp?.fromName  ?? "",
      },
      zapier:   { enabled: integrations.zapier?.enabled ?? false, webhookUrl: integrations.zapier?.webhookUrl ?? "" },
      slack:    { enabled: false, comingSoon: true },
      google:   { enabled: false, comingSoon: true },
      hubspot:  { enabled: false, comingSoon: true },
    });
  } catch (err) {
    console.error("[GET /tenant-integrations]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PUT /api/settings/tenant-integrations ───────────────────────────────────
router.put("/tenant-integrations", authenticate, async (req, res) => {
  try {
    const org = req.tenant;
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const existing   = (org as any).integrations ?? {};
    const { smtp, zapier } = req.body as {
      smtp?:   Record<string, any>;
      zapier?: Record<string, any>;
    };

    const updated = {
      ...existing,
      ...(smtp   !== undefined && { smtp   }),
      ...(zapier !== undefined && { zapier }),
    };

    await db
      .update(organisations)
      .set({ integrations: updated, modifiedOn: new Date() } as any)
      .where(eq(organisations.id, org.id));

    return res.json({ ok: true, integrations: updated });
  } catch (err) {
    console.error("[PUT /tenant-integrations]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
