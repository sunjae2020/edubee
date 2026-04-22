-- Migration: Step 1 — Camp 테이블에 organisation_id 추가 + packageGroupCoordinators 테이블 생성
-- Scope: Camp Coordinator Cross-Tenant Delegation (_rules/CAMP_COORDINATOR_DELEGATION.md Step 1)
-- Date: 2026-04-22

-- ── 1. camp_package_groups ───────────────────────────────────────────────────
ALTER TABLE camp_package_groups
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);

UPDATE camp_package_groups
SET organisation_id = (SELECT id FROM organisations ORDER BY created_on LIMIT 1)
WHERE organisation_id IS NULL;

ALTER TABLE camp_package_groups
  ALTER COLUMN organisation_id SET NOT NULL;

-- ── 2. camp_packages ─────────────────────────────────────────────────────────
ALTER TABLE camp_packages
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);

UPDATE camp_packages cp
SET organisation_id = (
  SELECT pg.organisation_id
  FROM camp_package_groups pg
  WHERE pg.id = cp.package_group_id
)
WHERE cp.organisation_id IS NULL;

-- package_group_id 없는 孤立 레코드는 첫 org 로 백필
UPDATE camp_packages
SET organisation_id = (SELECT id FROM organisations ORDER BY created_on LIMIT 1)
WHERE organisation_id IS NULL;

ALTER TABLE camp_packages
  ALTER COLUMN organisation_id SET NOT NULL;

-- ── 3. camp_applications ─────────────────────────────────────────────────────
ALTER TABLE camp_applications
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);

UPDATE camp_applications ca
SET organisation_id = (
  SELECT pg.organisation_id
  FROM camp_package_groups pg
  WHERE pg.id = ca.package_group_id
)
WHERE ca.organisation_id IS NULL AND ca.package_group_id IS NOT NULL;

-- package_group_id 없는 레코드는 첫 org 로 백필
UPDATE camp_applications
SET organisation_id = (SELECT id FROM organisations ORDER BY created_on LIMIT 1)
WHERE organisation_id IS NULL;

ALTER TABLE camp_applications
  ALTER COLUMN organisation_id SET NOT NULL;

-- ── 4. package_group_coordinators 테이블 생성 ────────────────────────────────
CREATE TABLE IF NOT EXISTS package_group_coordinators (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_group_id    UUID NOT NULL REFERENCES camp_package_groups(id),
  owner_org_id        UUID NOT NULL REFERENCES organisations(id),
  coordinator_org_id  UUID NOT NULL REFERENCES organisations(id),
  permissions         JSONB NOT NULL DEFAULT '{"view":true,"edit":true,"soft_delete":true,"manage_finance":false}',
  granted_by_user_id  UUID NOT NULL REFERENCES users(id),
  granted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  revoked_by_user_id  UUID REFERENCES users(id),
  status              VARCHAR(20) NOT NULL DEFAULT 'Pending',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Owner 와 Coordinator 는 같은 테넌트 불가
  CONSTRAINT chk_pgc_different_orgs CHECK (owner_org_id <> coordinator_org_id)
);

-- 동일 Package Group 에 활성 Coordinator 는 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_pgc_unique_active
  ON package_group_coordinators(package_group_id)
  WHERE status = 'Active';

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_pgc_coordinator_org
  ON package_group_coordinators(coordinator_org_id)
  WHERE status = 'Active' AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pgc_package_group
  ON package_group_coordinators(package_group_id);
