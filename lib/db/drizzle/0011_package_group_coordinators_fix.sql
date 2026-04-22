-- Migration 0011: package_group_coordinators FK 교정
-- camp_package_groups → package_groups (Admin이 실제 사용하는 테이블)
-- + package_groups에 organisation_id 추가 (Owner Tenant 식별용)
-- Date: 2026-04-22

-- ── 1. package_groups 에 organisation_id 추가 ────────────────────────────────
ALTER TABLE package_groups
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);

UPDATE package_groups
SET organisation_id = (SELECT id FROM organisations ORDER BY created_on LIMIT 1)
WHERE organisation_id IS NULL;

ALTER TABLE package_groups
  ALTER COLUMN organisation_id SET NOT NULL;

-- ── 2. package_group_coordinators: 기존 FK 교체 ──────────────────────────────
-- 기존 테이블 제거 후 재생성 (FK 대상이 달라지므로)
DROP TABLE IF EXISTS package_group_coordinators CASCADE;

CREATE TABLE package_group_coordinators (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_group_id    UUID NOT NULL REFERENCES package_groups(id),
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

  CONSTRAINT chk_pgc_different_orgs CHECK (owner_org_id <> coordinator_org_id)
);

-- 동일 Package Group 에 활성 Coordinator 는 1개만 허용
CREATE UNIQUE INDEX idx_pgc_unique_active
  ON package_group_coordinators(package_group_id)
  WHERE status = 'Active';

CREATE INDEX idx_pgc_coordinator_org
  ON package_group_coordinators(coordinator_org_id)
  WHERE status = 'Active' AND revoked_at IS NULL;

CREATE INDEX idx_pgc_package_group
  ON package_group_coordinators(package_group_id);
