# 작업 요청: Contract Detail — STUDENT 카드 Account 연결 (UI + API)

---

## 배경 및 선행 작업 완료 내용

아래 Migration이 이미 DB에 적용되어 있다:

```sql
-- 완료된 Migration (migration_001)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS secondary_contact_id UUID REFERENCES contacts(id);
CREATE INDEX IF NOT EXISTS idx_accounts_primary_contact ON accounts(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_contracts_account_id ON contracts(account_id);
```

또한 기존 Student Account 중 `contacts.account_id`로 연결된 건
`primary_contact_id`가 자동 설정되어 있다.

---

## 현재 문제

Contract Detail 화면의 **STUDENT 카드**에서:
- `Name` 항목이 `contracts.account_id → accounts.name` 을 읽지 않고 빈 값(`—`) 표시
- `Nationality` 항목이 Contact 데이터를 읽지 않아 빈 값 표시
- `Owner (EC)` 항목이 Account owner를 읽지 않아 빈 값 표시
- 연락처(Email, Phone) 필드 자체가 STUDENT 카드에 없음

---

## 요청 작업

### 작업 범위

**① API 수정** (`server/src/routes/contracts.ts` 또는 관련 라우트 파일)

Contract Detail GET 엔드포인트 (`GET /api/contracts/:id`)의 응답에
아래 필드를 추가한다:

```
contracts 조인 대상:
  contracts
    LEFT JOIN accounts  ON contracts.account_id        = accounts.id
    LEFT JOIN contacts  ON accounts.primary_contact_id = contacts.id
                          (primary_contact_id가 NULL이면
                           contacts.account_id = accounts.id 역방향 폴백)
    LEFT JOIN users     ON accounts.owner_id           = users.id

응답에 추가할 필드:
  studentAccount: {
    id:          accounts.id
    name:        accounts.name          ← STUDENT 카드: Name
    accountType: accounts.account_type
    email:       accounts.email         ← STUDENT 카드: 연락처(Account 직접)
    phone:       accounts.phone_number  ← STUDENT 카드: 연락처(Account 직접)
  }
  studentContact: {
    id:          contacts.id
    nationality: contacts.nationality   ← STUDENT 카드: Nationality
    email:       contacts.email_address ← 우선순위 높음 (Contact > Account)
    phone:       contacts.mobile_number ← 우선순위 높음 (Contact > Account)
  }
  studentOwner: {
    id:          users.id
    name:        users.name             ← STUDENT 카드: Owner (EC)
  }
```

**② 프론트엔드 수정** (`client/src/pages/ContractDetail.tsx` 또는 관련 파일)

STUDENT 카드 컴포넌트를 아래와 같이 수정한다:

```
현재:
  Name        —
  Nationality —
  Owner (EC)  —

수정 후:
  Name        [studentAccount.name]           ← Account로 이동 링크 포함
  Nationality [studentContact.nationality]
  Owner (EC)  [studentOwner.name]
  Email       [studentContact.email ?? studentAccount.email]
  Phone       [studentContact.phone ?? studentAccount.phone]
```

**③ Account 이동 링크**
STUDENT 카드의 Name 우측에 외부 링크 아이콘(Lucide: `ExternalLink`, 16px)을 추가한다.
클릭 시 `/accounts/:accountId` 로 이동한다.

**④ STUDENT 카드 Edit 기능**
카드 우측 상단의 연필(✏️) 아이콘 클릭 시 Account 검색 모달이 열린다.
- 검색 대상: `account_type = 'Student'`인 Account만 필터
- 선택 시 `contracts.account_id` 를 업데이트 (`PATCH /api/contracts/:id`)
- 저장 후 STUDENT 카드 즉시 갱신 (re-fetch)

---

## 디자인 규칙 (반드시 준수)

