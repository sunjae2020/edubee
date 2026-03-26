import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  boolean,
  integer,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { contracts } from "./contracts";
import { leads } from "./applications";
import { quotes, accounts } from "./crm";
import { products } from "./packages";

// ── Camp Package Groups ────────────────────────────────────────────────────
// Note: heroImageId references future 'files' table — plain uuid
export const campPackageGroups = pgTable("camp_package_groups", {
  id:                uuid("id").primaryKey().defaultRandom(),
  name:              varchar("name", { length: 255 }).notNull(),
  nameI18n:          jsonb("name_i18n"),
  country:           varchar("country", { length: 100 }),
  city:              varchar("city", { length: 100 }),
  durationWeeksMin:  integer("duration_weeks_min"),
  durationWeeksMax:  integer("duration_weeks_max"),
  targetAgeGroup:    varchar("target_age_group", { length: 50 }),
  inclusions:        text("inclusions"),
  exclusions:        text("exclusions"),
  programHighlights: jsonb("program_highlights"),
  landingPageActive: boolean("landing_page_active").notNull().default(false),
  landingPageSlug:   varchar("landing_page_slug", { length: 200 }).unique(),
  heroImageId:       uuid("hero_image_id"),
  galleryImages:     jsonb("gallery_images"),
  displayOrder:      integer("display_order").notNull().default(0),
  createdBy:         uuid("created_by").notNull().references(() => users.id),
  status:            varchar("status", { length: 20 }).notNull().default("Active"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

// ── Camp Packages ──────────────────────────────────────────────────────────
export const campPackages = pgTable("camp_packages", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  packageGroupId:      uuid("package_group_id").notNull().references(() => campPackageGroups.id),
  name:                varchar("name", { length: 255 }).notNull(),
  nameI18n:            jsonb("name_i18n"),
  packageType:         varchar("package_type", { length: 50 }),
  maxAdultCount:       integer("max_adult_count"),
  maxStudentCount:     integer("max_student_count"),
  durationWeeks:       integer("duration_weeks"),
  startDate:           date("start_date"),
  endDate:             date("end_date"),
  basePriceAud:        decimal("base_price_aud", { precision: 12, scale: 2 }),
  priceUsd:            decimal("price_usd", { precision: 12, scale: 2 }),
  priceJpy:            decimal("price_jpy", { precision: 12, scale: 2 }),
  priceKrw:            decimal("price_krw", { precision: 12, scale: 2 }),
  totalPartnerCostAud: decimal("total_partner_cost_aud", { precision: 12, scale: 2 }),
  maxParticipants:     integer("max_participants"),
  currentEnrollment:   integer("current_enrollment").notNull().default(0),
  status:              varchar("status", { length: 20 }).notNull().default("Active"),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
  updatedAt:           timestamp("updated_at").notNull().defaultNow(),
  // ── Phase 1 Migration ──────────────────────────────────────────────────
  productId:           uuid("product_id").references(() => products.id),
});

// ── Camp Package Products ──────────────────────────────────────────────────
export const campPackageProducts = pgTable("camp_package_products", {
  id:          uuid("id").primaryKey().defaultRandom(),
  packageId:   uuid("package_id").notNull().references(() => campPackages.id),
  productId:   uuid("product_id").notNull().references(() => products.id),
  serviceType: varchar("service_type", { length: 50 }),
  quantity:    integer("quantity").notNull().default(1),
  unitPrice:   decimal("unit_price", { precision: 12, scale: 2 }),
  partnerCost: decimal("partner_cost", { precision: 12, scale: 2 }),
  isOptional:  boolean("is_optional").notNull().default(false),
  sortOrder:   integer("sort_order").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── Camp Applications ──────────────────────────────────────────────────────
// Note: agentAccountId references future 'accounts' table — plain uuid
export const campApplications = pgTable("camp_applications", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  applicationRef:        varchar("application_ref", { length: 50 }).unique(),
  packageGroupId:        uuid("package_group_id").notNull().references(() => campPackageGroups.id),
  packageId:             uuid("package_id").notNull().references(() => campPackages.id),
  applicantFirstName:    varchar("applicant_first_name", { length: 255 }),
  applicantLastName:     varchar("applicant_last_name", { length: 255 }),
  applicantOriginalName: varchar("applicant_original_name", { length: 255 }),
  applicantEnglishName:  varchar("applicant_english_name", { length: 255 }),
  applicantName:         varchar("applicant_name", { length: 255 }).notNull(),
  applicantEmail:        varchar("applicant_email", { length: 255 }).notNull(),
  applicantPhone:        varchar("applicant_phone", { length: 50 }),
  applicantNationality:  varchar("applicant_nationality", { length: 100 }),
  applicantDob:          date("applicant_dob"),
  adultCount:            integer("adult_count").notNull().default(1),
  studentCount:          integer("student_count").notNull().default(0),
  preferredStartDate:    date("preferred_start_date"),
  specialRequirements:   text("special_requirements"),
  dietaryRequirements:   text("dietary_requirements"),
  medicalConditions:     text("medical_conditions"),
  emergencyContactName:  varchar("emergency_contact_name", { length: 200 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  leadId:                uuid("lead_id").references(() => leads.id),
  contractId:            uuid("contract_id").references(() => contracts.id),
  assignedStaffId:       uuid("assigned_staff_id").references(() => users.id),
  agentAccountId:        uuid("agent_account_id").references(() => accounts.id, { onDelete: "set null" }),
  applicationStatus:     varchar("application_status", { length: 50 }).notNull().default("submitted"),
  status:                varchar("status", { length: 20 }).notNull().default("Active"),
  quoteId:               uuid("quote_id").references(() => quotes.id),
  quotedAt:              timestamp("quoted_at"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

// ── Camp Institute Management ──────────────────────────────────────────────
// ⚠️  Phase 2 Migration: camp_institute_mgt was DROPPED on 2026-03-25.
//     Data migrated to study_abroad_mgt with program_context = 'camp'.
//     Use studyAbroadMgt (services.ts) with programContext filter instead.

// ── Camp Tour Management ───────────────────────────────────────────────────
export const campTourMgt = pgTable("camp_tour_mgt", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  contractId:            uuid("contract_id").notNull().references(() => contracts.id),
  campApplicationId:     uuid("camp_application_id").references(() => campApplications.id),
  tourProviderAccountId: uuid("tour_provider_account_id").references(() => accounts.id, { onDelete: "set null" }),
  tourName:              varchar("tour_name", { length: 255 }),
  tourType:              varchar("tour_type", { length: 50 }),
  tourDate:              date("tour_date"),
  tourDurationHours:     integer("tour_duration_hours"),
  pickupLocation:        varchar("pickup_location", { length: 255 }),
  bookingReference:      varchar("booking_reference", { length: 100 }),
  partnerCost:           decimal("partner_cost", { precision: 12, scale: 2 }),
  retailPrice:           decimal("retail_price", { precision: 12, scale: 2 }),
  status:                varchar("status", { length: 50 }).notNull().default("pending"),
  notes:                 text("notes"),
  arStatus:              varchar("ar_status",   { length: 20 }).default("scheduled"),
  apStatus:              varchar("ap_status",   { length: 20 }).default("pending"),
  coaArCode:             varchar("coa_ar_code", { length: 10 }),
  coaApCode:             varchar("coa_ap_code", { length: 10 }),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});
