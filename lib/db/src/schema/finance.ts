import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  boolean,
  jsonb,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { contracts } from "./contracts";

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromCurrency: varchar("from_currency", { length: 10 }).notNull(),
    toCurrency: varchar("to_currency", { length: 10 }).notNull().default("AUD"),
    rate: decimal("rate", { precision: 12, scale: 6 }).notNull(),
    source: varchar("source", { length: 50 }).default("manual"),
    effectiveDate: date("effective_date").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.fromCurrency, t.toCurrency, t.effectiveDate)]
);

export const banking = pgTable("banking", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  bankName: varchar("bank_name", { length: 255 }),
  accountNumber: varchar("account_number", { length: 100 }),
  accountHolder: varchar("account_holder", { length: 255 }),
  bankCode: varchar("bank_code", { length: 50 }),
  countryCode: varchar("country_code", { length: 10 }),
  defaultCurrency: varchar("default_currency", { length: 10 }),
  isPrimary: boolean("is_primary").default(false),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).unique(),
  contractId: uuid("contract_id").references(() => contracts.id),
  invoiceType: varchar("invoice_type", { length: 20 }).notNull(),
  recipientId: uuid("recipient_id").references(() => users.id),
  lineItems: jsonb("line_items"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  originalCurrency: varchar("original_currency", { length: 10 }),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }),
  audEquivalent: decimal("aud_equivalent", { precision: 12, scale: 2 }),
  exchangeRateToAud: decimal("exchange_rate_to_aud", {
    precision: 10,
    scale: 6,
  }),
  rateAppliedAt: timestamp("rate_applied_at"),
  currency: varchar("currency", { length: 10 }).default("AUD"),
  status: varchar("status", { length: 20 }).default("draft"),
  issuedAt: timestamp("issued_at"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").references(() => contracts.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  bankAccountId: uuid("bank_account_id").references(() => banking.id),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  originalCurrency: varchar("original_currency", { length: 10 }),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }),
  audEquivalent: decimal("aud_equivalent", { precision: 12, scale: 2 }),
  exchangeRateToAud: decimal("exchange_rate_to_aud", {
    precision: 10,
    scale: 6,
  }),
  currency: varchar("currency", { length: 10 }).default("AUD"),
  description: varchar("description", { length: 500 }),
  bankReference: varchar("bank_reference", { length: 200 }),
  transactionDate: date("transaction_date"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptNumber: varchar("receipt_number", { length: 50 }).unique(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  payerId: uuid("payer_id").references(() => users.id),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  originalCurrency: varchar("original_currency", { length: 10 }),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }),
  audEquivalent: decimal("aud_equivalent", { precision: 12, scale: 2 }),
  exchangeRateToAud: decimal("exchange_rate_to_aud", {
    precision: 10,
    scale: 6,
  }),
  currency: varchar("currency", { length: 10 }).default("AUD"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  receiptDate: date("receipt_date"),
  status: varchar("status", { length: 20 }).default("confirmed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});
export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  createdAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
