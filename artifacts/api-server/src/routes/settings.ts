import { Router } from "express";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { platformSettings, organisations } from "@workspace/db/schema";
import { eq, inArray, ilike, or, asc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { getResendConfig } from "../mailer.js";

const router = Router();
const SUPER_ADMIN = ["super_admin"];
const RESEND_KEYS = ["resend.apiKey", "resend.from", "resend.fromName"];

// ─── GET /settings/resend ────────────────────────────────────────────────────
router.get("/resend", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, RESEND_KEYS));
    const cfg: Record<string, string> = {};
    for (const row of rows) cfg[row.key] = row.value ?? "";
    return res.json({
      hasApiKey: !!(cfg["resend.apiKey"]),
      from: cfg["resend.from"] ?? "",
      fromName: cfg["resend.fromName"] ?? "Edubee Camp",
    });
  } catch (err) {
    console.error("GET /settings/resend error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PUT /settings/resend ────────────────────────────────────────────────────
router.put("/resend", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const { apiKey, from, fromName } = req.body;
    const upserts: { key: string; value: string; updatedAt: Date }[] = [];
    const now = new Date();

    if (apiKey && String(apiKey).trim()) upserts.push({ key: "resend.apiKey", value: String(apiKey).trim(), updatedAt: now });
    if (from !== undefined) upserts.push({ key: "resend.from", value: String(from), updatedAt: now });
    if (fromName !== undefined) upserts.push({ key: "resend.fromName", value: String(fromName), updatedAt: now });

    for (const row of upserts) {
      await db.insert(platformSettings).values(row)
        .onConflictDoUpdate({ target: platformSettings.key, set: { value: row.value, updatedAt: row.updatedAt } });
    }

    return res.json({ success: true, updated: upserts.map(u => u.key) });
  } catch (err) {
    console.error("PUT /settings/resend error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST /settings/test-email ───────────────────────────────────────────────
router.post("/test-email", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const { to } = req.body;
    const cfg = await getResendConfig();
    const apiKey = cfg["resend.apiKey"] || process.env.RESEND_API_KEY || "";
    const fromEmail = cfg["resend.from"] || "";
    const fromName = cfg["resend.fromName"] || "Edubee Camp";
    const recipient = to || fromEmail;

    if (!apiKey) {
      return res.status(400).json({ error: "Resend API Key is not configured. Please save your Resend settings first." });
    }
    if (!fromEmail) {
      return res.status(400).json({ error: "From Email is not configured. Please save your Resend settings first." });
    }
    if (!recipient) {
      return res.status(400).json({ error: "No recipient address provided." });
    }

    const resend = new Resend(apiKey);
    const now = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "full", timeStyle: "short" });

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipient,
      subject: "✉️ Edubee Camp — Resend Test Email",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <div style="background:#F5821F;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Edubee Camp</h1>
            <p style="color:#fff;margin:4px 0 0;opacity:.85;font-size:13px;">Resend Configuration Test</p>
          </div>
          <div style="background:#fff;border:1px solid #f0e8dc;border-top:0;padding:24px;border-radius:0 0 12px 12px;">
            <p style="font-size:15px;color:#333;margin:0 0 16px;">
              ✅ Your Resend settings are working correctly!
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:6px 0;color:#888;width:110px;">From</td><td style="padding:6px 0;color:#333;font-weight:500;">${fromName} &lt;${fromEmail}&gt;</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Sent To</td><td style="padding:6px 0;color:#333;font-weight:500;">${recipient}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Sent At</td><td style="padding:6px 0;color:#333;font-weight:500;">${now}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Provider</td><td style="padding:6px 0;color:#333;font-weight:500;">Resend</td></tr>
            </table>
            <p style="font-size:12px;color:#aaa;margin:20px 0 0;">
              This is an automated test email sent from Edubee Camp admin settings.
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    return res.json({ success: true, sentTo: recipient, messageId: result.data?.id });
  } catch (err: any) {
    console.error("Test email error:", err);
    return res.status(500).json({
      error: "Failed to send test email",
      detail: err?.message ?? String(err),
    });
  }
});

