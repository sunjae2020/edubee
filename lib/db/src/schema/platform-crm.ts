import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM CRM — SuperAdmin 전용, organisation_id 없는 플랫폼 레벨 테이블
// ─────────────────────────────────────────────────────────────────────────────

/**
 * platform_prospects — SaaS 구독 관심 회사 (아직 테넌트 아님)
 * status flow: new → contacted → demo → trial → converted | lost
 */
export const platformProspects = pgTable("platform_prospects", {
  id:            uuid("id").primaryKey().defaultRandom(),
  companyName:   varchar("company_name",   { length: 255 }).notNull(),
  website:       varchar("website",        { length: 500 }),
  industry:      varchar("industry",       { length: 100 }),
  country:       varchar("country",        { length: 100 }),
  planInterest:  varchar("plan_interest",  { length: 50  }),
  status:        varchar("status",         { length: 30  }).notNull().default("new"),
  source:        varchar("source",         { length: 100 }),
  assignedTo:    uuid("assigned_to"),
  notes:         text("notes"),
  convertedOrgId: uuid("converted_org_id"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

/**
 * platform_contacts — prospect 회사의 담당자
 */
export const platformContacts = pgTable("platform_contacts", {
  id:           uuid("id").primaryKey().defaultRandom(),
  prospectId:   uuid("prospect_id").notNull().references(() => platformProspects.id, { onDelete: "cascade" }),
  fullName:     varchar("full_name",  { length: 200 }).notNull(),
  email:        varchar("email",      { length: 255 }),
  phone:        varchar("phone",      { length: 50  }),
  title:        varchar("title",      { length: 100 }),
  isPrimary:    boolean("is_primary").notNull().default(false),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

/**
 * platform_activities — 영업 활동 로그 (통화, 이메일, 데모, 미팅, 메모)
 */
export const platformActivities = pgTable("platform_activities", {
  id:           uuid("id").primaryKey().defaultRandom(),
  prospectId:   uuid("prospect_id").notNull().references(() => platformProspects.id, { onDelete: "cascade" }),
  contactId:    uuid("contact_id").references(() => platformContacts.id),
  activityType: varchar("activity_type", { length: 30 }).notNull().default("note"),
  subject:      varchar("subject",       { length: 255 }),
  body:         text("body"),
  scheduledAt:  timestamp("scheduled_at"),
  completedAt:  timestamp("completed_at"),
  createdBy:    uuid("created_by"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});
