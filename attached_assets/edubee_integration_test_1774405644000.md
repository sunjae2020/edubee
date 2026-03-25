# 🐝 Edubee CRM — Phase 1~4 통합 테스트 프롬프트

## 테스트 목적
Phase 1~4에서 변경된 모든 사항이 정상 동작하는지 검증한다.
- DB 스키마 변경 (Phase 1~2)
- API 필터 동작 (Phase 3)
- 프론트엔드 메뉴 / 라우트 (Phase 4)
- 전체 파이프라인: Application → Quote → Contract → Service Module

---

## 사전 준비

아래 테스트 데이터가 DB에 존재하는지 확인 후 없으면 먼저 생성한다.

```sql
-- 테스트용 데이터 존재 여부 확인
SELECT COUNT(*) FROM accounts WHERE account_type = 'Student';
SELECT COUNT(*) FROM accounts WHERE account_type = 'School';
SELECT COUNT(*) FROM camp_package_groups;
SELECT COUNT(*) FROM camp_packages;
SELECT COUNT(*) FROM products WHERE product_context = 'camp_package';
```

---

## BLOCK 1 — DB 스키마 검증

### 1-1. study_abroad_mgt 신규 컬럼 확인

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'study_abroad_mgt'
  AND column_name IN (
    'program_context',
    'institute_account_id',
    'program_name',
    'program_type',
    'program_start_date',
    'program_end_date',
    'weekly_hours',
    'class_size_max',
    'age_group',
    'level_assessment_required',
    'level_assessment_date',
    'assigned_class',
    'partner_cost'
  )
ORDER BY column_name;
```

**기대 결과:** 13개 행 반환
**체크 포인트:**
- `program_context` → DEFAULT `'study_abroad'`, NOT NULL
- `level_assessment_required` → DEFAULT `false`, NOT NULL
- 나머지 11개 → nullable


### 1-2. camp_packages 신규 컬럼 확인

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'camp_packages'
  AND column_name = 'product_id';
```

**기대 결과:** 1개 행, is_nullable = YES


### 1-3. products 신규 컬럼 확인

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('product_context', 'camp_package_id')
ORDER BY column_name;
```

**기대 결과:** 2개 행
- `camp_package_id` → nullable
- `product_context` → DEFAULT `'general'`, NOT NULL


### 1-4. 기존 데이터 오염 여부 확인

```sql
-- 기존 study_abroad 레코드가 'study_abroad' 컨텍스트인지 확인
SELECT program_context, COUNT(*) as cnt
FROM study_abroad_mgt
GROUP BY program_context;
-- 기대: 'study_abroad' 만 존재 (Phase 2 이관 데이터는 'camp')

-- 기존 products 레코드가 'general' 컨텍스트인지 확인
SELECT product_context, COUNT(*) as cnt
FROM products
GROUP BY product_context;
-- 기대: 'general' 만 존재 (신규 등록 전)

-- camp_institute_mgt 테이블이 삭제됐는지 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'camp_institute_mgt';
-- 기대: 0개 행 (테이블 없음)
```

---

## BLOCK 2 — Products 등록 테스트

### 2-1. Camp Package 상품 신규 등록

**경로:** Products → Products 메뉴 → New Product

```
테스트 데이터:
  Name:            "Junior English Camp 3W — Package A"
  Price:           9800
  Currency:        AUD
  Product Context: camp_package          ← 신규 필드
  Service Module:  camp
  Status:          Active
```

**저장 후 DB 확인:**

```sql
SELECT id, name, price, product_context, camp_package_id, status
FROM products
WHERE name LIKE '%Junior English%'
ORDER BY created_on DESC
LIMIT 1;
```

**기대 결과:**
- `product_context` = `'camp_package'`
- `camp_package_id` = NULL (Package 연결 전)


### 2-2. Camp Addon 상품 등록

**경로:** Products → Products 메뉴 → New Product

```
테스트 데이터 1 — 인원 추가:
  Name:            "Extra Adult Participant"
  Price:           500
  Currency:        AUD
  Product Context: camp_addon            ← 신규 필드
  Status:          Active