```
카드 레이아웃:
  background: #FFFFFF
  border: 1px solid #E8E6E2
  border-radius: 12px
  padding: 20px 24px

카드 헤더:
  라벨: 12px / 500 / uppercase / letter-spacing 0.05em / color #A8A29E
  편집 아이콘: Lucide Pencil, 16px, color #A8A29E, 호버 시 #F5821F

행 레이아웃:
  label: 14px / 400 / color #57534E  (좌측)
  value: 14px / 500 / color #1C1917  (우측, text-align right)
  빈 값: "—"  (color #A8A29E)
  행 간격: 12px

Account 이동 링크:
  Lucide ExternalLink, 16px
  color: #A8A29E, hover: #F5821F
  margin-left: 4px
  cursor: pointer

Account 검색 모달:
  input: height 40px, border 1.5px solid #E8E6E2, border-radius 8px
  focus: border-color #F5821F, box-shadow 0 0 0 3px rgba(245,130,31,0.15)
  검색 결과 행: hover background #FEF0E3
  선택 버튼: Primary 스타일 (#F5821F)

로딩 상태:
  skeleton shimmer: background #F4F3F1 → #E8E6E2 gradient
```

---

## 작업 전 필수 분석 단계

코드를 수정하기 전에 반드시 아래를 수행한다:

1. 아래 파일을 전부 읽는다:
   - `server/src/routes/contracts.ts` (또는 Contract 관련 라우트 전체)
   - `client/src/pages/ContractDetail.tsx` (또는 Contract Detail 페이지 컴포넌트)
   - `db/schema.ts` 의 `contracts`, `accounts`, `contacts`, `users` 테이블 정의

2. 현재 GET /api/contracts/:id 응답 구조를 확인하고 어떤 필드가 이미 있는지 파악한다

3. STUDENT 카드가 현재 어느 컴포넌트에서 렌더링되는지 정확한 파일명과 줄 번호를 확인한다

4. 수정할 파일 목록과 변경 내용을 나에게 먼저 보고한다

5. 내가 명시적으로 **"진행해"** 라고 하기 전까지 수정하지 않는다

---

## 수정 시 안전 규칙

**반드시 지킬 것:**
- 분석에서 확인된 문제만 수정한다
- 파일 하나씩 수정 후 TypeScript 오류 확인
- 이미 정상 작동하는 코드(Financial Summary 카드, 탭, 서비스 카드 등)는 건드리지 않는다
- `contracts.account_id` FK는 이미 존재하므로 스키마 변경 없이 조인만 추가

**절대 하지 말 것:**
- DB 컬럼 삭제 또는 이름 변경
- 현재 작업과 무관한 파일 수정 (Financial Summary, Services, Invoice 탭 등)
- 인증/권한 관련 코드 임의 수정
- 스키마를 읽지 않고 필드명 추측
- 여러 파일을 한 번에 대량 수정

---

## 수정 후 필수 검증

모든 변경 완료 후 아래 순서로 반드시 확인:

1. `npx tsc --noEmit` → TypeScript 오류 0개 확인

2. 서버 정상 기동 확인 → import 오류, 런타임 오류 없음

3. DB 조인 쿼리 직접 확인:
```sql
SELECT
  ct.id, ct.name AS contract_name,
  a.name AS account_name, a.account_type,
  c.nationality, c.email_address, c.mobile_number,
  u.name AS owner_name
FROM contracts ct
LEFT JOIN accounts a ON ct.account_id = a.id
LEFT JOIN contacts c ON a.primary_contact_id = c.id
LEFT JOIN users    u ON a.owner_id = u.id
WHERE ct.status = 'Active'
ORDER BY ct.created_on DESC
LIMIT 3;
```

4. API 응답 확인:
```
GET /api/contracts/:id
→ studentAccount.name 이 null이 아닌지
→ studentContact.nationality 값 반환 여부
→ studentOwner.name 값 반환 여부
```

5. 브라우저에서 Contract Detail 페이지 열어 STUDENT 카드에
   Name / Nationality / Owner (EC) / Email / Phone 이 표시되는지 시각적으로 확인

각 단계 결과를 나에게 보고한다. 검증 실패 시 완료 처리하지 말고 즉시 수정한다.

---

## 작업 완료 보고 형식

완료 시 항상 아래 형식으로 보고:

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과: [tsc / 서버 / DB / API 각각 결과]
⚠️  다음에 할 작업: [있는 경우]
```
