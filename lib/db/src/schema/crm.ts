import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./applications";

export const contacts = pgTable("contacts", {
  id:             uuid("id").primaryKey().defaultRandom(),
  firstName:      varchar("first_name",     { length: 100 }).notNull(),
  lastName:       varchar("last_name",      { length: 100 }).notNull(),
  title:          varchar("title",          { length: 20  }),
  dob:            date("dob"),
  gender:         varchar("gender",         { length: 20  }),
  nationality:    varchar("nationality",    { length: 100 }),
  email:          varchar("email",          { length: 255 }),
  mobile:         varchar("mobile",         { length: 50  }),
  officeNumber:   varchar("office_number",  { length: 50  }),
  snsType:        varchar("sns_type",       { length: 50  }),
  snsId:          varchar("sns_id",         { length: 255 }),
  influxChannel:  varchar("influx_channel", { length: 50  }),
  importantDate1: date("important_date_1"),
  importantDate2: date("important_date_2"),
  description:    text("description"),
  status:         varchar("status",       { length: 20 }).notNull().default("Active"),
  accountType:    varchar("account_type", { length: 50 }).notNull().default("Student"),
  createdOn:      timestamp("created_on").notNull().defaultNow(),
  modifiedOn:     timestamp("modified_on").notNull().defaultNow(),
});

export const lead_activities = pgTable("lead_activities", {
  id:          uuid("id").primaryKey().defaultRandom(),
  leadId:      uuid("lead_id").references(() => leads.id).notNull(),
  channel:     varchar("channel", { length: 50 }).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  description: text("description").notNull(),
  createdBy:   uuid("created_by").references(() => users.id),
  createdOn:   timestamp("created_on").notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id:             uuid("id").primaryKey().defaultRandom(),
  quoteRefNumber: varchar("quote_ref_number", { length: 30 }).unique(),
  leadId:         uuid("lead_id").references(() => leads.id),
  contactId:      uuid("contact_id"),
  quoteStatus:    varchar("quote_status", { length: 30 }).notNull().default("Draft"),
  createdBy:      uuid("created_by").references(() => users.id),
  createdOn:      timestamp("created_on").notNull().defaultNow(),
  modifiedOn:     timestamp("modified_on").notNull().defaultNow(),
});

export type Contact         = typeof contacts.$inferSelect;
export type NewContact      = typeof contacts.$inferInsert;
export type LeadActivity    = typeof lead_activities.$inferSelect;
export type NewLeadActivity = typeof lead_activities.$inferInsert;
export type Quote           = typeof quotes.$inferSelect;
export type NewQuote        = typeof quotes.$inferInsert;