테스트 데이터 2 — 숙소 추가:
  Name:            "Extra 3-Night Accommodation"
  Price:           530
  Currency:        AUD
  Product Context: camp_addon
  Status:          Active
```

**DB 확인:**

```sql
SELECT id, name, price, product_context
FROM products
WHERE product_context = 'camp_addon'
ORDER BY created_on DESC
LIMIT 5;
```


### 2-3. Package에 Product 연결

**경로:** Products → Packages 메뉴 → 기존 Package 선택 → Edit

```
Package 선택 후:
  Product ID 필드에서 2-1에서 만든 Product 선택
  → 저장
```

**DB 확인:**

```sql
SELECT
  cp.id AS package_id,
  cp.name AS package_name,
  cp.product_id,
  p.name AS product_name,
  p.product_context
FROM camp_packages cp
LEFT JOIN products p ON cp.product_id = p.id
WHERE cp.product_id IS NOT NULL
LIMIT 5;
```

**기대 결과:** product_id가 연결되고 product_context = 'camp_package'

---

## BLOCK 3 — API 엔드포인트 테스트

### 3-1. Study Abroad 목록 — camp 레코드 제외 확인

```bash
GET /api/services/study-abroad
```

**응답 확인 포인트:**
- 응답 배열의 모든 항목에 `programContext = 'study_abroad'` 만 존재
- `programContext = 'camp'` 인 항목 없음

```bash
# camp 필터 동작 확인
GET /api/services/study-abroad?applicationStage=counseling
# 응답에 camp 레코드 없어야 함
```


### 3-2. Camp Services — Institute 목록

```bash
GET /api/camp-services/institutes
```

**응답 확인 포인트:**
- HTTP 200 반환
- 응답 구조: `{ institutes: [], total: 0, page: 1, totalPages: 1 }`
- 모든 항목의 `programContext = 'camp'`


### 3-3. Camp Services — Tour 목록

```bash
GET /api/camp-services/tours
```

**응답 확인 포인트:**
- HTTP 200 반환
- 응답 구조: `{ tours: [], total: 0, page: 1, totalPages: 1 }`


### 3-4. Products — productContext 필터

```bash
GET /api/products?productContext=camp_package
# 기대: camp_package 타입 상품만 반환

GET /api/products?productContext=camp_addon
# 기대: camp_addon 타입 상품만 반환

GET /api/products?productContext=general
# 기대: 기존 일반 상품만 반환
```


### 3-5. Lookup 엔드포인트 신규 확인

```bash
GET /api/products-lookup/camp-packages
# 기대: product_context='camp_package' + status='Active' 상품 목록

GET /api/products-lookup/camp-addons
# 기대: product_context='camp_addon' 상품 목록

GET /api/products-lookup/camp-addons?campPackageId={id}
# 기대: 특정 package에 연결된 addon만 반환
```

---

## BLOCK 4 — 전체 파이프라인 테스트 (캠프)

### 4-1. STEP 1 — Camp Application 생성

**경로:** Camp → Camp Application → New Application

```
테스트 신청 데이터:
  Application Ref:       CAMP-TEST-001 (자동 생성 확인)
  Package Group:         테스트 패키지 그룹 선택
  Package:               Junior English Camp 3W
  Applicant Name:        Jung Test Family
  Applicant Email:       test@edubee.com
  Applicant Phone:       +82-10-1234-5678
  Applicant Nationality: Korean
  Adult Count:           2
  Student Count:         1
  Preferred Start Date:  2026-07-01
  Special Requirements:  Vegetarian meal required
  Source:                direct
  Status:                submitted
```

**저장 후 DB 확인:**

```sql
SELECT
  id,
  application_ref,
  applicant_name,
  adult_count,
  student_count,
  application_status,
  lead_id,
  contract_id
