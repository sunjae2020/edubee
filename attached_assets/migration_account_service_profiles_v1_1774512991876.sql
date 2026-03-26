-- ============================================================
-- 🐝  Edubee CRM — Account Service Profiles Migration
-- ============================================================
-- 버전  : v1.1
-- 작성일: 2026-03-26
-- 목적  : Account별 서비스 카테고리 + 상세 프로필 테이블 추가
--
-- 신규 테이블 (6개):
--   1. account_service_categories   — 멀티 서비스 카테고리 태그
--   2. account_homestay_profiles    — 홈스테이 파트너 상세 프로필
--   3. account_pickup_profiles      — 픽업/드라이버/차량 프로필
--   4. account_company_profiles     — 인턴십 호스트 컴퍼니 프로필
--   5. account_school_profiles      — 학교 추가 프로필
--   6. account_tour_profiles        — 투어 컴퍼니 상세 프로필  [v1.1 추가]
--
-- 설계 원칙:
--   - 기존 테이블 컬럼 변경/삭제 없음 (하위 호환 100% 유지)
--   - _mgt 테이블의 수동 입력 필드는 유지 (계약별 스냅샷 역할)
--   - 프로필 테이블은 Pre-fill 소스로만 활용 (마스터 데이터)
--   - products.category_2_id (Provider Account FK) 활용으로 신규 FK 불필요
-- ============================================================

-- ============================================================
-- ■ TABLE 1: account_service_categories
-- 하나의 Account가 여러 서비스 유형 제공 가능 (멀티 체크박스)
-- ============================================================
CREATE TABLE IF NOT EXISTS account_service_categories (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  service_type    VARCHAR(50)   NOT NULL,
  -- 허용 값:
  --   'homestay'        — 홈스테이 / 하숙 제공
  --   'dormitory'       — 기숙사 운영
  --   'pickup'          — 공항 픽업 서비스
  --   'tour_provider'   — 투어 운영 업체
  --   'internship_host' — 인턴십/취업 호스트 컴퍼니
  --   'school'          — 교육 기관 (학교)
  --   'camp_institute'  — 캠프 프로그램 운영 기관
  --   'guardian'        — 가디언 서비스 제공자
  --   'translation'     — 번역/통역 서비스
  --   'other'           — 기타
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  -- 동일 Account + service_type 중복 방지
  UNIQUE (account_id, service_type)
);

COMMENT ON TABLE account_service_categories IS
  'Account별 제공 서비스 유형 태그 (멀티 체크박스). 하나의 Account가 여러 서비스 카테고리를 가질 수 있다.';

COMMENT ON COLUMN account_service_categories.service_type IS
  'homestay | dormitory | pickup | tour_provider | internship_host | school | camp_institute | guardian | translation | other';

