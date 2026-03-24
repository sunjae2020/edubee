# 작업 요청 004: Account Detail / Edit — Account Type별 조건부 필드 노출

---

## 배경

**완료된 선행 작업:**
- Migration 001: `accounts.primary_contact_id` 컬럼 추가, Account Type 값 확장
- Prompt 002: Contract Detail STUDENT 카드 연결
- Prompt 003: Account Detail Contracts·Leads 탭 연결

**현재 문제:**

Account Detail 화면의 QUICK INFO 카드가 모든 Account Type에 관계없이
동일한 필드만 표시한다 (`Type: Company` 등 최소 정보만 노출).

Account Type은 비즈니스적으로 완전히 다른 엔티티이므로
타입별로 표시 필드와 편집 폼이 달라야 한다.

---

## Account Type별 필드 정의

### Student (학생)

```
QUICK INFO 카드:
  Type          Student  (뱃지)
  Nationality   [contacts.nationality via primary_contact_id]
  Date of Birth [contacts.date_of_birth]
  Email         [contacts.email_address]
  Phone         [contacts.mobile_number]
  SNS           [contacts.sns_type] [contacts.sns_id]
  Owner (EC)    [users.name]

전용 탭 (기존 탭 외 추가):
  Overview | Contacts | Leads | Contracts
  (Student는 Contacts 탭 필수 — primary_contact 표시)
```

### School (학교)

```
QUICK INFO 카드:
  Type          School  (뱃지)
  Country       [accounts.country]
  Website       [accounts.website]  (클릭 가능 링크)
  ABN           [accounts.abn]
  Phone         [accounts.phone_number]
  Email         [accounts.email]
  Owner         [users.name]

전용 탭:
  Overview | Contacts | Leads | Contracts | Products
  (School은 Products 탭 추가 — 이 학교가 공급하는 Product 목록)
```

### Sub_Agency / Super_Agency (에이전트)

```
QUICK INFO 카드:
  Type          Sub Agency / Super Agency  (뱃지)
  Country       [accounts.country]
  Website       [accounts.website]
  ABN           [accounts.abn]
  Phone         [accounts.phone_number]
  Email         [accounts.email]
  Parent Account [parent_account_id → accounts.name]  (Super Agency만)
  Owner         [users.name]

전용 탭:
  Overview | Contacts | Leads | Contracts | Commission
  (Commission 탭: 이 에이전트에게 지급된/예정인 커미션 목록)
```

### Supplier (공급업체 — 숙소/픽업/보험 등)

```
QUICK INFO 카드:
  Type          Supplier  (뱃지)
  Category      [accounts.account_category]  (Homestay | Pickup | Insurance 등)
  Country       [accounts.country]
  ABN           [accounts.abn]
  Phone         [accounts.phone_number]
  Email         [accounts.email]
  Website       [accounts.website]
  Owner         [users.name]

전용 탭:
  Overview | Contacts | Products
```

### Staff (내부 직원)

```
QUICK INFO 카드:
  Type          Staff  (뱃지)
  Email         [accounts.email]
  Phone         [accounts.phone_number]
  Owner         [users.name]

전용 탭:
  Overview | Contacts | Leads | Contracts
  (Staff KPI는 별도 KPI 페이지에서 관리 — 이 탭에는 포함하지 않음)
```

### Branch (지사)

```
QUICK INFO 카드:
  Type          Branch  (뱃지)
  Parent Account [parent_account_id → accounts.name]  (본사 Account 링크)
  Country       [accounts.country]
  Address       [accounts.address]
  Phone         [accounts.phone_number]
  Owner         [users.name]

전용 탭:
  Overview | Contacts | Leads | Contracts
```

### Organisation / Agent / Provider / Partner (기타/레거시)

```
QUICK INFO 카드:
  Type          [account_type]  (뱃지)
  Country       [accounts.country]
  Phone         [accounts.phone_number]
  Email         [accounts.email]
  Owner         [users.name]

전용 탭:
  Overview | Contacts | Leads | Contracts
```

---

## 요청 작업

### ① QUICK INFO 카드 조건부 렌더링

`account_type` 값에 따라 QUICK INFO 카드의 표시 필드를 다르게 렌더링한다.

```typescript
// 렌더링 로직 구조 (예시)
function renderQuickInfo(account: AccountDetail) {
  switch (account.accountType) {
    case 'Student':    return <StudentQuickInfo account={account} />;
    case 'School':     return <SchoolQuickInfo account={account} />;
    case 'Sub_Agency':
    case 'Super_Agency': return <AgencyQuickInfo account={account} />;
    case 'Supplier':   return <SupplierQuickInfo account={account} />;
    case 'Staff':      return <StaffQuickInfo account={account} />;
    case 'Branch':     return <BranchQuickInfo account={account} />;
    default:           return <DefaultQuickInfo account={account} />;
  }
}
```

