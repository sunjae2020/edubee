# Edubee CRM — Application Form Management Page
## Replit 개발 프롬프트

> **버전:** 2026-04-01  
> **스택:** React + TypeScript + Vite / Node.js + Express + Drizzle ORM + PostgreSQL  
> **플랫폼:** Replit (Beta/MVP)  
> **원칙:** 기존 작동 코드를 절대 깨지 않는다

---

## 작업 개요

Edubee CRM에 **Application Form Management** 페이지를 신규 개발한다.  
이 페이지는 유학원이 외부 파트너(Agent / Provider / Organisation)에게  
맞춤형 신청서 링크를 제공하고 관리하는 기능이다.

---

## ⚠️ 필수 사전 작업 (코드 작성 전 반드시 수행)

1. `/db/schema.ts` 전체를 읽는다
2. `/server/src/routes/` 디렉토리 구조를 확인한다
3. `/client/src/pages/` 및 `/client/src/components/` 구조를 확인한다
4. 기존 `accounts` 테이블, `contacts` 테이블 스키마를 정확히 파악한다
5. 기존 라우팅 패턴(React Router) 확인 후 동일한 방식으로 구현한다
6. 분석 결과를 먼저 보고하고, **"진행해"** 확인 후 개발 시작한다

---

## STEP 1 — DB 스키마 추가 (`/db/schema.ts`)

기존 테이블을 수정하지 않고, 아래 2개 테이블을 추가한다.

### 테이블 1: `application_forms` (신청서 마스터)

```typescript
export const applicationForms = pgTable("application_forms", {
  id:             uuid("id").defaultRandom().primaryKey(),
  name:           varchar("name", { length: 255 }).notNull(),
  // URL slug: 영문 소문자, 하이픈만 허용 (예: "study-abroad-application")
  slug:           varchar("slug", { length: 100 }).notNull().unique(),
  description:    text("description"),
  // 공개 여부: public = 누구나 접근 / private = 파라미터 있는 링크만 접근
  visibility:     varchar("visibility", { length: 20 }).notNull().default("private"),
  // 신청 완료 후 리다이렉트 URL (선택)
  redirect_url:   varchar("redirect_url", { length: 500 }),
  // 이 폼이 복사된 원본 폼 ID (null이면 원본)
  source_form_id: uuid("source_form_id").references(() => applicationForms.id),
  organisation_id: uuid("organisation_id").references(() => organisations.id),
  created_by:     uuid("created_by").references(() => users.id),
  status:         varchar("status", { length: 20 }).notNull().default("active"),
  created_on:     timestamp("created_on").defaultNow().notNull(),
  modified_on:    timestamp("modified_on").defaultNow().notNull(),
});
```

### 테이블 2: `application_form_partners` (파트너별 폼 설정)

```typescript
export const applicationFormPartners = pgTable("application_form_partners", {
  id:          uuid("id").defaultRandom().primaryKey(),
  form_id:     uuid("form_id").notNull().references(() => applicationForms.id),
  // accounts 테이블의 account_type = Agent / Provider / Organisation
  partner_account_id: uuid("partner_account_id").notNull().references(() => accounts.id),
  // 파트너 고유 파라미터 (URL에 사용): 영문+숫자+하이픈, 예: "TST001", "abc-edu"
  partner_parameter:  varchar("partner_parameter", { length: 50 }).notNull(),
  // 화면 표시용 폼 이름: "{SiteName}/{FormName}-{PartnerName}({parameter})" 자동 생성, 수동 편집 가능
  display_name:  varchar("display_name", { length: 300 }),
  // 이메일 수신 설정
  // "applicant" = 신청자에게만 / "partner" = 파트너에게만 / "both" = 둘 다
  email_notification:     varchar("email_notification", { length: 20 }).notNull().default("both"),
  // 파트너 담당자 이메일 (파트너 Account의 account_email 기본값, 수동 오버라이드 가능)
  partner_email_override: varchar("partner_email_override", { length: 255 }),
  is_active:   boolean("is_active").notNull().default(true),
  created_on:  timestamp("created_on").defaultNow().notNull(),
  modified_on: timestamp("modified_on").defaultNow().notNull(),
});
```

