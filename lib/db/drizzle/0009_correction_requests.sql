-- Migration: correction_requests table (APP 13 - Privacy Act 1988)
CREATE TABLE IF NOT EXISTS "correction_requests" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id"       VARCHAR(50)  NOT NULL UNIQUE,
  "requested_by"     UUID         REFERENCES "users"("id"),
  "requester_email"  VARCHAR(255) NOT NULL,
  "entity_type"      VARCHAR(50)  NOT NULL DEFAULT 'personal_data',
  "entity_id"        UUID,
  "field_name"       VARCHAR(255) NOT NULL,
  "current_value"    TEXT,
  "requested_value"  TEXT         NOT NULL,
  "reason"           TEXT         NOT NULL,
  "status"           VARCHAR(30)  NOT NULL DEFAULT 'pending',
  "assigned_to"      UUID         REFERENCES "users"("id"),
  "resolved_by"      UUID         REFERENCES "users"("id"),
  "resolved_at"      TIMESTAMP,
  "resolution_notes" TEXT,
  "due_date"         TIMESTAMP,
  "created_at"       TIMESTAMP    NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMP    NOT NULL DEFAULT NOW(),
  "deleted_at"       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "correction_requests_status_idx"    ON "correction_requests"("status");
CREATE INDEX IF NOT EXISTS "correction_requests_requester_idx" ON "correction_requests"("requested_by");
CREATE INDEX IF NOT EXISTS "correction_requests_due_date_idx"  ON "correction_requests"("due_date");
