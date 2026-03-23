import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  jsonb,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { applications } from "./applications";
import { products } from "./packages";

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractNumber: varchar("contract_number", { length: 50 }).unique(),
  applicationId: uuid("application_id")
    .references(() => applications.id)
    .unique(),
  campProviderId: uuid("camp_provider_id").references(() => users.id),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }),
  balanceAmount: decimal("balance_amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("AUD"),
  status: varchar("status", { length: 50 }).default("draft"),
  signedAt: date("signed_at"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  studentName: varchar("student_name", { length: 255 }),
  clientEmail: varchar("client_email", { length: 255 }),
  clientCountry: varchar("client_country", { length: 100 }),
  packageGroupName: varchar("package_group_name", { length: 255 }),
  packageName: varchar("package_name", { length: 255 }),
  agentName: varchar("agent_name", { length: 255 }),
  notes: text("notes"),
  paymentFrequency: varchar("payment_frequency", { length: 50 }),
  commissionType: varchar("commission_type", { length: 20 }),
  courseStartDate: date("course_start_date"),
  courseEndDate: date("course_end_date"),
  totalArAmount: decimal("total_ar_amount", { precision: 12, scale: 2 }),
  totalApAmount: decimal("total_ap_amount", { precision: 12, scale: 2 }),
  serviceModulesActivated: jsonb("service_modules_activated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractProducts = pgTable("contract_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 50 }).default("pending"),
  arDueDate: date("ar_due_date"),
  apDueDate: date("ap_due_date"),
  arAmount: decimal("ar_amount", { precision: 12, scale: 2 }),
  apAmount: decimal("ap_amount", { precision: 12, scale: 2 }),
  arStatus: varchar("ar_status", { length: 20 }).default("scheduled"),
  apStatus: varchar("ap_status", { length: 20 }).default("pending"),
  coaArCode: varchar("coa_ar_code", { length: 10 }),
  coaApCode: varchar("coa_ap_code", { length: 10 }),
  serviceModuleType: varchar("service_module_type", { length: 50 }),
  name: varchar("name", { length: 255 }),
  sortIndex: integer("sort_index").default(0),
  isInitialPayment: boolean("is_initial_payment").default(false),
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }),
  schoolAmount: decimal("school_amount", { precision: 12, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }),
  netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const instituteMgt = pgTable("institute_mgt", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  instituteId: uuid("institute_id").references(() => users.id),
  programDetails: text("program_details"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  schedule: jsonb("schedule"),
  totalHours: integer("total_hours"),
  englishLevelStart: varchar("english_level_start", { length: 50 }),
  englishLevelEnd: varchar("english_level_end", { length: 50 }),
  teacherComments: text("teacher_comments"),
  status: varchar("status", { length: 50 }).default("pending"),
  progressNotes: text("progress_notes"),
  ledgerEntryId: uuid("ledger_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hotelMgt = pgTable("hotel_mgt", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  hotelId: uuid("hotel_id").references(() => users.id),
  roomType: varchar("room_type", { length: 100 }),
  checkinDate: date("checkin_date"),
  checkinTime: varchar("checkin_time", { length: 20 }),
  checkoutDate: date("checkout_date"),
  checkoutTime: varchar("checkout_time", { length: 20 }),
  confirmationNo: varchar("confirmation_no", { length: 100 }),
  guestNotes: text("guest_notes"),
  status: varchar("status", { length: 50 }).default("pending"),
  ledgerEntryId: uuid("ledger_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pickupMgt = pgTable("pickup_mgt", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  driverId: uuid("driver_id").references(() => users.id),
  pickupType: varchar("pickup_type", { length: 50 }),
  fromLocation: varchar("from_location", { length: 255 }),
  toLocation: varchar("to_location", { length: 255 }),
  pickupDatetime: timestamp("pickup_datetime"),
  vehicleInfo: varchar("vehicle_info", { length: 100 }),
  driverNotes: text("driver_notes"),
  status: varchar("status", { length: 50 }).default("pending"),
  ledgerEntryId: uuid("ledger_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tourMgt = pgTable("tour_mgt", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  tourCompanyId: uuid("tour_company_id").references(() => users.id),
  tourName: varchar("tour_name", { length: 255 }),
  tourDate: date("tour_date"),
  startTime: varchar("start_time", { length: 20 }),
  endTime: varchar("end_time", { length: 20 }),
  meetingPoint: varchar("meeting_point", { length: 255 }),
  highlights: jsonb("highlights"),
  guideInfo: varchar("guide_info", { length: 255 }),
  tourNotes: text("tour_notes"),
  status: varchar("status", { length: 50 }).default("pending"),
  ledgerEntryId: uuid("ledger_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settlementMgt = pgTable("settlement_mgt", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  productId: uuid("product_id").references(() => products.id),
  providerUserId: uuid("provider_user_id").references(() => users.id),
  providerRole: varchar("provider_role", { length: 50 }),
  serviceDescription: text("service_description"),
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("AUD"),
  originalCurrency: varchar("original_currency", { length: 10 }),
  originalNetAmount: decimal("original_net_amount", { precision: 12, scale: 2 }),
  audEquivalent: decimal("aud_equivalent", { precision: 12, scale: 2 }),
  exchangeRateToAud: decimal("exchange_rate_to_aud", {
    precision: 10,
    scale: 6,
  }),
  status: varchar("status", { length: 50 }).default("pending"),
  settlementDate: date("settlement_date"),
  notes: text("notes"),
  ledgerEntryId: uuid("ledger_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
