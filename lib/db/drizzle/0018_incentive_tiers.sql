-- ============================================================
-- 0018: Incentive Tiers (master)
-- 매출 구간별 인센티브 정책. staff_kpi_periods.incentive_tier 의 master.
-- effective_from/to 로 정책 변경 이력 보존 → 과거 정산 무결성.
-- ============================================================

CREATE TABLE IF NOT EXISTS incentive_tiers (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name         varchar(50)   NOT NULL,
    -- 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | ...
  applies_to_role   varchar(50),
    -- null = applies to all roles
  period_type       varchar(20)   NOT NULL DEFAULT 'monthly',
    -- monthly | quarterly | half_year | yearly

  -- 매출 구간 (귀속 매출 기준)
  min_revenue       decimal(12,2) NOT NULL DEFAULT 0,
  max_revenue       decimal(12,2),
    -- null = no upper bound

  -- 인센티브
  incentive_type    varchar(20)   NOT NULL,
    -- percentage | fixed
  incentive_rate    decimal(8,4),
    -- 0.0500 = 5%
  incentive_fixed   decimal(12,2),
  applies_to        varchar(20)   NOT NULL DEFAULT 'excess',
    -- 'excess' = (revenue - min) * rate
    -- 'total'  = revenue * rate

  effective_from    date          NOT NULL,
  effective_to      date,

  description       text,
  status            varchar(20)   NOT NULL DEFAULT 'Active',
  created_by        uuid          REFERENCES users(id),
  created_on        timestamp     NOT NULL DEFAULT now(),
  modified_on       timestamp     NOT NULL DEFAULT now(),

  CONSTRAINT incentive_tiers_bracket
    UNIQUE (tier_name, applies_to_role, period_type, effective_from),
  CONSTRAINT incentive_tiers_type_chk
    CHECK (incentive_type IN ('percentage', 'fixed')),
  CONSTRAINT incentive_tiers_applies_chk
    CHECK (applies_to IN ('excess', 'total')),
  CONSTRAINT incentive_tiers_revenue_chk
    CHECK (max_revenue IS NULL OR max_revenue > min_revenue)
);

CREATE INDEX IF NOT EXISTS idx_inc_tiers_lookup
  ON incentive_tiers(applies_to_role, period_type, effective_from)
  WHERE status = 'Active';
