// ============================================================
// Edubee CRM — Phase 1 Drizzle Schema 변경 패치
// 파일: /db/schema.ts 에 아래 변경사항을 적용하세요
// ============================================================
// 적용 방법:
//   1. /db/schema.ts 파일을 열어
//   2. 각 테이블 정의를 아래 패치로 교체
//   3. npx tsc --noEmit 으로 오류 확인
//   4. npx drizzle-kit push 로 DB 반영
// ============================================================

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  decimal,
  date,
  timestamp,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';


// ============================================================
// PATCH 1: studyAbroadMgt 테이블에 캠프 전용 필드 추가
// ============================================================
// /db/schema.ts 에서 studyAbroadMgt (또는 study_abroad_mgt) 테이블을
// 찾아서 아래 필드들을 추가하세요.
//
// ⚠️  기존 필드는 절대 수정하지 말고, 아래 블록을 기존 정의 끝에 추가

// 추가할 필드 블록 (기존 studyAbroadMgt 테이블 내부에 추가):
/*
  // ── 캠프 통합 필드 (Phase 1 추가) ──────────────────────────
  programContext: varchar('program_context', { length: 50 })
    .notNull()
    .default('study_abroad'),
  // 허용값: 'study_abroad' | 'camp'

  instituteAccountId: uuid('institute_account_id')
    .references(() => accounts.id),

  programName: varchar('program_name', { length: 255 }),

  programType: varchar('program_type', { length: 50 }),
  // english | academic | holiday | mixed | stem | arts

  programStartDate: date('program_start_date'),

  programEndDate: date('program_end_date'),

  weeklyHours: integer('weekly_hours'),

  classSizeMax: integer('class_size_max'),

  ageGroup: varchar('age_group', { length: 50 }),
  // adult | junior | mixed

  levelAssessmentRequired: boolean('level_assessment_required')
    .notNull()
    .default(false),

  levelAssessmentDate: date('level_assessment_date'),

  assignedClass: varchar('assigned_class', { length: 100 }),

  partnerCost: decimal('partner_cost', { precision: 12, scale: 2 }),
  // ── 끝 ─────────────────────────────────────────────────────
*/


// ============================================================
// PATCH 2: campPackages 테이블에 product_id 추가
// ============================================================
// /db/schema.ts 에서 campPackages 테이블을 찾아
// 아래 필드를 추가하세요.

/*
  // ── Products 연결 (Phase 1 추가) ───────────────────────────
  productId: uuid('product_id')
    .references(() => products.id),
  // 1 Package = 1 Product (Quote 선택용)
  // ── 끝 ─────────────────────────────────────────────────────
*/


// ============================================================
// PATCH 3: products 테이블에 camp 연결 필드 추가
// ============================================================
// /db/schema.ts 에서 products 테이블을 찾아
// 아래 필드들을 추가하세요.

/*
  // ── 캠프 연결 (Phase 1 추가) ────────────────────────────────
  productContext: varchar('product_context', { length: 50 })
    .notNull()
    .default('general'),
  // 허용값: 'general' | 'camp_package' | 'camp_addon'

  campPackageId: uuid('camp_package_id')
    .references(() => campPackages.id),
  // camp_package 타입 상품일 때 역참조
  // ── 끝 ─────────────────────────────────────────────────────
*/


// ============================================================
// PATCH 4: TypeScript 타입 정의 업데이트
// ============================================================
// /db/schema.ts 또는 별도 types 파일에서
// 아래 타입을 추가/업데이트하세요.

// 프로그램 컨텍스트 타입
export type ProgramContext = 'study_abroad' | 'camp';

// 상품 컨텍스트 타입
export type ProductContext = 'general' | 'camp_package' | 'camp_addon';

// 캠프 프로그램 타입
export type CampProgramType =
  | 'english'
  | 'academic'
  | 'holiday'
  | 'mixed'
  | 'stem'
  | 'arts';

// 캠프 연령대 타입
export type CampAgeGroup = 'adult' | 'junior' | 'mixed';


// ============================================================
// PATCH 5: 마이그레이션 후 검증 쿼리 (drizzle studio 또는 psql)
// ============================================================

/*
검증 1: study_abroad_mgt 컬럼 확인
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'study_abroad_mgt'
    AND column_name IN (
      'program_context', 'institute_account_id', 'program_name',
      'program_type', 'program_start_date', 'program_end_date',
      'weekly_hours', 'class_size_max', 'age_group',
      'level_assessment_required', 'level_assessment_date',
      'assigned_class', 'partner_cost'
    );
  기대: 13개 행 반환

검증 2: camp_packages 컬럼 확인
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'camp_packages'
    AND column_name = 'product_id';
  기대: 1개 행 반환

검증 3: products 컬럼 확인
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'products'
    AND column_name IN ('product_context', 'camp_package_id');
  기대: 2개 행 반환

검증 4: 기존 데이터 컨텍스트 보호 확인
  SELECT program_context, COUNT(*) FROM study_abroad_mgt GROUP BY 1;
  기대: 'study_abroad' 만 존재

  SELECT product_context, COUNT(*) FROM products GROUP BY 1;
  기대: 'general' 만 존재
*/


// ============================================================
// Phase 1 적용 완료 후 보고 형식
// ============================================================
/*
✅ 수정된 파일: /db/schema.ts
✅ 수정 내용:
   - studyAbroadMgt: 13개 필드 추가 (program_context 등)
   - campPackages: product_id 필드 추가
   - products: product_context, camp_package_id 필드 추가
✅ 검증 결과:
   - tsc: 오류 0개
   - 서버: 정상 기동
   - DB: 컬럼 추가 확인 (검증 쿼리 1~4 통과)
   - API: 기존 API 영향 없음
⚠️  다음 할 작업: Phase 2 — camp_institute_mgt 데이터 이관 후 삭제
*/
