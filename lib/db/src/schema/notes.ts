import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notes = pgTable("notes", {
  id:         uuid("id").primaryKey().defaultRandom(),

  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId:   uuid("entity_id").notNull(),

  noteType:   varchar("note_type", { length: 50 }).notNull().default("internal"),

  content:    text("content").notNull(),

  visibility: varchar("visibility", { length: 20 }).notNull().default("internal"),

  isPinned:   boolean("is_pinned").default(false),

  createdBy:  uuid("created_by").references(() => users.id),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow(),
});
