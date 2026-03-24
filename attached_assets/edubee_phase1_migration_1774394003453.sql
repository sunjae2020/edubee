-- ============================================================
-- Edubee CRM — Phase 1 DB Migration
-- 목적: Camp 통합 구조 (Option A)
-- 작성일: 2026-03-25
-- 적용 순서: 반드시 아래 순서대로 실행
-- ============================================================
-- 변경 요약:
--   1. study_abroad_mgt  — 캠프 전용 필드 13개 추가
--   2. camp_packages     — product_id 연결 컬럼 추가
--   3. products          — camp_package_id 역참조 + product_context 추가
-- ============================================================

-- ▶ 실행 전 체크
-- SELECT version();  -- PostgreSQL 버전 확인
-- \dt                -- 테이블 목록 확인


-- ============================================================
-- STEP 1: study_abroad_mgt — 캠프 전용 필드 13개 추가
-- ============================================================
-- 설명:
--   program_context 로 'study_abroad' / 'camp' 구분
--   기존 데이터는 DEFAULT 'study_abroad' 로 자동 보호
--   camp 전용 필드는 NULL 허용 → 기존 레코드 영향 없음

ALTER TABLE study_abroad_mgt

  -- [핵심 구분자] 컨텍스트 — 기존 데이터 보호용 DEFAULT 설정
  ADD COLUMN IF NOT EXISTS program_context
    VARCHAR(50) NOT NULL DEFAULT 'study_abroad',
    -- 허용값: 'study_abroad' | 'camp'

  -- [캠프 전용] 학업 기관 연결
  ADD COLUMN IF NOT EXISTS institute_account_id
    UUID REFERENCES accounts(id),
    -- 캠프 파트너 학교 Account

  -- [캠프 전용] 프로그램 정보
  ADD COLUMN IF NOT EXISTS program_name
    VARCHAR(255),

  ADD COLUMN IF NOT EXISTS program_type
    VARCHAR(50),
    -- english | academic | holiday | mixed | stem | arts

  -- [캠프 전용] 기간
  ADD COLUMN IF NOT EXISTS program_start_date
    DATE,

  ADD COLUMN IF NOT EXISTS program_end_date
    DATE,

  -- [캠프 전용] 수업 정보
  ADD COLUMN IF NOT EXISTS weekly_hours
    INTEGER,

  ADD COLUMN IF NOT EXISTS class_size_max
    INTEGER,

  ADD COLUMN IF NOT EXISTS age_group
    VARCHAR(50),
    -- adult | junior | mixed

  -- [캠프 전용] 레벨 평가
  ADD COLUMN IF NOT EXISTS level_assessment_required
    BOOLEAN NOT NULL DEFAULT FALSE,

  ADD COLUMN IF NOT EXISTS level_assessment_date
    DATE,

  ADD COLUMN IF NOT EXISTS assigned_class
    VARCHAR(100),

  -- [캠프 전용] 원가
  ADD COLUMN IF NOT EXISTS partner_cost
    DECIMAL(12,2);
    -- 파트너 원가 (AP)


-- STEP 1 인덱스
CREATE INDEX IF NOT EXISTS idx_study_abroad_context
  ON study_abroad_mgt(program_context);

CREATE INDEX IF NOT EXISTS idx_study_abroad_institute
  ON study_abroad_mgt(institute_account_id);

-- STEP 1 검증 쿼리
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'study_abroad_mgt'
-- ORDER BY ordinal_position;


-- ============================================================
-- STEP 2: camp_packages — product_id 연결 추가
-- ============================================================
-- 설명:
--   Package를 Products 카탈로그에 등록하여
--   Quote 작성 시 상품으로 선택 가능하게 함
--   1 Package = 1 Product (1:1 관계)

ALTER TABLE camp_packages
  ADD COLUMN IF NOT EXISTS product_id
    UUID REFERENCES products(id);
    -- NULL 허용: 기존 Package는 나중에 product 생성 후 연결

-- STEP 2 인덱스
CREATE INDEX IF NOT EXISTS idx_camp_packages_product
  ON camp_packages(product_id);

-- STEP 2 검증 쿼리
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'camp_packages'
-- ORDER BY ordinal_position;


-- ============================================================
-- STEP 3: products — camp 연결 필드 추가
-- ============================================================
-- 설명:
--   product_context: 상품이 어느 컨텍스트에서 사용되는지 구분
--   camp_package_id: camp_package 타입 상품일 때 역참조 (옵션)
--   기존 products는 모두 DEFAULT 'general' 로 자동 보호

ALTER TABLE products

  -- [컨텍스트 구분자] 상품 사용 컨텍스트
  ADD COLUMN IF NOT EXISTS product_context
    VARCHAR(50) NOT NULL DEFAULT 'general',
    -- 허용값: 'general' | 'camp_package' | 'camp_addon'

  -- [역참조] camp_package 타입 상품일 때 연결되는 Package ID
  ADD COLUMN IF NOT EXISTS camp_package_id
    UUID REFERENCES camp_packages(id);
    -- NULL 허용: 일반 상품은 NULL

-- STEP 3 인덱스
CREATE INDEX IF NOT EXISTS idx_products_context
  ON products(product_context);

CREATE INDEX IF NOT EXISTS idx_products_camp_package
  ON products(camp_package_id);

-- STEP 3 검증 쿼리
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'products'
-- ORDER BY ordinal_position;


-- ============================================================
-- STEP 4: 기존 데이터 컨텍스트 값 확인 (데이터 검증)
-- ============================================================

-- 기존 study_abroad_mgt 레코드가 'study_abroad' DEFAULT로 설정됐는지 확인
-- SELECT program_context, COUNT(*) as cnt
-- FROM study_abroad_mgt
-- GROUP BY program_context;
-- 기대 결과: 모든 기존 레코드 → program_context = 'study_abroad'

-- 기존 products 레코드가 'general' DEFAULT로 설정됐는지 확인
-- SELECT product_context, COUNT(*) as cnt
-- FROM products
-- GROUP BY product_context;
-- 기대 결과: 모든 기존 레코드 → product_context = 'general'

-- camp_packages product_id 현황 확인
-- SELECT COUNT(*) as total,
--        COUNT(product_id) as linked
-- FROM camp_packages;
-- 기대 결과: linked = 0 (아직 연결 전)


-- ============================================================
-- STEP 5: 스키마 헤더 코멘트용 변경사항 기록
-- ============================================================
-- 이 migration 이후 테이블 현황:
--
-- study_abroad_mgt:
--   기존 필드 + program_context (핵심 구분자)
--             + institute_account_id
--             + program_name / program_type
--             + program_start_date / program_end_date
--             + weekly_hours / class_size_max / age_group
--             + level_assessment_required / level_assessment_date
--             + assigned_class / partner_cost
--
-- camp_packages:
--   기존 필드 + product_id (→ products.id)
--
-- products:
--   기존 필드 + product_context ('general' | 'camp_package' | 'camp_addon')
--             + camp_package_id (→ camp_packages.id, 역참조)
--
-- 총 추가 컬럼: 15개
-- 삭제 컬럼:    0개  ← 기존 데이터 완전 보호
-- ============================================================

-- ============================================================
-- MIGRATION COMPLETE
-- 다음 단계: Phase 2 — camp_institute_mgt 데이터 이관 후 삭제
-- ============================================================
