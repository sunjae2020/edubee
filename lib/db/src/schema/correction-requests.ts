import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ── Correction Requests — APP 13 (Privacy Act 1988) ──────────────────────────
// 개인정보 수정 요청: 30일 이내 처리 의무 (호주 Privacy Act APP 13)
export const correctionRequests = pgTable("correction_requests", {
  id:               uuid("id").primaryKey().defaultRandom(),
  requestId:        varchar("request_id", { length: 50 }).notNull().unique(),
  // COR-{timestamp} 형식의 사용자 표시용 ID

  requestedBy:      uuid("requested_by").references(() => users.id),
  requesterEmail:   varchar("requester_email", { length: 255 }).notNull(),

  entityType:       varchar("entity_type", { length: 50 }).notNull().default("personal_data"),
  // personal_data | application | contract | document
  entityId:         uuid("entity_id"),

  fieldName:        varchar("field_name", { length: 255 }).notNull(),
  currentValue:     text("current_value"),
  requestedValue:   text("requested_value").notNull(),
  reason:           text("reason").notNull(),

  status:           varchar("status", { length: 30 }).notNull().default("pending"),
  // pending | in_review | resolved | rejected

  assignedTo:       uuid("assigned_to").references(() => users.id),
  resolvedBy:       uuid("resolved_by").references(() => users.id),
  resolvedAt:       timestamp("resolved_at"),
  resolutionNotes:  text("resolution_notes"),

  dueDate:          timestamp("due_date"),
  // APP 13: 요청일 + 30일

  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
  deletedAt:        timestamp("deleted_at"),
}, (t) => [
  index("correction_requests_status_idx").on(t.status),
  index("correction_requests_requester_idx").on(t.requestedBy),
  index("correction_requests_due_date_idx").on(t.dueDate),
]);

export type CorrectionRequest = typeof correctionRequests.$inferSelect;
export type InsertCorrectionRequest = typeof correctionRequests.$inferInsert;