FROM camp_applications
WHERE applicant_email = 'test@edubee.com'
ORDER BY created_at DESC
LIMIT 1;
```

**체크 포인트:**
- `application_ref` 자동 생성 확인
- `application_status` = `'submitted'`
- `lead_id`, `contract_id` = NULL (아직 확정 전)


### 4-2. STEP 2 — Quote 생성 (Application 기반)

**경로:** CRM → Quotes → New Quote
또는 Application 상세에서 "Create Quote" 버튼

```
Quote 데이터:
  연결: Camp Application CAMP-TEST-001
  
  라인 1 (자동):
    Product:   "Junior English Camp 3W — Package A"
    Qty:       1
    Unit Price: 9,800 AUD
    
  라인 2 (직원 추가):
    Product:   "Extra Adult Participant"
    Qty:       1
    Unit Price: 500 AUD
    
  라인 3 (직원 추가):
    Product:   "Extra 3-Night Accommodation"
    Qty:       1
    Unit Price: 530 AUD
    
  Total:     10,830 AUD   ← 자동 계산 확인
```

**저장 후 DB 확인:**

```sql
SELECT
  q.id,
  q.quote_number,
  q.total_amount,
  COUNT(qp.id) AS line_items
FROM quotes q
LEFT JOIN quote_products qp ON qp.quote_id = q.id
WHERE q.total_amount = 10830
ORDER BY q.created_on DESC
LIMIT 1;
```

**체크 포인트:**
- `total_amount` = 10830
- `line_items` = 3


### 4-3. STEP 3 — Contract 생성 (Quote 기반)

**경로:** Quote 상세 → "Convert to Contract" 버튼
또는 CRM → Contracts → New Contract

```
Contract 데이터:
  기반 Quote:    위에서 생성한 Quote
  Student:       Jung Test Family (Account)
  Contract Date: 2026-04-01
  Status:        Active
```

**저장 후 DB 확인:**

```sql
SELECT
  c.id,
  c.contract_number,
  c.contract_status,
  COUNT(cp.id) AS products
FROM contracts c
LEFT JOIN contract_products cp ON cp.contract_id = c.id
WHERE c.id = (
  SELECT id FROM contracts ORDER BY created_on DESC LIMIT 1
)
GROUP BY c.id, c.contract_number, c.contract_status;
```

**camp_applications 연결 확인:**

```sql
-- application의 contract_id가 업데이트됐는지 확인
SELECT id, application_ref, application_status, contract_id
FROM camp_applications
WHERE applicant_email = 'test@edubee.com';
-- 기대: contract_id가 위 contract id로 업데이트됨
```


### 4-4. STEP 4 — Service Module 자동 생성 확인

Contract 생성 후 service_module_type 감지로 아래 모듈이 자동 생성됐는지 확인한다.

**Camp Institute 모듈 확인:**

```sql
SELECT
  id,
  contract_id,
  program_context,
  program_name,
  status
FROM study_abroad_mgt
WHERE program_context = 'camp'
ORDER BY created_at DESC
LIMIT 3;
-- 기대: program_context = 'camp' 레코드 생성됨
```

**Accommodation 모듈 확인:**

```sql
SELECT id, contract_id, accommodation_type, status
FROM accommodation_mgt
ORDER BY created_at DESC
LIMIT 3;
```

**Pickup 모듈 확인:**

```sql
SELECT id, contract_id, status
FROM pickup_mgt
ORDER BY created_at DESC
LIMIT 3;
```


### 4-5. STEP 5 — Camp Institute 모듈 상세 입력

**경로:** Camp → Institute → 목록에서 해당 레코드 클릭

```
입력 데이터:
  Institute Account:         테스트 학교 선택
  Program Name:              Junior English Intensive
  Program Type:              english
  Program Start Date:        2026-07-01
  Program End Date:          2026-07-21
  Weekly Hours:              20
  Class Size Max:            15
  Age Group:                 junior
  Level Assessment Required: true
  Level Assessment Date:     2026-06-28
  Assigned Class:            J-Intermediate-A
  Partner Cost:              6000
  Status:                    confirmed
```

**저장 후 DB 확인:**

```sql
SELECT
  id,
  program_context,
  program_name,
  program_type,
  age_group,
  weekly_hours,
  level_assessment_required,
  assigned_class,
  partner_cost,
  status
