import {
  pgTable, uuid, varchar, text, timestamp, boolean,
  integer, jsonb, decimal,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ── Platform Settings (key-value store) ──────────────────────────────────────
export const platformSettings = pgTable("platform_settings", {
  key:       varchar("key", { length: 100 }).primaryKey(),
  value:     text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Organisations ─────────────────────────────────────────────────────────────
export const organisations = pgTable("organisations", {
  // ── Existing columns (do not modify) ──────────────────────────────────────
  id:                 uuid("id").primaryKey().defaultRandom(),
  name:               varchar("name",               { length: 255 }).notNull(),
  abn:                varchar("abn",                { length: 20  }),
  abnName:            varchar("abn_name",           { length: 255 }),
  hasAbn:             boolean("has_abn").notNull().default(false),
  address:            text("address"),
  phone:              varchar("phone",              { length: 50  }),
  email:              varchar("email",              { length: 255 }),
  bankAccountDetails: text("bank_account_details"),
  createdOn:          timestamp("created_on").notNull().defaultNow(),
  modifiedOn:         timestamp("modified_on").notNull().defaultNow(),

  // ── New: Status ────────────────────────────────────────────────────────────
  status: varchar("status", { length: 50 }).default("Active"),
  // Allowed: 'Active' | 'Suspended' | 'Cancelled'

  // ── New: Subdomain & Access ────────────────────────────────────────────────
  subdomain:    varchar("subdomain",     { length: 100 }).unique(),
  customDomain: varchar("custom_domain", { length: 255 }),

  // ── New: Custom Domain DNS/SSL Status ─────────────────────────────────────
  dnsStatus:    varchar("dns_status",    { length: 30  }).default("pending"),
  // Allowed: 'pending' | 'verified' | 'failed'
  dnsToken:     varchar("dns_token",     { length: 255 }),
  dnsVerifiedAt: timestamp("dns_verified_at"),
  sslStatus:    varchar("ssl_status",    { length: 30  }).default("pending"),
  // Allowed: 'pending' | 'active' | 'failed'

  // ── New: Branding ─────────────────────────────────────────────────────────
  logoUrl:        text("logo_url"),
  faviconUrl:     text("favicon_url"),
  primaryColor:   varchar("primary_color",   { length: 20  }).default("#F5821F"),
  secondaryColor: varchar("secondary_color", { length: 20  }).default("#1C1917"),
  accentColor:    varchar("accent_color",    { length: 20  }).default("#FEF0E3"),
  customCss:      text("custom_css"),

  // ── New: Extended Company Info ─────────────────────────────────────────────
  tradingName:  varchar("trading_name",  { length: 255 }),
  companyEmail: varchar("company_email", { length: 255 }),
  websiteUrl:   varchar("website_url",   { length: 500 }),
  description:  text("description"),

  // ── New: Address Fields ────────────────────────────────────────────────────
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  city:         varchar("city",          { length: 100 }),
  state:        varchar("state",         { length: 100 }),
  postcode:     varchar("postcode",      { length: 20  }),
  country:      varchar("country",       { length: 100 }).default("Australia"),

  // ── New: Bank Details Structured ──────────────────────────────────────────
  bankName:      varchar("bank_name",      { length: 255 }),
  bankAccName:   varchar("bank_acc_name",  { length: 255 }),
  bankBsb:       varchar("bank_bsb",       { length: 20  }),
  bankAccNumber: varchar("bank_acc_number",{ length: 50  }),
  bankSwift:     varchar("bank_swift",     { length: 50  }),

  // ── New: Localisation ─────────────────────────────────────────────────────
  timezone:        varchar("timezone",         { length: 100 }).default("Australia/Sydney"),
  defaultCurrency: varchar("default_currency", { length: 10  }).default("AUD"),
  defaultLanguage: varchar("default_language", { length: 20  }).default("en"),

  // ── New: SaaS Plan & Subscription ─────────────────────────────────────────
  planType:       varchar("plan_type",       { length: 50  }).default("starter"),
  planStatus:     varchar("plan_status",     { length: 50  }).default("trial"),
  trialEndsAt:    timestamp("trial_ends_at"),
  subscriptionId: varchar("subscription_id", { length: 255 }),
  maxUsers:       integer("max_users").default(5),
  maxStudents:    integer("max_students").default(100),

  // ── New: Feature Flags ─────────────────────────────────────────────────────
  features: jsonb("features").default({}),

  // ── New: Stripe Billing ────────────────────────────────────────────────────
  stripeCustomerId:     varchar("stripe_customer_id",      { length: 255 }),
  stripePriceId:        varchar("stripe_price_id",         { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id",  { length: 255 }),

  // ── New: Operational Meta ─────────────────────────────────────────────────
  onboardedAt: timestamp("onboarded_at"),
  lastLoginAt: timestamp("last_login_at"),
  ownerEmail:  varchar("owner_email", { length: 255 }),
});

export type Organisation    = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;

// ── Domain Configs (Custom Domain DNS/SSL Tracking) ───────────────────────────
export const domainConfigs = pgTable("domain_configs", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  organisationId:       uuid("organisation_id").notNull().unique()
                          .references(() => organisations.id, { onDelete: "cascade" }),
  customDomain:         varchar("custom_domain",          { length: 255 }),
  dnsVerificationToken: varchar("dns_verification_token", { length: 255 }),
  // DNS CNAME/TXT record value that the tenant must set
  dnsRecordType:        varchar("dns_record_type",        { length: 10  }).default("CNAME"),
  dnsRecordName:        varchar("dns_record_name",        { length: 255 }),
  dnsRecordValue:       varchar("dns_record_value",       { length: 500 }),
  dnsStatus:            varchar("dns_status",             { length: 30  }).default("pending"),
  // Allowed: 'pending' | 'verified' | 'failed'
  dnsVerifiedAt:        timestamp("dns_verified_at"),
  sslStatus:            varchar("ssl_status",             { length: 30  }).default("pending"),
  // Allowed: 'pending' | 'active' | 'failed'
  sslIssuedAt:          timestamp("ssl_issued_at"),
  sslExpiresAt:         timestamp("ssl_expires_at"),
  lastCheckedAt:        timestamp("last_checked_at"),
  checkAttempts:        integer("check_attempts").notNull().default(0),
  errorMessage:         text("error_message"),
  // 'Active' | 'Inactive' (soft delete)
  status:               varchar("status", { length: 20 }).notNull().default("Active"),
  createdOn:            timestamp("created_on").notNull().defaultNow(),
  modifiedOn:           timestamp("modified_on").notNull().defaultNow(),
});

export type DomainConfig    = typeof domainConfigs.$inferSelect;
export type NewDomainConfig = typeof domainConfigs.$inferInsert;

// ── Tenant Invitations ────────────────────────────────────────────────────────
export const tenantInvitations = pgTable("tenant_invitations", {
  id:             uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  email:          varchar("email",  { length: 255 }).notNull(),
  role:           varchar("role",   { length: 50  }).notNull().default("staff"),
  token:          varchar("token",  { length: 500 }).notNull().unique(),
  invitedBy:      uuid("invited_by").references(() => users.id),
  acceptedAt:     timestamp("accepted_at"),
  expiresAt:      timestamp("expires_at").notNull(),
  status:         varchar("status", { length: 20  }).notNull().default("Pending"),
  createdOn:      timestamp("created_on").notNull().defaultNow(),
  modifiedOn:     timestamp("modified_on").notNull().defaultNow(),
});

export type TenantInvitation    = typeof tenantInvitations.$inferSelect;
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert;

// ── Tenant Audit Logs ─────────────────────────────────────────────────────────
export const tenantAuditLogs = pgTable("tenant_audit_logs", {
  id:             uuid("id").primaryKey().defaultRandom(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  userId:         uuid("user_id").references(() => users.id),
  action:         varchar("action",      { length: 255 }).notNull(),
  entityType:     varchar("entity_type", { length: 100 }),
  entityId:       uuid("entity_id"),
  oldValues:      jsonb("old_values"),
  newValues:      jsonb("new_values"),
  ipAddress:      varchar("ip_address",  { length: 50  }),
  createdOn:      timestamp("created_on").notNull().defaultNow(),
});

export type TenantAuditLog    = typeof tenantAuditLogs.$inferSelect;
export type NewTenantAuditLog = typeof tenantAuditLogs.$inferInsert;

// ── Platform Plans (Super Admin managed) ─────────────────────────────────────
export const platformPlans = pgTable("platform_plans", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  name:                  varchar("name", { length: 100 }).notNull(),
  code:                  varchar("code", { length: 50  }).notNull().unique(),
  priceMonthly:          decimal("price_monthly",  { precision: 10, scale: 2 }),
  priceAnnually:         decimal("price_annually", { precision: 10, scale: 2 }),
  maxUsers:              integer("max_users"),
  maxStudents:           integer("max_students"),
  maxBranches:           integer("max_branches").notNull().default(1),
  storageGb:             integer("storage_gb").notNull().default(10),
  // Individual feature flags
  featureCommission:     boolean("feature_commission").notNull().default(false),
  featureVisa:           boolean("feature_visa").notNull().default(false),
  featureServiceModules: boolean("feature_service_modules").notNull().default(false),
  featureMultiBranch:    boolean("feature_multi_branch").notNull().default(false),
  featureAiAssistant:    boolean("feature_ai_assistant").notNull().default(false),
  featureAccounting:     boolean("feature_accounting").notNull().default(false),
  featureAvetmiss:       boolean("feature_avetmiss").notNull().default(false),
  featureCamp:           boolean("feature_camp").notNull().default(false),
  featureFinance:        boolean("feature_finance").notNull().default(false),
  featureApiAccess:      boolean("feature_api_access").notNull().default(false),
  featureWhiteLabel:     boolean("feature_white_label").notNull().default(false),
  // Stripe Price IDs (stored in DB for superadmin management)
  stripePriceMonthly:    varchar("stripe_price_monthly",  { length: 255 }),
  stripePriceAnnually:   varchar("stripe_price_annually", { length: 255 }),
  // Legacy JSONB features (kept for backwards compat)
  features:              jsonb("features"),
  isPopular:             boolean("is_popular").default(false),
  isActive:              boolean("is_active").notNull().default(true),
  sortOrder:             integer("sort_order").notNull().default(0),
  status:                varchar("status", { length: 20 }).notNull().default("Active"),
  createdOn:             timestamp("created_on").notNull().defaultNow(),
  modifiedOn:            timestamp("modified_on").notNull().defaultNow(),
});

export type PlatformPlan    = typeof platformPlans.$inferSelect;
export type NewPlatformPlan = typeof platformPlans.$inferInsert;
