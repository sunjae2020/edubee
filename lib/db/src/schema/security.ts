import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

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
