import { Resend } from "resend";
import { db } from "@workspace/db";
import { platformSettings } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";

const RESEND_KEYS = ["resend.apiKey", "resend.from", "resend.fromName"];

export async function getResendConfig(): Promise<Record<string, string>> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, RESEND_KEYS));
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value ?? "";
  }
  return config;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (process.env.EMAIL_ENABLED === "false") {
    console.log("[NOTIFICATION MOCK]", { to: options.to, subject: options.subject });
    return { success: true, mocked: true };
  }

  try {
    const cfg = await getResendConfig();
    const apiKey = cfg["resend.apiKey"] || process.env.RESEND_API_KEY || "";
    const fromEmail = cfg["resend.from"] || process.env.RESEND_FROM || "";
    const fromName = cfg["resend.fromName"] || "Edubee Camp";

    if (!apiKey || !fromEmail) {
      throw new Error("Resend configuration is incomplete. Please configure API Key and From Email in Settings.");
    }

    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]+>/g, ""),
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error("[EMAIL FAILED — non-blocking]", String(err));
    return { success: false, error: String(err) };
  }
}
