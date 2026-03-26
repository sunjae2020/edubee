# 🐝 Edubee CRM — Account Service Profiles 설계 문서

**버전:** v1.0 Addendum  
**작성일:** 2026-03-26  
**기반 문서:** edubee_crm_db_schema_design_doc_20260321.md (FINAL v4.0)  
**신규 테이블:** 5개 (총 누적: 52 → 57개)

---

## 목적

서비스 모듈(_mgt 테이블)에서 수동으로 입력하던 파트너 상세 정보를  
**전용 마스터 프로필 테이블**로 분리하여:

1. **재사용**: 같은 홈스테이 가족/픽업 업체/호스트 컴퍼니를 여러 계약에서 재활용
2. **Pre-fill**: 계약 생성 시 프로필 데이터 자동 불러오기
3. **멀티 카테고리**: 하나의 Account가 여러 서비스 유형 동시 제공 가능
4. **스냅샷 분리**: 계약 시점 정보는 _mgt 테이블에 별도 보존

---

## 아키텍처 위치

```
LAYER 0 — Master Data (신규)
┌─────────────────────────────────────────────────────────┐
│  accounts (기존)                                         │
│    ├── account_service_categories  [신규] ← 멀티 태그    │
│    ├── account_homestay_profiles   [신규] ← 1:N          │
│    ├── account_pickup_profiles     [신규] ← 1:N          │
│    ├── account_company_profiles    [신규] ← 1:1          │
│    └── account_school_profiles     [신규] ← 1:1          │
│                │                                         │
│                │ Pre-fill (계약 생성 시)                   │
│                ▼                                         │
│  accommodation_mgt / pickup_mgt / internship_mgt (스냅샷)│
└─────────────────────────────────────────────────────────┘
```

---

## TABLE 1: account_service_categories

### 역할
하나의 Account에 여러 서비스 카테고리를 태그할 수 있는 **멀티 체크박스 테이블**.

### 핵심 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| account_id | UUID FK → accounts | 대상 Account |
| service_type | VARCHAR(50) | 서비스 유형 (하단 Enum 참조) |
| is_active | BOOLEAN | 현재 활성 여부 |

### service_type Enum

| 값 | 설명 | 연계 프로필 테이블 |
|----|------|-----------------|
| `homestay` | 홈스테이/하숙 제공 | account_homestay_profiles |
| `dormitory` | 기숙사 운영 | account_homestay_profiles (공용) |
| `pickup` | 공항 픽업 서비스 | account_pickup_profiles |
| `tour_provider` | 투어 운영 업체 | account_tour_profiles |
| `internship_host` | 인턴십 호스트 컴퍼니 | account_company_profiles |
| `school` | 교육 기관 | account_school_profiles |
| `camp_institute` | 캠프 프로그램 운영 | account_school_profiles (공용) |
| `guardian` | 가디언 서비스 | (guardian_mgt 연계) |
| `translation` | 번역/통역 | — |
| `other` | 기타 | — |

### 관계
- `accounts (1) ←→ account_service_categories (N)`
- UNIQUE(account_id, service_type) — 동일 유형 중복 등록 방지

---

## TABLE 2: account_homestay_profiles

### 역할
홈스테이·기숙사 파트너의 **방(Room) 단위 상세 프로필**.  
1개 Account가 여러 방을 제공할 수 있으므로 **1:N 구조**.

### 핵심 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| account_id | UUID FK | 홈스테이 Account |
| room_type | VARCHAR(100) | Single Room \| Twin Room \| Single Ensuite \| Studio \| Granny Flat |
| accommodation_type | VARCHAR(100) | House \| Shared Apartment \| Townhouse \| Granny Flat |
| meal_included | VARCHAR(50) | no \| breakfast \| half_board \| full_board |
| weekly_rate | DECIMAL(10,2) | 학생 청구 주간 요금 (AR Pre-fill) |
| partner_weekly_cost | DECIMAL(10,2) | 파트너 원가 (AP Pre-fill, 선택) |
| distance_to_school | VARCHAR(200) | 학교까지 거리 |
| max_students | INTEGER | 동시 수용 학생 수 |
| available_from | DATE | 입주 가능일 |
| host_name | VARCHAR(255) | 호스트 이름 |
| host_contact | VARCHAR(100) | 호스트 연락처 |
| property_address | TEXT | 숙소 주소 |
| amenities | JSONB | {wifi, parking, laundry, pets 등} |
| is_currently_occupied | BOOLEAN | 현재 배정 여부 (가용성 판단) |

### accommodation_mgt Pre-fill 매핑

```
account_homestay_profiles          →   accommodation_mgt (계약별 스냅샷)
─────────────────────────────────────────────────────────────
host_name                          →   host_name
host_contact                       →   host_contact
property_address                   →   host_address
room_type                          →   room_type
accommodation_type                 →   accommodation_type
meal_included                      →   meal_included
weekly_rate                        →   weekly_rate
partner_weekly_cost                →   partner_weekly_cost
distance_to_school                 →   distance_to_school
```

