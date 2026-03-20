import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { platformSettings } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";

const SMTP_KEYS = ["smtp.host", "smtp.port", "smtp.user", "smtp.pass", "smtp.from", "smtp.fromName", "smtp.secure"];

export async function getSmtpConfig(): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, SMTP_KEYS));
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value ?? "";
  }
  return config;
}

export async function createTransporter() {
  const cfg = await getSmtpConfig();
  const host = cfg["smtp.host"] || process.env.SMTP_HOST || "";
  const port = parseInt(cfg["smtp.port"] || process.env.SMTP_PORT || "587", 10);
  const user = cfg["smtp.user"] || process.env.SMTP_USER || "";
  const pass = cfg["smtp.pass"] || process.env.SMTP_PASS || "";
  const secure = (cfg["smtp.secure"] || "false") === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete. Please configure host, username, and password in Settings.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  // CHECK 1.4 — Email mock for test environments (set EMAIL_ENABLED=false in Secrets)
  if (process.env.EMAIL_ENABLED === "false") {
    console.log("[NOTIFICATION MOCK]", { to: options.to, subject: options.subject });
    return { success: true, mocked: true };
  }

  try {
    const cfg = await getSmtpConfig();
    const fromName = cfg["smtp.fromName"] || "Edubee Camp";
    const fromEmail = cfg["smtp.from"] || cfg["smtp.user"] || "";
    const transporter = await createTransporter();
    return transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]+>/g, ""),
    });
  } catch (err) {
    // R-8: Email failures must NEVER block the main workflow
    console.error("[EMAIL FAILED — non-blocking]", String(err));
    return { success: false, error: String(err) };
  }
}
