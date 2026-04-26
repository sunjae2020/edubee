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
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { applications } from "./applications";
import { products } from "./packages";
import { accounts, quotes } from "./crm";
import { organisations } from "./settings";

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractNumber: varchar("contract_number", { length: 500 }).unique(),
  applicationId: uuid("application_id")
    .references(() => applications.id)
    .unique(),
  campApplicationId: uuid("camp_application_id"), // FK to camp_applications (no circular ref)
  campProviderId: uuid("camp_provider_id").references(() => organisations.id, { onDelete: "set null" }),
  agentAccountId: uuid("agent_account_id").references(() => accounts.id, { onDelete: "set null" }),
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
  agentInitial: varchar("agent_initial", { length: 10 }),
  notes: text("notes"),
  adminNote: text("admin_note"),
  partnerNote: text("partner_note"),
  kakaoName: varchar("kakao_name", { length: 100 }),
  googleFolderTitle: varchar("google_folder_title", { length: 255 }),
  paymentFrequency: varchar("payment_frequency", { length: 50 }),
  commissionType: varchar("commission_type", { length: 20 }),
  courseStartDate: date("course_start_date"),
  courseEndDate: date("course_end_date"),
  totalArAmount: decimal("total_ar_amount", { precision: 12, scale: 2 }),
  totalApAmount: decimal("total_ap_amount", { precision: 12, scale: 2 }),
  serviceModulesActivated: jsonb("service_modules_activated"),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive:  boolean("is_active").notNull().default(true),
  organisationId: uuid("organisation_id").references(() => organisations.id),
},
(t) => [unique("contracts_quote_id_unique").on(t.quoteId)]);

export const contractProducts = pgTable("contract_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  organisationId: uuid("organisation_id").references(() => organisations.id),
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
  commissionAmount:   decimal("commission_amount",    { precision: 12, scale: 2 }),
  netRevenue:         decimal("net_revenue",           { precision: 12, scale: 2 }),
  remittanceMethod:   varchar("remittance_method",     { length: 20 }),
  commissionArStatus: varchar("commission_ar_status",  { length: 20 }),
  gstAmount:          decimal("gst_amount",            { precision: 12, scale: 2 }),
  isGstFree:          boolean("is_gst_free").default(false),
  providerAccountId:  uuid("provider_account_id").references(() => accounts.id, { onDelete: "set null" }),
  apTrigger:    varchar("ap_trigger",    { length: 30 }).default("on_ar_paid"),
  invoiceCount: integer("invoice_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Contract E-Signature Requests ──────────────────────────────────────────────
export const contractSigningRequests = pgTable("contract_signing_requests", {
  id:             uuid("id").primaryKey().defaultRandom(),
  contractId:     uuid("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  organisationId: uuid("organisation_id"),
  token:          varchar("token",   { length: 255 }).unique().notNull(),
  status:         varchar("status",  { length: 50 }).default("pending"), // pending | signed | expired | cancelled
  expiresAt:      timestamp("expires_at"),
  // Signer configuration (set by admin)
  signers:        jsonb("signers"),    // [{role, name, email, required}]
  // Template data snapshot
  contractData:   jsonb("contract_data"),
  // Collected signatures
  signatures:     jsonb("signatures"), // [{role, name, signatureImage, signedAt}]
  // Generated PDF
  pdfPath:        varchar("pdf_path", { length: 500 }),
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  // Audit
  requestedBy:    uuid("requested_by"),
  signedAt:       timestamp("signed_at"),
  createdAt:      timestamp("created_at").defaultNow(),
  updatedAt:      timestamp("updated_at").defaultNow(),
});
export type ContractSigningRequest = typeof contractSigningRequests.$inferSelect;

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