---

## TABLE 3: account_pickup_profiles

### 역할
픽업 서비스 파트너의 **드라이버 및 차량 단위 프로필**.  
1개 픽업 회사가 여러 차량을 운영할 수 있으므로 **1:N 구조**.

### 핵심 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| account_id | UUID FK | 픽업 업체 Account |
| driver_name | VARCHAR(255) | 드라이버 이름 |
| driver_contact | VARCHAR(100) | 드라이버 연락처 |
| vehicle_make | VARCHAR(100) | 제조사 (Toyota) |
| vehicle_model | VARCHAR(100) | 모델 (HiAce) |
| vehicle_color | VARCHAR(50) | 색상 (White) |
| plate_number | VARCHAR(50) | 차량 번호판 (EDU 001) |
| capacity | INTEGER | 최대 탑승 인원 |
| service_airports | JSONB | 서비스 공항 배열 ["SYD", "MEL"] |
| base_rate | DECIMAL(10,2) | 기본 픽업 원가 (AP Pre-fill) |
| is_available | BOOLEAN | 현재 배정 가능 여부 |

### pickup_mgt Pre-fill 매핑

```
account_pickup_profiles           →   pickup_mgt (계약별 스냅샷)
─────────────────────────────────────────────────────────────
driver_name                       →   driver_name
driver_contact                    →   driver_contact
vehicle_make + model + color      
+ plate_number (조합)              →   vehicle_info
base_rate                         →   partner_cost
account_id                        →   provider_account_id
```

---

## TABLE 4: account_company_profiles

### 역할
인턴십 호스트 컴퍼니(Account)의 **회사 정보 + 포지션 목록 프로필**.  
회사는 단일 프로필이나, 포지션 목록은 **JSONB 배열**로 복수 관리.  
**1:1 구조** (UNIQUE account_id).

### 핵심 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| account_id | UUID FK | 호스트 컴퍼니 Account |
| industry | VARCHAR(100) | Hospitality \| IT \| Marketing \| Finance 등 |
| company_size | VARCHAR(50) | 1-10 \| 11-50 \| 51-200 등 |
| contact_person | VARCHAR(255) | 파트너십 담당자 |
| contact_email | VARCHAR(255) | 담당자 이메일 |
| available_positions | JSONB | 포지션 목록 배열 |
| placement_fee_type | VARCHAR(50) | flat_fee \| percentage_of_salary \| none |
| placement_fee | DECIMAL(10,2) | 플레이스먼트 수수료 |
| requires_police_check | BOOLEAN | 경찰 신원조회 필요 여부 |
| requires_wwcc | BOOLEAN | Working With Children Check |

### available_positions JSONB 구조

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

### internship_mgt Pre-fill 매핑

```
account_company_profiles          →   internship_mgt (계약별 스냅샷)
─────────────────────────────────────────────────────────────
account_id                        →   host_company_id
available_positions[n].title      →   position_title
available_positions[n].type       →   employment_type
available_positions[n].hourly_rate →  hourly_rate
placement_fee_type                →   placement_fee_type
```

---

## TABLE 5: account_school_profiles

### 역할
학교 Account의 **행정 및 커미션 관련 추가 프로필**.  
CRICOS 코드, 입학 담당자, 코스 목록, 기본 커미션율 관리.  
**1:1 구조** (UNIQUE account_id).

### 핵심 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| account_id | UUID FK | 학교 Account |
| cricos_code | VARCHAR(50) | CRICOS Provider Code |
| rto_code | VARCHAR(50) | RTO Code (VET 학교용) |
| institution_type | VARCHAR(50) | University \| TAFE \| English Language School 등 |
| enrolment_officer | VARCHAR(255) | 입학 담당자 |
| enrolment_email | VARCHAR(255) | 입학 담당자 이메일 |
| intake_months | JSONB | 입학 가능 월 [1, 3, 7, 10] |
| default_commission_rate | DECIMAL(8,4) | 기본 커미션율 (0.1500 = 15%) |
| available_courses | JSONB | 코스 목록 배열 |
| can_sponsor_student_visa | BOOLEAN | 학생 비자 후원 가능 여부 |
| oshc_required | BOOLEAN | OSHC 필수 여부 |

### available_courses JSONB 구조

```json
[
  {
    "name": "General English",
    "code": "GE-001",
    "level": "All levels",
    "duration_weeks_min": 4,
    "duration_weeks_max": 52,
    "tuition_per_week_aud": 350,
    "is_active": true
  }
]
```

---

## TABLE 6: account_tour_profiles

### 역할
투어 컴퍼니(Account)의 **투어 상품 단위 프로필**.  
1개 투어 회사가 여러 투어 상품을 운영할 수 있으므로 **1:N 구조**.  
`camp_tour_mgt` 생성 시 Pre-fill 소스.

