import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  boolean,
  jsonb,
  date,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./crm";

export const packageGroups = pgTable("package_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  campProviderId: uuid("camp_provider_id").references(() => accounts.id, { onDelete: "set null" }),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameKo: varchar("name_ko", { length: 255 }),
  nameJa: varchar("name_ja", { length: 255 }),
  nameTh: varchar("name_th", { length: 255 }),
  descriptionEn: text("description_en"),
  descriptionKo: text("description_ko"),
  descriptionJa: text("description_ja"),
  descriptionTh: text("description_th"),
  inclusionsEn: text("inclusions_en"),
  inclusionsKo: text("inclusions_ko"),
  exclusionsEn: text("exclusions_en"),
  exclusionsKo: text("exclusions_ko"),
  durationText: varchar("duration_text", { length: 100 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  location: varchar("location", { length: 255 }),
  countryCode: varchar("country_code", { length: 10 }),
  status: varchar("status", { length: 20 }).default("draft"),
  sortOrder: integer("sort_order").default(0),
  landingOrder: integer("landing_order"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  typeId: uuid("type_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageGroupId: uuid("package_group_id").references(() => packageGroups.id),
  name: varchar("name", { length: 100 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  maxParticipants: integer("max_participants"),
  maxAdults: integer("max_adults"),
  maxStudents: integer("max_students"),
  priceAud: decimal("price_aud", { precision: 12, scale: 2 }),
  priceUsd: decimal("price_usd", { precision: 12, scale: 2 }),
  priceKrw: decimal("price_krw", { precision: 15, scale: 0 }),
  priceJpy: decimal("price_jpy", { precision: 15, scale: 0 }),
  priceThb: decimal("price_thb", { precision: 12, scale: 2 }),
  pricePhp: decimal("price_php", { precision: 12, scale: 2 }),
  priceSgd: decimal("price_sgd", { precision: 10, scale: 2 }),
  priceGbp: decimal("price_gbp", { precision: 10, scale: 2 }),
  features: jsonb("features"),
  status: varchar("status", { length: 20 }).default("active"),
  // Agent commission settings
  agentCommissionType: varchar("agent_commission_type", { length: 20 }), // 'percentage' | 'fixed' | null
  agentCommissionRate: decimal("agent_commission_rate", { precision: 5, scale: 2 }),
  agentCommissionFixed: decimal("agent_commission_fixed", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerAccountId: uuid("provider_account_id").references(() => accounts.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productType: varchar("product_type", { length: 50 }).notNull(),
  description: text("description"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("AUD"),
  unit: varchar("unit", { length: 50 }),
  status: varchar("status", { length: 20 }).default("active"),
  serviceModuleType: varchar("service_module_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Extended fields
  manualInput:        boolean("manual_input").default(false),
  fromDate:           date("from_date"),
  toDate:             date("to_date"),
  durationWeeks:      integer("duration_weeks"),
  category1Id:        uuid("category_1_id"),
  category2Id:        uuid("category_2_id").references(() => accounts.id),
  itemDescription:    text("item_description"),
  price:              numeric("price", { precision: 12, scale: 2 }),
  isGstIncluded:      boolean("is_gst_included").default(false),
  installmentPlan:    varchar("installment_plan", { length: 50 }),
  defaultPaymentTerm: varchar("default_payment_term", { length: 50 }),
  numberOfPayments:   integer("number_of_payments"),
  minimumPayment:     numeric("minimum_payment", { precision: 12, scale: 2 }),
  productPriority:    integer("product_priority"),
  avetmissProductId:  uuid("avetmiss_product_id"),
  isVetInSchools:     boolean("is_vet_in_schools").default(false),
  productGrade:       varchar("product_grade", { length: 50 }),
  isRecommend:        boolean("is_recommend").default(false),
  providerId:         uuid("provider_id").references(() => accounts.id),
  commissionId:       uuid("commission_id"),
  promotionId:        uuid("promotion_id"),
  displayOnQuote:     boolean("display_on_quote").default(true),
  displayOnInvoice:   boolean("display_on_invoice").default(true),
  taxRateId:          uuid("tax_rate_id"),
  productTypeId:      uuid("product_type_id"),
  modifiedOn:         timestamp("modified_on").defaultNow(),
  // ── Phase 1 Migration: Camp integration fields ─────────────────────────
  // Note: campPackageId references camp_packages.id — plain uuid to avoid circular import
  productContext:     varchar("product_context", { length: 50 }).notNull().default("general"),
  campPackageId:      uuid("camp_package_id"),
  // ── Product Images (up to 5, with primary flag) ──────────────────────
  // Stored as JSON array: [{ url: "/objects/...", isPrimary: boolean }]
  productImages:      jsonb("product_images").$type<Array<{ url: string; isPrimary: boolean }>>().default([]),
});

// ── Phase 1 Type Definitions ──────────────────────────────────────────────
export type ProductContext = "general" | "camp_package" | "camp_addon";

export const packageGroupProducts = pgTable("package_group_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageGroupId: uuid("package_group_id").references(() => packageGroups.id),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const packageProducts = pgTable("package_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").references(() => packages.id),
  productId: uuid("product_id").references(() => products.id),
  isOptional: boolean("is_optional").default(false),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const enrollmentSettings = pgTable("enrollment_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageGroupId: uuid("package_group_id")
    .references(() => packageGroups.id)
    .unique(),
  isSpotLimited: boolean("is_spot_limited").default(false),
  displayOnLanding: boolean("display_on_landing").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const enrollmentSpots = pgTable("enrollment_spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageGroupId: uuid("package_group_id").references(() => packageGroups.id),
  gradeLabel: varchar("grade_label", { length: 100 }).notNull(),
  gradeOrder: integer("grade_order").default(0),
  totalSpots: integer("total_spots").notNull(),
  reservedSpots: integer("reserved_spots").default(0),
  manualReserved: integer("manual_reserved").default(0),
  status: varchar("status", { length: 20 }).default("available"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  dobRangeStart: timestamp("dob_range_start"),
  dobRangeEnd: timestamp("dob_range_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const interviewSettings = pgTable("interview_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageGroupId: uuid("package_group_id")
    .references(() => packageGroups.id)
    .unique(),
  isRequired: boolean("is_required").default(false),
  format: varchar("format", { length: 50 }),
  durationMinutes: integer("duration_minutes").default(30),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPackageGroupSchema = createInsertSchema(packageGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPackageGroup = z.infer<typeof insertPackageGroupSchema>;
export type PackageGroup = typeof packageGroups.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