FROM study_abroad_mgt
WHERE program_context = 'camp'
ORDER BY updated_at DESC
LIMIT 1;
```

**체크 포인트:**
- `program_context` = `'camp'` ← 핵심
- `age_group` = `'junior'`
- `level_assessment_required` = `true`
- `partner_cost` = `6000`


### 4-6. STEP 6 — Camp Tour 등록

**경로:** Camp → Tour → New Tour

```
입력 데이터:
  Contract:              위에서 생성한 Contract
  Tour Provider:         테스트 투어사 선택
  Tour Name:             Gold Coast Day Tour
  Tour Type:             day_tour
  Tour Date:             2026-07-10
  Tour Duration Hours:   8
  Pickup Location:       School Front Gate
  Max Participants:      30
  Booking Reference:     GC-TOUR-2026-001
  Partner Cost:          80
  Retail Price:          150
  Status:                booked
```

**저장 후 DB 확인:**

```sql
SELECT
  id,
  contract_id,
  tour_name,
  tour_type,
  tour_date,
  partner_cost,
  retail_price,
  status
FROM camp_tour_mgt
ORDER BY created_at DESC
LIMIT 1;
```

---

## BLOCK 5 — 전체 파이프라인 테스트 (일반 유학)

### 5-1. Study Abroad 신규 생성 — programContext 격리 확인

**경로:** Services → Study Abroad → New

```
입력 데이터:
  Contract:           기존 일반 유학 Contract 선택
  Application Stage:  counseling
  Status:             pending
```

**저장 후 DB 확인:**

```sql
SELECT id, contract_id, program_context, application_stage, status
FROM study_abroad_mgt
ORDER BY created_at DESC
LIMIT 1;
-- 기대: program_context = 'study_abroad'  ← 자동 설정 확인
```

### 5-2. Study Abroad 목록에서 camp 레코드 미노출 확인

**경로:** Services → Study Abroad 목록

- 목록에 `programContext = 'camp'` 인 "Junior English Intensive" 가 보이지 않아야 함
- 일반 유학 레코드만 표시돼야 함

---

## BLOCK 6 — 프론트엔드 메뉴 구조 확인

### 6-1. 사이드바 메뉴 항목 체크리스트

```
□ Camp 섹션 확인
  □ Package Groups 메뉴 없음  (Products로 이동됨)
  □ Packages 메뉴 없음        (Products로 이동됨)
  □ Camp Application 있음     → /admin/camp-applications
  □ Camp Contract 있음        → /admin/camp-contracts
  □ Institute 있음            → /admin/camp-services/institutes  (수정됨)
  □ Enrollment Spots 있음     → /admin/enrollment-spots
  □ Interviews 있음           → /admin/services/interviews
  □ Hotel 있음                → /admin/services/hotel
  □ Pickup / Transfer 있음    → /admin/services/pickup
  □ Tour 있음                 → /admin/camp-services/tours        (신규)

□ Products 섹션 확인
  □ Products Group 있음
  □ Products Type 있음
  □ Products 있음
  □ Promotion 있음
  □ Commission 있음
  □ Package Groups 있음  ← Camp에서 이동됨
  □ Packages 있음        ← Camp에서 이동됨

□ Services 섹션 확인
  □ Study Abroad 있음         → /admin/services/study-abroad
  □ Pickup / Transfer 있음    → /admin/services/pickup
  □ Accommodation 있음        → /admin/services/accommodation
  □ Internship 있음
  □ Guardian 있음
  □ Settlement 있음
  □ Other Services 있음