**마이그레이션 후 반드시 확인:**
- `npx drizzle-kit push` 실행
- 두 테이블이 DB에 생성됐는지 `SELECT 1` 쿼리로 확인

---

## STEP 2 — 백엔드 API (`/server/src/routes/applicationForms.ts` 신규 생성)

### 필요한 API 엔드포인트

```
GET    /api/application-forms                            폼 목록 (검색·필터 포함)
POST   /api/application-forms                            신규 폼 생성
GET    /api/application-forms/:id                        폼 단건 상세
PUT    /api/application-forms/:id                        폼 수정
DELETE /api/application-forms/:id                        폼 삭제 (soft delete: status = 'inactive')
POST   /api/application-forms/:id/clone                  폼 복사 (source_form_id 연결)

GET    /api/application-forms/:formId/partners           파트너 링크 목록
POST   /api/application-forms/:formId/partners           파트너 링크 추가
PUT    /api/application-forms/:formId/partners/:id       파트너 링크 수정
DELETE /api/application-forms/:formId/partners/:id       파트너 링크 삭제

GET    /api/accounts?accountType=Agent,Provider,Organisation   파트너 선택용 계정 목록
```

### 파트너 목록 쿼리 시 JOIN 규칙

`application_form_partners` 조회 시 아래 필드를 JOIN하여 반환한다:
- `accounts.name`
- `accounts.account_type`
- `accounts.account_email`

### 자동 display_name 생성 규칙 (서버 사이드)

```
{organisation.name}/{form.name}-{account.name}({partner_parameter})

예: TimeStudy/Study Abroad Application-ABC Education(ABC001)
```

파트너 추가 시 자동 생성하되, 사용자가 수동 편집한 경우 덮어쓰지 않는다.

---

## STEP 3 — 프론트엔드 페이지

### 3-1. 라우팅 등록

기존 React Router 설정 파일에 아래 경로를 추가한다:

```
/admin/application-forms               →  ApplicationFormList   페이지
/admin/application-forms/new           →  ApplicationFormEdit   페이지 (신규)
/admin/application-forms/:id/edit      →  ApplicationFormEdit   페이지 (수정)
/admin/application-forms/:id/partners  →  ApplicationFormPartners 페이지
```

---

### 3-2. 페이지 구성

#### 📄 페이지 A: Application Form List (`ApplicationFormList.tsx`)

**레이아웃:**
- 상단 헤더: "Application Forms" 타이틀 + `[+ New Form]` 버튼 (Primary 버튼, Orange `#F5821F`)
- 검색 인풋 (이름 검색)
- Visibility 필터 드롭다운: All / Public / Private
- Status 필터 드롭다운: All / Active / Inactive

**테이블 컬럼:**

| 컬럼 | 설명 |
|------|------|
| Form Name | 클릭 시 Partners 페이지로 이동 |
| Visibility | Public = 초록 뱃지 / Private = 회색 뱃지 |
| Partners | 연결된 파트너 수 (숫자 뱃지) |
| Source | 복사본이면 원본 폼 이름 표시, 원본이면 "—" |
| Status | Active / Inactive |
| Actions | [Edit] [Partners] [Clone] [Delete] 아이콘 버튼 |

---

#### 📄 페이지 B: Application Form Edit (`ApplicationFormEdit.tsx`)

**폼 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| Form Name * | 텍스트 인풋 | 필수 |
| Slug * | 텍스트 인풋 | 소문자·하이픈만 허용, Form Name 입력 시 자동 생성. 수동 편집 가능. 아래에 URL 프리뷰 표시: `https://edubee.co/apply/[slug]` |
| Visibility * | 라디오 버튼 | Public: "누구나 URL로 접근 가능" / Private: "파트너 파라미터가 있는 링크만 접근 가능" |
| Description | Textarea | 선택 |
| Redirect URL (After Submit) | 텍스트 인풋 | 선택 |
| Status * | 토글 스위치 | Active / Inactive |

