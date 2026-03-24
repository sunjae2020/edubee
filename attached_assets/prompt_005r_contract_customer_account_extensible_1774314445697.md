# 작업 요청 005 (revised): Contract — Customer Account 연결 구조 확장

---

## 설계 원칙 (이 작업의 핵심)

> **`contracts.account_id`는 어떤 Account Type과도 연결될 수 있다.**
> 현재 MVP에서는 대부분 Student이지만,
> 캠프 가족 신청(Organisation), 법인 고객(Company), 에이전트 직계약(Agent) 등
> 다양한 타입이 Contract의 주체가 될 수 있다.
>
> 따라서 Contract Detail의 카드는:
> - 고정된 "STUDENT 카드"가 아니라
> - 연결된 Account의 Type을 읽어 **동적으로 렌더링되는 "CUSTOMER 카드"** 여야 한다.

---

## 배경 및 선행 작업

**완료된 선행 작업:**
- Migration 001: `accounts.primary_contact_id`, `secondary_contact_id` 추가
- Prompt 002: Contract Detail STUDENT 카드 → Account 조인 연결
- Prompt 003: Account Detail Contracts·Leads 탭 연결
- Prompt 004: Account Type별 조건부 필드 노출

**현재 문제:**
- Contract Detail 카드가 "STUDENT"라고 하드코딩되어 있고
  `account_type = 'Student'`인 경우만 정상 동작
- Account 검색 모달이 Student 타입만 필터링
- Contract name 자동 생성 패턴이 Student 전제로 작동

---

## ① Contract Detail — CUSTOMER 카드 재설계

### 카드 헤더 변경

```
기존: STUDENT (하드코딩)
변경: [accountType 뱃지]  ← 연결된 Account.account_type 값으로 동적 표시
     예: STUDENT / ORGANISATION / AGENT / SCHOOL 등
```

### 카드 표시 필드 — Account Type별 분기 렌더링

```typescript
// 공통 필드 (모든 타입)
const commonFields = {
  name:    account.name,          // Account Name (항상 표시)
  owner:   account.owner.name,    // Owner (EC) (항상 표시)
};

// 타입별 추가 필드
switch (account.accountType) {

  case 'Student':
    return {
      ...commonFields,
      nationality: primaryContact?.nationality,
      email:       primaryContact?.emailAddress ?? account.email,
      phone:       primaryContact?.mobileNumber ?? account.phoneNumber,
    };

  case 'Organisation':
  case 'Branch':
    return {
      ...commonFields,
      country:     account.country,
      email:       account.email,
      phone:       account.phoneNumber,
    };

  case 'Sub_Agency':
  case 'Super_Agency':
  case 'Agent':          // 레거시 호환
    return {
      ...commonFields,
      country:     account.country,
      email:       account.email,
      phone:       account.phoneNumber,
    };

  default:               // School, Supplier, Staff, Provider, Partner 등
    return {
      ...commonFields,
      email:       account.email,
      phone:       account.phoneNumber,
    };
}
```

### 카드 UI 렌더링 규칙

```
┌────────────────────────────────────────────┐
│  [account_type 뱃지]               ✏️ Edit  │   ← 헤더
│────────────────────────────────────────────│
│  Name        Kim Min-jun (Account)  ↗      │   ← 항상 표시, 링크 아이콘
│  [타입별 필드들]                            │   ← 동적 렌더링
│  Owner (EC)  Ellaine VITAL                 │   ← 항상 표시
└────────────────────────────────────────────┘

뱃지 색상 (Prompt 004와 동일하게 통일):
  Student:      bg #FEF0E3, text #F5821F
  Organisation: bg #F4F3F1, text #57534E
  Sub_Agency /
  Super_Agency: bg #EDE9FE, text #7C3AED
  School:       bg #DCFCE7, text #16A34A
  Supplier:     bg #F0F9FF, text #0369A1
  Staff:        bg #F4F3F1, text #57534E
  Branch:       bg #FEF9C3, text #CA8A04
  기타/레거시:  bg #F4F3F1, text #57534E
```

---

## ② Contract Detail — Account 연결 Edit 모달 재설계

### 검색 범위: 전체 Account (타입 제한 없음)

