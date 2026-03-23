import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const platformSettings = pgTable("platform_settings", {
  key:       varchar("key", { length: 100 }).primaryKey(),
  value:     text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organisations = pgTable("organisations", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  name:               varchar("name",               { length: 255 }).notNull(),
  abn:                varchar("abn",                { length: 20  }),
  abnName:            varchar("abn_name",           { length: 255 }),
  hasAbn:             boolean("has_abn").notNull().default(false),
  address:            text("address"),
  phone:              varchar("phone",              { length: 50  }),
  email:              varchar("email",              { length: 255 }),
  bankAccountDetails: text("bank_account_details"),
  createdOn:          timestamp("created_on").notNull().defaultNow(),
  modifiedOn:         timestamp("modified_on").notNull().defaultNow(),
});

export type Organisation    = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
