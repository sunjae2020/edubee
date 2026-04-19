import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ── Security Incidents — NDB (Notifiable Data Breaches) Scheme ───────────────
// 호주 Privacy Act 1988, NDB Scheme: 30일 이내 OAIC 통보 의무
export const securityIncidents = pgTable("security_incidents", {
  id:                        uuid("id").primaryKey().defaultRandom(),
  incidentType:              varchar("incident_type", { length: 50 }).notNull(),
  // 유형: unauthorized_access | data_breach | account_compromise | suspicious_activity
  severity:                  varchar("severity", { length: 20 }).notNull(),
  // low | medium | high | critical
  description:               text("description").notNull(),
  affectedRecordsCount:      integer("affected_records_count"),
  affectedDataTypes:         text("affected_data_types").array(),
  // 예: ['passport_number', 'medical_information', 'financial_data']
  detectedAt:                timestamp("detected_at").notNull().defaultNow(),
  reportedToOaic:            boolean("reported_to_oaic").notNull().default(false),
  reportedToOaicAt:          timestamp("reported_to_oaic_at"),
  oaicReportNumber:          varchar("oaic_report_number", { length: 100 }),
  notificationSentToAffected: boolean("notification_sent_to_affected").notNull().default(false),
  notificationSentAt:        timestamp("notification_sent_at"),
  resolvedAt:                timestamp("resolved_at"),
  notes:                     text("notes"),
  createdBy:                 uuid("created_by").notNull(),
  createdAt:                 timestamp("created_at").notNull().defaultNow(),
  updatedAt:                 timestamp("updated_at").notNull().defaultNow(),
});

export type SecurityIncident = typeof securityIncidents.$inferSelect;
export type InsertSecurityIncident = typeof securityIncidents.$inferInsert;

// ── Audit Logs — CUD 이력 (S4-02) ────────────────────────────────────────────
// Create/Update/Delete 변경 이력: 법적 분쟁 증거, 내부 감사, 규정 준수
export const auditLogs = pgTable(
  "audit_logs",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    tableName:     varchar("table_name", { length: 100 }).notNull(),
    recordId:      uuid("record_id").notNull(),
    action:        varchar("action", { length: 10 }).notNull(), // CREATE | UPDATE | DELETE
    changedBy:     uuid("changed_by").notNull(),
    changedByEmail: varchar("changed_by_email", { length: 255 }),
    changedByRole: varchar("changed_by_role", { length: 50 }),
    oldValues:     jsonb("old_values"),
    newValues:     jsonb("new_values"),
    changedFields: text("changed_fields").array(),
    ipAddress:     varchar("ip_address", { length: 50 }),
    userAgent:     varchar("user_agent", { length: 500 }),
    createdAt:     timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tableRecordIdx: index("audit_logs_table_record_idx").on(table.tableName, table.recordId),
    userIdx:        index("audit_logs_user_idx").on(table.changedBy),
    dateIdx:        index("audit_logs_date_idx").on(table.createdAt),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