```

### 6-2. 라우트 직접 접근 테스트

```
□ /admin/camp-services/institutes    → CampInstitutes 목록 렌더링
□ /admin/camp-services/tours         → CampTours 목록 렌더링
□ /admin/camp-services/institutes/new → CampInstituteDetail (신규 폼)
□ /admin/camp-services/tours/new     → CampTourDetail (신규 폼)
□ /admin/package-groups              → PackageGroups 페이지 (Camp 메뉴에서도 접근 가능)
□ /admin/packages                    → Packages 페이지
□ /admin/services/study-abroad       → Study Abroad 목록 (camp 레코드 미노출)
```

### 6-3. 신규 목록 페이지 UI 확인

**Camp Institute 목록 (`/admin/camp-services/institutes`):**
```
□ 페이지 타이틀: "Camp Institute"
□ New Institute 버튼 존재
□ 검색 input 동작
□ Status 필터 드롭다운 동작
□ 테이블 컬럼: Student/Contract, Program, Period, Age Group, Hours/wk, Status
□ 빈 상태 메시지 표시 (데이터 없을 때)
□ 행 클릭 시 상세 페이지 이동
```

**Camp Tours 목록 (`/admin/camp-services/tours`):**
```
□ 페이지 타이틀: "Camp Tours"
□ New Tour 버튼 존재
□ 검색 input 동작
□ Tour Type 필터 드롭다운 동작 (Day Tour, Overnight 등)
□ Status 필터 드롭다운 동작
□ 테이블 컬럼: Student/Contract, Tour, Date, Duration, Retail Price, Status
□ 행 클릭 시 상세 페이지 이동
```

---

## BLOCK 7 — 최종 데이터 무결성 확인

```sql
-- 7-1. program_context 분포 최종 확인
SELECT program_context, COUNT(*) as cnt
FROM study_abroad_mgt
GROUP BY program_context
ORDER BY cnt DESC;

-- 7-2. camp 레코드의 필수 필드 누락 확인
SELECT id, contract_id, program_name, age_group, status
FROM study_abroad_mgt
WHERE program_context = 'camp'
  AND program_name IS NULL;
-- 기대: 입력 완료된 레코드는 0개

-- 7-3. products context 분포 확인
SELECT product_context, COUNT(*) as cnt
FROM products
GROUP BY product_context;

-- 7-4. camp_packages ↔ products 연결 현황
SELECT
  COUNT(*) AS total_packages,
  COUNT(product_id) AS linked_packages,
  COUNT(*) - COUNT(product_id) AS unlinked_packages
FROM camp_packages;

-- 7-5. 전체 파이프라인 연결 확인
SELECT
  ca.application_ref,
  ca.application_status,
  ca.contract_id,
  c.contract_number,
  c.contract_status,
  COUNT(cp.id) AS contract_products
FROM camp_applications ca
LEFT JOIN contracts c ON c.id = ca.contract_id
LEFT JOIN contract_products cp ON cp.contract_id = c.id
WHERE ca.applicant_email = 'test@edubee.com'
GROUP BY ca.application_ref, ca.application_status,
         ca.contract_id, c.contract_number, c.contract_status;
```

---

## 테스트 결과 체크리스트 요약

```
BLOCK 1 — DB 스키마
  □ study_abroad_mgt 컬럼 13개 확인
  □ camp_packages.product_id 확인
  □ products.product_context / camp_package_id 확인
  □ 기존 데이터 오염 없음
  □ camp_institute_mgt 테이블 삭제됨

BLOCK 2 — Products 등록
  □ camp_package 타입 상품 등록
  □ camp_addon 타입 상품 등록
  □ Package-Product 연결

BLOCK 3 — API
  □ Study Abroad 목록 camp 제외
  □ Camp Institute 목록 API
  □ Camp Tour 목록 API
  □ productContext 필터 동작
  □ 신규 Lookup 2개 동작

BLOCK 4 — 캠프 파이프라인
  □ Application 생성
  □ Quote 생성 (Package + Addon 합산 10,830)
  □ Contract 생성
  □ Service Module 자동 생성
  □ Institute 모듈 입력 (program_context = 'camp')
  □ Tour 등록

BLOCK 5 — 일반 유학 격리
  □ Study Abroad 신규 → program_context = 'study_abroad'
  □ 목록에 camp 레코드 미노출

BLOCK 6 — 프론트엔드
  □ 사이드바 메뉴 구조 정확
  □ 라우트 6개 접근 가능
  □ Institute 목록 페이지 UI
  □ Tour 목록 페이지 UI

BLOCK 7 — 데이터 무결성
  □ context 분포 정상
  □ 파이프라인 연결 완전
```

---

*테스트 완료 후 실패 항목이 있으면 해당 BLOCK 번호와 실패 내용을 보고한다.*
