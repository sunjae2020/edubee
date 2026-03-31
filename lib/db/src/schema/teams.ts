import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const teams = pgTable("teams", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type:        varchar("type", { length: 30 }).notNull().default("agent_team"),
  color:       varchar("color", { length: 20 }).default("#F5821F"),
  teamLeadId:  uuid("team_lead_id").references(() => users.id, { onDelete: "set null" }),
  status:      varchar("status", { length: 20 }).default("active"),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
