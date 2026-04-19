# COLOR_STATUS_CODES.md — Edubee CRM 상태 컬러 코드

> 생성일: 2026-04-19 | 소스: components/ui/status-badge.tsx, ContractFinanceTab.tsx, tasks.tsx 등

---

## 1. 엔티티별 상태 코드 & 컬러 매핑

### Lead Status
| 상태값 (DB) | 화면 표시 | 배경색 | 텍스트색 | Tailwind / CSS |
|------------|----------|--------|---------|----------------|
| `new` | New | `#F4F3F1` | `#57534E` | `bg-[#F4F3F1] text-[#57534E]` |
| `in_progress` | In Progress | `#FEF9C3` | `#CA8A04` | 노란계열 |
| `converted` | Converted | `#DCFCE7` | `#16A34A` | 초록계열 |
| `lost` | Lost | `#FEE2E2` | `#DC2626` | 빨강계열 |
| `on_hold` | On Hold | `#F3F4F6` | `#6B7280` | 회색계열 |

### Quote Status
| 상태값 | 화면 표시 | 비고 |
|--------|----------|------|
| `Draft` | Draft | 기본, 회색 |
| `Sent` | Sent | 파랑 |
| `Accepted` | Accepted | 초록 |
| `Declined` | Declined | 빨강 |
| `Expired` | Expired | 회색 |

### Contract Status
| 상태값 | 화면 표시 | 배경색 | 텍스트색 |
|--------|----------|--------|---------|
| `draft` | Draft | `bg-[#F4F3F1]` | `text-[#57534E]` |
| `active` | Active | 초록 계열 | 초록 |
| `completed` | Completed | 파랑 계열 | 파랑 |
| `cancelled` | Cancelled | 빨강 계열 | 빨강 |
| `on_hold` | On Hold | 노랑 계열 | 노랑 |

### Contract Finance Item Status (`ContractFinanceTab.tsx`)
```typescript
const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-[#FEF9C3] text-[#CA8A04]",   // 노랑
  invoiced:  "bg-[#DBEAFE] text-[#1D4ED8]",   // 파랑
  partial:   "bg-[#FEF3C7] text-[#D97706]",   // 주황
  paid:      "bg-[#DCFCE7] text-[#16A34A]",   // 초록
  overdue:   "bg-[#FEE2E2] text-[#DC2626]",   // 빨강
  cancelled: "bg-[#F3F4F6] text-[#6B7280]",   // 회색
}
```

### Invoice Status
| 상태값 | 화면 | 색상 |
|--------|------|------|
| `draft` | Draft | 회색 |
| `sent` | Sent | 파랑 |
| `paid` | Paid | 초록 |
| `overdue` | Overdue | 빨강 |
| `void` | Void | 진한 회색 |
| `partial` | Partial | 주황 |

### Payment Header Status (`ContractPaymentsPanel.tsx`)
```typescript
status === "Approved" ? "bg-[#DCFCE7] text-[#16A34A]"   // 초록
status === "Pending"  ? "bg-[#FEF9C3] text-[#CA8A04]"   // 노랑
                      : "bg-[#F3F4F6] text-[#6B7280]"   // 회색 (기본)
```

### Task Status (`services/tasks.tsx`)
```typescript
const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-[#FEF9C3] text-[#CA8A04]",
  in_progress: "bg-[#DBEAFE] text-[#1D4ED8]",
  completed:   "bg-[#DCFCE7] text-[#16A34A]",
  cancelled:   "bg-[#FEE2E2] text-[#DC2626]",
}
```

### Report Status (`ReportStatusBadge.tsx`)
| 상태값 | 색상 |
|--------|------|
| `draft` | 회색 (`bg-[#F4F3F1] text-[#57534E]`) |
| `published` | 초록 (`bg-[#DCFCE7] text-[#16A34A]`) |

### Document Status (`EntityDocumentsTab.tsx`)
```typescript
const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-[#FEF9C3] text-yellow-700",
  approved:  "bg-[#DCFCE7] text-green-700",
  rejected:  "bg-[#FEE2E2] text-red-700",
}
```

### KPI / Incentive Status (`IncentiveSection.tsx`)
```typescript
draft:     { bg: 'bg-[#F4F3F1]', textColor: 'text-[#57534E]',  border: 'border-[#E8E6E2]' }
active:    { bg: 'bg-[초록]',    textColor: 'text-[초록]' }
completed: { bg: 'bg-[파랑]',    textColor: 'text-[파랑]' }
```

---

## 2. 시스템 공통 컬러 코드

| 용도 | 배경색 | 텍스트색 | 설명 |
|------|--------|---------|------|
| **성공 / 완료** | `#DCFCE7` (green-100) | `#16A34A` (green-600) | Paid, Active, Approved |
| **경고 / 대기** | `#FEF9C3` (yellow-100) | `#CA8A04` (yellow-600) | Pending, Draft |
| **오류 / 위험** | `#FEE2E2` (red-100) | `#DC2626` (red-600) | Overdue, Rejected, Lost |
| **정보 / 진행** | `#DBEAFE` (blue-100) | `#1D4ED8` (blue-700) | In Progress, Sent |
| **중립 / 비활성** | `#F4F3F1` (neutral-100) | `#57534E` (neutral-600) | Default, Inactive |
| **주황 / 부분** | `#FEF3C7` (amber-100) | `#D97706` (amber-600) | Partial, Warning |

---

## 3. 하드코딩된 색상 위치

| 색상 | 위치 | 사유 |
|------|------|------|
| `#DCFCE7`, `#16A34A` | `ContractPaymentsPanel.tsx:151` | status === "Approved" inline |
| `#FEF9C3`, `#CA8A04` | `ContractPaymentsPanel.tsx:152` | status === "Pending" inline |
| `#F5821F` (orange) | `portal-layout.tsx`, `App.tsx` | 브랜드 컬러 기본값 |
| `#FAFAF9` | `App.tsx (portal)` | 페이지 배경 |
| `#F4F3F1` | 다수 컴포넌트 | 카드/뱃지 배경 |

---

## 4. 상태값 한국어 ↔ 영어 ↔ DB 값 매핑

| 한국어 | 영어 표시 | DB 값 |
|--------|----------|-------|
| 초안 | Draft | `draft` / `Draft` |
| 진행중 | In Progress | `in_progress` / `active` |
| 완료 | Completed | `completed` / `paid` |
| 취소됨 | Cancelled | `cancelled` |
| 대기중 | Pending | `pending` |
| 연체 | Overdue | `overdue` |
| 발송됨 | Sent | `sent` / `Sent` |
| 수락됨 | Accepted | `accepted` / `Accepted` |
| 거절됨 | Declined | `declined` / `rejected` |
| 승인됨 | Approved | `Approved` / `approved` |
| 비활성 | Inactive | `Inactive` / `inactive` |
| 신규 | New | `new` |
| 전환됨 | Converted | `converted` |
| 실패 | Lost / Failed | `lost` / `failed` |

> **주의**: DB 상태값이 PascalCase (`Draft`, `Active`)와 snake_case (`in_progress`)가 혼재함. 새 기능 개발 시 기존 테이블의 패턴을 확인할 것.

---

*© Edubee.Co. 2026 — 자동 생성 문서*
