import { Router } from "express";
import { db } from "@workspace/db";
import { platformSettings } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { createTransporter, getSmtpConfig } from "../mailer.js";

const router = Router();
const SUPER_ADMIN = ["super_admin"];
const SMTP_KEYS = ["smtp.host", "smtp.port", "smtp.user", "smtp.pass", "smtp.from", "smtp.fromName", "smtp.secure"];

// ─── GET /settings/smtp ───────────────────────────────────────────────────────
router.get("/smtp", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, SMTP_KEYS));
    const cfg: Record<string, string> = {};
    for (const row of rows) cfg[row.key] = row.value ?? "";
    return res.json({
      host: cfg["smtp.host"] ?? "",
      port: cfg["smtp.port"] ?? "587",
      user: cfg["smtp.user"] ?? "",
      hasPassword: !!(cfg["smtp.pass"]),
      from: cfg["smtp.from"] ?? "",
      fromName: cfg["smtp.fromName"] ?? "Edubee Camp",
      secure: cfg["smtp.secure"] ?? "false",
    });
  } catch (err) {
    console.error("GET /settings/smtp error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PUT /settings/smtp ───────────────────────────────────────────────────────
router.put("/smtp", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const { host, port, user, password, from, fromName, secure } = req.body;
    const upserts: { key: string; value: string; updatedAt: Date }[] = [];
    const now = new Date();

    if (host !== undefined) upserts.push({ key: "smtp.host", value: String(host), updatedAt: now });
    if (port !== undefined) upserts.push({ key: "smtp.port", value: String(port), updatedAt: now });
    if (user !== undefined) upserts.push({ key: "smtp.user", value: String(user), updatedAt: now });
    if (password && String(password).trim()) upserts.push({ key: "smtp.pass", value: String(password), updatedAt: now });
    if (from !== undefined) upserts.push({ key: "smtp.from", value: String(from), updatedAt: now });
    if (fromName !== undefined) upserts.push({ key: "smtp.fromName", value: String(fromName), updatedAt: now });
    if (secure !== undefined) upserts.push({ key: "smtp.secure", value: String(secure), updatedAt: now });

    for (const row of upserts) {
      await db.insert(platformSettings).values(row)
        .onConflictDoUpdate({ target: platformSettings.key, set: { value: row.value, updatedAt: row.updatedAt } });
    }

    return res.json({ success: true, updated: upserts.map(u => u.key) });
  } catch (err) {
    console.error("PUT /settings/smtp error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── POST /settings/test-email ───────────────────────────────────────────────
router.post("/test-email", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const { to } = req.body;
    const cfg = await getSmtpConfig();
    const fromEmail = cfg["smtp.from"] || cfg["smtp.user"] || "";
    const fromName = cfg["smtp.fromName"] || "Edubee Camp";
    const recipient = to || cfg["smtp.user"] || fromEmail;

    if (!cfg["smtp.host"] || !cfg["smtp.user"] || !cfg["smtp.pass"]) {
      return res.status(400).json({ error: "SMTP configuration is incomplete. Please save your SMTP settings first." });
    }

    const transporter = await createTransporter();

    const now = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "full", timeStyle: "short" });
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject: "✉️ Edubee Camp — SMTP Test Email",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <div style="background:#F5821F;padding:20px 24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Edubee Camp</h1>
            <p style="color:#fff;margin:4px 0 0;opacity:.85;font-size:13px;">SMTP Configuration Test</p>
          </div>
          <div style="background:#fff;border:1px solid #f0e8dc;border-top:0;padding:24px;border-radius:0 0 12px 12px;">
            <p style="font-size:15px;color:#333;margin:0 0 16px;">
              ✅ Your SMTP settings are working correctly!
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:6px 0;color:#888;width:110px;">SMTP Host</td><td style="padding:6px 0;color:#333;font-weight:500;">${cfg["smtp.host"]}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">SMTP Port</td><td style="padding:6px 0;color:#333;font-weight:500;">${cfg["smtp.port"]}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Username</td><td style="padding:6px 0;color:#333;font-weight:500;">${cfg["smtp.user"]}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Sent To</td><td style="padding:6px 0;color:#333;font-weight:500;">${recipient}</td></tr>
              <tr><td style="padding:6px 0;color:#888;">Sent At</td><td style="padding:6px 0;color:#333;font-weight:500;">${now}</td></tr>
            </table>
            <p style="font-size:12px;color:#aaa;margin:20px 0 0;">
              This is an automated test email sent from Edubee Camp admin settings.
            </p>
          </div>
        </div>
      `,
    });

    return res.json({ success: true, sentTo: recipient, host: cfg["smtp.host"] });
  } catch (err: any) {
    console.error("Test email error:", err);
    return res.status(500).json({
      error: "Failed to send test email",
      detail: err?.message ?? String(err),
    });
  }
});

// ─── GET /settings/general ───────────────────────────────────────────────────
router.get("/general", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const keys = ["general.platformName", "general.defaultCurrency", "general.supportEmail", "general.supportPhone", "general.activeLanguages"];
    const rows = await db.select().from(platformSettings).where(inArray(platformSettings.key, keys));
    const cfg: Record<string, string> = {};
    for (const row of rows) cfg[row.key] = row.value ?? "";
    return res.json({
      platformName: cfg["general.platformName"] ?? "Edubee Camp",
      defaultCurrency: cfg["general.defaultCurrency"] ?? "AUD",
      supportEmail: cfg["general.supportEmail"] ?? "",
      supportPhone: cfg["general.supportPhone"] ?? "",
      activeLanguages: cfg["general.activeLanguages"] ? JSON.parse(cfg["general.activeLanguages"]) : ["en", "ko", "ja", "th"],
    });
  } catch (err) {
    console.error("GET /settings/general error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── PUT /settings/general ───────────────────────────────────────────────────
router.put("/general", authenticate, requireRole(...SUPER_ADMIN), async (req, res) => {
  try {
    const { platformName, defaultCurrency, supportEmail, supportPhone, activeLanguages } = req.body;
    const now = new Date();
    const upserts = [
      { key: "general.platformName", value: String(platformName ?? "Edubee Camp"), updatedAt: now },
      { key: "general.defaultCurrency", value: String(defaultCurrency ?? "AUD"), updatedAt: now },
      { key: "general.supportEmail", value: String(supportEmail ?? ""), updatedAt: now },
      { key: "general.supportPhone", value: String(supportPhone ?? ""), updatedAt: now },
      { key: "general.activeLanguages", value: JSON.stringify(activeLanguages ?? ["en", "ko", "ja", "th"]), updatedAt: now },
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

export default router;
