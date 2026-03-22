import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  boolean,
  integer,
  decimal,
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

export const accounts = pgTable("accounts", {
  id:                         uuid("id").primaryKey().defaultRandom(),
  name:                       varchar("name",         { length: 255 }).notNull(),
  manualInput:                boolean("manual_input").notNull().default(false),
  accountType:                varchar("account_type", { length: 50  }),
  accountCategory:            varchar("account_category", { length: 50 }),
  parentAccountId:            uuid("parent_account_id").references((): any => accounts.id),
  primaryContactId:           uuid("primary_contact_id").references(() => contacts.id),
  secondaryContactId:         uuid("secondary_contact_id").references(() => contacts.id),
  phoneNumber:                varchar("phone_number",  { length: 50  }),
  phoneNumber2:               varchar("phone_number_2",{ length: 50  }),
  fax:                        varchar("fax",           { length: 50  }),
  email:                      varchar("email",         { length: 255 }),
  website:                    varchar("website",       { length: 500 }),
  websiteUrl2:                varchar("website_url_2", { length: 500 }),
  address:                    text("address"),
  secondaryAddress:           text("secondary_address"),
  country:                    varchar("country",       { length: 100 }),
  state:                      varchar("state",         { length: 100 }),
  city:                       varchar("city",          { length: 100 }),
  postalCode:                 varchar("postal_code",   { length: 20  }),
  abn:                        varchar("abn",           { length: 50  }),
  paymentInfoId:              uuid("payment_info_id"),
  isProductSource:            boolean("is_product_source").notNull().default(false),
  isProductProvider:          boolean("is_product_provider").notNull().default(false),
  foundYear:                  varchar("found_year",    { length: 10  }),
  totalCapacity:              integer("total_capacity"),
  logoId:                     uuid("logo_id"),
  agreementId:                uuid("agreement_id"),
  avetmissDeliveryLocationId: varchar("avetmiss_delivery_location_id", { length: 100 }),
  description:                text("description"),
  ownerId:                    uuid("owner_id").notNull().references(() => users.id),
  status:                     varchar("status",        { length: 20  }).notNull().default("Active"),
  createdOn:                  timestamp("created_on").notNull().defaultNow(),
  modifiedOn:                 timestamp("modified_on").notNull().defaultNow(),
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
  accountName:    varchar("account_name",     { length: 255 }),
  quoteStatus:    varchar("quote_status",     { length: 30 }).notNull().default("Draft"),
  expiryDate:     date("expiry_date"),
  isTemplate:     boolean("is_template").notNull().default(false),
  notes:          text("notes"),
  createdBy:      uuid("created_by").references(() => users.id),
  createdOn:      timestamp("created_on").notNull().defaultNow(),
  modifiedOn:     timestamp("modified_on").notNull().defaultNow(),
});

export const quote_products = pgTable("quote_products", {
  id:                uuid("id").primaryKey().defaultRandom(),
  quoteId:           uuid("quote_id").references(() => quotes.id).notNull(),
  productName:       varchar("product_name",   { length: 255 }).notNull(),
  description:       text("description"),
  qty:               integer("qty").notNull().default(1),
  unitPrice:         decimal("unit_price",  { precision: 12, scale: 2 }).notNull().default("0"),
  gstRate:           decimal("gst_rate",    { precision: 5,  scale: 2 }).notNull().default("0"),
  total:             decimal("total",       { precision: 12, scale: 2 }).notNull().default("0"),
  serviceModuleType: varchar("service_module_type", { length: 50 }),
  sortOrder:         integer("sort_order").notNull().default(0),
  createdOn:         timestamp("created_on").notNull().defaultNow(),
});

export type Contact         = typeof contacts.$inferSelect;
export type NewContact      = typeof contacts.$inferInsert;
export type Account         = typeof accounts.$inferSelect;
export type NewAccount      = typeof accounts.$inferInsert;
export type LeadActivity    = typeof lead_activities.$inferSelect;
export type NewLeadActivity = typeof lead_activities.$inferInsert;
export type Quote           = typeof quotes.$inferSelect;
export type NewQuote        = typeof quotes.$inferInsert;
export type QuoteProduct    = typeof quote_products.$inferSelect;
export type NewQuoteProduct = typeof quote_products.$inferInsert;
