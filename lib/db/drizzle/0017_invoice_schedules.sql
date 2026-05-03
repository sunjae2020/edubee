-- ============================================================
-- 0017: Invoice Schedules (recurring billing)
-- Master + run log tables for auto-generated recurring invoices.
-- Replaces ad-hoc parent_invoice_id usage for scheduled billing.
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice_schedules (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id          uuid          REFERENCES contracts(id) ON DELETE CASCADE,
  contract_product_id  uuid,
  account_id           uuid          REFERENCES accounts(id) ON DELETE SET NULL,
  invoice_type         varchar(20)   NOT NULL DEFAULT 'client',
  frequency            varchar(20)   NOT NULL,
    -- 'monthly' | 'quarterly' | 'termly' | 'weekly'
  amount               decimal(12,2) NOT NULL,
  currency             varchar(10)   NOT NULL DEFAULT 'AUD',
  description          text,
  start_date           date          NOT NULL,
  end_date             date,
  next_run_date        date          NOT NULL,
  last_run_date        date,
  run_count            integer       NOT NULL DEFAULT 0,
  max_runs             integer,
  status               varchar(20)   NOT NULL DEFAULT 'active',
    -- 'active' | 'paused' | 'completed' | 'cancelled'
  created_by           uuid          REFERENCES users(id),
  created_at           timestamp     NOT NULL DEFAULT now(),
  updated_at           timestamp     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_isch_active_next
  ON invoice_schedules(status, next_run_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_isch_contract ON invoice_schedules(contract_id);

CREATE TABLE IF NOT EXISTS invoice_schedule_runs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   uuid        NOT NULL REFERENCES invoice_schedules(id) ON DELETE CASCADE,
  run_date      date        NOT NULL,
  invoice_id    uuid        REFERENCES invoices(id) ON DELETE SET NULL,
  status        varchar(20) NOT NULL DEFAULT 'ok',
    -- 'ok' | 'failed' | 'skipped'
  error_msg     text,
  created_at    timestamp   NOT NULL DEFAULT now(),
  CONSTRAINT invoice_schedule_runs_idem UNIQUE (schedule_id, run_date)
);

CREATE INDEX IF NOT EXISTS idx_isr_schedule ON invoice_schedule_runs(schedule_id);
