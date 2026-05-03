import { Router } from "express";
import { db } from "@workspace/db";
import { organisations } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { superAdminOnly } from "../middleware/superAdminOnly.js";
import { Resend } from "resend";
import Stripe from "stripe";

const router = Router();
const guard  = [authenticate, superAdminOnly];

// ─── GET /api/superadmin/integrations/status ─────────────────────────────────
// Returns platform-level external service connection status
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
    const cloudName     = process.env.CLOUDINARY_CLOUD_NAME ?? "";
    const cloudApiKey   = process.env.CLOUDINARY_API_KEY ?? "";
    const cloudSecret   = process.env.CLOUDINARY_API_SECRET ?? "";

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
      cloudinary: {
        connected:     cloudName.length > 0 && cloudApiKey.length > 0,
        cloudName:     cloudName || null,
        apiKeyMasked:  mask(cloudApiKey),
        hasSecret:     cloudSecret.length > 0,
        uploadPreset:  cloudName ? `https://res.cloudinary.com/${cloudName}/image/upload/` : null,
        docsUrl: "https://cloudinary.com/console",
      },
      appUrl,
    });
  } catch (err) {
    console.error("[GET /superadmin/integrations/status]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST /api/superadmin/integrations/test/resend ───────────────────────────
router.post("/integrations/test/resend", ...guard, async (req, res) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(400).json({ ok: false, error: "RESEND_API_KEY is not configured" });

    const toEmail = (req as any).user?.email;
    if (!toEmail) return res.status(400).json({ ok: false, error: "No authenticated user email found" });

    const fromEmail = process.env.FROM_EMAIL ?? "noreply@edubee.co";
    const resend    = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from:    fromEmail,
      to:      toEmail,
      subject: "✅ Edubee – Resend Connection Test",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#F5821F;margin-bottom:8px">Connection test successful</h2>
          <p style="color:#57534E;font-size:14px">
            This email confirms that your <strong>Resend</strong> integration is working correctly.
          </p>
          <hr style="border:none;border-top:1px solid #E8E6E2;margin:20px 0">
          <p style="color:#A8A29E;font-size:12px">Sent from Edubee Platform Admin · ${new Date().toUTCString()}</p>
        </div>`,
    });

    if (error) return res.status(400).json({ ok: false, error: error.message ?? "Resend API returned an error" });
    return res.json({ ok: true, messageId: data?.id, to: toEmail });
  } catch (err: any) {
    console.error("[TEST /resend]", err);
    return res.status(500).json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
});

// ─── POST /api/superadmin/integrations/test/stripe ───────────────────────────
router.post("/integrations/test/stripe", ...guard, async (_req, res) => {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return res.status(400).json({ ok: false, error: "STRIPE_SECRET_KEY is not configured" });

    const stripe  = new Stripe(secretKey);
    const account = await stripe.accounts.retrieve();
    return res.json({ ok: true, accountId: account.id, email: account.email ?? null, country: account.country ?? null });
  } catch (err: any) {
    console.error("[TEST /stripe]", err);
    return res.status(400).json({ ok: false, error: err?.message ?? "Stripe connection failed" });
  }
});

// ─── POST /api/superadmin/integrations/test/cloudinary ───────────────────────
router.post("/integrations/test/cloudinary", ...guard, async (_req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret)
      return res.status(400).json({ ok: false, error: "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required" });

    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const response    = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(400).json({ ok: false, error: `Cloudinary returned ${response.status}: ${body}` });
    }

    const body = await response.json() as any;
    return res.json({ ok: true, status: body.status ?? "ok", cloudName });
  } catch (err: any) {
    console.error("[TEST /cloudinary]", err);
    return res.status(500).json({ ok: false, error: err?.message ?? "Unexpected error" });
  }
});

// ─── POST /api/superadmin/integrations/test/storage ──────────────────────────
router.post("/integrations/test/storage", ...guard, async (_req, res) => {
  try {
    const accessKey = process.env.AWS_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;
    const bucket    = process.env.S3_BUCKET ?? process.env.R2_BUCKET;
    const region    = process.env.AWS_REGION ?? "auto";
    const endpoint  = process.env.R2_ENDPOINT ?? process.env.S3_ENDPOINT;

    if (!accessKey || !secretKey || !bucket)
      return res.status(400).json({ ok: false, error: "Storage credentials (access key, secret key, bucket) are not fully configured" });

    // Dynamic import to avoid hard dependency
    // @ts-expect-error - optional peer dependency, installed at runtime
    const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3") as any;
    const client = new S3Client({
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      ...(endpoint ? { endpoint } : {}),
    });

    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return res.json({ ok: true, bucket, region });
  } catch (err: any) {
    console.error("[TEST /storage]", err);
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404)
      return res.status(404).json({ ok: false, error: `Bucket not found` });
    if (err?.name === "NoSuchBucket")
      return res.status(404).json({ ok: false, error: "Bucket does not exist" });
    return res.status(400).json({ ok: false, error: err?.message ?? "Storage connection failed" });
  }
});

// ─── GET /api/settings/integrations ─────────────────────────────────────────
// Returns tenant-level integration settings
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
      zapier: { enabled: integrations.zapier?.enabled ?? false, webhookUrl: integrations.zapier?.webhookUrl ?? "" },
      slack:  {
        enabled:    integrations.slack?.enabled    ?? false,
        webhookUrl: integrations.slack?.webhookUrl ?? "",
        events:     integrations.slack?.events     ?? { newContract: true, contractStatus: true, newStudent: true, paymentReceived: false },
      },
      google:  { enabled: false, comingSoon: true },
      hubspot: { enabled: false, comingSoon: true },
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
    const { smtp, zapier, slack } = req.body as {
      smtp?:   Record<string, any>;
      zapier?: Record<string, any>;
      slack?:  Record<string, any>;
    };

    const updated = {
      ...existing,
      ...(smtp   !== undefined && { smtp   }),
      ...(zapier !== undefined && { zapier }),
      ...(slack  !== undefined && { slack  }),
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

// ─── POST /api/slack/test ────────────────────────────────────────────────────
router.post("/slack/test", authenticate, async (req, res) => {
  try {
    const org = req.tenant;
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    const webhookUrl: string = req.body.webhookUrl ?? (org as any).integrations?.slack?.webhookUrl ?? "";
    if (!webhookUrl) return res.status(400).json({ error: "No Slack webhook URL configured" });

    const payload = {
      text: `✅ *Edubee CRM* — Slack integration test successful!\n>Workspace: *${(org as any).name ?? "Your Organisation"}*\n>This confirms your webhook is connected correctly.`,
    };

    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(400).json({ error: `Slack returned ${r.status}: ${text}` });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[POST /slack/test]", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
});

export default router;
