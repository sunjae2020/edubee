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
import { products } from "./packages";
import { accounts } from "./crm";

// ── Accommodation Management ───────────────────────────────────────────────
// Note: settlementId references settlement_mgt — plain uuid (same-file circular ref avoided)
export const accommodationMgt = pgTable("accommodation_mgt", {
  id:                uuid("id").primaryKey().defaultRandom(),
  contractId:        uuid("contract_id").notNull().references(() => contracts.id),
  leadId:            uuid("lead_id").references(() => leads.id),
  studentAccountId:  uuid("student_account_id").references(() => accounts.id, { onDelete: "set null" }),
  assignedStaffId:   uuid("assigned_staff_id").references(() => users.id),
  providerAccountId: uuid("provider_account_id").references(() => accounts.id, { onDelete: "set null" }),
  accommodationType: varchar("accommodation_type", { length: 50 }),
  checkinDate:       date("checkin_date"),
  checkoutDate:      date("checkout_date"),
  mealIncluded:      varchar("meal_included", { length: 50 }),
  roomType:          varchar("room_type", { length: 100 }),
  weeklyRate:        decimal("weekly_rate", { precision: 12, scale: 2 }),
  partnerWeeklyCost: decimal("partner_weekly_cost", { precision: 12, scale: 2 }),
  hostName:          varchar("host_name", { length: 200 }),
  hostAddress:       text("host_address"),
  hostContact:       varchar("host_contact", { length: 200 }),
  distanceToSchool:  varchar("distance_to_school", { length: 100 }),
  welfareCheckDates: jsonb("welfare_check_dates"),
  relocationReason:  text("relocation_reason"),
  settlementId:      uuid("settlement_id"),
  status:            varchar("status", { length: 50 }).notNull().default("searching"),
  notes:             text("notes"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

// ── Internship Management ──────────────────────────────────────────────────
export const internshipMgt = pgTable("internship_mgt", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  contractId:            uuid("contract_id").notNull().references(() => contracts.id),
  leadId:                uuid("lead_id").references(() => leads.id),
  studentAccountId:      uuid("student_account_id").references(() => accounts.id, { onDelete: "set null" }),
  assignedStaffId:       uuid("assigned_staff_id").references(() => users.id),
  englishLevel:          varchar("english_level", { length: 50 }),
  workExperience:        jsonb("work_experience"),
  preferredIndustry:     jsonb("preferred_industry"),
  availableHoursPerWeek: integer("available_hours_per_week"),
  hostCompanyId:         uuid("host_company_id").references(() => accounts.id, { onDelete: "set null" }),
  positionTitle:         varchar("position_title", { length: 200 }),
  employmentType:        varchar("employment_type", { length: 50 }),
  hourlyRate:            decimal("hourly_rate", { precision: 8, scale: 2 }),
  resumePrepared:        boolean("resume_prepared").notNull().default(false),
  coverLetterPrepared:   boolean("cover_letter_prepared").notNull().default(false),
  interviewDate:         timestamp("interview_date"),
  interviewResult:       varchar("interview_result", { length: 50 }),
  startDate:             date("start_date"),
  endDate:               date("end_date"),
  placementFeeType:      varchar("placement_fee_type", { length: 50 }),
  referenceLetterIssued: boolean("reference_letter_issued").notNull().default(false),
  status:                varchar("status", { length: 50 }).notNull().default("profile_review"),
  notes:                 text("notes"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

// ── Guardian Management ────────────────────────────────────────────────────
export const guardianMgt = pgTable("guardian_mgt", {
  id:                             uuid("id").primaryKey().defaultRandom(),
  contractId:                     uuid("contract_id").notNull().references(() => contracts.id),
  leadId:                         uuid("lead_id").references(() => leads.id),
  studentAccountId:               uuid("student_account_id").references(() => accounts.id, { onDelete: "set null" }),
  assignedStaffId:                uuid("assigned_staff_id").references(() => users.id),
  guardianStaffId:                uuid("guardian_staff_id").references(() => users.id),
  serviceStartDate:               date("service_start_date"),
  serviceEndDate:                 date("service_end_date"),
  billingCycle:                   varchar("billing_cycle", { length: 20 }),
  schoolId:                       uuid("school_id").references(() => accounts.id, { onDelete: "set null" }),
  officialGuardianRegistered:     boolean("official_guardian_registered").notNull().default(false),
  schoolGuardianRegistrationDate: date("school_guardian_registration_date"),
  monthlyReports:                 jsonb("monthly_reports"),
  parentContact:                  jsonb("parent_contact"),
  emergencyContact:               varchar("emergency_contact", { length: 500 }),
  schoolEventsAttended:           jsonb("school_events_attended"),
  medicalEmergencies:             jsonb("medical_emergencies"),
  welfareInterventions:           jsonb("welfare_interventions"),
  status:                         varchar("status", { length: 50 }).notNull().default("pending"),
  serviceFee:                     decimal("service_fee", { precision: 12, scale: 2 }),
  notes:                          text("notes"),
  createdAt:                      timestamp("created_at").notNull().defaultNow(),
  updatedAt:                      timestamp("updated_at").notNull().defaultNow(),
});

// ── Study Abroad Management ────────────────────────────────────────────────
// Note: coeDocumentId, visaDocumentId reference future 'files' table — plain uuid
export const studyAbroadMgt = pgTable("study_abroad_mgt", {
  id:                      uuid("id").primaryKey().defaultRandom(),
  contractId:              uuid("contract_id").notNull().references(() => contracts.id),
  leadId:                  uuid("lead_id").references(() => leads.id),
  studentAccountId:        uuid("student_account_id").references(() => accounts.id, { onDelete: "set null" }),
  assignedStaffId:         uuid("assigned_staff_id").references(() => users.id),
  applicationStage:        varchar("application_stage", { length: 50 }),
  targetSchools:           jsonb("target_schools"),
  coeNumber:               varchar("coe_number", { length: 100 }),
  coeExpiryDate:           date("coe_expiry_date"),
  coeDocumentId:           uuid("coe_document_id"),
  visaType:                varchar("visa_type", { length: 100 }),
  visaApplicationDate:     date("visa_application_date"),
  visaDecisionDate:        date("visa_decision_date"),
  visaExpiryDate:          date("visa_expiry_date"),
  visaGranted:             boolean("visa_granted").notNull().default(false),
  visaDocumentId:          uuid("visa_document_id"),
  departureDate:           date("departure_date"),
  orientationCompleted:    boolean("orientation_completed").notNull().default(false),
  status:                  varchar("status", { length: 50 }).notNull().default("pending"),
  notes:                   text("notes"),
  createdAt:               timestamp("created_at").notNull().defaultNow(),
  updatedAt:               timestamp("updated_at").notNull().defaultNow(),
  // ── Phase 1 Migration: Camp integration fields ─────────────────────────
  programContext:          varchar("program_context", { length: 50 }).notNull().default("study_abroad"),
  instituteAccountId:      uuid("institute_account_id").references(() => accounts.id, { onDelete: "set null" }),
  programName:             varchar("program_name", { length: 255 }),
  programType:             varchar("program_type", { length: 50 }),
  programStartDate:        date("program_start_date"),
  programEndDate:          date("program_end_date"),
  weeklyHours:             integer("weekly_hours"),
  classSizeMax:            integer("class_size_max"),
  ageGroup:                varchar("age_group", { length: 50 }),
  levelAssessmentRequired: boolean("level_assessment_required").notNull().default(false),
  levelAssessmentDate:     date("level_assessment_date"),
  assignedClass:           varchar("assigned_class", { length: 100 }),
  partnerCost:             decimal("partner_cost", { precision: 12, scale: 2 }),
});

// ── Phase 1 Type Definitions ──────────────────────────────────────────────
export type ProgramContext  = "study_abroad" | "camp";
export type CampProgramType = "english" | "academic" | "holiday" | "mixed" | "stem" | "arts";
export type CampAgeGroup    = "adult" | "junior" | "mixed";

// ── Visa Service Management ─────────────────────────────────────────────────
export const visaServicesMgt = pgTable("visa_services_mgt", {
  id:              uuid("id").primaryKey().defaultRandom(),
  contractId:      uuid("contract_id").notNull().references(() => contracts.id),
  assignedStaffId: uuid("assigned_staff_id").references(() => users.id),
  partnerId:       uuid("partner_id").references(() => accounts.id, { onDelete: "set null" }),
  visaType:        varchar("visa_type", { length: 100 }),
  country:         varchar("country", { length: 100 }),
  applicationDate: date("application_date"),
  appointmentDate: date("appointment_date"),
  submissionDate:  date("submission_date"),
  decisionDate:    date("decision_date"),
  visaNumber:      varchar("visa_number", { length: 100 }),
  startDate:       date("start_date"),
  endDate:         date("end_date"),
  status:          varchar("status", { length: 50 }).notNull().default("pending"),
  serviceFee:      decimal("service_fee", { precision: 12, scale: 2 }),
  apCost:          decimal("ap_cost", { precision: 12, scale: 2 }),
  notes:           text("notes"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Other Service Management ────────────────────────────────────────────────
export const otherServicesMgt = pgTable("other_services_mgt", {
  id:              uuid("id").primaryKey().defaultRandom(),
  contractId:      uuid("contract_id").notNull().references(() => contracts.id),
  assignedStaffId: uuid("assigned_staff_id").references(() => users.id),
  partnerId:       uuid("partner_id").references(() => accounts.id, { onDelete: "set null" }),
  serviceType:     varchar("service_type", { length: 100 }),
  title:           varchar("title", { length: 255 }),
  startDate:       date("start_date"),
  endDate:         date("end_date"),
  status:          varchar("status", { length: 50 }).notNull().default("pending"),
  serviceFee:      decimal("service_fee", { precision: 12, scale: 2 }),
  apCost:          decimal("ap_cost", { precision: 12, scale: 2 }),
  notes:           text("notes"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

// ── Pickup Management ──────────────────────────────────────────────────────
// (이동됨: contracts.ts → services.ts)
export const pickupMgt = pgTable("pickup_mgt", {
  id:            uuid("id").primaryKey().defaultRandom(),
  contractId:    uuid("contract_id").references(() => contracts.id),
  driverId:      uuid("driver_id").references(() => users.id),
  pickupType:    varchar("pickup_type", { length: 50 }),
  fromLocation:  varchar("from_location", { length: 255 }),
  toLocation:    varchar("to_location", { length: 255 }),
  pickupDatetime: timestamp("pickup_datetime"),
  driverName:    varchar("driver_name",    { length: 255 }),
  driverContact: varchar("driver_contact", { length: 100 }),
  vehicleInfo:   varchar("vehicle_info",   { length: 100 }),
  driverNotes:   text("driver_notes"),
  status:        varchar("status", { length: 50 }).default("pending"),
  ledgerEntryId: uuid("ledger_entry_id"),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
  productId:     uuid("product_id").references(() => products.id),
  serviceFee:    decimal("service_fee", { precision: 12, scale: 2 }),
  apCost:        decimal("ap_cost",     { precision: 12, scale: 2 }),
});

// ── Tour Management ────────────────────────────────────────────────────────
// (이동됨: contracts.ts → services.ts)
export const tourMgt = pgTable("tour_mgt", {
  id:            uuid("id").primaryKey().defaultRandom(),
  contractId:    uuid("contract_id").references(() => contracts.id),
  tourCompanyId: uuid("tour_company_id").references(() => users.id),
  tourName:      varchar("tour_name",    { length: 255 }),
  tourDate:      date("tour_date"),
  startTime:     varchar("start_time",   { length: 20 }),
  endTime:       varchar("end_time",     { length: 20 }),
  meetingPoint:  varchar("meeting_point", { length: 255 }),
  highlights:    jsonb("highlights"),
  guideInfo:     varchar("guide_info",   { length: 255 }),
  tourNotes:     text("tour_notes"),
  status:        varchar("status", { length: 50 }).default("pending"),
  ledgerEntryId: uuid("ledger_entry_id"),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
  productId:     uuid("product_id").references(() => products.id),
  serviceFee:    decimal("service_fee", { precision: 12, scale: 2 }),
  apCost:        decimal("ap_cost",     { precision: 12, scale: 2 }),
});

// ── Settlement Management ──────────────────────────────────────────────────
// (이동됨: contracts.ts → services.ts)
export const settlementMgt = pgTable("settlement_mgt", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  contractId:            uuid("contract_id").references(() => contracts.id),
  productId:             uuid("product_id").references(() => products.id),
  providerUserId:        uuid("provider_user_id").references(() => users.id),
  providerRole:          varchar("provider_role", { length: 50 }),
  serviceDescription:    text("service_description"),
  grossAmount:           decimal("gross_amount",        { precision: 12, scale: 2 }),
  commissionRate:        decimal("commission_rate",     { precision: 5,  scale: 2 }),
  commissionAmount:      decimal("commission_amount",   { precision: 12, scale: 2 }),
  netAmount:             decimal("net_amount",          { precision: 12, scale: 2 }),
  currency:              varchar("currency",            { length: 10 }).default("AUD"),
  originalCurrency:      varchar("original_currency",  { length: 10 }),
  originalNetAmount:     decimal("original_net_amount", { precision: 12, scale: 2 }),
  audEquivalent:         decimal("aud_equivalent",      { precision: 12, scale: 2 }),
  exchangeRateToAud:     decimal("exchange_rate_to_aud", { precision: 10, scale: 6 }),
  status:                varchar("status", { length: 50 }).default("pending"),
  settlementDate:        date("settlement_date"),
  notes:                 text("notes"),
  ledgerEntryId:         uuid("ledger_entry_id"),
  createdAt:             timestamp("created_at").defaultNow(),
  updatedAt:             timestamp("updated_at").defaultNow(),
  // ── Arrival Settlement Service fields ─────────────────────────────────
  studentAccountId:      uuid("student_account_id").references(() => accounts.id, { onDelete: "set null" }),
  assignedConsultantId:  uuid("assigned_consultant_id").references(() => users.id),
  arrivalDate:           date("arrival_date"),
  overallStatus:         varchar("overall_status", { length: 50 }).default("pending"),
  checklist:             jsonb("checklist"),
  checklistTemplateId:   uuid("checklist_template_id"),
});

// ── Settlement Checklist Templates ─────────────────────────────────────────
// (이동됨: contracts.ts → services.ts)
export const settlementChecklistTemplates = pgTable("settlement_checklist_templates", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        varchar("name",        { length: 200 }).notNull(),
  description: text("description"),
  items:       jsonb("items").notNull(),
  isDefault:   boolean("is_default").notNull().default(false),
  createdBy:   uuid("created_by").references(() => users.id),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});