**하단 버튼:** `[Cancel]` `[Save Form]`

---

#### 📄 페이지 C: Application Form Partners (`ApplicationFormPartners.tsx`)

**레이아웃:**
- 상단 브레드크럼: `Application Forms > {FormName} > Partner Links`
- 폼 요약 카드 (Form Name / Visibility / Slug / 전체 링크 복사 버튼)
- `[+ Add Partner Link]` 버튼 (Primary Orange)

**파트너 링크 테이블 컬럼:**

| 컬럼 | 설명 |
|------|------|
| Display Name | `SiteName/FormName-PartnerName(parameter)` 형태 |
| Partner | Account 이름 |
| Type | Account Type 뱃지 (Agent / Provider / Organisation) |
| Parameter | `TST001` 스타일 코드 |
| Email Notification | Applicant Only / Partner Only / Both |
| Full URL | `https://edubee.co/apply/{slug}?partner={parameter}` — 복사 버튼 포함 |
| Active | 토글 스위치 |
| Actions | [Edit] [Delete] 아이콘 버튼 |

---

#### 🗂️ 모달: Add / Edit Partner Link

```
Partner (Account) *
  - 검색 드롭다운
  - account_type IN (Agent, Provider, Organisation) 만 표시
  - Student, School 제외
  - 선택 시 account_email 자동으로 Partner Email 필드에 채움

Partner Parameter *
  - 텍스트 인풋 (영문+숫자+하이픈만 허용)
  - 예시 힌트: "TST001" or "abc-education"
  - 폼 내 유일성 실시간 검증 (중복 시 에러 표시)

Display Name
  - 텍스트 인풋 (자동 생성됨, 수동 편집 가능)
  - [Auto Generate] 버튼 → 서버 규칙대로 재생성

Email Notification *
  - 라디오 버튼 3개 (기본값: Both)
    ○ Applicant Only  (신청자에게만 확인 메일 발송)
    ○ Partner Only    (파트너에게만 발송)
    ● Both            (신청자 + 파트너 모두)

Partner Email
  - 텍스트 인풋
  - Partner 선택 시 account_email 자동 채워짐, 수동 편집 가능
  - "Applicant Only" 선택 시: disabled + 회색 처리
  - "Partner Only" / "Both" 선택 시: 필수 입력 검증 활성화

Active
  - 토글 스위치 (기본: ON)
```

**하단 버튼:** `[Cancel]` `[Save]`

---

#### 🗂️ 모달: Clone Form

```
Source Form:       {현재 폼 이름} (읽기 전용)
New Form Name *:   텍스트 인풋 (기본값: "{원본이름} - Copy")
New Slug *:        텍스트 인풋 (자동 생성)
Include Partners:  체크박스 — 파트너 링크도 함께 복사할지 여부
```

**하단 버튼:** `[Cancel]` `[Clone Form]`

---

## STEP 4 — 사이드바 메뉴 등록

기존 사이드바 네비게이션 컴포넌트를 찾아서 아래 항목을 추가한다.  
(기존 메뉴 구조를 변경하지 않고, 적절한 섹션 안에 삽입)

```
📋 Application Forms    →  /admin/application-forms
```

---

## STEP 5 — 디자인 시스템 준수 (엄격 적용)

아래 규칙을 100% 준수한다. 이 외의 색상·스타일은 절대 사용하지 않는다.

### Color Palette

| 용도 | 색상 코드 |
|------|-----------|
| Primary Accent (버튼, 링크, 활성) | `#F5821F` |
| Hover / Active | `#D96A0A` |
| Accent Light (뱃지 배경, 선택 상태) | `#FEF0E3` |
| Page Background | `#FAFAF9` |
| Card Background | `#F4F3F1` |
| Border / Divider | `#E8E6E2` |
| Placeholder | `#A8A29E` |
| Secondary Text | `#57534E` |
| Primary Text | `#1C1917` |
| Success (Active, Public) | `#16A34A` |
| Warning (Pending) | `#CA8A04` |
| Danger (Delete, Error) | `#DC2626` |

