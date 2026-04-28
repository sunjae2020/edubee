import { db } from "@workspace/db";
import { securityIncidents } from "@workspace/db/schema";
import { Resend } from "resend";
import { logger } from "./logger.js";

const SECURITY_ALERT_EMAIL = process.env.SECURITY_ALERT_EMAIL ?? "admin@edubee.co";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export interface IncidentPayload {
  type: "unauthorized_access" | "data_breach" | "account_compromise" | "suspicious_activity";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedDataTypes?: string[];
  estimatedAffectedCount?: number;
  reportedBy?: string;
  notes?: string;
}

/**
 * Records and notifies security incidents based on the NDB (Notifiable Data Breaches) Scheme.
 * Immediately sends an alert email to admins when severity is 'high' or 'critical'.
 * OAIC notification required within 30 days (72-hour recommendation for critical incidents).
 */
export async function reportSecurityIncident(payload: IncidentPayload): Promise<string | null> {
  const {
    type, severity, description,
    affectedDataTypes = [],
    estimatedAffectedCount = 0,
    reportedBy = SYSTEM_USER_ID,
    notes,
  } = payload;

  // Structured log — passport_number etc. are automatically masked via pino redact
  logger.error(
    { type, severity, affectedDataTypes, estimatedAffectedCount },
    `[SECURITY INCIDENT] ${description}`,
  );

  let incidentId: string | null = null;

  try {
    const [inserted] = await db.insert(securityIncidents).values({
      incidentType:              type,
      severity,
      description,
      affectedDataTypes,
      affectedRecordsCount:      estimatedAffectedCount,
      reportedToOaic:            false,
      notificationSentToAffected: false,
      notes:                     notes ?? null,
      createdBy:                 reportedBy,
    }).returning({ id: securityIncidents.id });
    incidentId = inserted?.id ?? null;
  } catch (e) {
    logger.error({ err: e }, "[incidentReporter] DB insert failed");
  }

  // ── Immediate email alert (high / critical) ──────────────────────────────────
  if (severity === "high" || severity === "critical") {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = new Resend(apiKey);
        const ndbDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-AU");
        await resend.emails.send({
          from: "Edubee Security <no-reply@edubee.co>",
          to: SECURITY_ALERT_EMAIL,
          subject: `[${severity.toUpperCase()}] Security Incident Detected — Edubee`,
          html: `
            <h2>⚠️ Security Incident Detected</h2>
            <table border="1" cellpadding="6" style="border-collapse:collapse;">
              <tr><th>Field</th><th>Value</th></tr>
              <tr><td>Severity</td><td><strong>${severity.toUpperCase()}</strong></td></tr>
              <tr><td>Type</td><td>${type}</td></tr>
              <tr><td>Description</td><td>${description}</td></tr>
              <tr><td>Affected Data Types</td><td>${affectedDataTypes.join(", ") || "Unknown"}</td></tr>
              <tr><td>Estimated Affected Records</td><td>${estimatedAffectedCount}</td></tr>
              <tr><td>Incident ID</td><td>${incidentId ?? "N/A"}</td></tr>
              <tr><td>Detected At</td><td>${new Date().toISOString()}</td></tr>
            </table>
            <br/>
            <p><strong>NDB Scheme Reminder:</strong> Under the Australian Privacy Act 1988, you have <strong>30 days</strong> to report this eligible data breach to the OAIC (deadline: ${ndbDeadline}).</p>
            <p>Report at: <a href="https://www.oaic.gov.au/privacy/notifiable-data-breaches/notify-the-oaic-of-a-data-breach">OAIC NDB Notification Portal</a></p>
          `,
        });
        logger.info({ to: SECURITY_ALERT_EMAIL }, "[incidentReporter] Alert email sent");
      }
    } catch (e) {
      logger.error({ err: e }, "[incidentReporter] Email send failed");
    }
  }

  return incidentId;
}
