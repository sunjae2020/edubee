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
  englishName:    varchar("english_name",  { length: 100 }),
  originalName:   varchar("original_name", { length: 200 }),
  fullName:       varchar("full_name",     { length: 200 }),
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
  location:                   text("location"),
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
  bankAccountType:            varchar("bank_account_type", { length: 20 }),
  ownerId:                    uuid("owner_id").notNull().references(() => users.id),
  status:                     varchar("status",        { length: 20  }).notNull().default("Active"),
  createdOn:                  timestamp("created_on").notNull().defaultNow(),
  modifiedOn:                 timestamp("modified_on").notNull().defaultNow(),
  portalAccess:               boolean("portal_access").notNull().default(false),
  portalRole:                 varchar("portal_role",          { length: 50  }),
  portalEmail:                varchar("portal_email",         { length: 255 }),
  portalPasswordHash:         varchar("portal_password_hash", { length: 500 }),
  portalTempPassword:         varchar("portal_temp_password", { length: 100 }),
  portalTempPwExpires:        timestamp("portal_temp_pw_expires"),
  portalMustChangePw:         boolean("portal_must_change_pw").notNull().default(false),
  portalLastLoginAt:          timestamp("portal_last_login_at"),
  portalFailedAttempts:       integer("portal_failed_attempts").notNull().default(0),
  portalLockedUntil:          timestamp("portal_locked_until"),
  portalInvitedAt:            timestamp("portal_invited_at"),
  firstName:                  varchar("first_name",    { length: 100 }),
  lastName:                   varchar("last_name",     { length: 100 }),
  englishName:                varchar("english_name",  { length: 100 }),
  originalName:               varchar("original_name", { length: 200 }),
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
  id:                  uuid("id").primaryKey().defaultRandom(),
  quoteRefNumber:      varchar("quote_ref_number",    { length: 30  }).unique(),
  leadId:              uuid("lead_id").references(() => leads.id),
  contactId:           uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  customerContactId:   uuid("customer_contact_id").references(() => contacts.id, { onDelete: "set null" }),
  studentAccountId:    uuid("student_account_id").references(() => accounts.id, { onDelete: "set null" }),
  accountName:         varchar("account_name",        { length: 255 }),
  customerName:        varchar("customer_name",       { length: 255 }),
  quoteStatus:         varchar("quote_status",        { length: 30  }).notNull().default("Draft"),
  expiryDate:          date("expiry_date"),
  isTemplate:          boolean("is_template").notNull().default(false),
  notes:               text("notes"),
  ownerId:             uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdBy:           uuid("created_by").references(() => users.id),
  createdOn:           timestamp("created_on").notNull().defaultNow(),
  modifiedOn:          timestamp("modified_on").notNull().defaultNow(),
  campApplicationId:   uuid("camp_application_id"),
});

export const quote_products = pgTable("quote_products", {
  id:                uuid("id").primaryKey().defaultRandom(),
  quoteId:           uuid("quote_id").references(() => quotes.id).notNull(),
  productId:         uuid("product_id"),
  manualInput:       boolean("manual_input").notNull().default(false),
  name:              varchar("name",            { length: 255 }),
  itemDescription:   text("item_description"),
  price:             decimal("price",           { precision: 12, scale: 2 }),
  quantity:          integer("quantity").notNull().default(1),
  isInitialPayment:  boolean("is_initial_payment").notNull().default(false),
  dueDate:           timestamp("due_date"),
  sortIndex:         integer("sort_index").notNull().default(0),
  isGstIncluded:     boolean("is_gst_included").notNull().default(false),
  status:            varchar("status",          { length: 20  }).notNull().default("Active"),
  modifiedOn:        timestamp("modified_on").notNull().defaultNow(),
  createdOn:         timestamp("created_on").notNull().defaultNow(),
  // Legacy columns kept for backward compatibility
  productName:       varchar("product_name",   { length: 255 }),
  description:       text("description"),
  qty:               integer("qty").notNull().default(1),
  unitPrice:         decimal("unit_price",  { precision: 12, scale: 2 }).notNull().default("0"),
  gstRate:           decimal("gst_rate",    { precision: 5,  scale: 2 }).notNull().default("0"),
  total:             decimal("total",       { precision: 12, scale: 2 }).notNull().default("0"),
  serviceModuleType: varchar("service_module_type", { length: 50 }),
  sortOrder:         integer("sort_order").notNull().default(0),
});

export const account_contacts = pgTable("account_contacts", {
  id:        uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  role:      varchar("role", { length: 100 }),
  createdOn: timestamp("created_on").notNull().defaultNow(),
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
