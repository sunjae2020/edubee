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

// ── Accommodation Management ───────────────────────────────────────────────
// Note: studentAccountId, providerAccountId reference future 'accounts' table — plain uuid
// Note: settlementId references settlement_mgt which exists with a different structure — plain uuid
export const accommodationMgt = pgTable("accommodation_mgt", {
  id:                uuid("id").primaryKey().defaultRandom(),
  contractId:        uuid("contract_id").notNull().references(() => contracts.id),
  leadId:            uuid("lead_id").references(() => leads.id),
  studentAccountId:  uuid("student_account_id"),
  assignedStaffId:   uuid("assigned_staff_id").references(() => users.id),
  providerAccountId: uuid("provider_account_id"),
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
// Note: studentAccountId, hostCompanyId reference future 'accounts' table — plain uuid
export const internshipMgt = pgTable("internship_mgt", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  contractId:            uuid("contract_id").notNull().references(() => contracts.id),
  leadId:                uuid("lead_id").references(() => leads.id),
  studentAccountId:      uuid("student_account_id"),
  assignedStaffId:       uuid("assigned_staff_id").references(() => users.id),
  englishLevel:          varchar("english_level", { length: 50 }),
  workExperience:        jsonb("work_experience"),
  preferredIndustry:     jsonb("preferred_industry"),
  availableHoursPerWeek: integer("available_hours_per_week"),
  hostCompanyId:         uuid("host_company_id"),
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
// Note: studentAccountId, schoolId reference future 'accounts' table — plain uuid
export const guardianMgt = pgTable("guardian_mgt", {
  id:                             uuid("id").primaryKey().defaultRandom(),
  contractId:                     uuid("contract_id").notNull().references(() => contracts.id),
  leadId:                         uuid("lead_id").references(() => leads.id),
  studentAccountId:               uuid("student_account_id"),
  assignedStaffId:                uuid("assigned_staff_id").references(() => users.id),
  guardianStaffId:                uuid("guardian_staff_id").references(() => users.id),
  serviceStartDate:               date("service_start_date"),
  serviceEndDate:                 date("service_end_date"),
  billingCycle:                   varchar("billing_cycle", { length: 20 }),
  schoolId:                       uuid("school_id"),
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
// Note: studentAccountId references future 'accounts' table — plain uuid
// Note: coeDocumentId, visaDocumentId reference future 'files' table — plain uuid
export const studyAbroadMgt = pgTable("study_abroad_mgt", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  contractId:           uuid("contract_id").notNull().references(() => contracts.id),
  leadId:               uuid("lead_id").references(() => leads.id),
  studentAccountId:     uuid("student_account_id"),
  assignedStaffId:      uuid("assigned_staff_id").references(() => users.id),
  applicationStage:     varchar("application_stage", { length: 50 }),
  targetSchools:        jsonb("target_schools"),
  coeNumber:            varchar("coe_number", { length: 100 }),
  coeExpiryDate:        date("coe_expiry_date"),
  coeDocumentId:        uuid("coe_document_id"),
  visaType:             varchar("visa_type", { length: 100 }),
  visaApplicationDate:  date("visa_application_date"),
  visaDecisionDate:     date("visa_decision_date"),
  visaExpiryDate:       date("visa_expiry_date"),
  visaGranted:          boolean("visa_granted").notNull().default(false),
  visaDocumentId:       uuid("visa_document_id"),
  departureDate:        date("departure_date"),
  orientationCompleted: boolean("orientation_completed").notNull().default(false),
  status:               varchar("status", { length: 50 }).notNull().default("pending"),
  notes:                text("notes"),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
  updatedAt:            timestamp("updated_at").notNull().defaultNow(),
});

// ── Other Service Management ────────────────────────────────────────────────
// Note: partnerId references future 'accounts' table — plain uuid
export const otherServicesMgt = pgTable("other_services_mgt", {
  id:              uuid("id").primaryKey().defaultRandom(),
  contractId:      uuid("contract_id").notNull().references(() => contracts.id),
  assignedStaffId: uuid("assigned_staff_id").references(() => users.id),
  partnerId:       uuid("partner_id"),
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
