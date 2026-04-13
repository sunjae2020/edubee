import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { organisations } from "./settings";
import { accounts } from "./crm";
import { users } from "./users";

export const applicationForms = pgTable("application_forms", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         varchar("name",         { length: 255 }).notNull(),
  slug:         varchar("slug",         { length: 100 }).notNull().unique(),
  description:  text("description"),
  formType:     varchar("form_type",    { length: 30  }).notNull().default("camp_application"),
  visibility:   varchar("visibility",   { length: 20  }).notNull().default("private"),
  redirectUrl:  varchar("redirect_url", { length: 500 }),
  sourceFormId: uuid("source_form_id").references((): any => applicationForms.id),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  createdBy:    uuid("created_by").references(() => users.id),
  status:       varchar("status",       { length: 20  }).notNull().default("active"),
  createdOn:    timestamp("created_on").defaultNow().notNull(),
  modifiedOn:   timestamp("modified_on").defaultNow().notNull(),
});

export const applicationFormPartners = pgTable("application_form_partners", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  formId:              uuid("form_id").notNull().references(() => applicationForms.id),
  partnerAccountId:    uuid("partner_account_id").notNull().references(() => accounts.id),
  partnerParameter:    varchar("partner_parameter", { length: 50 }).notNull(),
  displayName:         varchar("display_name",      { length: 300 }),
  emailNotification:   varchar("email_notification", { length: 20 }).notNull().default("both"),
  partnerEmailOverride: varchar("partner_email_override", { length: 255 }),
  isActive:            boolean("is_active").notNull().default(true),
  createdOn:           timestamp("created_on").defaultNow().notNull(),
  modifiedOn:          timestamp("modified_on").defaultNow().notNull(),
});

export const formTermsContent = pgTable("form_terms_content", {
  id:         uuid("id").primaryKey().defaultRandom(),
  formId:     uuid("form_id").notNull().references(() => applicationForms.id, { onDelete: "cascade" }),
  language:   varchar("language", { length: 10 }).notNull(),
  content:    text("content").notNull(),
  isDefault:  boolean("is_default").notNull().default(false),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

export type ApplicationForm        = typeof applicationForms.$inferSelect;
export type NewApplicationForm     = typeof applicationForms.$inferInsert;
export type ApplicationFormPartner = typeof applicationFormPartners.$inferSelect;
export type FormTermsContent       = typeof formTermsContent.$inferSelect;
