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
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { contracts } from "./contracts";
import { contractProducts } from "./contracts";
import { invoices } from "./finance";
import { accounts } from "./crm";
import { organisations } from "./settings";

// ── Chart of Accounts ──────────────────────────────────────────────────────
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  code:        varchar("code", { length: 10 }).notNull().unique(),
  name:        varchar("name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 20 }).notNull(),
  description: text("description"),
  parentCode:  varchar("parent_code", { length: 10 }),
  isActive:    boolean("is_active").notNull().default(true),
  createdOn:   timestamp("created_on").notNull().defaultNow(),
  modifiedOn:  timestamp("modified_on").notNull().defaultNow(),
});

// ── Product Cost Lines ─────────────────────────────────────────────────────
export const productCostLines = pgTable("product_cost_lines", {
  id:                uuid("id").primaryKey().defaultRandom(),
  contractProductId: uuid("contract_product_id").notNull().references(() => contractProducts.id),
  costType:          varchar("cost_type", { length: 50 }).notNull(),
  partnerId:         uuid("partner_id").references(() => accounts.id, { onDelete: "set null" }),
  staffId:           uuid("staff_id").references(() => users.id),
  calcType:          varchar("calc_type", { length: 20 }).notNull(),
  rate:              decimal("rate", { precision: 8, scale: 4 }),
  baseAmount:        decimal("base_amount", { precision: 12, scale: 2 }),
  calculatedAmount:  decimal("calculated_amount", { precision: 12, scale: 2 }),
  coaCode:           varchar("coa_code", { length: 10 }).references(() => chartOfAccounts.code),
  description:       text("description"),
  status:            varchar("status", { length: 20 }).notNull().default("pending"),
  paidAt:            timestamp("paid_at"),
  paymentHeaderId:   uuid("payment_header_id"),
  createdOn:         timestamp("created_on").notNull().defaultNow(),
  modifiedOn:        timestamp("modified_on").notNull().defaultNow(),
});