```
┌─────────────────────────────────────────────────────────────┐
│  LINK ACCOUNT                                         ✕     │
│─────────────────────────────────────────────────────────────│
│  🔍  Search accounts...                                     │
│                                                             │
│  Filter by type:                                            │
│  [All ✓] [Student] [Organisation] [Agent] [School] [Other]  │
│  ← 기본값: All (타입 제한 없음)                              │
│─────────────────────────────────────────────────────────────│
│  검색 결과                                                   │
│                                                             │
│  Student_Kim Min-jun    [Student]  Korean     Select        │
│  ABC Travel Group       [Org]      Australia  Select        │
│  Best Education Agency  [Agent]    Korea      Select        │
│─────────────────────────────────────────────────────────────│
│  찾는 계정이 없나요?                                         │
│  + Create New Account                                       │
└─────────────────────────────────────────────────────────────┘
```

**검색 API:**
```
GET /api/accounts/search?q=:keyword&type=:accountType&status=Active
  - type 파라미터 생략 시 → 전체 타입 검색
  - type=Student → Student만 필터
  - type=Organisation,Agent → 복수 타입 필터 (콤마 구분)

응답 필드:
  id, name, accountType, country,
  primaryContact.nationality (Student인 경우만),
  email, phoneNumber
```

---

## ③ Contract Name 자동 생성 — 타입 무관 통일 규칙

```typescript
// Account Type에 상관없이 동일한 패턴 적용
function generateContractName(accountName: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `CT-${accountName}-${dateStr}`;
  // 예: CT-Student_Kim Min-jun-2026-01-15
  // 예: CT-ABC Travel Group-2026-01-15
  // 예: CT-Best Education Agency-2026-03-24
}
```

PATCH /api/contracts/:id (account 변경 시):
```
1. contracts.account_id = newAccountId
2. contracts.name = generateContractName(account.name, today)
3. 응답: 업데이트된 contract + customerAccount (조인 포함)
```

---

## ④ Account 생성 플로우 — 타입별 분기

### Account 목록 → + New Account

```
Step 1: Account Type 선택 (필수)
  ── Client ──────────────────
  • Student        ← primary_contact 연결 Step 추가
  • Organisation   ← 바로 Step 2 (기본 정보 입력)
  ── Partner ─────────────────
  • School
  • Sub Agency
  • Super Agency
  • Supplier
  ── Internal ────────────────
  • Staff
  • Branch
  ── Other ───────────────────
  • Organisation

Step 2 분기:
  - Student 선택 시:
      → Primary Contact 연결 (검색 또는 신규 생성)
      → Name 자동 생성: "Student_FirstName LastName"

  - Student 외 모든 타입:
      → 바로 기본 정보 입력 폼
      → Name: 수동 입력 (Manual Input 기본 true)
```

### Student 타입 전용 추가 처리

```typescript
// Student Account 생성 시에만 실행
if (accountType === 'Student') {
  // 1. Name 자동 생성
  if (!manualInput && primaryContact) {
    name = `Student_${primaryContact.firstName} ${primaryContact.lastName}`;
  }
  // 2. primary_contact_id 저장
  accounts.primaryContactId = primaryContactId;
  // 3. Contact의 account_id 역방향 업데이트
  await db.update(contacts)
    .set({ accountId: newAccountId })
    .where(eq(contacts.id, primaryContactId));
}
// Student 외 타입: 위 처리 없이 accounts INSERT만 실행
```

---

## ⑤ Contact Detail → Account 생성 버튼

Contact Detail 상단 액션 영역:

```
기존:  [Edit]  [+ Add Task]
수정:  [Edit]  [+ Add Task]  [Create Account ▼]  ← account_id 없는 Contact만 표시
                              ↓ 드롭다운
                              • Student Account   ← primary_contact로 연결
                              • Other Account     ← 타입 선택 후 일반 생성 폼
```

Student Account 선택 시:
- Name 자동 생성: `Student_${contact.firstName} ${contact.lastName}`
- primary_contact_id = 현재 Contact.id
- 저장 후 contacts.account_id 자동 업데이트

Other Account 선택 시:
- Account Type 선택 드롭다운 표시 (Student 제외)
- 일반 Account 생성 폼 열림
- 저장 후 contacts.account_id 자동 업데이트

