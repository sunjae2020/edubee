-- ============================================================
-- Edubee CRM — Phase 2 Migration
-- 목적: camp_institute_mgt 데이터 → study_abroad_mgt 이관 후 삭제
-- ⚠️  Phase 1 완료 확인 후 실행
-- ============================================================
-- 실행 전 체크리스트:
--   □ Phase 1 SQL 적용 완료
--   □ study_abroad_mgt에 13개 컬럼 존재 확인
--   □ 기존 서비스 정상 동작 확인
-- ============================================================


-- ============================================================
-- STEP 1: 이관 전 데이터 현황 확인 (반드시 먼저 실행)
-- ============================================================

-- camp_institute_mgt 현재 데이터 수 확인
SELECT COUNT(*) as camp_institute_count FROM camp_institute_mgt;

-- 이관 대상 샘플 확인 (처음 5개)
SELECT
  id,
  contract_id,
  institute_account_id,
  program_name,
  program_type,
  program_start_date,
  program_end_date,
  weekly_hours,
  class_size_max,
  age_group,
  level_assessment_required,
  level_assessment_date,
  assigned_class,
  partner_cost,
  status
FROM camp_institute_mgt
LIMIT 5;


-- ============================================================
-- STEP 2: camp_institute_mgt → study_abroad_mgt 데이터 이관
-- ============================================================
-- ⚠️  데이터가 0건이면 STEP 2는 건너뛰고 STEP 3으로 이동

BEGIN;

INSERT INTO study_abroad_mgt (
  -- 코어 연결 (공통)
  contract_id,
  lead_id,
  student_account_id,
  assigned_staff_id,
  -- 컨텍스트 구분자
  program_context,
  -- 캠프 전용 필드
  institute_account_id,
  program_name,
  program_type,
  program_start_date,
  program_end_date,
  weekly_hours,
  class_size_max,
  age_group,
  level_assessment_required,
  level_assessment_date,
  assigned_class,
  partner_cost,
  -- 상태
  status,
  notes,
  created_at,
  updated_at
)
SELECT
  ci.contract_id,
  NULL AS lead_id,               -- camp_institute_mgt에 없는 필드
  ci.student_account_id,
  ci.assigned_staff_id,
  'camp' AS program_context,     -- ← 핵심: camp 컨텍스트로 이관
  ci.institute_account_id,
  ci.program_name,
  ci.program_type,
  ci.program_start_date,
  ci.program_end_date,
  ci.weekly_hours,
  ci.class_size_max,
  ci.age_group,
  ci.level_assessment_required,
  ci.level_assessment_date,
  ci.assigned_class,
  ci.partner_cost,
  ci.status,
  ci.notes,
  ci.created_at,
  ci.updated_at
FROM camp_institute_mgt ci
-- 이미 이관된 레코드 중복 방지
WHERE NOT EXISTS (
  SELECT 1 FROM study_abroad_mgt sa
  WHERE sa.contract_id = ci.contract_id
    AND sa.program_context = 'camp'
);

-- 이관 결과 확인
SELECT
  program_context,
  COUNT(*) as cnt
FROM study_abroad_mgt
GROUP BY program_context;
-- 기대: study_abroad = 기존수, camp = 이관된 수

COMMIT;


-- ============================================================
-- STEP 3: 이관 검증 — COMMIT 전에 반드시 확인
-- ============================================================

-- 이관된 camp 레코드 샘플 확인
SELECT
  id,
  program_context,
  contract_id,
  institute_account_id,
  program_name,
  program_type,
  age_group,
  status
FROM study_abroad_mgt
WHERE program_context = 'camp'
LIMIT 5;

-- 원본(camp_institute_mgt)과 건수 비교
SELECT
  (SELECT COUNT(*) FROM camp_institute_mgt) AS original_count,
  (SELECT COUNT(*) FROM study_abroad_mgt WHERE program_context = 'camp') AS migrated_count;
-- 기대: original_count = migrated_count


-- ============================================================
-- STEP 4: camp_institute_mgt 삭제
-- ============================================================
-- ⚠️  STEP 3 검증 완료 후에만 실행
-- ⚠️  이 작업은 되돌릴 수 없음

-- 인덱스 먼저 삭제
DROP INDEX IF EXISTS idx_camp_institute_contract;

-- 테이블 삭제
DROP TABLE IF EXISTS camp_institute_mgt;

-- 삭제 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'camp_institute_mgt';
-- 기대: 0개 행 (테이블 없음)


-- ============================================================
-- STEP 5: 스키마 문서 업데이트 기록
-- ============================================================
-- Phase 2 완료 후 테이블 현황:
--
-- 삭제된 테이블: camp_institute_mgt (1개)
-- 총 테이블 수: 52개 → 51개
--
-- camp_institute_mgt 데이터 이동 경로:
--   camp_institute_mgt → study_abroad_mgt (program_context = 'camp')
--
-- ※ camp_applications, camp_tour_mgt 는 유지
-- ============================================================

-- ============================================================
-- Phase 2 COMPLETE
-- 다음 단계: Phase 3 — Backend API 수정 (program_context 필터 추가)
-- ============================================================