// ── Payment Headers ────────────────────────────────────────────────────────
// Note: paymentInfoId references 'payment_infos' (future table) — stored as plain uuid
export const paymentHeaders = pgTable("payment_headers", {
  id:             uuid("id").primaryKey().defaultRandom(),
  paymentRef:     varchar("payment_ref", { length: 50 }).unique(),
  contractId:     uuid("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  invoiceId:      uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  paymentDate:    date("payment_date").notNull(),
  totalAmount:    decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  currency:       varchar("currency", { length: 10 }).notNull().default("AUD"),
  paymentMethod:  varchar("payment_method", { length: 50 }),
  paymentType:    varchar("payment_type", { length: 30 }).notNull(),
  receivedFrom:   uuid("received_from").references(() => accounts.id, { onDelete: "set null" }),
  paidTo:         uuid("paid_to").references(() => accounts.id, { onDelete: "set null" }),
  bankReference:  varchar("bank_reference", { length: 100 }),
  paymentInfoId:  uuid("payment_info_id"),
  notes:          text("notes"),
  createdBy:      uuid("created_by").notNull().references(() => users.id),
  approvedBy:     uuid("approved_by").references(() => users.id),
  status:         varchar("status", { length: 20 }).notNull().default("Active"),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  createdOn:      timestamp("created_on").notNull().defaultNow(),
  modifiedOn:     timestamp("modified_on").notNull().defaultNow(),
});

// ── Payment Lines ──────────────────────────────────────────────────────────
export const paymentLines = pgTable("payment_lines", {
  id:                uuid("id").primaryKey().defaultRandom(),
  paymentHeaderId:   uuid("payment_header_id").notNull().references(() => paymentHeaders.id),
  invoiceId:         uuid("invoice_id").references(() => invoices.id),
  contractProductId: uuid("contract_product_id").references(() => contractProducts.id),
  coaCode:           varchar("coa_code", { length: 10 }).references(() => chartOfAccounts.code),
  splitType:         varchar("split_type", { length: 50 }),
  amount:            decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  staffId:           uuid("staff_id").references(() => users.id),
  description:       text("description"),
  organisationId:    uuid("organisation_id").references(() => organisations.id),
  createdOn:         timestamp("created_on").notNull().defaultNow(),
});

// ── Journal Entries ────────────────────────────────────────────────────────
export const journalEntries = pgTable("journal_entries", {
  id:               uuid("id").primaryKey().defaultRandom(),
  entryDate:        date("entry_date").notNull(),
  paymentHeaderId:  uuid("payment_header_id").references(() => paymentHeaders.id),
  paymentLineId:    uuid("payment_line_id").references(() => paymentLines.id),
  debitCoa:         varchar("debit_coa", { length: 10 }).notNull().references(() => chartOfAccounts.code),
  creditCoa:        varchar("credit_coa", { length: 10 }).notNull().references(() => chartOfAccounts.code),
  amount:           decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  description:      text("description"),
  studentAccountId: uuid("student_account_id").references(() => accounts.id, { onDelete: "set null" }),
  partnerId:        uuid("partner_id").references(() => accounts.id, { onDelete: "set null" }),
  staffId:          uuid("staff_id").references(() => users.id),
  contractId:       uuid("contract_id").references(() => contracts.id),
  invoiceId:        uuid("invoice_id").references(() => invoices.id),
  entryType:        varchar("entry_type", { length: 50 }),
  autoGenerated:    boolean("auto_generated").notNull().default(true),
  createdBy:        uuid("created_by").notNull().references(() => users.id),
  createdOn:        timestamp("created_on").notNull().defaultNow(),
});

// ── Agent Commission Configs ───────────────────────────────────────────────
export const agentCommissionConfigs = pgTable("agent_commission_configs", {
  id:             uuid("id").primaryKey().defaultRandom(),
  partnerId:      uuid("partner_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  schoolId:       uuid("school_id").references(() => accounts.id, { onDelete: "set null" }),
  commissionType: varchar("commission_type", { length: 20 }).notNull(),
  defaultRate:    decimal("default_rate", { precision: 8, scale: 4 }),
  defaultAmount:  decimal("default_amount", { precision: 12, scale: 2 }),
  defaultBase:    varchar("default_base", { length: 30 }),
  paymentMethod:  varchar("payment_method", { length: 20 }),
  paymentTiming:  varchar("payment_timing", { length: 50 }),
  notes:          text("notes"),
  validFrom:      date("valid_from"),
  validTo:        date("valid_to"),
  status:         varchar("status", { length: 20 }).notNull().default("Active"),
  createdOn:      timestamp("created_on").notNull().defaultNow(),
  modifiedOn:     timestamp("modified_on").notNull().defaultNow(),
});


// ── Tax Invoices ───────────────────────────────────────────────────────────
export const taxInvoices = pgTable("tax_invoices", {
  id:                uuid("id").primaryKey().defaultRandom(),
  // Foreign key to unified invoices table
  invoiceId:         uuid("invoice_id").references(() => invoices.id),
  // Core tax invoice fields
  invoiceRef:        varchar("invoice_ref",        { length: 50  }).unique().notNull(),
  invoiceDate:       date("invoice_date").notNull(),
  invoiceType:       varchar("invoice_type",        { length: 20  }).notNull(),
  contractProductId: uuid("contract_product_id").notNull().references(() => contractProducts.id),
  contractId:        uuid("contract_id").notNull().references(() => contracts.id),
  schoolAccountId:   uuid("school_account_id").notNull().references(() => accounts.id),
  studentAccountId:  uuid("student_account_id").references(() => accounts.id),
  programName:       varchar("program_name",        { length: 255 }).notNull(),
  studentName:       varchar("student_name",        { length: 255 }).notNull(),
  courseStartDate:   date("course_start_date"),
  courseEndDate:     date("course_end_date"),
  commissionAmount:  decimal("commission_amount",   { precision: 12, scale: 2 }).notNull().default("0"),
  gstAmount:         decimal("gst_amount",          { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount:       decimal("total_amount",        { precision: 12, scale: 2 }).notNull().default("0"),
  isGstFree:         boolean("is_gst_free").notNull().default(false),
  paymentHeaderId:   uuid("payment_header_id").references(() => paymentHeaders.id),
  pdfUrl:            varchar("pdf_url",             { length: 500 }),
  sentAt:            timestamp("sent_at"),
  sentToEmail:       varchar("sent_to_email",       { length: 255 }),
  status:            varchar("status",              { length: 20  }).notNull().default("draft"),
  dueDate:           date("due_date"),
  paidAt:            timestamp("paid_at"),
  createdBy:         uuid("created_by").notNull().references(() => users.id),
  createdOn:         timestamp("created_on").notNull().defaultNow(),
  modifiedOn:        timestamp("modified_on").notNull().defaultNow(),
});

export type TaxInvoice    = typeof taxInvoices.$inferSelect;
export type NewTaxInvoice = typeof taxInvoices.$inferInsert;

// ── Payment Statements ──────────────────────────────────────────────────────
export const paymentStatements = pgTable("payment_statements", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  statementRef:         varchar("statement_ref",         { length: 50  }).unique().notNull(),
  statementDate:        date("statement_date").notNull(),
  statementScope:       varchar("statement_scope",       { length: 20  }).notNull(),
  contractId:           uuid("contract_id").references(() => contracts.id),
  studentAccountId:     uuid("student_account_id").references(() => accounts.id),
  totalPaidAmount:      decimal("total_paid_amount",     { precision: 12, scale: 2 }).notNull().default("0"),
  totalOutstanding:     decimal("total_outstanding",     { precision: 12, scale: 2 }).notNull().default("0"),
  totalContractAmount:  decimal("total_contract_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  lineItemCount:        integer("line_item_count").notNull().default(0),
  pdfUrl:               varchar("pdf_url",               { length: 500 }),
  issuedBy:             uuid("issued_by").notNull().references(() => users.id),
  sentToEmail:          varchar("sent_to_email",         { length: 255 }),
  sentAt:               timestamp("sent_at"),
  issueReason:          varchar("issue_reason",          { length: 100 }),
  notes:                text("notes"),
  status:               varchar("status",                { length: 20  }).notNull().default("issued"),
  createdOn:            timestamp("created_on").notNull().defaultNow(),
  modifiedOn:           timestamp("modified_on").notNull().defaultNow(),
});

export type PaymentStatement    = typeof paymentStatements.$inferSelect;
export type NewPaymentStatement = typeof paymentStatements.$inferInsert;

// ── Cost Centers ─────────────────────────────────────────────────────────────
// Phase 1: Global (no org_id). Phase 2 will add organisation_id FK.
export const costCenters = pgTable("cost_centers", {
  id:          uuid("id").primaryKey().defaultRandom(),
  code:        varchar("code", { length: 20  }).notNull().unique(),
  name:        varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  status:      varchar("status", { length: 20 }).notNull().default("active"),
  createdOn:   timestamp("created_on").notNull().defaultNow(),
  modifiedOn:  timestamp("modified_on").notNull().defaultNow(),
});

export type CostCenter    = typeof costCenters.$inferSelect;
export type NewCostCenter = typeof costCenters.$inferInsert;

// ── Payment Infos ─────────────────────────────────────────────────────────────
// Master list of payment method configurations used in payment headers.
// Phase 1: Global. Phase 2 will add organisation_id FK.
export const paymentInfos = pgTable("payment_infos", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          varchar("name",           { length: 100 }).notNull().unique(),
  paymentMethod: varchar("payment_method", { length: 50  }).notNull(),
  // Allowed: 'bank_transfer' | 'credit_card' | 'cash' | 'paypal' | 'stripe' | 'other'
  currency:      varchar("currency",       { length: 10  }).notNull().default("AUD"),
  description:   text("description"),
  isDefault:     boolean("is_default").notNull().default(false),
  status:        varchar("status",         { length: 20  }).notNull().default("active"),
  createdOn:     timestamp("created_on").notNull().defaultNow(),
  modifiedOn:    timestamp("modified_on").notNull().defaultNow(),
});

export type PaymentInfo    = typeof paymentInfos.$inferSelect;
export type NewPaymentInfo = typeof paymentInfos.$inferInsert;
