# 🐝 Edubee CRM — Account Service Profiles
# 전체 패키지 통합 문서

**버전:** v1.1 Final  
**작성일:** 2026-03-26  
**작업 범위:** Account Service Profiles 모듈 전체 설계 + 구현 산출물  
**기반 스키마:** edubee_crm_db_schema_final_20260321.sql (FINAL v4.0 / 52 테이블)  
**추가 후 총 테이블:** 58개

---

## 📋 목차

1. [작업 배경 및 목적](#1-작업-배경-및-목적)
2. [설계 의사결정 요약](#2-설계-의사결정-요약)
3. [신규 테이블 6개 정의](#3-신규-테이블-6개-정의)
4. [전체 아키텍처 다이어그램](#4-전체-아키텍처-다이어그램)
5. [Pre-fill 연동 흐름](#5-pre-fill-연동-흐름)
6. [산출물 파일 목록](#6-산출물-파일-목록)
7. [Replit 적용 순서 (Step-by-Step)](#7-replit-적용-순서-step-by-step)
8. [API 엔드포인트 전체 목록](#8-api-엔드포인트-전체-목록)
9. [UI 컴포넌트 사용법](#9-ui-컴포넌트-사용법)
10. [기존 코드 영향 분석](#10-기존-코드-영향-분석)
11. [다음 단계 로드맵](#11-다음-단계-로드맵)

---

## 1. 작업 배경 및 목적

### 해결한 문제

서비스 모듈(`_mgt` 테이블)에서 파트너 상세 정보를 **계약마다 수동 입력**하는 비효율 구조:

| 서비스 | 기존 수동 입력 필드 | 문제점 |
|--------|-------------------|--------|
| 홈스테이 | host_name, host_address, host_contact, room_type, meal_included, weekly_rate | 같은 홈스테이 가족을 여러 계약에서 매번 재입력 |
| 픽업 | driver_name, driver_contact, vehicle_info | 차량 정보 재입력 및 오타 위험 |
| 인턴십 | position_title, employment_type, hourly_rate | 호스트 컴퍼니 정보 중복 |
| 투어 | tour_name, tour_type, pickup_location, partner_cost | 투어 상품 정보 매번 입력 |

### 솔루션

**Account 단위 마스터 프로필 테이블** 도입:
- 파트너 정보를 Account에 한 번 등록
- 계약 생성 시 자동 Pre-fill
- 멀티 카테고리 지원 (하나의 Account가 픽업 + 투어 동시 제공 가능)
- `_mgt` 테이블 스냅샷은 유지 (계약 당시 조건 보존)

---

## 2. 설계 의사결정 요약

### ✅ 채택: 카테고리 태그 + 타입별 프로필 분리 (Option C)

| 레이어 | 테이블 | 역할 |
|--------|--------|------|
| 카테고리 태그 | `account_service_categories` | 멀티 체크박스 — 어떤 서비스를 제공하는지 |
| 프로필 상세 | `account_homestay_profiles` 외 5개 | 각 서비스의 구체적 정보 |

### ❌ 기각: Product ↔ Account 공통 테이블

**이유:** 책임 분리 원칙 위반. Product는 "무엇을 팔지", Account는 "누가 제공하는지"로 역할이 다름.
`products.category_2_id` (Provider Account FK)가 이미 연결 고리 역할을 수행 중.

### 핵심 설계 원칙

```
account_service_categories   ← "이 Account는 어떤 서비스를 제공하는가" (태그)
account_*_profiles           ← "그 서비스의 구체적 정보는 무엇인가" (마스터)
accommodation_mgt 등 _mgt    ← "이 계약에서 실제 적용된 내용은?" (스냅샷, 변경 없음)
```

---

## 3. 신규 테이블 6개 정의

### TABLE 1: `account_service_categories`
**구조:** 1:N | **역할:** 멀티 서비스 카테고리 태그

```sql
id              UUID PK
account_id      UUID FK → accounts (CASCADE)
service_type    VARCHAR(50)   -- 아래 Enum 참조
is_active       BOOLEAN DEFAULT true
notes           TEXT
UNIQUE (account_id, service_type)
```

**service_type Enum 전체:**

| 값 | 설명 | 연계 프로필 |
|----|------|------------|
| `homestay` | 홈스테이/하숙 | account_homestay_profiles |
| `dormitory` | 기숙사 운영 | account_homestay_profiles (공용) |
| `pickup` | 공항 픽업 | account_pickup_profiles |
| `tour_provider` | 투어 운영 | account_tour_profiles |
| `internship_host` | 인턴십 호스트 | account_company_profiles |
| `school` | 교육 기관 | account_school_profiles |
| `camp_institute` | 캠프 프로그램 | account_school_profiles (공용) |
| `guardian` | 가디언 서비스 | — |
| `translation` | 번역/통역 | — |
| `other` | 기타 | — |

---

### TABLE 2: `account_homestay_profiles`
**구조:** 1:N (방 여러 개) | **Pre-fill 대상:** `accommodation_mgt`

```sql
id, account_id FK
room_type               VARCHAR(100)   -- Single Room | Single Ensuite | Studio 등
accommodation_type      VARCHAR(100)   -- House | Shared Apartment | Granny Flat 등
meal_included           VARCHAR(50)    -- no | breakfast | half_board | full_board
weekly_rate             DECIMAL(10,2)  -- 학생 청구 AR → accommodation_mgt.weekly_rate
partner_weekly_cost     DECIMAL(10,2)  -- 파트너 원가 AP → accommodation_mgt.partner_weekly_cost
distance_to_school      VARCHAR(200)   -- "15 min by train"
max_students            INTEGER
available_from          DATE
host_name               VARCHAR(255)   -- → accommodation_mgt.host_name
host_contact            VARCHAR(100)   -- → accommodation_mgt.host_contact
property_address        TEXT           -- → accommodation_mgt.host_address
amenities               JSONB          -- {wifi, parking, laundry, pets}
is_currently_occupied   BOOLEAN
current_student_count   INTEGER
```

---

### TABLE 3: `account_pickup_profiles`
**구조:** 1:N (차량 여러 대) | **Pre-fill 대상:** `pickup_mgt`

```sql
id, account_id FK
driver_name             VARCHAR(255)   -- → pickup_mgt.driver_name
driver_contact          VARCHAR(100)   -- → pickup_mgt.driver_contact
driver_license_no       VARCHAR(100)   -- 컴플라이언스용 (선택)
vehicle_make            VARCHAR(100)   -- Toyota
vehicle_model           VARCHAR(100)   -- HiAce
vehicle_color           VARCHAR(50)    -- White
plate_number            VARCHAR(50)    -- EDU 001  → pickup_mgt.vehicle_info 조합
vehicle_year            INTEGER
capacity                INTEGER
service_area            VARCHAR(255)   -- Sydney Metro
service_airports        JSONB          -- ["SYD","MEL","BNE"]
base_rate               DECIMAL(10,2)  -- AP → pickup_mgt.partner_cost
night_rate              DECIMAL(10,2)  -- 야간 할증 (선택)
extra_stop_rate         DECIMAL(10,2)  -- 경유지 추가 (선택)
is_available            BOOLEAN
```

---

### TABLE 4: `account_company_profiles`
**구조:** 1:1 (UNIQUE account_id) | **Pre-fill 대상:** `internship_mgt`

```sql
id, account_id FK UNIQUE
industry                VARCHAR(100)   -- Hospitality | IT | Marketing 등
company_size            VARCHAR(50)    -- 1-10 | 11-50 | 51-200 등
abn                     VARCHAR(50)
contact_person          VARCHAR(255)   -- 파트너십 담당자
contact_title           VARCHAR(100)   -- HR Manager | Director
contact_email           VARCHAR(255)
contact_phone           VARCHAR(100)
available_positions     JSONB          -- [{title, type, hourly_rate, hours_per_week, available_from, is_active}]
placement_fee_type      VARCHAR(50)    -- flat_fee | percentage_of_salary | none
placement_fee           DECIMAL(10,2)
requires_police_check   BOOLEAN
requires_wwcc           BOOLEAN        -- Working With Children Check
dress_code              VARCHAR(100)
work_address            TEXT
```

**available_positions JSONB 구조:**
```json
[
  {
    "title": "Business Development Intern",
    "type": "internship",
    "hourly_rate": 0,
    "hours_per_week": 20,
    "available_from": "2026-05-01",
    "is_active": true,
    "notes": "Marketing background preferred"
  }
]
```

---

### TABLE 5: `account_school_profiles`
**구조:** 1:1 (UNIQUE account_id) | **참조:** `study_abroad_mgt`, `agent_commission_configs`

```sql
id, account_id FK UNIQUE
cricos_code             VARCHAR(50)    -- CRICOS Provider Code
rto_code                VARCHAR(50)    -- RTO Code (VET용)
institution_type        VARCHAR(50)    -- University | TAFE | English Language School 등
enrolment_officer       VARCHAR(255)
enrolment_email         VARCHAR(255)
enrolment_phone         VARCHAR(100)
intake_months           JSONB          -- [1, 3, 7, 10]
academic_calendar       VARCHAR(50)    -- Term | Semester | Trimester | Year-round
default_commission_rate DECIMAL(8,4)   -- 0.1500 = 15% (agent_commission_configs 기본값)
commission_basis        VARCHAR(30)    -- gross | net | first_term | full_year_first_term
available_courses       JSONB          -- [{name, code, level, duration_weeks_min/max, tuition_per_week_aud}]
can_sponsor_student_visa BOOLEAN
oshc_required           BOOLEAN        -- Overseas Student Health Cover
```

---

### TABLE 6: `account_tour_profiles`
**구조:** 1:N (투어 상품 여러 개) | **Pre-fill 대상:** `camp_tour_mgt`

```sql
id, account_id FK
tour_name               VARCHAR(255)   -- "Blue Mountains Day Tour" → camp_tour_mgt.tour_name
tour_type               VARCHAR(50)    -- day_tour|overnight|cultural|adventure|city|nature|theme_park|wildlife|other
tour_category           VARCHAR(100)   -- Nature | City Sightseeing | Cultural Heritage
duration_hours          INTEGER        -- 소요 시간
duration_days           INTEGER        -- 숙박 투어 일 수
min_participants        INTEGER
max_participants        INTEGER        -- → camp_tour_mgt.max_participants
default_pickup_location VARCHAR(255)   -- → camp_tour_mgt.pickup_location
pickup_available        BOOLEAN
operates_on             JSONB          -- ["Mon","Wed","Fri","Sat","Sun"]
departure_time          VARCHAR(50)    -- "08:00 AM"
return_time             VARCHAR(50)    -- "06:00 PM"
inclusions              TEXT
exclusions              TEXT
adult_retail_price      DECIMAL(10,2)  -- AR per person → camp_tour_mgt.retail_price
child_retail_price      DECIMAL(10,2)  -- AR 어린이 (선택)
partner_cost            DECIMAL(10,2)  -- AP per person → camp_tour_mgt.partner_cost
advance_booking_days    INTEGER
cancellation_policy     TEXT
booking_contact         VARCHAR(255)
guide_languages         JSONB          -- ["English","Korean","Chinese"]
thumbnail_url           VARCHAR(500)
```

---

## 4. 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 0 — Account Master Profiles (신규)                        │
│                                                                   │
│  accounts (기존)                                                  │
│    ├── account_service_categories (1:N) ← 멀티 카테고리 태그      │
│    │         service_type: homestay | pickup | tour_provider      │
│    │                       internship_host | school | ...         │
│    │                                                              │
│    ├── account_homestay_profiles  (1:N) ← 방 단위                │
│    ├── account_pickup_profiles    (1:N) ← 차량 단위              │
│    ├── account_tour_profiles      (1:N) ← 투어 상품 단위         │
│    ├── account_company_profiles   (1:1) ← 컴퍼니 단위            │
│    └── account_school_profiles    (1:1) ← 학교 단위              │
│                    │                                              │
│                    │  Pre-fill (계약 생성 시 자동 채우기)           │
│                    ▼                                              │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — 서비스 모듈 (기존 — 변경 없음)                         │
│                                                                   │
│  accommodation_mgt   ← host_name, weekly_rate 등 Pre-fill        │
│  pickup_mgt          ← driver_name, vehicle_info 등 Pre-fill     │
│  internship_mgt      ← position_title, employment_type Pre-fill  │
│  camp_tour_mgt       ← tour_name, retail_price 등 Pre-fill       │
│  study_abroad_mgt    ← (school_profile 참조)                     │
└─────────────────────────────────────────────────────────────────┘

products.category_2_id (Provider Account FK) ← 기존 연결 고리 유지
```

---

## 5. Pre-fill 연동 흐름

### API 흐름

```
① 담당자가 계약 생성 → accommodation_mgt 폼 진입
② Provider Account 선택 (provider_account_id)
③ 프론트엔드에서 호출:
   GET /api/accounts/{provider_id}/service-profile-summary
④ 응답 데이터로 폼 자동 채우기:
   homestayProfiles[0] → host_name, host_contact, weekly_rate 등
⑤ 담당자 확인/수정 후 저장
   → accommodation_mgt 테이블에 계약별 스냅샷으로 저장
```

### Pre-fill 매핑 테이블

**홈스테이 → accommodation_mgt**
```
account_homestay_profiles.host_name         → accommodation_mgt.host_name
account_homestay_profiles.host_contact      → accommodation_mgt.host_contact
account_homestay_profiles.property_address  → accommodation_mgt.host_address
account_homestay_profiles.room_type         → accommodation_mgt.room_type
account_homestay_profiles.accommodation_type→ accommodation_mgt.accommodation_type
account_homestay_profiles.meal_included     → accommodation_mgt.meal_included
account_homestay_profiles.weekly_rate       → accommodation_mgt.weekly_rate
account_homestay_profiles.partner_weekly_cost→ accommodation_mgt.partner_weekly_cost
account_homestay_profiles.distance_to_school→ accommodation_mgt.distance_to_school
```

**픽업 → pickup_mgt**
```
account_pickup_profiles.driver_name         → pickup_mgt.driver_name
account_pickup_profiles.driver_contact      → pickup_mgt.driver_contact
make + model + color + plate (조합)          → pickup_mgt.vehicle_info
account_pickup_profiles.base_rate           → pickup_mgt.partner_cost
account_pickup_profiles.account_id          → pickup_mgt.provider_account_id
```

**투어 → camp_tour_mgt**
```
account_tour_profiles.tour_name             → camp_tour_mgt.tour_name
account_tour_profiles.tour_type             → camp_tour_mgt.tour_type
account_tour_profiles.max_participants      → camp_tour_mgt.max_participants
account_tour_profiles.default_pickup_location→ camp_tour_mgt.pickup_location
account_tour_profiles.adult_retail_price    → camp_tour_mgt.retail_price
account_tour_profiles.partner_cost          → camp_tour_mgt.partner_cost
account_tour_profiles.account_id            → camp_tour_mgt.tour_provider_account_id
```

**인턴십 → internship_mgt**
```
account_company_profiles.account_id              → internship_mgt.host_company_id
available_positions[n].title                     → internship_mgt.position_title
available_positions[n].type                      → internship_mgt.employment_type
available_positions[n].hourly_rate               → internship_mgt.hourly_rate
account_company_profiles.placement_fee_type      → internship_mgt.placement_fee_type
```

---

## 6. 산출물 파일 목록

| 파일명 | 타입 | 용도 | 적용 위치 |
|--------|------|------|---------|
| `migration_account_service_profiles_v1.sql` | SQL | DB 테이블 생성 Migration | PostgreSQL 직접 실행 |
| `schema_account_service_profiles.ts` | TypeScript | Drizzle ORM 스키마 정의 | `/db/schema.ts` 하단에 추가 |
| `routes_accountServiceProfiles.ts` | TypeScript | Express API 라우트 | `/server/src/routes/accountServiceProfiles.ts` |
| `AccountServiceProfilesTab.tsx` | React/TSX | Account 상세 UI 탭 | `/client/src/components/accounts/` |
| `edubee_account_service_profiles_design_v1.md` | Markdown | 설계 문서 (Addendum) | 프로젝트 문서 보관 |

---

## 7. Replit 적용 순서 (Step-by-Step)

### STEP 1 — DB Migration 실행

```bash
# Replit Shell에서 실행
psql $DATABASE_URL -f migration_account_service_profiles_v1.sql

# 또는 Drizzle 사용 시:
# migration_account_service_profiles_v1.sql 내용을
# drizzle/migrations/ 폴더에 새 파일로 추가 후
npx drizzle-kit migrate
```

**검증:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'account_%profiles%'
   OR table_name = 'account_service_categories';
-- 6개 테이블 확인
```

---

### STEP 2 — schema.ts 업데이트

```typescript
// /db/schema.ts 파일 하단에 추가
// schema_account_service_profiles.ts 전체 내용 붙여넣기
// (import 문 제외 — 기존 accounts 테이블 변수명 확인 필요)

// ⚠️ 주의: 기존 파일의 accounts 테이블 변수명이
// 'accounts'가 아닐 경우 참조명 수정 필요
```

**accounts Relations 확장 (기존 정의에 추가):**
```typescript
export const accountsRelations = relations(accounts, ({ many }) => ({
  // ... 기존 relations ...

  // [신규 추가]
  serviceCategories: many(accountServiceCategories),
  homestayProfiles:  many(accountHomestayProfiles),
  pickupProfiles:    many(accountPickupProfiles),
  companyProfile:    many(accountCompanyProfiles),
  schoolProfile:     many(accountSchoolProfiles),
  tourProfiles:      many(accountTourProfiles),
}));
```

**TypeScript 검증:**
```bash
npx tsc --noEmit
# 오류 0개 확인
```

---

### STEP 3 — API 라우트 등록

```typescript
// /server/src/routes/accountServiceProfiles.ts 파일 생성
// routes_accountServiceProfiles.ts 내용 그대로 복사

// /server/src/index.ts (또는 app.ts)에 라우터 등록:
import accountServiceProfilesRouter from "./routes/accountServiceProfiles";
app.use("/api/accounts", accountServiceProfilesRouter);
```

**API 동작 확인:**
```bash
# 서버 기동 후 테스트
curl http://localhost:3000/api/accounts/{account-id}/service-categories
# → { "success": true, "data": [] }
```

---

### STEP 4 — UI 컴포넌트 추가

```bash
# 파일 복사
cp AccountServiceProfilesTab.tsx \
   client/src/components/accounts/AccountServiceProfilesTab.tsx
```

**Account 상세 페이지 탭에 추가:**
```tsx
// /client/src/pages/accounts/AccountDetail.tsx (또는 유사 파일)

import AccountServiceProfilesTab from "@/components/accounts/AccountServiceProfilesTab";

// 탭 목록에 추가:
const tabs = [
  { id: "details",   label: "Details" },
  { id: "contacts",  label: "Contacts" },
  { id: "service-profiles", label: "Service Profiles" },  // ← 추가
  // ...
];

// 탭 콘텐츠에 추가:
{activeTab === "service-profiles" && (
  <AccountServiceProfilesTab
    accountId={account.id}
    accountName={account.name}
    readOnly={!canEdit}          // 권한에 따라 설정
  />
)}
```

---

### STEP 5 — 최종 검증

```bash
# 1. TypeScript 오류 확인
npx tsc --noEmit

# 2. 서버 기동
npm run dev

# 3. DB 데이터 확인
# Replit DB 콘솔 또는 psql에서:
SELECT COUNT(*) FROM account_service_categories;  -- 0
SELECT COUNT(*) FROM account_homestay_profiles;    -- 0
# (정상 — 아직 데이터 없음)

# 4. API 응답 확인
curl http://localhost:3000/api/accounts/{id}/service-profile-summary
# → success: true, data: { serviceCategories: [], homestayProfiles: [], ... }
```

---

## 8. API 엔드포인트 전체 목록

### Service Categories (멀티 체크박스)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/accounts/:id/service-categories` | 카테고리 목록 조회 |
| POST | `/api/accounts/:id/service-categories` | 카테고리 추가 `{ serviceType }` |
| DELETE | `/api/accounts/:id/service-categories/:serviceType` | 카테고리 제거 |

### Homestay Profiles
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/accounts/:id/profiles/homestay` | 홈스테이 프로필 목록 |
| POST | `/api/accounts/:id/profiles/homestay` | 신규 방 프로필 추가 |
| PUT | `/api/accounts/:id/profiles/homestay/:profileId` | 프로필 수정 |
| DELETE | `/api/accounts/:id/profiles/homestay/:profileId` | 소프트 삭제 |

### Pickup Profiles
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/accounts/:id/profiles/pickup` | 차량 프로필 목록 |
| POST | `/api/accounts/:id/profiles/pickup` | 신규 차량 추가 |
| PUT | `/api/accounts/:id/profiles/pickup/:profileId` | 차량 수정 |
| DELETE | `/api/accounts/:id/profiles/pickup/:profileId` | 소프트 삭제 |

### Tour Profiles
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/accounts/:id/profiles/tour` | 투어 상품 목록 |
| POST | `/api/accounts/:id/profiles/tour` | 신규 투어 추가 |
| PUT | `/api/accounts/:id/profiles/tour/:profileId` | 투어 수정 |
| DELETE | `/api/accounts/:id/profiles/tour/:profileId` | 소프트 삭제 |

### Company Profile (1:1)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/accounts/:id/profiles/company` | 컴퍼니 프로필 조회 |
| POST | `/api/accounts/:id/profiles/company` | 신규 생성 |
| PUT | `/api/accounts/:id/profiles/company/:profileId` | 수정 |

### School Profile (1:1)
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/accounts/:id/profiles/school` | 학교 프로필 조회 |
| POST | `/api/accounts/:id/profiles/school` | 신규 생성 |
| PUT | `/api/accounts/:id/profiles/school/:profileId` | 수정 |

### Pre-fill 통합 소스
| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/accounts/:id/service-profile-summary` | 계약 생성 시 모든 프로필 일괄 조회 |

**service-profile-summary 응답 구조:**
```json
{
  "success": true,
  "data": {
    "serviceCategories": [...],
    "homestayProfiles":  [...],
    "pickupProfiles":    [...],
    "companyProfile":    {...} | null,
    "schoolProfile":     {...} | null,
    "tourProfiles":      [...]
  }
}
```

---

## 9. UI 컴포넌트 사용법

### AccountServiceProfilesTab Props

```tsx
<AccountServiceProfilesTab
  accountId="uuid-here"       // 필수 — Account UUID
  accountName="Anderson Family" // 선택 — 표시용 이름
  readOnly={false}             // 선택 — true시 편집 불가 (기본: false)
/>
```

### 컴포넌트 구조

```
AccountServiceProfilesTab (Entry Point)
  ├── ServiceCategorySelector    ← 항상 표시 (카테고리 체크박스)
  │     선택된 카테고리에 따라 아래 섹션 동적 표시
  ├── HomestayProfileSection     ← homestay | dormitory 선택 시
  │     ├── 카드 리스트 (읽기)
  │     └── 인라인 폼 (편집)
  ├── PickupProfileSection       ← pickup 선택 시
  ├── TourProfileSection         ← tour_provider 선택 시
  ├── CompanyProfileSection      ← internship_host 선택 시
  └── SchoolProfileSection       ← school | camp_institute 선택 시
```

### 핵심 UX 동작

| 동작 | 설명 |
|------|------|
| 카테고리 토글 | 체크 즉시 API 호출 → 해당 프로필 섹션 자동 표시/숨김 |
| 멀티 프로필 | 홈스테이/픽업/투어는 "Add" 버튼으로 복수 등록 가능 |
| 편집 전환 | 카드 뷰 → 인라인 폼으로 전환 (페이지 이동 없음) |
| 소프트 삭제 | 데이터 삭제 없이 is_active=false 처리 |
| 실시간 동기화 | 3초 polling으로 카테고리 상태 동기화 |

---

## 10. 기존 코드 영향 분석

### 변경된 파일: **없음**

| 기존 파일/테이블 | 변경 여부 | 비고 |
|----------------|-----------|------|
| `/db/schema.ts` | ➕ 추가만 | 기존 코드 끝에 6개 테이블 정의 추가 |
| `accounts` 테이블 | ❌ 변경 없음 | account_category 필드 레거시 유지 |
| `accommodation_mgt` | ❌ 변경 없음 | 수동 입력 필드 스냅샷으로 유지 |
| `pickup_mgt` | ❌ 변경 없음 | |
| `internship_mgt` | ❌ 변경 없음 | |
| `camp_tour_mgt` | ❌ 변경 없음 | |
| `study_abroad_mgt` | ❌ 변경 없음 | |
| `products` | ❌ 변경 없음 | category_2_id Provider FK 기존 활용 |
| 기타 모든 테이블 | ❌ 변경 없음 | |

> **핵심 원칙 준수:** 기존 작동 코드 절대 건드리지 않음.  
> 신규 테이블은 accounts에 CASCADE FK로 연결만 추가.

---

## 11. 다음 단계 로드맵

### Phase 1 (즉시) — Replit 적용
- [ ] STEP 1: Migration SQL 실행
- [ ] STEP 2: schema.ts 업데이트
- [ ] STEP 3: API 라우트 등록
- [ ] STEP 4: UI 탭 추가
- [ ] STEP 5: 검증

### Phase 2 (단기) — Pre-fill 연동
- [ ] `accommodation_mgt` 폼: Provider Account 선택 시 `service-profile-summary` 호출 후 자동 채우기
- [ ] `pickup_mgt` 폼: 동일 방식 연동
- [ ] `camp_tour_mgt` 폼: Tour Account 선택 시 투어 상품 목록 드롭다운

### Phase 3 (중기) — 고도화
- [ ] 홈스테이 가용성 달력 뷰 (is_currently_occupied 기반)
- [ ] 투어 상품 운영 요일 충돌 체크
- [ ] 커미션 자동 계산 (school_profile.default_commission_rate 활용)
- [ ] SaaS 전환 시 모든 프로필 테이블에 `organisation_id` FK 추가

---

## 테이블 수 최종 집계

| 구분 | 테이블 수 | 상태 |
|------|-----------|------|
| SYSTEM CONFIG | 4 | 기존 |
| PARTNER / CLIENT | 2 | 기존 |
| **ACCOUNT SERVICE PROFILES** | **6** | **[신규 — 이번 작업]** |
| SALES | 9 | 기존+ |
| FINANCE CORE | 7 | 기존 |
| FINANCE ACCOUNTING | 7 | 기존 신규 |
| PRODUCTS | 5 | 기존+ |
| USER & TEAM | 4 | 기존 |
| MAINTENANCE | 2 | 기존 |
| SERVICE MODULES | 6 | 기존 신규 |
| CAMP MODULE | 6 | 기존 신규 |
| **TOTAL** | **58** | |

---

*© Edubee.Co — 내부 개발 문서. 배포 금지.*  
*작성: 2026-03-26 | 검토: Jason KIM 대표 필수*  
*다음 문서 버전 업데이트 시: edubee_crm_db_schema_design_doc 에 Section 추가 필요*
