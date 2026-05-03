-- ============================================================
-- 0019: Tenant isolation — add organisation_id to finance/kpi tables
-- All tables targeted here are 0-row (verified before migration);
-- adding NOT NULL FK is safe with no backfill required.
--
-- Tables:
--   invoice_schedules, invoice_schedule_runs (run inherits via schedule)
--   journal_entries
--   staff_kpi_periods, team_kpi_periods, kpi_targets
--   incentive_tiers
--
-- NOTE: chart_of_accounts (34 rows) and journal_entry_mappings (14 rows)
-- are NOT included here — see Phase 3 for per-tenant separation policy.
-- ============================================================

-- ── invoice_schedules ───────────────────────────────────────
ALTER TABLE invoice_schedules
  ADD COLUMN IF NOT EXISTS organisation_id uuid NOT NULL
    REFERENCES organisations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_isch_org
  ON invoice_schedules(organisation_id);

-- ── invoice_schedule_runs (inherit via parent schedule) ─────
ALTER TABLE invoice_schedule_runs
  ADD COLUMN IF NOT EXISTS organisation_id uuid NOT NULL
    REFERENCES organisations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_isr_org
  ON invoice_schedule_runs(organisation_id);

-- ── journal_entries ─────────────────────────────────────────
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS organisation_id uuid NOT NULL
    REFERENCES organisations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_je_org
  ON journal_entries(organisation_id);

-- ── staff_kpi_periods ───────────────────────────────────────
ALTER TABLE staff_kpi_periods
  ADD COLUMN IF NOT EXISTS organisation_id uuid NOT NULL
    REFERENCES organisations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_skp_org
  ON staff_kpi_periods(organisation_id);

-- ── team_kpi_periods ────────────────────────────────────────
ALTER TABLE team_kpi_periods
  ADD COLUMN IF NOT EXISTS organisation_id uuid NOT NULL
    REFERENCES organisations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_tkp_org
  ON team_kpi_periods(organisation_id);

-- Replace global unique constraint with org-scoped one
ALTER TABLE team_kpi_periods
  DROP CONSTRAINT IF EXISTS team_kpi_periods_team_id_period_type_period_start_unique;

ALTER TABLE team_kpi_periods
  ADD CONSTRAINT team_kpi_periods_org_team_period_unique
    UNIQUE (organisation_id, team_id, period_type, period_start);

-- ── kpi_targets ─────────────────────────────────────────────
ALTER TABLE kpi_targets
  ADD COLUMN IF NOT EXISTS organisation_id uuid NOT NULL
    REFERENCES organisations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_kt_org
  ON kpi_targets(organisation_id);

-- ── incentive_tiers ─────────────────────────────────────────
ALTER TABLE incentive_tiers
  ADD COLUMN IF NOT EXISTS organisation_id uuid NOT NULL
    REFERENCES organisations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_inc_tiers_org
  ON incentive_tiers(organisation_id);

-- Replace global tier-bracket unique with org-scoped one
ALTER TABLE incentive_tiers
  DROP CONSTRAINT IF EXISTS incentive_tiers_bracket;

ALTER TABLE incentive_tiers
  ADD CONSTRAINT incentive_tiers_bracket
    UNIQUE (organisation_id, tier_name, applies_to_role, period_type, effective_from);
