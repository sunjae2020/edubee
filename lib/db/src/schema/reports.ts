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
  assignedTo: uuid("assigned_to").references(() => users.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  taskTitle: varchar("task_title", { length: 255 }),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  status: varchar("status", { length: 20 }).default("open"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type Task = typeof tasks.$inferSelect;
