import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db/schema";

/**
 * CUD 감사 로그 기록 유틸 — S4-02
 * contracts, invoices, payment_headers 등 핵심 테이블 변경 이력 추적.
 * 민감 정보(여권번호, 비밀번호 등)는 자동으로 [REDACTED] 처리.
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
    // 감사 로그 실패는 주 트랜잭션을 막지 않음 — 경고 로그만 기록
    console.warn("[auditLogger] Failed to write audit log:", err);
  }
}

/**
 * Express req 객체에서 공통 감사 파라미터 추출 헬퍼
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
