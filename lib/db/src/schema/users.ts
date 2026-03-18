import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  lineId: varchar("line_id", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Seoul"),
  preferredLang: varchar("preferred_lang", { length: 10 }).default("en"),
  companyName: varchar("company_name", { length: 255 }),
  businessRegNo: varchar("business_reg_no", { length: 100 }),
  countryOfOps: varchar("country_of_ops", { length: 10 }),
  platformCommRate: decimal("platform_comm_rate", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 20 }).default("active"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 500 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pagePermissions = pgTable("page_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: varchar("role", { length: 50 }).notNull(),
  pageSlug: varchar("page_slug", { length: 100 }).notNull(),
  canAccess: boolean("can_access").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const impersonationLogs = pgTable("impersonation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  targetUserId: uuid("target_user_id").references(() => users.id),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  ipAddress: varchar("ip_address", { length: 50 }),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
