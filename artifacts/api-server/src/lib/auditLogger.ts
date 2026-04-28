import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db/schema";

/**
 * CUD audit log utility — S4-02
 * Tracks change history for core tables: contracts, invoices, payment_headers, etc.
 * Sensitive fields (passport number, password, etc.) are automatically [REDACTED].
 */

const SENSITIVE_FIELDS = [
  "passport_number",
  "passport_no",
  "visa_number",
  "medical_conditions",
  "password",
  "password_hash",
];

function sanitize(obj?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!obj) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_FIELDS.includes(k) ? "[REDACTED]" : v,
    ]),
  );
}

export interface AuditParams {
  tableName: string;
  recordId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  changedBy: string;
  changedByEmail?: string;
  changedByRole?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tableName:     params.tableName,
      recordId:      params.recordId,
      action:        params.action,
      changedBy:     params.changedBy,
      changedByEmail: params.changedByEmail,
      changedByRole: params.changedByRole,
      oldValues:     sanitize(params.oldValues) ?? null,
      newValues:     sanitize(params.newValues) ?? null,
      changedFields: params.changedFields ?? null,
      ipAddress:     params.ipAddress ?? null,
      userAgent:     params.userAgent?.slice(0, 500) ?? null,
    });
  } catch (err) {
    // Audit log failure does not block the main transaction — warning log only
    console.warn("[auditLogger] Failed to write audit log:", err);
  }
}

/**
 * Helper to extract common audit parameters from an Express req object
 */
export function auditParamsFromReq(req: any): Pick<AuditParams, "changedBy" | "changedByEmail" | "changedByRole" | "ipAddress" | "userAgent"> {
  return {
    changedBy:     req.user?.id ?? "unknown",
    changedByEmail: req.user?.email,
    changedByRole: req.user?.role,
    ipAddress:     req.ip,
    userAgent:     req.headers?.["user-agent"],
  };
}