각 QuickInfo 서브컴포넌트는 동일한 행 레이아웃을 사용한다:
```
label (좌, 14px/400/#57534E) + value (우, 14px/500/#1C1917)
빈 값: "—"  (color #A8A29E)
```

### ② Account Type 뱃지 색상

```
Student:      bg #FEF0E3, text #F5821F   (orange — 핵심 고객)
School:       bg #DCFCE7, text #16A34A   (green — 파트너)
Sub_Agency:   bg #EDE9FE, text #7C3AED   (purple — 에이전트)
Super_Agency: bg #EDE9FE, text #7C3AED
Supplier:     bg #F0F9FF, text #0369A1   (blue — 공급사)
Staff:        bg #F4F3F1, text #57534E   (gray — 내부)
Branch:       bg #FEF9C3, text #CA8A04   (yellow — 지사)
Organisation: bg #F4F3F1, text #57534E
Agent/Provider/Partner: bg #F4F3F1, text #57534E  (레거시)
```

### ③ Account Edit 폼 — Type별 조건부 필드

Account 수정 모달/페이지에서 `account_type` 선택 시
해당 타입에 맞는 입력 필드만 노출한다.

```
공통 필드 (모든 타입):
  - Account Type (드롭다운, 필수)
  - Name
  - Phone / Email
  - Country
  - Owner
  - Status
  - Description

Student 추가 필드:
  - Primary Contact (검색 🔍 — contacts 테이블, account_type=Student 필터)
  - Secondary Contact (검색 🔍)

School 추가 필드:
  - Website
  - ABN
  - Total Capacity
  - Found Year
  - Logo (파일 업로드)
  - Agreement (파일 업로드)

Agency (Sub/Super) 추가 필드:
  - Website
  - ABN
  - Parent Account (Super Agency만 — 검색 🔍)

Supplier 추가 필드:
  - Account Category (Homestay | Pickup | Insurance | Other)
  - Website
  - ABN

Branch 추가 필드:
  - Parent Account (검색 🔍 — 본사 Account)
  - Address
```

### ④ API 수정

`GET /api/accounts/:id` 응답에 조건부 필드 데이터 추가:

```
Student: primary_contact 정보 포함 (nationality, dob, email, phone, sns)
School/Agency/Supplier: 기존 account 필드 그대로
공통: parent_account.name (parent_account_id가 있는 경우)
```

---

## 작업 전 필수 분석 단계

1. 아래 파일을 전부 읽는다:
   - `client/src/pages/AccountDetail.tsx`
   - `client/src/components/` 내 Account 관련 컴포넌트
   - `server/src/routes/accounts.ts` 의 GET /:id 응답 구조

2. 현재 QUICK INFO 카드가 어떤 컴포넌트에서 렌더링되는지 파악

3. 현재 Account Edit 폼이 어떤 컴포넌트/모달인지 파악

4. 수정할 파일 목록과 변경 내용을 나에게 먼저 보고

5. **"진행해"** 확인 후 작업 시작

---

## 수정 시 안전 규칙

- 기존 Overview, Contacts 탭 로직 변경 없음
- DB 컬럼 변경 없음 (이미 Migration 001에서 완료)
- 타입별 컴포넌트를 분리 작성해 기존 코드 최소 영향
- 레거시 타입(Agent, Provider, Partner) 데이터가 있으므로
  default 분기에서 처리하여 기존 데이터 표시 깨지지 않도록

---

## 수정 후 필수 검증

1. `npx tsc --noEmit` → 오류 0개

2. DB 확인 — 각 타입별 샘플 Account 1건씩 조회:
```sql
SELECT id, name, account_type, account_category,
       primary_contact_id, country, email, phone_number
FROM accounts
WHERE status = 'Active'
  AND account_type IN ('Student','School','Sub_Agency','Supplier','Staff','Agent')
LIMIT 10;
```

3. API 응답 확인:
```
GET /api/accounts/:studentId
→ primary_contact.nationality 포함 여부

GET /api/accounts/:schoolId
→ country, website, abn 포함 여부
```

4. 브라우저 확인:
   - Student Account: QUICK INFO에 Nationality, DOB, Email, Phone 표시
   - School Account: QUICK INFO에 Country, Website, ABN 표시
   - 뱃지 색상이 타입별로 다르게 표시

---

## 완료 보고 형식

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과: [tsc / 서버 / DB / API 각각 결과]
⚠️  다음에 할 작업: [있는 경우]
```