---

## ⑥ API 전체 목록

| Method | Endpoint | 변경 내용 |
|---|---|---|
| `GET` | `/api/accounts/search` | 신규 추가 — 타입 필터 지원 전체 검색 |
| `POST` | `/api/accounts` | Student 타입 시 primary_contact 연결 처리 추가 |
| `PATCH` | `/api/contracts/:id` | accountId 변경 + name 재생성 |
| `GET` | `/api/contracts/:id` | customerAccount 조인 (타입 무관 공통 필드 + 타입별 확장 필드) |

---

## 작업 전 필수 분석 단계

1. 아래 파일을 전부 읽는다:
   - `server/src/routes/contracts.ts` — GET /:id, PATCH /:id 핸들러
   - `server/src/routes/accounts.ts` — GET 검색 엔드포인트 현황
   - `client/src/pages/ContractDetail.tsx` — CUSTOMER(STUDENT) 카드 컴포넌트
   - `client/src/components/` — Account 검색 모달 컴포넌트
   - `client/src/pages/ContactDetail.tsx` — 상단 액션 버튼 영역
   - `db/schema.ts` — accounts, contracts, contacts 테이블 정의

2. 현재 Contract Detail 카드가 "STUDENT"를 어떻게 하드코딩하고 있는지 파악
   (컴포넌트명, 줄 번호 확인)

3. 현재 Account 검색 모달이 타입 필터를 어떻게 처리하는지 확인

4. 수정할 파일 목록과 변경 내용을 나에게 먼저 보고

5. **"진행해"** 확인 후 작업 시작

---

## 수정 시 안전 규칙

**반드시 지킬 것:**
- CUSTOMER 카드 렌더링은 `account_type`으로 분기하되,
  **unknown type에도 항상 Name + Owner는 표시**해 데이터가 깨지지 않도록
- Student 외 타입에 대한 `contacts.account_id` 업데이트는 하지 않음
- 검색 API의 `type` 파라미터는 선택값 — 없으면 전체 반환
- 기존 Invoice, Transaction, Services 탭 등 다른 탭 로직 변경 없음

**절대 하지 말 것:**
- Contract Detail의 STUDENT 카드를 삭제하고 새로 만들기
  (기존 컴포넌트를 리팩토링하는 방식으로 진행)
- `contracts.account_id` 컬럼 타입 변경
- Account Type 드롭다운에서 특정 타입을 Contract 연결에서 차단하는 로직 추가
  (미래 확장성을 위해 모든 타입 허용)

---

## 수정 후 필수 검증

1. `npx tsc --noEmit` → 오류 0개

2. DB 확인:
```sql
-- 다양한 타입의 Account가 Contract와 연결 가능한지 확인
SELECT
  ct.id, ct.name AS contract_name,
  a.name AS account_name,
  a.account_type,
  c.nationality
FROM contracts ct
LEFT JOIN accounts a ON ct.account_id = a.id
LEFT JOIN contacts c ON a.primary_contact_id = c.id
WHERE ct.status = 'Active'
ORDER BY a.account_type, ct.created_on DESC
LIMIT 10;
```

3. API 응답 확인:
```
GET /api/accounts/search?q=test
→ 모든 타입 반환 확인

GET /api/accounts/search?q=test&type=Student
→ Student만 반환 확인

GET /api/contracts/:id  (account_type=Student 인 Contract)
→ customerAccount.accountType = 'Student', nationality 포함

GET /api/contracts/:id  (account_type=Organisation 인 Contract)
→ customerAccount.accountType = 'Organisation', country 포함
```

4. 브라우저 확인:
   - Student Account 연결된 Contract → 카드에 Student 뱃지 + nationality 표시
   - Organisation Account 연결된 Contract → 카드에 Organisation 뱃지 + country 표시
   - Edit 모달 → 타입 필터 "All" 기본값, Student 외 타입 검색 가능
   - Student Account 생성 → Name 자동 생성 동작
   - 타입 필터 전환 시 검색 결과 즉시 변경

---

## 완료 보고 형식

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과: [tsc / 서버 / DB / API 각각 결과]
⚠️  다음에 할 작업: [있는 경우]
```