// ─── GET /settings/display (public — all authenticated users) ────────────────
router.get("/display", authenticate, async (req, res) => {
  try {
    const rows = await db.select().from(platformSettings)
      .where(inArray(platformSettings.key, ["general.dateFormat"]));
    const cfg: Record<string, string> = {};
    for (const row of rows) cfg[row.key] = row.value ?? "";
    return res.json({
      dateFormat: cfg["general.dateFormat"] ?? "DD/MM/YYYY",
    });
  } catch (err) {
    console.error("GET /settings/display error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /settings/general ───────────────────────────────────────────────────
router.get("/general", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const keys = ["general.platformName", "general.defaultCurrency", "general.supportEmail", "general.supportPhone", "general.activeLanguages", "general.dateFormat"];
    const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, keys));
    const cfg: Record<string, string> = {};
    for (const row of rows) cfg[row.key] = row.value ?? "";
    return res.json({
      platformName: cfg["general.platformName"] ?? "Edubee Camp",
      defaultCurrency: cfg["general.defaultCurrency"] ?? "AUD",
      supportEmail: cfg["general.supportEmail"] ?? "",
      supportPhone: cfg["general.supportPhone"] ?? "",
      activeLanguages: cfg["general.activeLanguages"] ? JSON.parse(cfg["general.activeLanguages"]) : ["en", "ko", "ja", "th"],
      dateFormat: cfg["general.dateFormat"] ?? "DD/MM/YYYY",
    });
  } catch (err) {
    console.error("GET /settings/general error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PUT /settings/general ───────────────────────────────────────────────────
router.put("/general", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const { platformName, defaultCurrency, supportEmail, supportPhone, activeLanguages, dateFormat } = req.body;
    const now = new Date();
    const upserts = [
      { key: "general.platformName", value: String(platformName ?? "Edubee Camp"), updatedAt: now },
      { key: "general.defaultCurrency", value: String(defaultCurrency ?? "AUD"), updatedAt: now },
      { key: "general.supportEmail", value: String(supportEmail ?? ""), updatedAt: now },
      { key: "general.supportPhone", value: String(supportPhone ?? ""), updatedAt: now },
      { key: "general.activeLanguages", value: JSON.stringify(activeLanguages ?? ["en", "ko", "ja", "th"]), updatedAt: now },
      { key: "general.dateFormat", value: String(dateFormat ?? "DD/MM/YYYY"), updatedAt: now },
    ];
    for (const row of upserts) {
      await db.insert(platformSettings).values(row)
        .onConflictDoUpdate({ target: platformSettings.key, set: { value: row.value, updatedAt: row.updatedAt } });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("PUT /settings/general error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /settings/branding ──────────────────────────────────────────────────
router.get("/branding", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const keys = ["branding.logoPath", "branding.faviconPath"];
    const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, keys));
    const cfg: Record<string, string> = {};
    for (const row of rows) cfg[row.key] = row.value ?? "";
    return res.json({
      logoPath: cfg["branding.logoPath"] ?? "",
      faviconPath: cfg["branding.faviconPath"] ?? "",
    });
  } catch (err) {
    console.error("GET /settings/branding error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PUT /settings/branding ──────────────────────────────────────────────────
router.put("/branding", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const { logoPath, faviconPath } = req.body;
    const now = new Date();
    const upserts: { key: string; value: string; updatedAt: Date }[] = [];
    if (logoPath !== undefined) upserts.push({ key: "branding.logoPath", value: String(logoPath), updatedAt: now });
    if (faviconPath !== undefined) upserts.push({ key: "branding.faviconPath", value: String(faviconPath), updatedAt: now });
    for (const row of upserts) {
      await db.insert(platformSettings).values(row)
        .onConflictDoUpdate({ target: platformSettings.key, set: { value: row.value, updatedAt: row.updatedAt } });
    }
    return res.json({ success: true, updated: upserts.map(u => u.key) });
  } catch (err) {
    console.error("PUT /settings/branding error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── GET /settings/organisations — search tenants for package group assignment ─
router.get("/organisations", authenticate, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const q = String(req.query.q as string ?? "").trim();
    const limit = Math.min(50, parseInt(String(req.query.limit as string ?? "20"), 10));
    const r = (x: any) => x.rows ?? (x as any[]);
    const rows = await db.execute(sql`
      SELECT id, name, trading_name, subdomain, status, logo_url
      FROM organisations
      ${q ? sql`WHERE (name ILIKE ${"%" + q + "%"} OR trading_name ILIKE ${"%" + q + "%"} OR subdomain ILIKE ${"%" + q + "%"})` : sql``}
      ORDER BY name ASC
      LIMIT ${limit}
    `);
    return res.json({ data: r(rows) });
  } catch (err) {
    console.error("GET /settings/organisations error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
