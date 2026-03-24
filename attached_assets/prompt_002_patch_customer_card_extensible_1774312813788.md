# 작업 요청 002-patch: Contract Detail — CUSTOMER 카드 확장성 수정

---

## 작업 배경

Prompt 002에서 구현한 Contract Detail의 STUDENT 카드에
아래 두 가지 **확장성 문제**가 있어 수정이 필요하다.

`contracts.account_id`는 DB 레벨에서 어떤 Account Type과도
연결될 수 있도록 설계되어 있다.
(학생 외 Organisation, Agent, School 등도 Contract 주체가 될 수 있음)

따라서 아래 두 곳만 정확히 수정한다.
**Prompt 002에서 구현한 다른 기능(조인 쿼리, 데이터 표시, PATCH 등)은 건드리지 않는다.**

---

## 수정 대상 1 — 카드 헤더 하드코딩 제거

### 현재 (문제)
```
카드 상단에 "STUDENT" 또는 "PRIMARY SERVICE" 등의 텍스트가
코드에 문자열로 하드코딩되어 있음
```

### 수정 후 (목표)
```
카드 헤더 라벨을 account_type 값으로 동적 표시

account_type 값 → 표시 텍스트 + 뱃지 색상

| account_type   | 표시 텍스트   | 뱃지 bg    | 뱃지 text  |
|----------------|-------------|------------|------------|
| Student        | STUDENT      | #FEF0E3    | #F5821F    |
| School         | SCHOOL       | #DCFCE7    | #16A34A    |
| Sub_Agency     | SUB AGENCY   | #EDE9FE    | #7C3AED    |
| Super_Agency   | SUPER AGENCY | #EDE9FE    | #7C3AED    |
| Supplier       | SUPPLIER     | #F0F9FF    | #0369A1    |
| Staff          | STAFF        | #F4F3F1    | #57534E    |
| Branch         | BRANCH       | #FEF9C3    | #CA8A04    |
| Organisation   | ORGANISATION | #F4F3F1    | #57534E    |
| Agent          | AGENT        | #EDE9FE    | #7C3AED    |
| Provider       | PROVIDER     | #F0F9FF    | #0369A1    |
| Partner        | PARTNER      | #F4F3F1    | #57534E    |
| null / unknown | ACCOUNT      | #F4F3F1    | #57534E    |

구현 방식 (헬퍼 함수):
  function getAccountTypeBadge(accountType: string | null) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      Student:      { label: 'STUDENT',      bg: '#FEF0E3', color: '#F5821F' },
      School:       { label: 'SCHOOL',       bg: '#DCFCE7', color: '#16A34A' },
      Sub_Agency:   { label: 'SUB AGENCY',   bg: '#EDE9FE', color: '#7C3AED' },
      Super_Agency: { label: 'SUPER AGENCY', bg: '#EDE9FE', color: '#7C3AED' },
      Supplier:     { label: 'SUPPLIER',     bg: '#F0F9FF', color: '#0369A1' },
      Staff:        { label: 'STAFF',        bg: '#F4F3F1', color: '#57534E' },
      Branch:       { label: 'BRANCH',       bg: '#FEF9C3', color: '#CA8A04' },
      Organisation: { label: 'ORGANISATION', bg: '#F4F3F1', color: '#57534E' },
      Agent:        { label: 'AGENT',        bg: '#EDE9FE', color: '#7C3AED' },
      Provider:     { label: 'PROVIDER',     bg: '#F0F9FF', color: '#0369A1' },
      Partner:      { label: 'PARTNER',      bg: '#F4F3F1', color: '#57534E' },
    };
    return map[accountType ?? ''] ?? { label: 'ACCOUNT', bg: '#F4F3F1', color: '#57534E' };
  }
```

뱃지 스타일:
```
font-size: 12px
font-weight: 500
border-radius: 999px
padding: 3px 10px
display: inline-block
```

---

## 수정 대상 2 — Account 검색 모달 타입 필터 해제

### 현재 (문제)
```
Account 연결 모달의 검색 API 호출 또는 필터 조건이
account_type = 'Student' 로 고정되어 있음
```

