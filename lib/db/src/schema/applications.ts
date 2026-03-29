import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  date,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { packageGroups, packages, enrollmentSpots } from "./packages";
import { accounts } from "./crm";

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").references(() => users.id),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  firstName:         varchar("first_name",    { length: 100 }),
  lastName:          varchar("last_name",     { length: 100 }),
  englishName:       varchar("english_name",  { length: 100 }),
  originalName:      varchar("original_name", { length: 200 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  nationality: varchar("nationality", { length: 100 }),
  source: varchar("source", { length: 100 }),
  interestedIn: uuid("interested_in").references(() => packageGroups.id),
  status:            varchar("status",              { length: 50  }).default("new"),
  notes:             text("notes"),
  leadRefNumber:     varchar("lead_ref_number",     { length: 30  }).unique(),
  assignedStaffId:   uuid("assigned_staff_id").references(() => users.id),
  inquiryType:       varchar("inquiry_type",        { length: 100 }),
  budget:            decimal("budget",              { precision: 12, scale: 2 }),
  expectedStartDate: date("expected_start_date"),
  contactId:         uuid("contact_id"),
  accountId:         uuid("account_id"),
  createdAt:         timestamp("created_at").defaultNow(),
  updatedAt:         timestamp("updated_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationNumber: varchar("application_number", { length: 50 }).unique(),
  agentId: uuid("agent_id").references(() => users.id),
  agentAccountId: uuid("agent_account_id").references(() => accounts.id),
  clientId: uuid("client_id").references(() => users.id),
  packageGroupId: uuid("package_group_id").references(() => packageGroups.id),
  packageId: uuid("package_id").references(() => packages.id),
  preferredStartDate: date("preferred_start_date"),
  status: varchar("status", { length: 50 }).default("pending"),
  totalChildren: integer("total_children").default(1),
  totalAdults: integer("total_adults").default(0),
  primaryLanguage: varchar("primary_language", { length: 10 }).default("en"),
  referralSource: varchar("referral_source", { length: 100 }),
  referralAgentCode: varchar("referral_agent_code", { length: 50 }),
  specialRequests: text("special_requests"),
  termsAccepted: boolean("terms_accepted").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // ── Service Application fields ──────────────────────────────
  applicationType:    varchar("application_type",    { length: 50  }),
  serviceTypes:       jsonb("service_types"),
  applicationStatus:  varchar("application_status",  { length: 50  }).default("submitted"),
  quoteId:            uuid("quote_id"),
  contactId:          uuid("contact_id"),
  accountId:          uuid("account_id"),
  assignedStaffId:    uuid("assigned_staff_id").references(() => users.id),
  applicantName:      varchar("applicant_name",      { length: 255 }),
  applicantEmail:     varchar("applicant_email",     { length: 255 }),
  applicantPhone:     varchar("applicant_phone",     { length: 50  }),
  applicantNationality: varchar("applicant_nationality", { length: 100 }),
  // Pickup service
  flightNumber:       varchar("flight_number",       { length: 50  }),
  flightDate:         date("flight_date"),
  arrivalTime:        varchar("arrival_time",        { length: 20  }),
  departureAirport:   varchar("departure_airport",   { length: 100 }),
  arrivalAirport:     varchar("arrival_airport",     { length: 100 }),
  passengerCount:     integer("passenger_count"),
  // Accommodation service
  checkinDate:        date("checkin_date"),
  checkoutDate:       date("checkout_date"),
  roomType:           varchar("room_type",           { length: 50  }),
  numRooms:           integer("num_rooms"),
  accommodationAddress: text("accommodation_address"),
  // Study Abroad service
  destinationCountry: varchar("destination_country", { length: 100 }),
  studyStartDate:     date("study_start_date"),
  studyEndDate:       date("study_end_date"),
  institutionName:    varchar("institution_name",    { length: 255 }),
  courseName:         varchar("course_name",         { length: 255 }),
  // Internship service
  internshipStartDate: date("internship_start_date"),
  internshipEndDate:   date("internship_end_date"),
  industry:            varchar("industry",           { length: 100 }),
  companyPreference:   varchar("company_preference", { length: 255 }),
  // Settlement service
  settlementDate:     date("settlement_date"),
  suburb:             varchar("suburb",              { length: 100 }),
  settlementNotes:    text("settlement_notes"),
  // Guardian service
  guardianStartDate:  date("guardian_start_date"),
  guardianEndDate:    date("guardian_end_date"),
  studentNameForGuardian: varchar("student_name_for_guardian", { length: 255 }),
  guardianType:       varchar("guardian_type",       { length: 50  }),
  // Name fields (통합 이름 시스템)
  firstName:          varchar("first_name",    { length: 100 }),
  lastName:           varchar("last_name",     { length: 100 }),
  englishName:        varchar("english_name",  { length: 100 }),
  originalName:       varchar("original_name", { length: 200 }),
});

export const applicationParticipants = pgTable("application_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id),
  campApplicationId: uuid("camp_application_id"),
  participantType: varchar("participant_type", { length: 50 }).notNull(),
  sequenceOrder: integer("sequence_order").default(1),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  fullNameNative: varchar("full_name_native", { length: 255 }),
  englishName: varchar("english_name", { length: 255 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  nationality: varchar("nationality", { length: 100 }),
  passportNumber: varchar("passport_number", { length: 100 }),
  passportExpiry: date("passport_expiry"),
  grade: varchar("grade", { length: 100 }),
  schoolName: varchar("school_name", { length: 255 }),
  englishLevel: varchar("english_level", { length: 50 }),
  medicalConditions: text("medical_conditions"),
  dietaryRequirements: varchar("dietary_requirements", { length: 100 }),
  specialNeeds: text("special_needs"),
  relationshipToStudent: varchar("relationship_to_student", { length: 100 }),
  isEmergencyContact: boolean("is_emergency_contact").default(false),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  lineId: varchar("line_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const applicationGrade = pgTable("application_grade", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id),
  participantId: uuid("participant_id").references(
    () => applicationParticipants.id
  ),
  enrollmentSpotId: uuid("enrollment_spot_id").references(
    () => enrollmentSpots.id
  ),
  gradeLabel: varchar("grade_label", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const interviewSchedules = pgTable("interview_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id),
  studyAbroadId: uuid("study_abroad_id"),
  packageGroupId: uuid("package_group_id").references(() => packageGroups.id),
  interviewerId: uuid("interviewer_id").references(() => users.id),
  scheduledDatetime: timestamp("scheduled_datetime").notNull(),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Seoul"),
  format: varchar("format", { length: 50 }),
  meetingLink: varchar("meeting_link", { length: 500 }),
  location: varchar("location", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"),
  result: varchar("result", { length: 20 }),
  interviewerNotes: text("interviewer_notes"),
  candidateNotes: text("candidate_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type ApplicationParticipant =
  typeof applicationParticipants.$inferSelect;
