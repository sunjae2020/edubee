-- ============================================================
-- 🐝  Edubee CRM — Migration 001
--     accounts 테이블 확장: primary_contact_id, secondary_contact_id 추가
--     account_type 유효값 정의 (VARCHAR 방식 — 기존 데이터 보존)
-- ============================================================
-- 실행 환경 : PostgreSQL (Replit / Supabase)
-- 작성일    : 2026-03-24
-- 안전 등급 : 🟢 Safe — ADD COLUMN IF NOT EXISTS, 기존 컬럼 변경 없음
-- 롤백      : migration_001_rollback.sql 참고
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1. accounts 테이블 — primary_contact_id 추가
-- ────────────────────────────────────────────────────────────
-- 목적: Contract Detail STUDENT 카드에서 국적(nationality),
--       이메일, 전화번호를 Contact를 통해 조회하기 위한 FK
-- 기존 데이터: NULL로 채워지므로 기존 레코드에 영향 없음
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- STEP 2. accounts 테이블 — secondary_contact_id 추가
-- ────────────────────────────────────────────────────────────
-- 목적: 학생 부모/보호자 또는 부 연락처 연결용
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS secondary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- STEP 3. account_type 유효값 코멘트 업데이트
-- ────────────────────────────────────────────────────────────
-- 기존 VARCHAR(50) 유지 — 데이터 손상 없음
-- 기존 값 (Agent | Provider | Partner) → 그대로 유지
-- 신규 권장 값 추가 정의
COMMENT ON COLUMN accounts.account_type IS
  'Student | School | Sub_Agency | Super_Agency | Supplier | Staff | Branch | Organisation | Agent | Provider | Partner';

-- ────────────────────────────────────────────────────────────
-- STEP 4. contracts.contract_status Draft 값 코멘트 추가
-- ────────────────────────────────────────────────────────────
-- UI에서 이미 Draft 상태가 표시됨 — 코멘트로 명시
COMMENT ON COLUMN contracts.contract_status IS
  'Draft | Active | Completed | Cancelled | Pending';

-- ────────────────────────────────────────────────────────────
-- STEP 5. 인덱스 추가 (조인 성능 최적화)
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accounts_primary_contact
  ON accounts(primary_contact_id);

CREATE INDEX IF NOT EXISTS idx_accounts_secondary_contact
  ON accounts(secondary_contact_id);

CREATE INDEX IF NOT EXISTS idx_accounts_account_type
  ON accounts(account_type);

CREATE INDEX IF NOT EXISTS idx_contracts_account_id
  ON contracts(account_id);

-- ────────────────────────────────────────────────────────────
-- STEP 6. 기존 Student Account ↔ Contact 자동 연결 (선택 실행)
-- ────────────────────────────────────────────────────────────
-- contacts.account_id가 이미 accounts.id를 참조하는 경우,
-- 해당 Contact를 primary_contact로 자동 설정
-- 주의: 한 Account에 여러 Contact가 있으면 가장 최근 생성된 것 선택
UPDATE accounts a
SET primary_contact_id = (
  SELECT c.id
  FROM contacts c
  WHERE c.account_id = a.id
    AND c.status = 'Active'
  ORDER BY c.created_on ASC   -- 가장 먼저 생성된 Contact = 주 연락처
  LIMIT 1
)
WHERE a.primary_contact_id IS NULL
  AND a.account_type = 'Student'
  AND EXISTS (
    SELECT 1 FROM contacts c WHERE c.account_id = a.id AND c.status = 'Active'
  );

-- ────────────────────────────────────────────────────────────
-- STEP 7. 검증 쿼리 — 실행 후 아래 SELECT로 결과 확인
-- ────────────────────────────────────────────────────────────

-- 7-1. 컬럼 추가 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN ('primary_contact_id', 'secondary_contact_id', 'account_type')
ORDER BY column_name;

-- 7-2. primary_contact 연결된 Student Account 수 확인
SELECT
  a.account_type,
  COUNT(*)                            AS total_accounts,
  COUNT(a.primary_contact_id)         AS linked_primary_contact,
  COUNT(*) - COUNT(a.primary_contact_id) AS unlinked
FROM accounts a
WHERE a.status = 'Active'
GROUP BY a.account_type
ORDER BY a.account_type;

-- 7-3. Contract + Account + Contact 조인 테스트
--      → Contract Detail STUDENT 카드에서 사용할 쿼리 구조
SELECT
  ct.id                  AS contract_id,
  ct.name                AS contract_name,
  ct.contract_status,
  a.id                   AS account_id,
  a.name                 AS account_name,
  a.account_type,
  c.nationality,
  c.email_address        AS contact_email,
  c.mobile_number        AS contact_phone,
  u.name                 AS owner_name
FROM contracts ct
LEFT JOIN accounts  a  ON ct.account_id         = a.id
LEFT JOIN contacts  c  ON a.primary_contact_id  = c.id
LEFT JOIN users     u  ON a.owner_id            = u.id
WHERE ct.status = 'Active'
ORDER BY ct.created_on DESC
LIMIT 5;