### 수정 후 (목표)
```
1. 검색 API 호출 시 type 파라미터 제거 (또는 기본값을 전체로 변경)
   기존: GET /api/accounts?type=Student&q=:keyword
   변경: GET /api/accounts?q=:keyword  (타입 필터 없음)

2. API 서버 측에서 type 파라미터가 없으면 전체 타입 반환하도록 수정
   기존: WHERE account_type = 'Student'
   변경: type 파라미터 있으면 → WHERE account_type = :type
         type 파라미터 없으면 → 타입 조건 없음 (전체)

3. 검색 결과 목록에 account_type 뱃지 표시 추가
   각 검색 결과 행에 위의 getAccountTypeBadge()로 타입 뱃지 표시

   예시:
   ┌──────────────────────────────────────────────────┐
   │  Student_Kim Min-jun    [STUDENT]    Korean  Select │
   │  ABC Travel Agency      [AGENT]      Korea   Select │
   │  Family Camp Group      [ORG]        AU      Select │
   └──────────────────────────────────────────────────┘

4. 모달 타이틀 변경
   기존: "LINK STUDENT ACCOUNT"  또는 유사 텍스트
   변경: "LINK ACCOUNT"
```

---

## 수정 범위 명시 (이것만 수정)

```
수정 O:
  - 카드 헤더 라벨 하드코딩 → getAccountTypeBadge() 동적 렌더링
  - Account 검색 API 호출의 type=Student 파라미터 제거
  - 서버 accounts 검색 라우트의 type 필터 조건 수정 (선택적 필터로 변경)
  - 검색 결과 행에 account_type 뱃지 추가
  - 모달 타이틀 텍스트 변경

수정 X (절대 건드리지 않는다):
  - contracts ↔ accounts ↔ contacts ↔ users 조인 쿼리
  - 카드에 표시되는 Name, Nationality, Email, Phone, Owner 데이터
  - ✏️ Edit 아이콘 클릭 → 모달 오픈 로직
  - Account 선택 후 contracts.account_id PATCH 로직
  - ExternalLink 아이콘 및 /accounts/:id 이동 로직
  - 카드의 행 레이아웃, 간격, 폰트 스타일
  - 다른 탭(Services, Financial Summary 등) 전체
```

---

## 작업 전 필수 분석 단계

1. 아래 파일을 전부 읽는다:
   - Prompt 002에서 수정된 Contract Detail 컴포넌트 파일
     (카드 헤더가 어느 줄에 하드코딩되어 있는지 확인)
   - Account 검색 모달 컴포넌트
     (type=Student 필터가 어느 줄에 있는지 확인)
   - `server/src/routes/accounts.ts`
     (검색 엔드포인트의 WHERE 조건 확인)

2. **수정 전 현재 상태를 나에게 먼저 보고한다:**
   - 카드 헤더 하드코딩 위치 (파일명 + 줄 번호)
   - type=Student 필터 위치 (파일명 + 줄 번호)

3. **"진행해"** 확인 후 작업 시작

---

## 수정 시 안전 규칙

- 파일 하나씩 수정 후 TypeScript 오류 확인
- 수정 대상으로 명시되지 않은 코드는 한 줄도 변경하지 않는다
- getAccountTypeBadge 헬퍼 함수는 해당 컴포넌트 파일 내 또는
  `client/src/utils/accountType.ts` 신규 파일로 분리 (기존 파일 구조 따름)

---

## 수정 후 필수 검증

1. `npx tsc --noEmit` → 오류 0개

2. 브라우저 확인:
   - account_type = 'Student' 인 Contract Detail
     → 카드 헤더에 주황색 "STUDENT" 뱃지 표시
   - account_type = null 또는 없는 Contract Detail
     → 카드 헤더에 회색 "ACCOUNT" 뱃지 표시 (오류 없음)
   - Edit 모달 → 검색창에 아무 키워드나 입력
     → Student 외 타입 Account도 검색 결과에 표시됨
   - 검색 결과 각 행에 account_type 뱃지 표시됨

3. 기존 기능 회귀 확인:
   - Account 선택 후 카드 데이터 정상 갱신
   - Name 클릭 → /accounts/:id 이동 정상
   - Nationality / Email / Phone / Owner 데이터 정상 표시

---

## 완료 보고 형식

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과: [tsc / 브라우저 / 회귀 각각 결과]
⚠️  다음에 할 작업: [있는 경우]
```
