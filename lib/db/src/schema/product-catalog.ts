import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { products } from "./packages";
import { accounts } from "./crm";

export const productGroups = pgTable("product_groups", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status:      varchar("status", { length: 20 }).default("Active"),
  createdOn:   timestamp("created_on").defaultNow(),
  modifiedOn:  timestamp("modified_on").defaultNow(),
});

export const productTypes = pgTable("product_types", {
  id:                uuid("id").primaryKey().defaultRandom(),
  name:              varchar("name", { length: 255 }).notNull(),
  productGroupId:    uuid("product_group_id").references(() => productGroups.id),
  serviceModuleType: varchar("service_module_type", { length: 50 }),
  description:       text("description"),
  status:            varchar("status", { length: 20 }).default("Active"),
  createdOn:         timestamp("created_on").defaultNow(),
  modifiedOn:        timestamp("modified_on").defaultNow(),
});

export const promotions = pgTable("promotions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  name:           varchar("name", { length: 255 }).notNull(),
  productId:      uuid("product_id").references(() => products.id),
  accountId:      uuid("account_id").references(() => accounts.id),
  fromDate:       date("from_date"),
  toDate:         date("to_date"),
  promotionPrice: text("promotion_price"),
  status:         varchar("status", { length: 20 }).default("Active"),
  createdOn:      timestamp("created_on").defaultNow(),
  modifiedOn:     timestamp("modified_on").defaultNow(),
});

export const commissions = pgTable("commissions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  name:           varchar("name", { length: 100 }).notNull(),
  commissionType: varchar("commission_type", { length: 20 }).notNull().default("rate"),
  rateValue:      numeric("rate_value", { precision: 8, scale: 2 }),
  description:    text("description"),
  status:         varchar("status", { length: 20 }).default("Active"),
  createdOn:      timestamp("created_on").defaultNow(),
  modifiedOn:     timestamp("modified_on").defaultNow(),
});

export const taxRates = pgTable("tax_rates", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        varchar("name", { length: 100 }).notNull(),
  rate:        numeric("rate", { precision: 6, scale: 4 }).notNull().default("0"),
  description: text("description"),
  status:      varchar("status", { length: 20 }).default("Active"),
  createdOn:   timestamp("created_on").defaultNow(),
  modifiedOn:  timestamp("modified_on").defaultNow(),
});

export type ProductGroup    = typeof productGroups.$inferSelect;
export type NewProductGroup = typeof productGroups.$inferInsert;
export type ProductType     = typeof productTypes.$inferSelect;
export type NewProductType  = typeof productTypes.$inferInsert;
export type Promotion       = typeof promotions.$inferSelect;
export type NewPromotion    = typeof promotions.$inferInsert;
export type Commission      = typeof commissions.$inferSelect;
export type NewCommission   = typeof commissions.$inferInsert;
export type TaxRate         = typeof taxRates.$inferSelect;
export type NewTaxRate      = typeof taxRates.$inferInsert;
