-- Step 6: tenant_audit_logs 에 Delegation 감사 추적 컬럼 3개 추가
-- acting_org_id : Delegated Access 로 액션을 수행한 Coordinator Tenant
-- target_org_id : 대상 Owner Tenant (위임 컨텍스트에서의 소유 org)
-- via_delegation: 해당 액션이 위임 컨텍스트에서 발생했는지 여부

ALTER TABLE tenant_audit_logs
  ADD COLUMN IF NOT EXISTS acting_org_id  UUID REFERENCES organisations(id),
  ADD COLUMN IF NOT EXISTS target_org_id  UUID REFERENCES organisations(id),
  ADD COLUMN IF NOT EXISTS via_delegation BOOLEAN NOT NULL DEFAULT FALSE;

-- 인덱스: 위임 경유 액션 조회 최적화
CREATE INDEX IF NOT EXISTS idx_audit_via_delegation
  ON tenant_audit_logs(acting_org_id, via_delegation)
  WHERE via_delegation = TRUE;