-- ============================================================
-- ■ TABLE 2: account_homestay_profiles
-- 홈스테이 파트너(Account) 상세 프로필
-- 한 Account가 여러 방/옵션을 가질 수 있으므로 1:N 구조
-- ============================================================
CREATE TABLE IF NOT EXISTS account_homestay_profiles (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- 방 정보
  room_type               VARCHAR(100),
  -- 예: Single Room | Twin Room | Single Ensuite | Studio | Granny Flat
  accommodation_type      VARCHAR(100),
  -- 예: House | Shared Apartment | Townhouse | Granny Flat | Unit

  -- 식사 조건
  meal_included           VARCHAR(50),
  -- no | breakfast | half_board | full_board

  -- 요금 (마스터 단가 — 계약 시 Pre-fill 소스)
  weekly_rate             DECIMAL(10,2),  -- 학생 청구 주간 요금 (AR)
  partner_weekly_cost     DECIMAL(10,2),  -- 유학원 파트너 지급 원가 (AP, 선택)

  -- 학교까지 거리
  distance_to_school      VARCHAR(200),
  -- 예: "15 min by train" | "10 min walk" | "20 min by bus"

  -- 수용 정보
  max_students            INTEGER        DEFAULT 1,  -- 동시 수용 가능 학생 수
  available_from          DATE,                      -- 입주 가능일 (NULL = 즉시 가능)

  -- 호스트 담당자 정보
  host_name               VARCHAR(255),
  host_contact            VARCHAR(100),
  -- 별도 주소 (accounts.address와 다를 경우)
  property_address        TEXT,

  -- 편의시설 및 규칙 (자유 형식 JSONB)
  amenities               JSONB,
  -- 예: { "wifi": true, "parking": false, "laundry": true, "pets": false }
  house_rules             TEXT,

  -- 현재 배정 상태
  is_currently_occupied   BOOLEAN        NOT NULL DEFAULT FALSE,
  current_student_count   INTEGER        NOT NULL DEFAULT 0,

  is_active               BOOLEAN        NOT NULL DEFAULT TRUE,
  notes                   TEXT,
  created_at              TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE account_homestay_profiles IS
  '홈스테이 파트너 계정(Account)의 방/숙소 상세 프로필. 1 Account : N 프로필 (방 여러 개 가능). accommodation_mgt 생성 시 Pre-fill 소스로 활용.';

COMMENT ON COLUMN account_homestay_profiles.weekly_rate IS
  '학생 청구 주간 요금 (AR). accommodation_mgt.weekly_rate Pre-fill 기본값.';

COMMENT ON COLUMN account_homestay_profiles.partner_weekly_cost IS
  '파트너 원가 (AP). accommodation_mgt.partner_weekly_cost Pre-fill 기본값. 선택 입력.';

-- ============================================================
-- ■ TABLE 3: account_pickup_profiles
-- 픽업 서비스 파트너(Account) — 드라이버 및 차량 프로필
-- 한 픽업 회사가 여러 차량/드라이버 보유 가능하므로 1:N 구조
-- ============================================================
CREATE TABLE IF NOT EXISTS account_pickup_profiles (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- 드라이버 정보
  driver_name       VARCHAR(255),
  driver_contact    VARCHAR(100),
  driver_license_no VARCHAR(100),  -- 선택 (컴플라이언스용)

  -- 차량 정보
  vehicle_make      VARCHAR(100),   -- 예: Toyota
  vehicle_model     VARCHAR(100),   -- 예: HiAce
  vehicle_color     VARCHAR(50),    -- 예: White
  plate_number      VARCHAR(50),    -- 예: EDU 001
  vehicle_year      INTEGER,        -- 연식
  capacity          INTEGER,        -- 최대 탑승 인원 (수하물 포함 시 별도 메모)

  -- 서비스 운영 정보
  service_area      VARCHAR(255),   -- 예: "Sydney Metro" | "All NSW" | "SYD / MEL"
  service_airports  JSONB,          -- 예: ["SYD", "MEL", "BNE"] — 서비스 가능 공항

  -- 요금 (Pre-fill 기본값)
  base_rate         DECIMAL(10,2),  -- 기본 픽업 요금 (AP 원가)
  night_rate        DECIMAL(10,2),  -- 야간 할증 요금 (선택)
  extra_stop_rate   DECIMAL(10,2),  -- 추가 경유지 요금 (선택)

  -- 차량 상태
  is_available      BOOLEAN         NOT NULL DEFAULT TRUE,

  is_active         BOOLEAN         NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE account_pickup_profiles IS
  '픽업 서비스 파트너(Account)의 드라이버 및 차량 프로필. 1 Account : N 프로필 (차량 여러 대 가능). pickup_mgt 생성 시 Pre-fill 소스로 활용.';

COMMENT ON COLUMN account_pickup_profiles.service_airports IS
  '서비스 가능 공항 코드 배열. 예: ["SYD", "MEL", "BNE"]';

COMMENT ON COLUMN account_pickup_profiles.base_rate IS
  '기본 픽업 원가 (AP). pickup_mgt.partner_cost Pre-fill 기본값.';

-- ============================================================
-- ■ TABLE 4: account_company_profiles
-- 인턴십 호스트 컴퍼니(Account) 상세 프로필
-- 1 Account : 1 프로필 (회사는 단일 프로필, 포지션은 JSONB)
-- ============================================================
CREATE TABLE IF NOT EXISTS account_company_profiles (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- 회사 정보
  industry              VARCHAR(100),
  -- 예: Hospitality | IT / Software | Marketing | Finance | Retail | Healthcare | Education
  company_size          VARCHAR(50),
  -- 1-10 | 11-50 | 51-200 | 201-500 | 500+
  abn                   VARCHAR(50),   -- 호주 사업자 번호 (accounts.abn과 별도 관리 가능)

  -- 담당자 (파트너십 관리 담당)
  contact_person        VARCHAR(255),
  contact_title         VARCHAR(100),  -- HR Manager | Director | Owner 등
  contact_email         VARCHAR(255),
  contact_phone         VARCHAR(100),

  -- 포지션 목록 (JSONB — 복수 포지션 관리)
  available_positions   JSONB,
  /*
    구조 예시:
    [
      {
        "title": "Business Development Intern",
        "type": "internship",           -- internship | casual | part_time | full_time
        "hourly_rate": 0,               -- 인턴십은 0 가능
        "hours_per_week": 20,
        "available_from": "2026-05-01",
        "is_active": true,
        "notes": "Marketing background preferred"
      },
      {
        "title": "Customer Service",
        "type": "casual",
        "hourly_rate": 24.50,
        "hours_per_week": 15,
        "available_from": "2026-04-01",
        "is_active": true
      }
    ]
  */

  -- 수수료 설정 (Pre-fill 기본값)
  placement_fee_type    VARCHAR(50),
  -- flat_fee | percentage_of_salary | none
  placement_fee         DECIMAL(10,2),
  -- flat_fee일 경우 금액, percentage일 경우 비율 (0.1 = 10%)

  -- 온보딩 요건
  requires_police_check BOOLEAN       NOT NULL DEFAULT FALSE,
  requires_wwcc         BOOLEAN       NOT NULL DEFAULT FALSE, -- Working With Children Check
  dress_code            VARCHAR(100),

  -- 위치 정보 (offices 등록 지점과 다를 경우)
  work_address          TEXT,

  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
  -- 한 Account에 하나의 company profile
  UNIQUE (account_id)
);

COMMENT ON TABLE account_company_profiles IS
  '인턴십 호스트 컴퍼니(Account) 상세 프로필. 1 Account : 1 Profile. available_positions JSONB로 복수 포지션 관리. internship_mgt 생성 시 Pre-fill 소스로 활용.';

COMMENT ON COLUMN account_company_profiles.available_positions IS
  '포지션 목록. [{title, type, hourly_rate, hours_per_week, available_from, is_active, notes}]';

-- ============================================================
-- ■ TABLE 5: account_school_profiles
-- 학교(Account) 추가 행정 프로필
-- 1 Account : 1 프로필
-- ============================================================
CREATE TABLE IF NOT EXISTS account_school_profiles (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- 호주 학교 등록 정보
  cricos_code             VARCHAR(50),
  -- CRICOS Provider Code (Registered with TEQSA/ASQA)
  rto_code                VARCHAR(50),
  -- Registered Training Organisation Code (VET용)
  institution_type        VARCHAR(50),
  -- University | TAFE | English Language School | High School | Primary School | Other

  -- 입학 담당자
  enrolment_officer       VARCHAR(255),
  enrolment_email         VARCHAR(255),
  enrolment_phone         VARCHAR(100),

  -- 오퍼레이션 정보
  intake_months           JSONB,
  -- 입학 가능 월 배열. 예: [1, 3, 7, 10]
  academic_calendar       VARCHAR(50),
  -- Term | Semester | Trimester | Year-round

  -- 커미션 설정 (agent_commission_configs와 연계)
  default_commission_rate DECIMAL(8,4),
  -- 기본 커미션율. 예: 0.1500 = 15%
  commission_basis        VARCHAR(30),
  -- gross | net | first_term | full_year_first_term

  -- 코스 목록 (JSONB)
  available_courses       JSONB,
  /*
    구조 예시:
    [
      {
        "name": "General English",
        "code": "GE-001",
        "level": "All levels",
        "duration_weeks_min": 4,
        "duration_weeks_max": 52,
        "tuition_per_week_aud": 350,
        "is_active": true
      },
      {
        "name": "IELTS Preparation",
        "code": "IELTS-P",
        "level": "Upper Intermediate+",
        "duration_weeks_min": 4,
        "duration_weeks_max": 12,
        "tuition_per_week_aud": 380,
        "is_active": true
      }
    ]
  */

  -- 비자 후원 여부
  can_sponsor_student_visa  BOOLEAN     NOT NULL DEFAULT TRUE,
  oshc_required             BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Overseas Student Health Cover 필수 여부

  -- 학교 주요 연락처
  emergency_contact         VARCHAR(100),

  is_active                 BOOLEAN     NOT NULL DEFAULT TRUE,
  notes                     TEXT,
  created_at                TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMP   NOT NULL DEFAULT NOW(),
  -- 한 Account에 하나의 school profile
  UNIQUE (account_id)
);

COMMENT ON TABLE account_school_profiles IS
  '학교 Account 추가 행정 프로필. CRICOS 코드, 입학 담당자, 코스 목록, 커미션 기본값 등 관리. study_abroad_mgt.target_schools 및 products 매핑 시 참조.';

COMMENT ON COLUMN account_school_profiles.cricos_code IS
  '호주 CRICOS (Commonwealth Register of Institutions and Courses for Overseas Students) Provider Code.';

COMMENT ON COLUMN account_school_profiles.default_commission_rate IS
  '기본 커미션율 (소수). 예: 0.1500 = 15%. agent_commission_configs 미설정 시 기본값으로 사용.';

-- ============================================================
-- ■ SECTION: INDEXES
-- ============================================================

-- account_service_categories
CREATE INDEX IF NOT EXISTS idx_acct_svc_cat_account
  ON account_service_categories(account_id);
CREATE INDEX IF NOT EXISTS idx_acct_svc_cat_type
  ON account_service_categories(service_type);
CREATE INDEX IF NOT EXISTS idx_acct_svc_cat_active
  ON account_service_categories(is_active) WHERE is_active = TRUE;

-- account_homestay_profiles
CREATE INDEX IF NOT EXISTS idx_homestay_profile_account
  ON account_homestay_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_homestay_profile_active
  ON account_homestay_profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_homestay_profile_available
  ON account_homestay_profiles(is_currently_occupied, is_active);

-- account_pickup_profiles
CREATE INDEX IF NOT EXISTS idx_pickup_profile_account
  ON account_pickup_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_pickup_profile_active
  ON account_pickup_profiles(is_active) WHERE is_active = TRUE;

-- account_company_profiles
CREATE INDEX IF NOT EXISTS idx_company_profile_account
  ON account_company_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_company_profile_industry
  ON account_company_profiles(industry);

-- account_school_profiles
CREATE INDEX IF NOT EXISTS idx_school_profile_account
  ON account_school_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_school_profile_cricos
  ON account_school_profiles(cricos_code);
CREATE INDEX IF NOT EXISTS idx_school_profile_type
  ON account_school_profiles(institution_type);

-- ============================================================
-- ■ VERIFICATION QUERIES (실행 후 확인용)
-- ============================================================
/*
-- 신규 테이블 생성 확인
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'account_service_categories',
    'account_homestay_profiles',
    'account_pickup_profiles',
    'account_company_profiles',
    'account_school_profiles'
  )
ORDER BY table_name;

-- FK 관계 확인
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'account_service_categories',
    'account_homestay_profiles',
    'account_pickup_profiles',
    'account_company_profiles',
    'account_school_profiles'
  );
*/

-- ============================================================
-- ■ SAMPLE DATA (개발/테스트용 — 프로덕션 실행 전 제거)
-- ============================================================
/*
-- 예시: Anderson Family 홈스테이 등록
-- (실제 account_id는 해당 Account의 UUID로 교체 필요)

-- 1. 서비스 카테고리 태그 등록
INSERT INTO account_service_categories (account_id, service_type)
VALUES
  ('<<anderson_family_account_id>>', 'homestay');

-- 2. 홈스테이 프로필 등록
INSERT INTO account_homestay_profiles (
  account_id,
  room_type, accommodation_type, meal_included,
  weekly_rate, partner_weekly_cost,
  distance_to_school, max_students,
  host_name, host_contact, property_address
) VALUES (
  '<<anderson_family_account_id>>',
  'Single Ensuite Room', 'Shared Apartment', 'half_board',
  330.00, 280.00,
  '15 min by train', 1,
  'The Anderson Family', '+61 2 9714 5566',
  '14 Maple Street, Strathfield NSW 2135'
);

-- 예시: ABC Transport 픽업 등록
INSERT INTO account_service_categories (account_id, service_type)
VALUES
  ('<<abc_transport_account_id>>', 'pickup'),
  ('<<abc_transport_account_id>>', 'tour_provider');

INSERT INTO account_pickup_profiles (
  account_id,
  driver_name, driver_contact,
  vehicle_make, vehicle_model, vehicle_color, plate_number,
  capacity, service_airports, base_rate
) VALUES (
  '<<abc_transport_account_id>>',
  NULL, NULL,
  'Toyota', 'HiAce', 'White', 'EDU 001',
  10, '["SYD", "MEL"]', 120.00
);
*/

-- ============================================================
-- ■ TABLE 6: account_tour_profiles  [v1.1 추가]
-- 투어 컴퍼니(Account) 상세 프로필 — 투어 상품 단위 관리
-- 1개 투어 회사가 여러 투어 상품을 운영하므로 1:N 구조
-- 연계: camp_tour_mgt Pre-fill 소스
-- ============================================================
CREATE TABLE IF NOT EXISTS account_tour_profiles (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id               UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- 투어 상품 기본 정보
  tour_name                VARCHAR(255)  NOT NULL,
  -- 예: Blue Mountains Day Tour | Sydney Harbour Cruise | Hunter Valley Wine Tour
  tour_type                VARCHAR(50),
  -- day_tour | overnight | cultural | adventure | city | nature | theme_park | wildlife | other
  tour_category            VARCHAR(100),
  -- 예: Nature | City Sightseeing | Cultural Heritage | Food & Wine | Adventure Sports

  -- 투어 운영 세부
  duration_hours           INTEGER,           -- 투어 소요 시간 (시간 단위)
  duration_days            INTEGER,           -- 숙박 투어의 경우 일 수 (day_tour는 NULL)
  min_participants         INTEGER DEFAULT 1,  -- 최소 출발 인원
  max_participants         INTEGER,            -- 최대 수용 인원

  -- 픽업 정보 (투어 출발지 기본값)
  default_pickup_location  VARCHAR(255),
  -- 예: "Sydney CBD — Town Hall Station" | "Hotel Pickup Available"
  pickup_available         BOOLEAN       NOT NULL DEFAULT FALSE,
  -- 호텔/숙소 픽업 서비스 제공 여부

  -- 운영 일정
  operates_on              JSONB,
  -- 운영 요일 배열. 예: ["Mon", "Wed", "Fri", "Sat", "Sun"]
  departure_time           VARCHAR(50),   -- 예: "08:00 AM"
  return_time              VARCHAR(50),   -- 예: "06:00 PM"

  -- 포함/불포함 사항
  inclusions               TEXT,
  -- 예: "Lunch, National Park Entry Fee, Professional Guide"
  exclusions               TEXT,
  -- 예: "Personal expenses, Travel insurance, Gratuities"

  -- 요금 (Pre-fill 기본값 — per person)
  adult_retail_price       DECIMAL(10,2),  -- 성인 학생 청구액 AR
  child_retail_price       DECIMAL(10,2),  -- 어린이 청구액 AR (선택)
  partner_cost             DECIMAL(10,2),  -- 파트너 원가 AP Pre-fill

  -- 예약 관련
  advance_booking_days     INTEGER,        -- 최소 사전 예약 일수
  cancellation_policy      TEXT,
  booking_contact          VARCHAR(255),   -- 예약 담당 연락처

  -- 언어 지원
  guide_languages          JSONB,
  -- 예: ["English", "Korean", "Chinese", "Japanese"]

  -- 미디어
  thumbnail_url            VARCHAR(500),

  is_active                BOOLEAN         NOT NULL DEFAULT TRUE,
  notes                    TEXT,
  created_at               TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE account_tour_profiles IS
  '투어 컴퍼니(Account)의 투어 상품 단위 프로필. 1 Account : N 프로필 (투어 상품 여러 개 가능). camp_tour_mgt 생성 시 Pre-fill 소스로 활용.';

COMMENT ON COLUMN account_tour_profiles.operates_on IS
  '운영 요일 배열. 예: ["Mon", "Wed", "Fri", "Sat", "Sun"]';

COMMENT ON COLUMN account_tour_profiles.guide_languages IS
  '가이드 지원 언어 배열. 예: ["English", "Korean", "Chinese"]';

COMMENT ON COLUMN account_tour_profiles.adult_retail_price IS
  '성인 학생 청구액 per person (AR). camp_tour_mgt.retail_price Pre-fill 기본값.';

COMMENT ON COLUMN account_tour_profiles.partner_cost IS
  '파트너 원가 per person (AP). camp_tour_mgt.partner_cost Pre-fill 기본값.';

-- account_tour_profiles 인덱스
CREATE INDEX IF NOT EXISTS idx_tour_profile_account
  ON account_tour_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_tour_profile_type
  ON account_tour_profiles(tour_type);
CREATE INDEX IF NOT EXISTS idx_tour_profile_active
  ON account_tour_profiles(is_active) WHERE is_active = TRUE;

-- ============================================================
-- ■ SUMMARY
-- ============================================================
-- 신규 테이블: 6개
-- ┌──────────────────────────────────┬──────────────────────────────────────────┐
-- │ 테이블명                          │ 역할                                      │
-- ├──────────────────────────────────┼──────────────────────────────────────────┤
-- │ account_service_categories       │ Account 멀티 서비스 카테고리 (체크박스)    │
-- │ account_homestay_profiles        │ 홈스테이 방/숙소 상세 프로필 (1:N)        │
-- │ account_pickup_profiles          │ 픽업 드라이버/차량 상세 프로필 (1:N)      │
-- │ account_company_profiles         │ 인턴십 호스트 컴퍼니 프로필 (1:1)         │
-- │ account_school_profiles          │ 학교 행정 추가 프로필 (1:1)               │
-- │ account_tour_profiles            │ 투어 컴퍼니 투어 상품 프로필 (1:N) [v1.1] │
-- └──────────────────────────────────┴──────────────────────────────────────────┘
-- 총 누적 테이블: 52 + 6 = 58개
-- ============================================================
