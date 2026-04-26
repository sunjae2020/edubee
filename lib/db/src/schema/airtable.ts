import {
  pgTable, uuid, varchar, timestamp, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const airtableSyncMap = pgTable("airtable_sync_map", {
  id:                uuid("id").primaryKey().defaultRandom(),
  organisationId:    uuid("organisation_id"),
  airtableBaseId:    varchar("airtable_base_id",   { length: 50  }).notNull(),
  airtableTable:     varchar("airtable_table",      { length: 100 }).notNull(),
  airtableRecordId:  varchar("airtable_record_id",  { length: 100 }).notNull(),
  crmTable:          varchar("crm_table",           { length: 100 }).notNull(),
  crmId:             uuid("crm_id").notNull(),
  syncDirection:     varchar("sync_direction",      { length: 20  }).notNull().default("inbound"),
  lastSyncedAt:      timestamp("last_synced_at").notNull().defaultNow(),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("airtable_sync_map_unique_idx").on(t.airtableBaseId, t.airtableTable, t.airtableRecordId),
  index("airtable_sync_map_crm_idx").on(t.crmTable, t.crmId),
]);

export type AirtableSyncMap    = typeof airtableSyncMap.$inferSelect;
export type NewAirtableSyncMap = typeof airtableSyncMap.$inferInsert;
