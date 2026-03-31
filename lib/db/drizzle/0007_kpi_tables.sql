-- ============================================================
-- KPI 기능 마이그레이션
-- 파일: 0007_kpi_tables.sql
-- ============================================================

-- [A] staff_kpi_periods 컬럼 추가
-- ⚠️ 기존 incentive_rate, incentive_amount, bonus_tier 컬럼은
--    DB에 이미 존재하므로 ADD COLUMN IF NOT EXISTS 로 안전하게 처리
ALTER TABLE staff_kpi_periods
  ADD COLUMN IF NOT EXISTS ar_scheduled      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ar_collected      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ar_overdue        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ap_scheduled      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ap_paid           NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_revenue       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_amount     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS excess_amount     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incentive_type    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS incentive_fixed   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS incentive_tier    VARCHAR(50);
  -- incentive_rate, incentive_amount 는 DB에 이미 존재 — 추가하지 않음

-- [B] kpi_targets 신규 생성
CREATE TABLE IF NOT EXISTS kpi_targets (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         UUID          REFERENCES users(id),
  team_id          UUID          REFERENCES teams(id),
  period_type      VARCHAR(20)   NOT NULL,
  target_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  incentive_type   VARCHAR(20)   NOT NULL DEFAULT 'none',
                   -- percentage | fixed | none
  incentive_rate   NUMERIC(8,4),
  incentive_fixed  NUMERIC(12,2),
  valid_from       DATE          NOT NULL,
  valid_to         DATE,
  description      TEXT,
  status           VARCHAR(20)   NOT NULL DEFAULT 'Active',
  created_by       UUID          NOT NULL REFERENCES users(id),
  created_on       TIMESTAMP     NOT NULL DEFAULT NOW(),
  modified_on      TIMESTAMP     NOT NULL DEFAULT NOW(),
  CONSTRAINT kpi_targets_target_check
    CHECK (staff_id IS NOT NULL OR team_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_kpi_targets_staff
  ON kpi_targets(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kpi_targets_team
  ON kpi_targets(team_id)  WHERE team_id  IS NOT NULL;

-- [C] team_kpi_periods 신규 생성
CREATE TABLE IF NOT EXISTS team_kpi_periods (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                 UUID          NOT NULL REFERENCES teams(id),
  period_type             VARCHAR(20)   NOT NULL,
  period_start            DATE          NOT NULL,
  period_end              DATE          NOT NULL,
  member_count            INTEGER       NOT NULL DEFAULT 0,
  lead_count              INTEGER       NOT NULL DEFAULT 0,
  conversion_count        INTEGER       NOT NULL DEFAULT 0,
  conversion_rate         NUMERIC(8,4),
  payment_processed_count INTEGER       NOT NULL DEFAULT 0,
  visa_granted_count      INTEGER       NOT NULL DEFAULT 0,
  ar_scheduled            NUMERIC(12,2) DEFAULT 0,
  ar_collected            NUMERIC(12,2) DEFAULT 0,
  ar_overdue              NUMERIC(12,2) DEFAULT 0,
  ap_scheduled            NUMERIC(12,2) DEFAULT 0,
  ap_paid                 NUMERIC(12,2) DEFAULT 0,
  net_revenue             NUMERIC(12,2) DEFAULT 0,
  target_amount           NUMERIC(12,2) DEFAULT 0,
  excess_amount           NUMERIC(12,2) DEFAULT 0,
  incentive_type          VARCHAR(20),
  incentive_rate          NUMERIC(8,4),
  incentive_fixed         NUMERIC(12,2),
  incentive_amount        NUMERIC(12,2) DEFAULT 0,
  status                  VARCHAR(20)   NOT NULL DEFAULT 'draft',
  approved_by             UUID          REFERENCES users(id),
  approved_at             TIMESTAMP,
  paid_at                 TIMESTAMP,
  notes                   TEXT,
  created_on              TIMESTAMP     NOT NULL DEFAULT NOW(),
  modified_on             TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_team_kpi_periods_team
  ON team_kpi_periods(team_id);
CREATE INDEX IF NOT EXISTS idx_team_kpi_periods_period
  ON team_kpi_periods(period_type, period_start);