### Typography
- Font: **Inter** (Google Fonts import — weights 400, 500, 600, 700)

### Border Radius
- Buttons: `8px` / Cards: `12px` / Modals: `16px` / Inputs: `8px` / Chips: `999px`

> ❌ NO gradients  ❌ NO blue/purple/green accent  ✅ Orange only

---

## STEP 6 — 구현 시 주의사항

### 1. Slug 자동 생성
Form Name 입력 시 실시간으로 slug 생성:
- 소문자 변환, 공백→하이픈, 특수문자 제거
- 예: `"Study Abroad Application 2026"` → `"study-abroad-application-2026"`

### 2. URL 복사 버튼
- `navigator.clipboard.writeText()` 사용
- 복사 완료 시 버튼 텍스트가 **"Copied! ✓"** 로 1.5초간 변경

### 3. Partner Parameter 중복 검증
- 같은 폼 안에서 동일한 parameter 값 불가
- 저장 시 서버에서 검증 + 프론트에서 실시간 중복 체크

### 4. Clone 기능
- `source_form_id` 연결 유지
- 복사본은 테이블 "Source" 컬럼에 원본 폼 이름 표시

### 5. Account Type 필터
파트너 선택 드롭다운은 아래만 표시:
```
account_type IN ('Agent', 'Provider', 'Organisation')
```
Student, School 제외

### 6. Email Notification 연동 로직

| 선택값 | Partner Email 필드 동작 |
|--------|------------------------|
| Applicant Only | disabled + 회색 처리 |
| Partner Only | 필수 입력 검증 활성화 |
| Both | 필수 입력 검증 활성화 |

### 7. Soft Delete
- 폼 삭제 시 실제 DB 삭제가 아닌 `status = 'inactive'` 처리
- 삭제 전 확인 다이얼로그 표시:
  > "이 폼과 연결된 {N}개의 파트너 링크도 비활성화됩니다."

---

## STEP 7 — 검증 체크리스트

모든 개발 완료 후 순서대로 확인:

### 1. TypeScript 검증
```bash
npx tsc --noEmit
```
→ 오류 0개 확인

### 2. 서버 기동 확인
서버 재시작 후 import 오류, 런타임 오류 없음 확인

### 3. DB 확인
```sql
SELECT * FROM application_forms LIMIT 3;
SELECT * FROM application_form_partners LIMIT 3;
```

### 4. API 테스트
```
GET  /api/application-forms
     → 빈 배열 [] 반환 (정상)

POST /api/application-forms
     → 신규 폼 생성 후 id 반환

GET  /api/accounts?accountType=Agent,Provider,Organisation
     → 계정 목록 반환
```

### 5. 프론트엔드 라우팅
`/admin/application-forms` 페이지 정상 로딩 확인

---

## 완료 보고 형식

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과:
   - tsc: 오류 0개
   - 서버: 정상 기동
   - DB: application_forms, application_form_partners 테이블 생성 확인
   - API: 주요 엔드포인트 응답 확인
⚠️  다음에 할 작업: [있는 경우]
```

---

## 데이터 흐름 요약

```
application_forms (신청서 마스터)
  └── application_form_partners (파트너별 링크 설정)
        └── accounts (파트너 계정, account_type: Agent / Provider / Organisation)

URL 생성 규칙:
  https://edubee.co/apply/{slug}?partner={parameter}
  예: https://edubee.co/apply/study-abroad-2026?partner=TST001

Display Name 자동 생성 규칙:
  {OrganisationName}/{FormName}-{PartnerName}({parameter})
  예: TimeStudy/Study Abroad Application-ABC Education(ABC001)
```

---

*Edubee CRM — Application Form Management Replit Prompt v1.0*  
*Generated: 2026-04-01*
