-- ============================================================
-- 0021: Tenant isolation completion — teams + product_cost_lines
--
-- teams: 0 rows in production at migration time → safe NOT NULL
-- product_cost_lines: 0 rows + organisation_id already added in 0020
--   (was nullable). Tighten to NOT NULL.
-- ============================================================

-- ── teams ───────────────────────────────────────────────────
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE RESTRICT;

-- Backfill any existing rows from team_lead's organisation, in case rows
-- were inserted between schema check and this migration.
UPDATE teams t
SET organisation_id = u.organisation_id
FROM users u
WHERE t.team_lead_id = u.id
  AND t.organisation_id IS NULL;

-- Any team without a resolvable lead → assign to myagency as a safe default.
DO $$
DECLARE
  myagency_id uuid;
BEGIN
  SELECT id INTO myagency_id FROM organisations WHERE subdomain = 'myagency' LIMIT 1;
  IF myagency_id IS NOT NULL THEN
    UPDATE teams SET organisation_id = myagency_id WHERE organisation_id IS NULL;
  END IF;
END $$;

ALTER TABLE teams ALTER COLUMN organisation_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organisation_id);

-- ── product_cost_lines: tighten to NOT NULL ─────────────────
-- 0020 added the column nullable (0 rows at the time). Enforce now so
-- new inserts must carry tenant context.
ALTER TABLE product_cost_lines ALTER COLUMN organisation_id SET NOT NULL;
