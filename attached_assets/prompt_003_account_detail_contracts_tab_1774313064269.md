# 작업 요청 003: Account Detail — Contracts · Leads 탭 데이터 연결 수정

---

## 배경

**완료된 선행 작업:**
- Migration 001: `accounts.primary_contact_id`, `secondary_contact_id` 컬럼 추가
- Prompt 002: Contract Detail STUDENT 카드 → Account 조인 연결

**현재 문제 (스크린샷 확인):**

Account Detail 화면 → `Contracts` 탭에서:
```
"No contracts linked to this account yet."
```
위와 같이 표시되며 실제 연결된 Contract가 보이지 않는다.

**원인 추정:**
- `GET /api/accounts/:id/contracts` 엔드포인트가 없거나
- 있더라도 `contracts.account_id = accounts.id` 조건으로 조회하지 않고 있음
- 또는 프론트엔드 Contracts 탭이 API를 호출하지 않고 빈 배열을 렌더링 중

---

## 요청 작업

### ① API 추가/수정

**`GET /api/accounts/:id/contracts`**

```
조회 조건:
  WHERE contracts.account_id = :id
    AND contracts.status = 'Active'
  ORDER BY contracts.created_on DESC

응답 필드 (리스트용 요약):
  [
    {
      id:              contracts.id
      name:            contracts.name           -- CT-AccountName-YYYY-MM-DD
      contractStatus:  contracts.contract_status -- Draft | Active | Completed | ...
      contractAmount:  contracts.contract_amount
      fromDate:        contracts.from_date
      toDate:          contracts.to_date
      ownerName:       users.name               -- 담당 직원 (JOIN users)
      createdOn:       contracts.created_on
    }
  ]
```

**`GET /api/accounts/:id/leads`**

```
조회 조건:
  WHERE leads.account_id = :id
    AND leads.status = 'Active'
  ORDER BY leads.created_on DESC

응답 필드:
  [
    {
      id:          leads.id
      name:        leads.name
      leadStatus:  leads.lead_status
      subject:     leads.subject
      ownerName:   users.name
      createdOn:   leads.created_on
    }
  ]
```

---

### ② 프론트엔드 수정

**Account Detail — Contracts 탭 (`/accounts/:id` → Contracts 탭)**

현재: 빈 Empty State 표시
수정 후:

```
┌─────────────────────────────────────────────────────────┐
│  Contracts                              + New Quote      │
│─────────────────────────────────────────────────────────│
│  CT-Student_Kim Min-jun-2026-01-15   Draft    $0.00  >  │
│  CT-Student_Kim Min-jun-2025-08-10   Active  $12,000 >  │
│─────────────────────────────────────────────────────────│
│  (없을 경우) No contracts linked to this account yet.    │
└─────────────────────────────────────────────────────────┘
```

각 Contract 행 클릭 시 → `/contracts/:contractId` 로 이동

**Account Detail — Leads 탭 (`/accounts/:id` → Leads 탭)**

```
┌─────────────────────────────────────────────────────────┐
│  Leads                                  + New Lead       │
│─────────────────────────────────────────────────────────│
│  English Course Inquiry    In Progress  Sunjae Kim   >  │
│─────────────────────────────────────────────────────────│
│  (없을 경우) No leads linked to this account yet.        │
└─────────────────────────────────────────────────────────┘
```

**우측 QUICK INFO 패널 (현재 이미 있음 — 유지)**

```
QUICK INFO
Type        [accountType 뱃지]
Leads       [count]  + New Lead
Contracts   [count]  + New Quote
```
→ count는 각 API 응답 배열 길이로 계산

---

### ③ Contract 행 컴포넌트 디자인

```
행 레이아웃 (48px 높이):
  좌측: Contract Name (14px/500/#1C1917) + 날짜 (12px/400/#57534E)
  중앙: Status 뱃지
  우측: 금액 (14px/600/#1C1917) + ChevronRight 아이콘

Status 뱃지 규칙:
  Draft:     bg #F4F3F1, text #57534E
  Active:    bg #DCFCE7, text #16A34A
  Completed: bg #F4F3F1, text #57534E
  Cancelled: bg #FEF2F2, text #DC2626
  Pending:   bg #FEF9C3, text #CA8A04

행 hover: background #FAFAF9
행 클릭: /contracts/:id 로 이동

빈 상태:
  아이콘: Lucide FileText, 40px, color #A8A29E
  텍스트: "No contracts linked to this account yet."
  14px / #57534E / text-align center
```

---

## 작업 전 필수 분석 단계

1. 아래 파일을 전부 읽는다:
   - `server/src/routes/accounts.ts`
   - `client/src/pages/AccountDetail.tsx` (또는 Account Detail 관련 페이지)
   - Contracts 탭 관련 컴포넌트 파일

2. 현재 `GET /api/accounts/:id` 응답 구조를 확인한다
   - contracts, leads 관련 데이터를 이미 포함하는지 확인
   - 별도 탭 API 호출인지 단일 API인지 확인

3. 프론트엔드에서 Contracts 탭이 렌더링하는 데이터 소스를 정확히 파악한다

4. 수정할 파일 목록과 변경 내용을 나에게 먼저 보고한다

5. **"진행해"** 확인 후 작업 시작

---

## 수정 시 안전 규칙

- 기존 Overview, Contacts 탭 로직은 건드리지 않는다
- `accounts.ts` 라우트에서 기존 엔드포인트 변경 없이 신규 엔드포인트만 추가
- DB 컬럼 삭제/이름 변경 없음

---

## 수정 후 필수 검증

1. `npx tsc --noEmit` → 오류 0개

2. DB 직접 확인:
```sql
-- 특정 Account에 연결된 Contract 확인
SELECT ct.id, ct.name, ct.contract_status, ct.contract_amount
FROM contracts ct
WHERE ct.account_id = '[테스트 account_id]'
  AND ct.status = 'Active'
ORDER BY ct.created_on DESC;
```

3. API 응답 확인:
```
GET /api/accounts/:id/contracts
→ 배열 반환 여부, 각 항목에 name/contractStatus/contractAmount 포함 확인
```

4. 브라우저에서 Account Detail → Contracts 탭 클릭 시
   Contract 목록이 표시되는지 확인

---

## 완료 보고 형식

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과: [tsc / 서버 / DB / API 각각 결과]
⚠️  다음에 할 작업: [있는 경우]
```
