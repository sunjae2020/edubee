import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { contracts } from "./contracts";
import { applications } from "./applications";

export const programReports = pgTable("program_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  reportTitle: varchar("report_title", { length: 255 }),
  status: varchar("status", { length: 20 }).default("draft"),
  generatedBy: uuid("generated_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
  summaryNotes: text("summary_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportSections = pgTable("report_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => programReports.id),
  sectionType: varchar("section_type", { length: 50 }),
  sectionTitle: varchar("section_title", { length: 255 }),
  displayOrder: integer("display_order").default(0),
  isVisible: boolean("is_visible").default(true),
  content: jsonb("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  type: varchar("type", { length: 100 }),
  title: varchar("title", { length: 255 }),
  message: text("message"),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskNumber: varchar("task_number", { length: 30 }),
  taskType: varchar("task_type", { length: 30 }).default("cs_request"),
  category: varchar("category", { length: 30 }).default("inquiry"),
  source: varchar("source", { length: 30 }).default("portal"),
  submittedBy: uuid("submitted_by").references(() => users.id),
  submittedName: varchar("submitted_name", { length: 255 }),
  submittedEmail: varchar("submitted_email", { length: 255 }),
  submittedPhone: varchar("submitted_phone", { length: 50 }),
  assignedTo: uuid("assigned_to").references(() => users.id),
  assignedTeam: varchar("assigned_team", { length: 100 }),
  contractId: uuid("contract_id").references(() => contracts.id),
  applicationId: uuid("application_id").references(() => applications.id),
  relatedServiceType: varchar("related_service_type", { length: 30 }),
  title: varchar("title", { length: 255 }),
  taskTitle: varchar("task_title", { length: 255 }),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  status: varchar("status", { length: 30 }).default("open"),
  visibility: varchar("visibility", { length: 20 }).default("internal"),
  dueDate: date("due_date"),
  firstResponseAt: timestamp("first_response_at"),
  resolvedAt: timestamp("resolved_at"),
  slaBreached: boolean("sla_breached").default(false),
  satisfactionRating: integer("satisfaction_rating"),
  satisfactionComment: text("satisfaction_comment"),
  ratedAt: timestamp("rated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskAttachments = pgTable("task_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => tasks.id),
  filePath: varchar("file_path", { length: 500 }),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => tasks.id),
  authorId: uuid("author_id").references(() => users.id),
  authorName: varchar("author_name", { length: 255 }),
  content: text("content"),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type TaskComment = typeof taskComments.$inferSelect;