### 핵심 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| account_id | UUID FK | 투어 컴퍼니 Account |
| tour_name | VARCHAR(255) | 투어 상품명 |
| tour_type | VARCHAR(50) | day_tour \| overnight \| cultural \| adventure \| city \| nature \| theme_park \| wildlife \| other |
| tour_category | VARCHAR(100) | Nature \| City Sightseeing \| Cultural Heritage \| Food & Wine \| Adventure Sports |
| duration_hours | INTEGER | 투어 소요 시간 |
| duration_days | INTEGER | 숙박 투어 일 수 |
| min/max_participants | INTEGER | 최소/최대 인원 |
| default_pickup_location | VARCHAR(255) | 기본 출발지 |
| pickup_available | BOOLEAN | 호텔 픽업 서비스 여부 |
| operates_on | JSONB | 운영 요일 ["Mon","Wed","Sat"] |
| departure_time | VARCHAR(50) | 출발 시간 |
| inclusions / exclusions | TEXT | 포함/불포함 항목 |
| adult_retail_price | DECIMAL(10,2) | 성인 청구액 per person (AR Pre-fill) |
| child_retail_price | DECIMAL(10,2) | 어린이 청구액 per person (AR, 선택) |
| partner_cost | DECIMAL(10,2) | 파트너 원가 per person (AP Pre-fill) |
| advance_booking_days | INTEGER | 최소 사전 예약 일수 |
| cancellation_policy | TEXT | 취소 정책 |
| guide_languages | JSONB | 지원 언어 ["English","Korean"] |

### camp_tour_mgt Pre-fill 매핑

```
account_tour_profiles             →   camp_tour_mgt (계약별 스냅샷)
─────────────────────────────────────────────────────────────
tour_name                         →   tour_name
tour_type                         →   tour_type
max_participants                  →   max_participants
default_pickup_location           →   pickup_location
adult_retail_price                →   retail_price
partner_cost                      →   partner_cost
account_id                        →   tour_provider_account_id
```

---

## Pre-fill 흐름 (서버 로직)

```
[담당자가 계약에서 Provider Account 선택]
         │
         ▼
[account_service_categories 조회]
  → service_type 확인
         │
  ┌──────┴──────┬──────────────┬─────────────┬────────────┐
  ▼             ▼              ▼             ▼            ▼
homestay      pickup     internship_host   school     tour_provider
  │             │              │
  ▼             ▼              ▼
account_     account_       account_
homestay_    pickup_        company_
profiles     profiles       profiles
  │             │              │
  ▼             ▼              ▼
accommodation_ pickup_mgt    internship_
mgt 폼 자동     폼 자동 채움    mgt 폼 자동
채움                           채움
         │
         ▼
[담당자 확인 및 수정 후 저장]
  → _mgt 테이블에 계약별 스냅샷으로 저장
```

---

## 기존 스키마 영향 분석

| 기존 테이블 | 변경 여부 | 비고 |
|------------|-----------|------|
| accounts | ❌ 변경 없음 | account_category 필드 유지 (단일 카테고리 레거시) |
| accommodation_mgt | ❌ 변경 없음 | 수동 입력 필드 유지 (스냅샷 역할) |
| pickup_mgt | ❌ 변경 없음 | 수동 입력 필드 유지 |
| internship_mgt | ❌ 변경 없음 | host_company_id 유지 |
| products | ❌ 변경 없음 | category_2_id (Provider Account) 활용 |
| 기타 모든 테이블 | ❌ 변경 없음 | — |

> **`accounts.account_category`** (기존 단일값 필드)는 레거시로 유지하되,  
> 신규 **`account_service_categories`** 테이블이 멀티 카테고리의 정식 소스가 된다.

---

## 업데이트된 테이블 수 요약

| 구분 | 테이블 수 | 상태 |
|------|-----------|------|
| SYSTEM CONFIG | 4 | 기존 |
| PARTNER / CLIENT | 2 | 기존 |
| **ACCOUNT SERVICE PROFILES** | **6** | **[신규]** |
| SALES | 9 | 기존+ |
| FINANCE CORE | 7 | 기존 |
| FINANCE ACCOUNTING | 7 | 신규 |
| PRODUCTS | 5 | 기존+ |
| USER & TEAM | 4 | 기존 |
| MAINTENANCE | 2 | 기존 |
| SERVICE MODULES | 6 | 신규 |
| CAMP MODULE | 6 | 신규 |
| **합계** | **58** | |

---

## 구현 우선순위

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | Migration SQL 실행 | 5개 테이블 생성 |
| 2 | Drizzle ORM schema.ts 추가 | 5개 테이블 정의 |
| 3 | Account 상세 페이지 UI | 카테고리 탭 + 프로필 폼 |
| 4 | Pre-fill API 엔드포인트 | GET /accounts/:id/service-profile |
| 5 | _mgt 생성 시 Pre-fill 연동 | accommodation/pickup/internship |

---

*© Edubee.Co — 내부 설계 문서. 배포 금지.*  
*작성: 2026-03-26 | 검토: Jason KIM 대표 필수*
