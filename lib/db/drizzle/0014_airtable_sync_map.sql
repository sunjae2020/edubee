-- Migration: airtable_sync_map table
-- Tracks Airtable record <-> CRM record mapping to prevent duplicates
CREATE TABLE IF NOT EXISTS "airtable_sync_map" (
  "id"                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "organisation_id"     UUID,
  "airtable_base_id"    VARCHAR(50) NOT NULL,
  "airtable_table"      VARCHAR(100) NOT NULL,
  "airtable_record_id"  VARCHAR(100) NOT NULL,
  "crm_table"           VARCHAR(100) NOT NULL,
  "crm_id"              UUID        NOT NULL,
  "sync_direction"      VARCHAR(20) NOT NULL DEFAULT 'inbound',
  "last_synced_at"      TIMESTAMP   NOT NULL DEFAULT NOW(),
  "created_at"          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "airtable_sync_map_unique_idx"
  ON "airtable_sync_map"("airtable_base_id", "airtable_table", "airtable_record_id");

CREATE INDEX IF NOT EXISTS "airtable_sync_map_crm_idx"
  ON "airtable_sync_map"("crm_table", "crm_id");
