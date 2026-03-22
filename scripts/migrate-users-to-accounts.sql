-- =============================================================================
-- Migration Script: users → accounts
-- Created: 2026-03-22
-- Purpose: users 테이블의 기존 데이터를 accounts 테이블로 이전한다.
--          users 테이블은 내부 직원 인증용으로 유지되며,
--          DB 재업로드 전에 기존 Users 데이터를 Accounts로 옮겨두기 위한 스크립트이다.
-- =============================================================================
--
-- [필드 매핑 (users → accounts)]
--   users.id              → accounts.id          (동일 UUID 재사용)
--   users.id              → accounts.owner_id    (자기 자신을 owner로 설정; NOT NULL)
--   users.company_name    → accounts.name        (company_name 우선)
--   users.full_name       → accounts.name        (company_name이 NULL이면 full_name 사용)
--   users.email           → accounts.email       (직접 매핑)
--   users.phone           → accounts.phone_number (직접 매핑)
--   users.business_reg_no → accounts.abn         (사업자등록번호)
--   users.country_of_ops  → accounts.country     (국가 코드)
--   users.status          → accounts.status      (active → Active, inactive → Inactive: 첫 글자 대문자; NULL이면 'Active' 기본값)
--   users.created_at      → accounts.created_on  (타임스탬프)
--   users.updated_at      → accounts.modified_on (타임스탬프)
--
-- [고정값으로 설정되는 accounts 필드]
--   manual_input         = false         (수동 입력 아님)
--   account_type         = 'Internal Staff' (내부 직원)
--   is_product_source    = false
--   is_product_provider  = false
--
-- [매핑하지 않는 users 필드 (accounts에 대응 컬럼 없음)]
--   password_hash      — 인증 전용 데이터; accounts에 불필요
--   role               — 권한 관리 전용; accounts 모델과 무관
--   whatsapp           — SNS 연락처; accounts 스키마에 없음
--   line_id            — SNS 연락처; accounts 스키마에 없음
--   avatar_url         — 프로필 이미지; accounts 스키마에 없음
--   timezone           — 개인 설정값; accounts 스키마에 없음
--   preferred_lang     — 개인 설정값; accounts 스키마에 없음
--   platform_comm_rate — 수수료율; accounts 스키마에 없음
--   last_login_at      — 인증 메타데이터; accounts 스키마에 없음
--
-- [중복 처리]
--   accounts.id에 동일한 UUID가 이미 존재하면 해당 행은 INSERT하지 않고 건너뜀 (ON CONFLICT DO NOTHING).
--
-- [실행 방법]
--   psql -U <user> -d <database> -f scripts/migrate-users-to-accounts.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 마이그레이션 전 카운트 확인
-- -----------------------------------------------------------------------------
SELECT
    'BEFORE MIGRATION' AS phase,
    (SELECT COUNT(*) FROM users)    AS total_users,
    (SELECT COUNT(*) FROM accounts) AS total_accounts;

-- -----------------------------------------------------------------------------
-- 마이그레이션 실행
-- -----------------------------------------------------------------------------
INSERT INTO accounts (
    id,
    owner_id,
    name,
    email,
    phone_number,
    abn,
    country,
    status,
    manual_input,
    account_type,
    is_product_source,
    is_product_provider,
    created_on,
    modified_on
)
SELECT
    u.id,
    u.id                                                          AS owner_id,
    COALESCE(NULLIF(TRIM(u.company_name), ''), u.full_name)       AS name,
    u.email,
    u.phone                                                       AS phone_number,
    u.business_reg_no                                             AS abn,
    u.country_of_ops                                              AS country,
    COALESCE(INITCAP(u.status), 'Active')                         AS status,
    false                                                         AS manual_input,
    'Internal Staff'                                              AS account_type,
    false                                                         AS is_product_source,
    false                                                         AS is_product_provider,
    COALESCE(u.created_at, NOW())                                 AS created_on,
    COALESCE(u.updated_at, NOW())                                 AS modified_on
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM accounts a WHERE a.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 마이그레이션 후 카운트 확인 및 결과 요약
-- -----------------------------------------------------------------------------
SELECT
    'AFTER MIGRATION' AS phase,
    (SELECT COUNT(*) FROM users)    AS total_users,
    (SELECT COUNT(*) FROM accounts) AS total_accounts;

-- 마이그레이션된 Internal Staff 계정만 확인
SELECT
    'MIGRATED INTERNAL STAFF' AS phase,
    COUNT(*)                  AS count
FROM accounts
WHERE account_type = 'Internal Staff';
