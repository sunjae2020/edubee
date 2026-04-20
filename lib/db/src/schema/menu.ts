import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const menuCategories = pgTable("menu_categories", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       varchar("name", { length: 100 }).notNull(),
  sortOrder:  integer("sort_order").notNull().default(0),
  status:     varchar("status", { length: 20 }).notNull().default("Active"),
  // Active | Inactive
  createdOn:  timestamp("created_on").notNull().defaultNow(),
  modifiedOn: timestamp("modified_on").notNull().defaultNow(),
}, (t) => [
  index("menu_categories_status_idx").on(t.status),
]);

export const menuItems = pgTable("menu_items", {
  id:         uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => menuCategories.id),
  name:       varchar("name", { length: 100 }).notNull(),
  routeKey:   varchar("route_key", { length: 100 }).notNull(),
  iconName:   varchar("icon_name", { length: 100 }),
  sortOrder:  integer("sort_order").notNull().default(0),
  isVisible:  boolean("is_visible").notNull().default(true),
  status:     varchar("status", { length: 20 }).notNull().default("Active"),
  // Active | Inactive
  createdOn:  timestamp("created_on").notNull().defaultNow(),
  modifiedOn: timestamp("modified_on").notNull().defaultNow(),
}, (t) => [
  unique("menu_items_route_key_uq").on(t.routeKey),
  index("menu_items_category_idx").on(t.categoryId),
  index("menu_items_status_idx").on(t.status),
]);

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = typeof menuCategories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;
