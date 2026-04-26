# FINANCE_SYSTEM_GUIDE.md
## Edubee 재무 시스템 통합 가이드 — Single Source of Truth

> ## ⚠️ CLAUDE CODE — READ THIS FIRST
>
> **이 문서가 Finance 모듈의 단일 진실 소스(Single Source of Truth)입니다.**
>
> - 이 문서와 `FINANCE_WORKFLOW.md`의 내용이 충돌할 경우, **반드시 이 문서를 우선** 따를 것
> - `FINANCE_WORKFLOW.md`는 **Legacy AS-IS 참조용**으로만 남겨두었으며, **2026-05-06 이후 삭제 예정**
> - 새로운 Finance 기능 구현 시 **이 문서만 참조**할 것
> - 정보가 실제 코드와 다르면 **실제 코드가 우선** — 발견 시 이 문서도 업데이트할 것
> - 코드 충돌 판단 우선순위: **실제 코드 > 이 문서 > FINANCE_WORKFLOW.md**

> **작성 근거 (실제 검증된 파일):**
> - `lib/db/src/schema/accounting.ts` — 10개 회계 테이블
> - `lib/db/src/schema/finance.ts` — Legacy + 통합 테이블
> - `artifacts/api-server/src/routes/accounting-payments.ts` — JE 자동 생성 로직
> - `artifacts/api-server/src/routes/finance.ts` — Legacy invoice/transaction
> - `artifacts/api-server/src/services/journalEntryService.ts` — DR/CR 매핑 엔진
> - `artifacts/api-server/src/services/contractFinanceService.ts` — 계약-재무 자동 연동
> - `artifacts/api-server/src/lib/financeDelegationGuard.ts` — 권한 위임 가드
>
> **문서 작성일:** 2026-04-22 | **버전:** v1.2 | **최종 업데이트:** 2026-04-26 (Migration 0015 반영) | **검토 필수:** Jason KIM 대표

---

## 목차

0. [핵심 개념 — Dual Finance System](#0-핵심-개념)
**W. [Time Study 워크플로우 데이터 룰 (전체)](#w-워크플로우-데이터-룰)** ← 2026-04-26 신규
1. [Chart of Accounts (실제 CoA)](#1-coa)
2. [계약 시점 — 자동 생성 흐름](#2-계약시점)
3. [수익 구조 및 인식 시점](#3-수익구조)
4. [분개 (Journal Entries) — 자동화 엔진](#4-분개)
5. [서비스 파트너 비용 송금 (AP)](#5-파트너송금)
6. [직원 KPI 및 인센티브](#6-kpi)
7. [실제 API 엔드포인트 맵](#7-api)
8. [Claude Code 작업 가이드라인](#8-가이드라인)
9. [마이그레이션 로드맵](#9-로드맵)
10. [⚠️ 알려진 이슈 및 경고](#10-경고)

부록 A. [전체 테이블 레퍼런스](#부록-a)
부록 B. [작업 완료 보고 템플릿](#부록-b)

---

<a id="w-워크플로우-데이터-룰"></a>
## W. Time Study 워크플로우 데이터 룰 (전체)

> **추가일:** 2026-04-26 | **검증 완료:** Migration 0015 적용 후 스키마 일치 확인

### W.1 전체 흐름 요약

```
Lead(QUALIFIED) → Quote(1:N QP) → Contract(1:N CP, 1:1 Account) → Invoice(1:N IP)
   → Payment Header(1:N Lines) → Receipt + Journal Entry → [Recurring: 자동 반복]
```

### W.2 단계별 데이터 룰

#### W.2.1 상담 ~ 계약 단계

| 룰 | 구현 상태 | 관련 테이블/컬럼 |
|----|----------|----------------|
| Lead `QUALIFIED` → Quote 생성 | ✅ | `leads.id → quotes.lead_id` |
| Quote 1:N Quote Products | ✅ | `quotes.id → quote_products.quote_id` |
| Quote → Contract 최대 1개 (잠금) | ✅★ | `contracts.quote_id` UNIQUE + FK (Migration 0015) |
| Contract 생성 시 QP → CP 스냅샷 복사 | ✅ 앱 레벨 | `quote_products` → `contract_products` 복사 |
| Contract 1:1 Account (Student/Client) | ✅ FK, ⚠️ NOT NULL 미적용 | `contracts.account_id` (nullable) |
| Contact M:N Account | ✅ | `account_contacts` 테이블 (M:N) |
| Contact — 동일 Type Account 중복 금지 | ⚠️ 앱 레벨만 | `account_contacts`에 `UNIQUE(contact_id, account_type)` 미설정 |

★ Migration 0015 적용

#### W.2.2 계약 ~ 청구 단계

| 룰 | 구현 상태 | 관련 테이블/컬럼 |
|----|----------|----------------|
| Contract 1:N Contract Products | ✅ | `contract_products.contract_id` |
| Contract Product → AR/AP 일정 | ✅ | `ar_due_date`, `ap_due_date`, `ar_status`, `ap_status` |
| Contract Product → Cost Lines | ✅ | `product_cost_lines.contract_product_id` |
| Invoice → Contract (1 Contract) | ✅ | `invoices.contract_id` |
| Invoice → Account (1 Account) | ✅★ | `invoices.account_id` FK (Migration 0015) |
| Invoice 1:N Invoice Products (분할 청구) | ✅★ | `invoice_products` 신설 (Migration 0015) |
| 1 Contract Product → N Invoice Products (split) | ✅★ | `invoice_products.contract_product_id` |
| Contract Product `invoice_count` 누적 | ✅★ | `contract_products.invoice_count` (Migration 0015) |

★ Migration 0015 적용

#### W.2.3 수금 ~ 정산 단계

| 룰 | 구현 상태 | 관련 테이블/컬럼 |
|----|----------|----------------|
| Payment Header 1:N Payment Lines (Split) | ✅ | `payment_headers`, `payment_lines` |
| Payment Line → Invoice 또는 Contract Product | ✅ | `payment_lines.invoice_id`, `payment_lines.contract_product_id` |
| Invoice Status 자동 갱신 (scheduled→invoiced→partial→paid) | ⚠️ 앱 레벨 | `invoices.ar_status` |
| Payment Header 1:1 Receipt | ✅★ | `receipts.payment_header_id` FK (Migration 0015) |
| Payment Header → Journal Entry 자동 | ✅ | `journal_entries.payment_header_id`, `auto_generated=true` |
| AR 완납 시 AP Status `pending→ready` 자동 전환 | ✅★ | `contract_products.ap_trigger='on_ar_paid'` (Migration 0015) — **실행 로직은 앱 레벨 구현 필요** |
| 학교 송금 (AP): `payment_type='trust_transfer'` | ✅ | `payment_headers.payment_type` |
| AP 송금 시 `product_cost_lines` `pending→paid` 갱신 | ✅ | `product_cost_lines.payment_header_id`, `status` |

★ Migration 0015 적용

#### W.2.4 반복 청구 (Recurring) 단계

| 룰 | 구현 상태 | 관련 테이블/컬럼 |
|----|----------|----------------|
| `guardian_mgt.billing_cycle` (monthly / per_term) | ✅ | `guardian_mgt.billing_cycle` |
| `accommodation_mgt.billing_cycle` (monthly / per_term) | ✅★ | `accommodation_mgt.billing_cycle` (Migration 0015) |
| 반복 Invoice → 부모 Invoice 추적 | ✅ | `invoices.parent_invoice_id` (self-ref) |
| 반복 플래그 | ✅ | `invoices.is_recurring`, `invoices.recurring_cycle`, `invoices.recurring_seq` |
| `service_end_date` 도달 시 스케줄러 중지 | ⚠️ | 스케줄러 미구현 (Phase C) |
| 월별 독립 처리 (미납 해당월만 Overdue) | ⚠️ | `invoices.ar_status='overdue'` — cron은 있으나 자동 생성 없음 |

★ Migration 0015 적용

### W.3 구현 갭 현황 (Migration 0015 이후 잔여)

| 갭 | 설명 | 조치 |
|----|------|------|
| `contracts.account_id` NOT NULL 미적용 | nullable로 계약 생성 가능 | 기존 데이터 backfill 후 NOT NULL 추가 필요 |
| `UNIQUE(contact_id, account_type)` 미설정 | 동일 Type Account 중복 DB 레벨 방지 없음 | `account_contacts`에 unique constraint 추가 필요 |
| `ap_trigger` 실행 로직 미구현 | 컬럼은 추가됐으나 AR 완납 감지 → AP 전환 앱 로직 없음 | AR payment 처리 route에 자동 전환 로직 추가 필요 |
| 반복 청구 스케줄러 미구현 | `is_recurring=true` Invoice 자동 생성 없음 | Phase C 예정 |

---

<a id="0-핵심-개념"></a>
## 0. 핵심 개념 — Dual Finance System

### 0.1 Edubee는 두 개의 재무 시스템이 **병행 운영** 중

```
┌──────────────────────────────────────────────────────────────────┐
│                Edubee — Dual Finance System                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  【Legacy Finance System】(기존)                                  │
│   대상: Camp / Agent Invoice 워크플로우                           │
│   중심 테이블: contract_finance_items, user_ledger                │
│   CoA 방식: 문자열 Cost Center (RC-CAMP, CC-AGENT, CC-HOTEL...)   │
│   라우트: /api/finance/* + /api/my-accounting/*                   │
│   서비스: contractFinanceService.ts                               │
│   상태: ✅ 운영 중 — 건드리지 말 것                                │
│                                                                   │
│  【New Accounting System】(신규)                                  │
│   대상: 표준 유학 상담 워크플로우 (Student lifecycle)              │
│   중심 테이블: contract_products, product_cost_lines,             │
│              payment_headers, payment_lines, journal_entries      │
│   CoA 방식: 숫자 코드 (1100, 1200, 2100, 3100, 4100, 5300...)    │
│   라우트: /api/accounting-*                                       │
│   서비스: journalEntryService.ts                                  │
│   상태: ✅ 운영 중 — 새 Finance 기능은 여기에 추가                 │
│                                                                   │
│  🎯 향후 통합 목표 (장기):                                         │
│   Legacy → New Accounting으로 통합 예정                           │
│   통합 완료까지는 Dual System 유지                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 0.2 어느 시스템을 써야 하는가 — 결정 매트릭스

| 워크플로우 | 사용 시스템 | 이유 |
|-----------|-----------|------|
| **Camp 신청·계약·정산** | Legacy | 이미 운영 중, `contract_finance_items`가 주 테이블 |
| **Agent Invoice 발행** | Legacy | `invoiceType='agent_invoice'` 사용 |
| **스태프 개인 회계 뷰** | Legacy | `/my-accounting/*` 경로 |
| **Receipt 자동 발행** | Legacy | `receiptPdfService.ts` 사용 |
| **표준 유학 상담** | New Accounting | `contract_products` + 이중 분개 |
| **Trust Account 이중 분개** | New Accounting | `journal_entries` 자동 생성 |
| **Tax Invoice (학교 커미션)** | New Accounting | `tax_invoices` 테이블 |
| **Split Transaction** | New Accounting | `payment_headers` + `payment_lines` |
| **파트너 Cost Line 관리** | New Accounting | `product_cost_lines` 사용 |
| **CoA 기반 정식 회계** | New Accounting | `chart_of_accounts` 사용 |

### 0.3 공유 자원

두 시스템 모두 공통으로 사용하는 것:
- `invoices` 테이블 (확장 필드로 양쪽 지원)
- `contracts`, `contract_products` 테이블
- `accounts`, `users` 테이블
- `banking` 테이블 (은행 계좌 마스터)
- `exchange_rates` 테이블

---

<a id="1-coa"></a>
## 1. Chart of Accounts (실제 CoA)

### 1.1 실제 DB 테이블: `chart_of_accounts`

```sql
chart_of_accounts (
  id           UUID PRIMARY KEY,
  code         VARCHAR(10) UNIQUE,    -- 1100, 1200, 2100...
  name         VARCHAR(255),
  account_type VARCHAR(20),           -- asset | liability | revenue | cogs | expense
  description  TEXT,
  parent_code  VARCHAR(10),           -- 계층 구조용
  is_active    BOOLEAN DEFAULT TRUE
)
```

**위치:** `lib/db/src/schema/accounting.ts`

### 1.2 실제 사용 중인 CoA 코드 (검증됨)

아래 코드는 `journalEntryService.ts`의 `DR_CR_MAP`과 `accounting-payments.ts`의 `JE_MAP`에서 **실제로 사용 중인 코드만** 기재합니다.

#### 자산 (1000번대)
| 코드 | 계정명 | 용도 |
|------|--------|------|
| `1100` | Cash & Bank — Operating | 일반 운영 계좌 |
| `1200` | Trust Account | 고객 대리 보관금 (신탁) |
| `1300` | AR — Commission Receivable | 미수 커미션 (GROSS 방식) |

#### 부채 (2000번대)
| 코드 | 계정명 | 용도 |
|------|--------|------|
| `2100` | AP — Student Tuition Payable | 학생 대리 학비 |
| `2200` | AP — Visa Fee / Insurance Payable | 대리 비자비·보험료 |
| `2300` | AP — Accommodation Payable | 대리 숙소비 |
| `2400` | AP — Pickup Payable | 대리 픽업비 |

#### 매출 (3000번대)
| 코드 | 계정명 | 용도 |
|------|--------|------|
| `3100` | Commission — Tuition | 학비 커미션 |
| `3400` | Service Fee — Study Abroad | 유학 상담 서비스 피 |
| `3500` | Service Fee — Camp | 캠프 운영 수익 |

#### 매출원가 (4000번대) — 파트너 지급
| 코드 | 계정명 | 용도 |
|------|--------|------|
| `4100` | Sub-agent Commission | 서브에이전트 커미션 |
| `4200` | Super-agent Commission | 슈퍼에이전트 라이선스·소개비 |
| `4300` | Referral Fee | 파트너 소개비 |
| `4600` | Direct — Tour Cost | 투어 파트너 원가 (Camp) |
| `4700` | Direct — Other / Institute | 기타 직접원가 (Camp Institute 포함) |

#### 영업비용 (5000번대) — 내부 인건비
| 코드 | 계정명 | 용도 |
|------|--------|------|
| `5200` | Salary | 직원 기본급 |
| `5300` | Incentive | 직원 인센티브 |

### 1.3 권장 — TypeScript 상수 파일 생성

```ts
// client/src/lib/coa.ts 또는 artifacts/api-server/src/lib/coa.ts
// CoA 코드 하드코딩 방지용 상수

export const COA = {
  // 자산
  CASH_OPERATING:      '1100',
  TRUST_ACCOUNT:       '1200',
  AR_COMMISSION:       '1300',

  // 부채
  AP_TUITION:          '2100',
  AP_VISA_INSURANCE:   '2200',
  AP_ACCOMMODATION:    '2300',
  AP_PICKUP:           '2400',

  // 매출
  COMM_TUITION:        '3100',
  SF_STUDY_ABROAD:     '3400',
  SF_CAMP:             '3500',

  // 매출원가
  SUB_AGENT_COMM:      '4100',
  SUPER_AGENT_COMM:    '4200',
  REFERRAL_FEE:        '4300',
  COST_TOUR:           '4600',
  COST_OTHER:          '4700',

  // 영업비용
  SALARY:              '5200',
  INCENTIVE:           '5300',
} as const;
```

### 1.4 GST 처리 (호주)

```ts
// ATO 1/11 방식 — taxInvoiceService.ts:135에서 실제 사용
const gstAmt = calculateGst(commissionAmt, isGstFree);
// commissionAmt × 10/110 = commissionAmt / 11

// isGstFree=true (해외 계좌): GST 면제
// isGstFree=false (호주 ABN 법인): 10% GST 적용
```

---

<a id="2-계약시점"></a>
## 2. 계약 시점 — 자동 생성 흐름

### 2.1 Legacy 시스템: `financeAutoGenerate(contractId)`

**위치:** `artifacts/api-server/src/services/contractFinanceService.ts`
**호출 시점:** Contract 확정 시
**멱등성:** ✅ 보장 (기존 `contract_finance_items` 있으면 skip)

**자동 생성 흐름:**

```
Contract 확정
  ↓
contractFinanceService.financeAutoGenerate(contractId)
  ↓
  ├─ 기존 items 있으면 skip (멱등성)
  │
  ├─ contract + application + package + packageProducts 로드
  │
  ├─ RECEIVABLE 생성:
  │    ┌─ client_invoice (costCenter: RC-CAMP or RC-DIRECT)
  │    │    estimatedAmount = contract.totalAmount
  │    │
  │    └─ (agent 있는 경우) agent_invoice (costCenter: RC-CAMP)
  │         estimatedAmount = totalAmount - commissionAmount
  │         linkedAgentId = application.agentId
  │
  ├─ PAYABLE 생성 (Product별 1건):
  │    Product Type → Cost Center 매핑
  │    ┌─ institute  → cc_institute  (CC-INSTITUTE)
  │    ├─ hotel      → cc_hotel      (CC-HOTEL)
  │    ├─ pickup     → cc_pickup     (CC-PICKUP)
  │    ├─ tour       → cc_tour       (CC-TOUR)
  │    ├─ settlement → cc_settlement (CC-SETTLEMENT)
  │    └─ (기타)     → cc_misc       (CC-MISC)
  │
  └─ (agent 있는 경우) PAYABLE: cc_agent (CC-AGENT)
       Agent Commission 항목 추가
```

### 2.2 New Accounting 시스템: `contract_products` + `product_cost_lines`

**자동 생성 흐름:**

```
Contract 확정
  ↓
contract_products 레코드 생성 (Product 단위)
  ├─ name, quantity, price
  ├─ due_date
  ├─ product_id (연결)
  ├─ service_module_type (확장 필드)
  └─ (확장) ar_due_date, ap_due_date, ar_status, ap_status

  ↓ (트리거 또는 서버 훅)

product_cost_lines 레코드 생성 (Cost 단위)
  ├─ contract_product_id (FK)
  ├─ cost_type: 'sub_agent' | 'super_agent' | 'referral' | 'incentive' | 'other'
  ├─ partner_id (FK → accounts, cost 수혜 파트너)
  ├─ staff_id (FK → users, 인센티브 수혜 직원)
  ├─ calc_type: 'percentage' | 'fixed'
  ├─ rate, base_amount, calculated_amount
  ├─ coa_code (FK → chart_of_accounts.code)
  └─ status: 'pending' (기본값)
```

### 2.3 계약 시점에 **즉시 인식되지 않는** 항목

| 항목 | 인식 시점 |
|------|----------|
| 서비스 피 (Service Fee) | 학생 납부 수령 시 (계약 시 아님) |
| 학교 커미션 | NET: 학교 송금 시점 / GROSS: Tax Invoice 발행 시점 |
| Cost Lines | `status=pending` 예약 → 실제 지급 시 비용 인식 |
| 인센티브 | 월말 KPI 집계 후 지급 시 (`5300 Incentive`) |

---

<a id="3-수익구조"></a>
## 3. 수익 구조 및 인식 시점

### 3.1 수익 4대 유형

```
┌──────────────────────────────────────────────────────────────┐
│                    수익 유형 분류                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ① 서비스 피 (Service Fee) — 직접 매출                        │
│     CoA: 3400 (Study Abroad), 3500 (Camp)                    │
│     인식: 학생 납부 시 즉시                                   │
│                                                               │
│  ② 학교 커미션 (Commission) — 핵심 수익                       │
│     CoA: 3100 (Tuition Commission)                           │
│     ├─ NET 방식  (pre_deduct): 학교 송금 시 즉시 인식        │
│     └─ GROSS 방식 (invoice):  Tax Invoice 발행 시 AR 인식    │
│                                  → 실수령 시 현금화          │
│                                                               │
│  ③ 숙소·투어 마진 (Margin)                                    │
│     AR - Partner Cost = Margin                               │
│                                                               │
│  ④ 서브커미션 수령 (passive income)                           │
│     파트너 계약 기반 수익                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 NET vs GROSS 방식

**설정 위치:** `agent_commission_configs.payment_method`

| 항목 | NET (`pre_deduct`) | GROSS (`invoice`) |
|------|-------------------|-------------------|
| 학교 송금액 | AR − 커미션 (± GST) | AR 전액 |
| 커미션 수령 | 즉시 (차감 방식) | 학교가 별도 역송금 |
| Tax Invoice 발행 | 송금 시 자동 | 개강 후 수동 |
| 매출 인식 | 즉시 (3100) | AR 인식(1300) → 실수령 시 전환 |
| GST (AUD 계좌) | 차감 처리 | Invoice 정산 시 납부 |
| 리스크 | 낮음 | 학교 미납 리스크 |

### 3.3 `agent_commission_configs` 테이블 구조

```sql
agent_commission_configs (
  partner_id       UUID FK → accounts,
  school_id        UUID FK → accounts,    -- NULL = 모든 학교 적용
  commission_type  VARCHAR(20),           -- 'percentage' | 'fixed'
  default_rate     DECIMAL(8,4),          -- 예: 0.1500 = 15%
  default_amount   DECIMAL(12,2),         -- 고정액
  default_base     VARCHAR(30),           -- 'gross' | 'net' | 'full_year_first_term'
  payment_method   VARCHAR(20),           -- 'pre_deduct' | 'invoice'
  payment_timing   VARCHAR(50),           -- 'on_enrolment' | 'on_completion' | 'termly'
  valid_from       DATE,
  valid_to         DATE,
  status           VARCHAR(20)
)
```

---

<a id="4-분개"></a>
## 4. 분개 (Journal Entries) — 자동화 엔진

### 4.1 실제 DB 테이블: `journal_entries`

```sql
journal_entries (
  id                 UUID PRIMARY KEY,
  entry_date         DATE NOT NULL,
  payment_header_id  UUID FK → payment_headers,
  payment_line_id    UUID FK → payment_lines,
  debit_coa          VARCHAR(10) NOT NULL FK → chart_of_accounts.code,
  credit_coa         VARCHAR(10) NOT NULL FK → chart_of_accounts.code,
  amount             DECIMAL(12,2) NOT NULL,
  description        TEXT,
  -- 다차원 집계용 FK
  student_account_id UUID FK → accounts,
  partner_id         UUID FK → accounts,
  staff_id           UUID FK → users,
  contract_id        UUID FK → contracts,
  invoice_id         UUID FK → invoices,
  entry_type         VARCHAR(50),
  auto_generated     BOOLEAN DEFAULT TRUE,
  created_by         UUID FK → users
)
```

### 4.2 ⚠️ CRITICAL — DR/CR 매핑이 **두 군데에 다르게** 정의됨

> **이것은 이 문서 전체에서 가장 중요한 주의사항입니다.**

두 개의 서로 다른 매핑 엔진이 공존합니다:

#### ① `journalEntryService.ts`의 `DR_CR_MAP` (세분화 - Service Layer)

키 형식: `${paymentType}:${splitType}` — 조합 기반

```typescript
// 위치: artifacts/api-server/src/services/journalEntryService.ts
const DR_CR_MAP = {
  "trust_receipt:tuition":        { debit: "1200", credit: "2100", entryType: "trust_receipt" },
  "trust_receipt:accommodation":  { debit: "1200", credit: "2300", entryType: "trust_receipt" },
  "trust_receipt:pickup":         { debit: "1200", credit: "2400", entryType: "trust_receipt" },
  "trust_receipt:insurance":      { debit: "1200", credit: "2200", entryType: "trust_receipt" },
  "direct:service_fee":           { debit: "1100", credit: "3400", entryType: "service_fee" },
  "direct:visa_fee":              { debit: "1100", credit: "3400", entryType: "service_fee" },
  "trust_transfer:*":             { debit: "2100", credit: "1200", entryType: "school_transfer" },
  "commission:pre_deduct":        { debit: "1200", credit: "3100", entryType: "commission_received" },
  "commission:invoice":           { debit: "1100", credit: "1300", entryType: "commission_received" },
  "cost_payment:sub_agent":       { debit: "4100", credit: "1100", entryType: "cost_payment" },
  "cost_payment:super_agent":     { debit: "4200", credit: "1100", entryType: "cost_payment" },
  "cost_payment:referral":        { debit: "4300", credit: "1100", entryType: "cost_payment" },
  "cost_payment:salary":          { debit: "5200", credit: "1100", entryType: "cost_payment" },
  "cost_payment:incentive":       { debit: "5300", credit: "1100", entryType: "cost_payment" },
};
```

#### ② `accounting-payments.ts`의 `JE_MAP` (단순화 - Route Layer)

키 형식: `paymentType` — 단독 기반

```typescript
// 위치: artifacts/api-server/src/routes/accounting-payments.ts
const JE_MAP = {
  trust_receipt:      { debit: "1200", credit: "1300" },  // ⚠️ CR=1300 (service와 다름!)
  trust_transfer:     { debit: "2100", credit: "1200" },
  commission:         { debit: "1100", credit: "3100" },
  direct:             { debit: "4700", credit: "1100" },
  service_fee_camp:   { debit: "1100", credit: "3500" },
  camp_tour_ap:       { debit: "4600", credit: "1100" },
  camp_institute_ap:  { debit: "4700", credit: "1100" },
};
```

#### ⚠️ 불일치 포인트 (미해결 이슈)

| paymentType | Service 매핑 (splitType별) | Route 매핑 (단독) |
|-------------|---------------------------|------------------|
| `trust_receipt` | CR: 2100/2200/2300/2400 (splitType별) | CR: **1300** |
| `trust_transfer` | CR: 1200 (동일) | CR: 1200 (동일) |
| `commission` | DR: 1200 또는 1100 (splitType별) | DR: **1100** (고정) |
| `direct` | DR: 1100 (service_fee) | DR: **4700** (반대!) |

**→ Claude Code 작업 시 새 paymentType 추가하거나 매핑 수정 시 반드시 두 곳 모두 업데이트할 것.**

### 4.3 실제 JE 생성 호출 경로

두 경로로 JE가 생성됩니다:

#### 경로 1: `createJournalEntriesForPaymentLine()` — 권장 방식

```typescript
// artifacts/api-server/src/services/journalEntryService.ts
export async function createJournalEntriesForPaymentLine(
  paymentLine: PaymentLineRow,
  paymentHeader: PaymentHeaderRow,
  createdBy: string,
  tx?: typeof db    // 트랜잭션 전달 시 atomic 보장
): Promise<void>
```

**특징:**
- `paymentLine` 단위로 호출 (Split Transaction 지원)
- `DR_CR_MAP` 사용 (세분화된 매핑)
- 트랜잭션 `tx` 주입 가능 → rollback 안전
- `contract_id`, `student_account_id` 자동 연결

#### 경로 2: `POST /api/accounting/payments` 라우트 내부 직접 INSERT

```typescript
// artifacts/api-server/src/routes/accounting-payments.ts
await db.transaction(async (tx) => {
  // 1. payment_headers INSERT
  // 2. payment_lines INSERT
  // 3. journal_entries INSERT (JE_MAP 사용)
  // 4. transactions INSERT (Legacy 호환)
});
```

**특징:**
- 라우트 핸들러 안에서 직접 JE INSERT
- `JE_MAP` 사용 (단순 매핑)
- Legacy `transactions` 테이블도 동시 생성 (호환성)

### 4.4 Split Transaction 처리

```sql
-- payment_headers (1건)
INSERT INTO payment_headers (
  payment_ref, contract_id, payment_date, total_amount,
  payment_type, received_from, paid_to, created_by
) VALUES (...);

-- payment_lines (N건, 총합 = total_amount)
INSERT INTO payment_lines (
  payment_header_id, invoice_id, contract_product_id,
  coa_code, split_type, amount, staff_id
) VALUES
  (header_id, inv_id, cp_id, '2100', 'tuition',     4000.00, staff_id),
  (header_id, NULL,   NULL,  '2200', 'visa_fee',     500.00, staff_id),
  (header_id, NULL,   NULL,  '3400', 'service_fee',  500.00, staff_id);

-- journal_entries (paymentLine별 자동 생성)
-- 각 line마다 DR/CR 페어 1건 INSERT
```

### 4.5 이중 분개 검증

현재 `journalEntryService.ts`에는 기본 검증 함수가 있으나, **라우트 레벨에서 강제 실행하지 않음**:

```typescript
export function validateDoubleEntry(entries: JournalEntryDraft[]): void {
  const totalDR = entries.reduce((s, e) => s + e.amount, 0);
  const totalCR = entries.reduce((s, e) => s + e.amount, 0);
  if (Math.abs(totalDR - totalCR) > 0.001) {
    throw new Error(`Journal imbalance: DR=${totalDR} CR=${totalCR}`);
  }
}
```

### 4.6 Master 분개 매핑표 (실제 코드 기반)

| 거래 단계 | paymentType | splitType | DR | CR | 매핑 출처 |
|----------|------------|-----------|----|----|----------|
| 학생 학비 납부 (Trust) | `trust_receipt` | `tuition` | 1200 | 2100 | Service |
| 학생 숙소비 납부 (Trust) | `trust_receipt` | `accommodation` | 1200 | 2300 | Service |
| 학생 픽업비 납부 (Trust) | `trust_receipt` | `pickup` | 1200 | 2400 | Service |
| 학생 보험료 납부 (Trust) | `trust_receipt` | `insurance` | 1200 | 2200 | Service |
| 서비스피 직접 수령 | `direct` | `service_fee` | 1100 | 3400 | Service |
| 비자피 직접 수령 | `direct` | `visa_fee` | 1100 | 3400 | Service |
| 학교 학비 송금 | `trust_transfer` | (any) | 2100 | 1200 | Service/Route |
| 커미션 수령 (NET) | `commission` | `pre_deduct` | 1200 | 3100 | Service |
| 커미션 수령 (GROSS) | `commission` | `invoice` | 1100 | 1300 | Service |
| Sub-agent 커미션 지급 | `cost_payment` | `sub_agent` | 4100 | 1100 | Service |
| Super-agent 커미션 지급 | `cost_payment` | `super_agent` | 4200 | 1100 | Service |
| Referral 소개비 지급 | `cost_payment` | `referral` | 4300 | 1100 | Service |
| 직원 기본급 지급 | `cost_payment` | `salary` | 5200 | 1100 | Service |
| 직원 인센티브 지급 | `cost_payment` | `incentive` | 5300 | 1100 | Service |
| **Camp 서비스피** | `service_fee_camp` | — | 1100 | 3500 | Route 전용 |
| **Camp 투어 AP** | `camp_tour_ap` | — | 4600 | 1100 | Route 전용 |
| **Camp Institute AP** | `camp_institute_ap` | — | 4700 | 1100 | Route 전용 |

---

<a id="5-파트너송금"></a>
## 5. 서비스 파트너 비용 송금 (AP Settlement)

### 5.1 파트너 유형별 매핑

| 파트너 유형 | AP CoA | COGS CoA | Cost Type | Cost Center (Legacy) |
|------------|--------|----------|-----------|--------------------|
| 학교 (School) | 2100 | — (AR 상계) | — | — |
| 숙소 제공자 | 2300 | — | — | CC-HOTEL |
| 픽업 파트너 | 2400 | — | — | CC-PICKUP |
| 보험사 | 2200 | — | — | — |
| Sub-agent | — | 4100 | `sub_agent` | CC-AGENT |
| Super-agent | — | 4200 | `super_agent` | CC-AGENT |
| Referral 파트너 | — | 4300 | `referral` | CC-AGENT |
| 투어 업체 (Camp) | — | 4600 | `other` | CC-TOUR |
| Institute (Camp) | — | 4700 | `other` | CC-INSTITUTE |

### 5.2 AP 승인·지급 워크플로우

```
① AR 완납 확인 (Legacy: contract_finance_items.status='paid')
      │
      ▼
② Manager 승인
      │   ⚠️ financeDelegationGuard 체크 필수 (camp_coordinator)
      ▼
③ POST /api/accounting/payments
      │   paymentType: 'trust_transfer'
      │   paidTo: partner_account_id
      │   lines: [{ coaCode, splitType, amount, ... }]
      │
      ▼
④ 트랜잭션 내부 자동 처리:
      ├─ payment_headers INSERT
      ├─ payment_lines INSERT
      ├─ journal_entries INSERT (DR AP / CR Trust)
      └─ transactions INSERT (Legacy 호환)
      │
      ▼
⑤ (옵션) Tax Invoice 생성
      ├─ NET: 자동 발행 (generateTaxInvoice 호출)
      └─ GROSS: 알림 후 수동 발행
      │
      ▼
⑥ product_cost_lines.status → 'paid'
      (cost line 지급인 경우)
```

### 5.3 권한 위임 가드 — `financeDelegationGuard.ts`

**위치:** `artifacts/api-server/src/lib/financeDelegationGuard.ts`

**Camp Coordinator의 재무 작업은 반드시 위임 권한 검증 필수:**

```typescript
// accounting-payments.ts 실제 사용 예
if (user.role === "camp_coordinator" && user.organisationId && contractId) {
  const pgId = await resolvePackageGroupIdFromContractId(contractId);
  if (pgId) {
    const ok = await assertFinanceDelegation(
      res,
      user.organisationId,
      user.id,
      pgId,
      "edit",    // 작업 유형
      req.ip
    );
    if (!ok) return;  // 권한 없으면 차단
  }
}
```

**규칙:**
- `super_admin`, `admin`, `finance`: 전체 재무 작업 가능
- `camp_coordinator`: **PackageGroup 단위로 위임된 경우에만** 가능
- 기타 역할: 재무 수정 작업 불가 (`STAFF_ROLES`에서 확인)

### 5.4 `product_cost_lines` 기반 지급 목록 쿼리

```sql
-- 지급 대기 목록
SELECT
  pcl.id,
  pcl.cost_type,              -- sub_agent | super_agent | referral | incentive | other
  pcl.calculated_amount,
  pcl.coa_code,               -- 4100 | 4200 | 4300 | 4600 | 4700 | 5300
  a.name AS partner_name,
  pcl.status
FROM product_cost_lines pcl
LEFT JOIN accounts a ON pcl.partner_id = a.id
WHERE pcl.status = 'pending'
  AND pcl.paid_at IS NULL
ORDER BY pcl.modified_on DESC;

-- 지급 완료 후 업데이트
UPDATE product_cost_lines
SET status = 'paid',
    paid_at = NOW(),
    payment_header_id = $1
WHERE id = ANY($2::uuid[]);
```

### 5.5 Tax Invoice 발행 (학교용 커미션 문서)

**테이블:** `tax_invoices`
**서비스:** `artifacts/api-server/src/services/taxInvoiceService.ts`

```ts
generateTaxInvoice({
  invoiceType: 'commission',   // 세금계산서 유형
  contractProductId,
  contractId,
  schoolAccountId,
  studentAccountId,
  commissionAmount,
  isGstFree,                   // true: 해외 / false: 호주 10% GST
  paymentHeaderId,
});

// GST 계산: ATO 1/11 방식
// gstAmt = commissionAmt / 11 (isGstFree=false 시)
// totalAmt = commissionAmt + gstAmt
```

---

<a id="6-kpi"></a>
## 6. 직원 KPI 및 인센티브

### 6.1 현재 구현 상태 — ⚠️ **부분 구현**

| 항목 | 상태 |
|------|------|
| `staff_id` 귀속 (`journal_entries`, `payment_lines`) | ✅ 스키마 존재 |
| 실시간 귀속 매출 쿼리 가능 | ✅ 가능 |
| `staff_kpi_periods` 캐시 테이블 | ❌ **미구현** |
| `incentive_tiers` 티어 구조 | ❌ **미구현** |
| KPI 집계 크론잡 | ❌ 미구현 |
| 인센티브 자동 계산 | ❌ 미구현 |
| 승인 워크플로우 | ❌ 미구현 |

### 6.2 현재 가능한 귀속 추적 (실시간 쿼리)

```sql
-- 특정 직원의 월별 귀속 매출 (journal_entries 기반)
SELECT
  staff_id,
  DATE_TRUNC('month', entry_date) AS period,
  SUM(amount) AS attributed_revenue
FROM journal_entries
WHERE staff_id = $1
  AND entry_type IN ('commission_received', 'service_fee')
  AND credit_coa LIKE '3%'    -- 매출 계정만
  AND entry_date BETWEEN $2 AND $3
GROUP BY staff_id, DATE_TRUNC('month', entry_date);

-- 입금 처리 건수 (payment_lines.staff_id 기반)
SELECT
  staff_id,
  COUNT(*) AS payment_count,
  SUM(amount) AS total_processed
FROM payment_lines
WHERE staff_id = $1
  AND split_type IN ('tuition', 'service_fee')
  AND created_on BETWEEN $2 AND $3
GROUP BY staff_id;
```

### 6.3 🎯 TO-BE — 도입 예정 구조

**`staff_kpi_periods` 캐시 테이블 (도입 필요):**

```sql
CREATE TABLE staff_kpi_periods (
  id                       UUID PRIMARY KEY,
  staff_id                 UUID NOT NULL FK → users,
  period_type              VARCHAR(20) NOT NULL,   -- monthly | term
  period_start             DATE NOT NULL,
  period_end               DATE NOT NULL,
  -- KPI 집계
  lead_count               INTEGER DEFAULT 0,
  conversion_count         INTEGER DEFAULT 0,
  conversion_rate          DECIMAL(8,4),
  attributed_revenue       DECIMAL(12,2) DEFAULT 0,
  payment_processed_count  INTEGER DEFAULT 0,
  visa_granted_count       INTEGER DEFAULT 0,
  -- 인센티브
  incentive_rate           DECIMAL(8,4),
  incentive_amount         DECIMAL(12,2) DEFAULT 0,
  bonus_tier               VARCHAR(50),            -- standard | silver | gold | platinum
  -- 승인 흐름
  status                   VARCHAR(20) DEFAULT 'draft',
  approved_by              UUID FK → users,
  approved_at              TIMESTAMP,
  paid_at                  TIMESTAMP,
  UNIQUE (staff_id, period_type, period_start)
);
```

**`incentive_tiers` 티어 테이블 (도입 필요):**

```sql
CREATE TABLE incentive_tiers (
  id          UUID PRIMARY KEY,
  account_id  UUID FK → accounts,        -- 지사별 또는 개인별
  from_amount DECIMAL(12,2),
  to_amount   DECIMAL(12,2),
  rate        DECIMAL(8,4),
  tier_name   VARCHAR(50)                -- 'Tier 1' | 'Silver' | 'Gold'
);
```

### 6.4 KPI 집계 크론잡 의사코드 (향후 구현)

```ts
// artifacts/api-server/src/jobs/aggregate-kpi.ts (신규 필요)
// 매일 자정 + 월말 최종 확정

async function aggregateStaffKPI(
  staffId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // 1. Lead 수 (leads.assigned_staff_id)
  const leadCount = await countLeads(staffId, periodStart, periodEnd);

  // 2. 계약 전환 수 (contracts.owner_id)
  const conversionCount = await countContracts(staffId, periodStart, periodEnd);

  // 3. 귀속 매출 (journal_entries.staff_id + credit_coa LIKE '3%')
  const attributedRevenue = await sumAttributedRevenue(staffId, periodStart, periodEnd);

  // 4. Tier 계산 (incentive_tiers 조회)
  const tier = await calculateTier(attributedRevenue, staffId);
  const incentive = await calculateTieredIncentive(attributedRevenue, staffId);

  // 5. Upsert staff_kpi_periods
  await db.staff_kpi_periods.upsert({ ... });
}
```

### 6.5 인센티브 지급 워크플로우 (향후)

```
매월 말일
  ↓
[자동 집계] staff_kpi_periods (status='draft') 생성
  ↓
[매니저 검토] 귀속 매출·전환율 검증
  ↓
[승인] status='approved' + approved_by 기록
  ↓
[지급 실행] POST /api/accounting/payments
             paymentType: 'cost_payment'
             splitType: 'incentive'
  ↓
[자동 JE 생성] DR 5300 / CR 1100
  ↓
[status='paid' + paid_at 기록]
```


---

<a id="7-api"></a>
## 7. 실제 API 엔드포인트 맵

### 7.1 Legacy Finance System (`/api/finance/*`)

**위치:** `artifacts/api-server/src/routes/finance.ts`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/finance/invoices` | 인보이스 목록 (filter: contractId, status, invoiceType) |
| POST | `/api/finance/invoices` | 인보이스 생성 + `account_ledger_entries` 자동 생성 |
| GET | `/api/finance/invoices/:id` | 인보이스 상세 |
| PUT | `/api/finance/invoices/:id` | 인보이스 수정 |
| POST | `/api/finance/invoices/:id/send-email` | 이메일 발송 (Resend API) |
| GET | `/api/finance/transactions` | 거래 목록 |
| POST | `/api/finance/transactions` | 거래 생성 + `account_ledger_entries` 생성 (payment_received 시) |
| GET | `/api/finance/receipts` | 영수증 목록 |
| POST | `/api/finance/receipts` | 영수증 생성 |
| POST | `/api/finance/exchange-rates/sync` | 환율 동기화 |

### 7.2 Legacy Contract Finance (`/api/contracts/:id/finance`)

**위치:** `artifacts/api-server/src/routes/contract-finance.ts`

| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/contracts/:id/finance` | 계약별 재무 요약 (`buildFinanceSummary`) |
| POST | `/api/contracts/:id/finance/auto-generate` | `contract_finance_items` 자동 생성 |
| POST | `/api/finance/items/:itemId/confirm-payment` | 지급 확인 + Receipt 생성 |

### 7.3 Legacy My Accounting (`/api/my-accounting/*`)

| 경로 | 설명 |
|------|------|
| `/my-accounting/settlements` | 스태프 개인 정산 내역 |
| `/my-accounting/invoices` | 스태프 개인 인보이스 |
| `/my-accounting/revenue` | 스태프 개인 수익 요약 |

### 7.4 New Accounting System (`/api/accounting/*`)

**위치:** `artifacts/api-server/src/routes/accounting-*.ts`

#### Payments (`accounting-payments.ts`)
| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/accounting/journal-entries` | 분개장 (감사용, limit 200) |
| GET | `/api/accounting/payments` | Payment Header 목록 |
| GET | `/api/accounting/payments/:id` | Payment 상세 (lines + JEs 포함) |
| POST | `/api/accounting/payments` | **Payment + Lines + JE + Transaction 원자적 생성** |
| PATCH | `/api/accounting/payments/:id` | Payment 수정 |
| GET | `/api/accounting/payments-lookup/accounts` | 계정 검색 |
| GET | `/api/accounting/payments-lookup/contracts` | 계약 검색 |
| GET | `/api/accounting/payments-lookup/contracts/:id/products` | 계약별 Product 목록 |
| GET | `/api/accounting/payments/by-contract/:contractId` | 계약별 결제 이력 |
| GET | `/api/accounting/ledger/by-account/:accountId` | 계정별 원장 |

#### CoA (`accounting-coa.ts`)
| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/accounting/coa` | 계정과목 목록 |
| POST | `/api/accounting/coa` | 계정과목 생성 (admin) |
| PATCH | `/api/accounting/coa/:code` | 계정과목 수정 |

#### AR/AP (`accounting-arap.ts`)
| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/accounting/arap` | AR/AP 현황 |
| GET | `/api/accounting/arap/aging` | Aging 분석 |

#### Transactions (`accounting-transactions.ts`)
| 메소드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/accounting/transactions` | 거래 목록 (확장 필드 포함) |
| POST | `/api/accounting/transactions` | Create Transaction 폼 전용 |

### 7.5 권한 역할 매트릭스

```typescript
// 실제 코드 기반
const STAFF_ROLES = [
  "super_admin",
  "admin",
  "finance",
  "admission",
  "team_manager",
  "camp_coordinator"   // ⚠️ financeDelegationGuard 필요
];

const ADMIN_ROLES = ["super_admin", "admin"];
```

| 역할 | GET 권한 | POST/PATCH 권한 | 특이사항 |
|------|---------|----------------|---------|
| `super_admin` | 모든 엔드포인트 | 모든 엔드포인트 | 제한 없음 |
| `admin` | 모든 엔드포인트 | 모든 엔드포인트 | 제한 없음 |
| `finance` | 모든 finance | 모든 finance | 재무 전담 |
| `admission` | 조회 가능 | 일부만 (invoice 생성) | 입학 관련 |
| `team_manager` | 팀 범위 | 팀 범위 | 팀원 작업 승인 |
| `camp_coordinator` | 위임된 PackageGroup | 위임된 PackageGroup | `financeDelegationGuard` 필수 |

---

<a id="8-가이드라인"></a>
## 8. Claude Code 작업 가이드라인

### 8.1 작업 전 필수 체크리스트

```bash
# 1. 스키마 실제 확인 (추측 금지)
cat lib/db/src/schema/accounting.ts   # New Accounting 테이블
cat lib/db/src/schema/finance.ts      # Legacy + 공유 테이블
cat lib/db/src/schema/contracts.ts    # contract_products 위치

# 2. JE 매핑 엔진 확인 (⚠️ 두 군데 모두)
cat artifacts/api-server/src/services/journalEntryService.ts
grep -A 20 "JE_MAP" artifacts/api-server/src/routes/accounting-payments.ts

# 3. 권한 가드 확인
cat artifacts/api-server/src/lib/financeDelegationGuard.ts

# 4. 관련 라우트 확인
cat artifacts/api-server/src/routes/accounting-payments.ts
cat artifacts/api-server/src/routes/finance.ts
```

### 8.2 ✅ 반드시 지킬 것

| # | 규칙 |
|---|------|
| 1 | **Legacy는 건드리지 않음** — Camp, Agent Invoice 관련 코드는 유지만 |
| 2 | **새 Finance 기능은 New Accounting 시스템에 추가** |
| 3 | CoA 코드는 `COA` 상수로 추출 후 사용 (하드코딩 금지) |
| 4 | DR_CR_MAP 수정 시 **journalEntryService.ts + accounting-payments.ts 양쪽 모두** 업데이트 |
| 5 | Payment 저장 시 **반드시 `db.transaction()`** 사용 (원자적 보장) |
| 6 | `financeDelegationGuard` — camp_coordinator 역할 재무 작업 시 필수 검증 |
| 7 | Split 합계 = header total_amount (DB 레벨 제약은 없으나 앱 레벨 검증 필수) |
| 8 | 저장 전 TypeScript 오류 0개 확인 (`npx tsc --noEmit`) |

### 8.3 ❌ 절대 하지 말 것

| # | 금지 사항 | 이유 |
|---|----------|------|
| 1 | `chart_of_accounts` 코드 임의 삭제 | FK 연쇄 오류 |
| 2 | `journal_entries` 수동 INSERT | 분개 정합성 파괴 |
| 3 | `ar_amount`, `ap_amount` 직접 수정 | `contract_products`가 원천 |
| 4 | DR_CR_MAP 한 곳만 수정 | 이중 매핑 불일치 악화 |
| 5 | `contract_finance_items` 스키마 변경 | Legacy Camp 시스템 깨짐 |
| 6 | `payment_lines` 저장 시 트랜잭션 누락 | JE 부분 생성으로 DR≠CR |
| 7 | `financeDelegationGuard` 우회 | 권한 통제 무너짐 |
| 8 | `user_ledger`와 `journal_entries` 혼용 | 두 시스템 경계 파괴 |

### 8.4 새 Finance 기능 추가 시 권장 절차

```
Step 1: 어느 시스템에 추가할지 결정
  ├─ Camp/Agent 관련? → Legacy
  └─ 그 외 모든 것?  → New Accounting (기본값)

Step 2: CoA 코드 필요 여부 확인
  ├─ 기존 코드로 충분? → 그대로 사용
  └─ 신규 코드 필요?  → chart_of_accounts INSERT (admin 승인)

Step 3: paymentType 필요 여부 확인
  ├─ 기존 type 재사용? → DR_CR_MAP 확인 후 사용
  └─ 신규 type 필요?  → DR_CR_MAP + JE_MAP **양쪽 모두** 추가

Step 4: 트랜잭션 경계 설계
  ├─ Payment Header + Lines + JE: 반드시 한 트랜잭션
  └─ 관련 notification, email: 트랜잭션 밖 (try/catch)

Step 5: 테스트
  ├─ npx tsc --noEmit (TypeScript)
  ├─ npm run dev (서버 기동)
  └─ 실제 API 호출 후 DB 확인
```

### 8.5 DB 검증 쿼리 (수정 후 실행)

```sql
-- 1. 최근 생성된 JE 3건 확인
SELECT id, entry_date, debit_coa, credit_coa, amount, entry_type, auto_generated
FROM journal_entries
ORDER BY created_on DESC LIMIT 3;

-- 2. DR/CR 균형 검증 (최근 1시간)
SELECT
  payment_header_id,
  SUM(CASE WHEN debit_coa IS NOT NULL THEN amount ELSE 0 END) AS dr_total,
  SUM(CASE WHEN credit_coa IS NOT NULL THEN amount ELSE 0 END) AS cr_total
FROM journal_entries
WHERE created_on > NOW() - INTERVAL '1 hour'
GROUP BY payment_header_id;
-- DR ≠ CR 건이 있으면 조사 필요

-- 3. payment_lines 합계 vs header 일치 검증
SELECT
  ph.id, ph.total_amount,
  SUM(pl.amount) AS line_sum,
  ph.total_amount - SUM(pl.amount) AS diff
FROM payment_headers ph
LEFT JOIN payment_lines pl ON pl.payment_header_id = ph.id
WHERE ph.created_on > NOW() - INTERVAL '1 hour'
GROUP BY ph.id, ph.total_amount
HAVING ABS(ph.total_amount - COALESCE(SUM(pl.amount), 0)) > 0.01;
```

---

<a id="9-로드맵"></a>
## 9. 마이그레이션 로드맵

### 9.1 Phase A — KPI 캐시 도입 (우선)

**목표:** 실시간 쿼리 부담 해소, 인센티브 자동 계산 기반 마련

```
Phase A 작업:
  1. staff_kpi_periods 테이블 마이그레이션 생성
  2. incentive_tiers 테이블 마이그레이션 생성
  3. aggregate-kpi.ts 크론잡 구현
  4. /api/kpi/* 라우트 신설
  5. KPI Dashboard UI (/kpi/my-dashboard)
```

### 9.2 Phase B — DR_CR 매핑 통합

**목표:** 두 매핑 엔진 일원화

```
Phase B 작업:
  1. accounting-payments.ts의 JE_MAP 제거
  2. 모든 JE 생성을 createJournalEntriesForPaymentLine 호출로 통일
  3. journalEntryService.ts에 Camp 전용 paymentType 추가
     - service_fee_camp, camp_tour_ap, camp_institute_ap
  4. 기존 이중 매핑으로 생성된 JE 감사 및 정합성 검증
```

### 9.3 Phase C — Payable Items 큐 도입

**목표:** 파트너 지급 대기열 체계화

```
Phase C 작업:
  1. payable_items 테이블 신설
  2. product_cost_lines → payable_items 자동 생성 트리거
  3. 일괄 승인/지급 UI 구현
```

### 9.4 Phase D — Legacy 통합 (장기)

**목표:** Dual System → Single System

```
Phase D 작업 (장기 로드맵):
  1. contract_finance_items → contract_products + product_cost_lines 마이그레이션 도구
  2. Cost Center 코드 → CoA 코드 매핑 테이블
  3. user_ledger → journal_entries 병합
  4. /api/my-accounting/* → /api/accounting/staff/* 리팩토링
  5. Legacy 라우트 deprecation + 최종 제거
```

---

<a id="10-경고"></a>
## 10. ⚠️ 알려진 이슈 및 경고

### 10.1 🔴 CRITICAL — DR_CR 매핑 이중화

**문제:** 동일한 `paymentType='trust_receipt'`에 대해:
- `journalEntryService.ts`: CR = `2100` (AP Tuition)
- `accounting-payments.ts`: CR = `1300` (AR Commission)

**영향:** 어느 경로로 Payment가 처리되느냐에 따라 분개 결과가 다름
**조치 필요:** Phase B에서 통합
**우회법 (현재):** `trust_receipt`는 `journalEntryService`로만 처리, `accounting-payments.ts`의 해당 매핑은 참고용으로만 존재

### 10.2 🟡 WARNING — 이중 분개 검증이 강제되지 않음

**문제:** `validateDoubleEntry()` 함수는 존재하나, 라우트에서 강제 호출되지 않음

**조치:**
- 새 Payment 관련 라우트 작성 시 **반드시 validateDoubleEntry 호출 추가**
- 저장 전 DR ≠ CR 검증

### 10.3 🟡 WARNING — Camp 전용 paymentType 존재

**이유:** Camp 워크플로우 특수성 (institute, tour 등)
**매핑:**
- `service_fee_camp`, `camp_tour_ap`, `camp_institute_ap`
- 오직 `accounting-payments.ts`의 `JE_MAP`에만 정의됨

**조치:**
- Camp 관련 작업 시 이 paymentType 사용
- 일반 유학 상담에서는 사용 금지

### 10.4 🟡 WARNING — Invoice 자동 발행 미구현

**현재:** AR due_date 기반 자동 발행 없음 → 스태프 수동 발행
**영향:** 정기 청구(guardian 등) 서비스의 반복 인보이스 수동 처리
**조치 필요:** 별도 크론잡 구현 (Phase C 근처)

### 10.5 🟡 WARNING — BK ≠ MGR 규칙이 DB 제약으로 강제되지 않음

**현재:** `payment_headers.created_by` ≠ `approved_by` 검증이 앱 레벨에만 존재
**조치:** 라우트 핸들러에서 반드시 `if (createdBy === approvedBy) throw Error` 추가

### 10.6 🟢 INFO — Receipt Signed URL TTL 900초

**출처:** `receiptPdfService.ts`
**내용:** GCS에 업로드된 Receipt PDF의 Signed URL은 **900초(15분)** 후 만료
**영향:** 이메일 링크 유효기간 짧음 — 고객이 뒤늦게 클릭 시 재발급 필요

### 10.7 🟢 INFO — 환율 자동 적용 미확인

**테이블:** `exchange_rates` 존재, `invoices`/`transactions`에 `exchange_rate_to_aud` 필드 존재
**현재 상태:** 환율 저장은 되나, 자동 AUD 환산 로직 일관성 미확인
**조치:** 환율 관련 기능 구현 시 `exchangeRateSync.ts` 서비스 확인 필요

---

<a id="부록-a"></a>
## 부록 A. 전체 테이블 레퍼런스

### A.1 Legacy Finance (lib/db/src/schema/finance.ts)

| 테이블 | 역할 | 상태 | 주요 변경 |
|--------|------|------|----------|
| `exchange_rates` | 환율 마스터 | ✅ 공유 | — |
| `banking` | 은행 계좌 마스터 | ✅ 공유 | — |
| `invoices` | 통합 인보이스 (양 시스템 공유) | ✅ 공유 | `account_id` FK 추가★ |
| `invoice_products` | 분할 청구 라인 (1 CP → N IP) | ✅ **신설★** | Migration 0015 |
| `transactions` | Legacy 거래 + 확장 필드 | ✅ Legacy | — |
| `receipts` | 영수증 | ✅ Legacy | `payment_header_id` 추가★ |
| `contract_finance_items` | Camp/Agent 재무 항목 | ✅ Legacy 전용 | — |
| `user_ledger` | 스태프 개인 원장 | ✅ Legacy 전용 | — |
| `account_ledger_entries` | 계정별 원장 (파트너·학생별) | ✅ 양쪽 사용 | — |

★ Migration 0015 (2026-04-26)

### A.2 New Accounting (lib/db/src/schema/accounting.ts)

| 테이블 | 역할 | 상태 |
|--------|------|------|
| `chart_of_accounts` | CoA 마스터 | ✅ 실재 |
| `product_cost_lines` | Product별 비용 의무 (N:1) | ✅ 실재 |
| `payment_headers` | 자금 이동 헤더 | ✅ 실재 |
| `payment_lines` | Split 분할 라인 | ✅ 실재 |
| `journal_entries` | 이중 분개 (자동 생성) | ✅ 실재 |
| `agent_commission_configs` | 파트너 커미션 조건 | ✅ 실재 |
| `tax_invoices` | 학교용 세금계산서 | ✅ 실재 |
| `payment_statements` | 결제 명세서 | ✅ 실재 |
| `cost_centers` | Cost Center 코드 마스터 (Legacy 호환) | ✅ 실재 |
| `payment_infos` | 결제 수단 마스터 | ✅ 실재 |

### A.3 New Accounting — 주요 컬럼 변경 (Migration 0015)

| 테이블 | 파일 | 추가 컬럼 | 내용 |
|--------|------|----------|------|
| `contracts` | `contracts.ts` | `quote_id` UNIQUE+FK | Quote → Contract 1:1 보장 |
| `contract_products` | `contracts.ts` | `ap_trigger` (`on_ar_paid`) | AR 완납 시 AP 자동 전환 트리거 기준 |
| `contract_products` | `contracts.ts` | `invoice_count` | 분할 청구 횟수 누적 카운터 |
| `invoices` | `finance.ts` | `account_id` FK | Invoice 귀속 Account |
| `receipts` | `finance.ts` | `payment_header_id` | Payment Header 1:1 Receipt 연결 |
| `accommodation_mgt` | `services.ts` | `billing_cycle` | monthly / per_term 반복 청구 |

### A.4 🎯 TO-BE — 향후 도입 예정 테이블

| 테이블 | 목적 | Phase |
|--------|------|-------|
| `staff_kpi_periods` | KPI 집계 캐시 | Phase A |
| `incentive_tiers` | 티어별 인센티브 구간 | Phase A |
| `payable_items` | 지급 대기 큐 | Phase C |

### A.4 핵심 서비스 파일

| 파일 | 역할 | 시스템 |
|------|------|-------|
| `services/journalEntryService.ts` | DR/CR 자동 생성 엔진 | New |
| `services/contractFinanceService.ts` | 계약 → 재무 자동 생성 | Legacy |
| `services/taxInvoiceService.ts` | Tax Invoice 생성 (GST 포함) | New |
| `services/ledgerService.ts` | `account_ledger_entries` 조작 | 공유 |
| `services/receiptPdfService.ts` | Receipt PDF + GCS 업로드 | Legacy |
| `services/exchangeRateSync.ts` | 환율 동기화 | 공유 |
| `lib/financeDelegationGuard.ts` | 권한 위임 검증 | New |

---

<a id="부록-b"></a>
## 부록 B. 작업 완료 보고 템플릿

Finance 관련 코드 수정 후 반드시 아래 형식으로 보고:

```
✅ 수정된 파일:
  - [파일 경로 목록]

✅ 수정 내용:
  - [변경 내용 요약]

✅ 시스템 선택:
  - [ ] Legacy Finance (Camp/Agent)
  - [ ] New Accounting (표준 유학)
  - [ ] Both (공유 테이블 수정)

✅ 검증 결과:
  - tsc: ✓ 오류 0개 / ✗ [오류 수]
  - 서버 기동: ✓ 정상 / ✗ [오류]
  - DB 검증:
    * journal_entries 최근 3건: [결과]
    * DR=CR 균형 확인: [결과]
    * payment_lines 합계 일치: [결과]
  - API 응답: [상태 코드 + 샘플]

✅ 영향 범위:
  - [영향받는 라우트/페이지 목록]

⚠️  남은 이슈:
  - [있는 경우]

⚠️  다음 작업 제안:
  - [있는 경우]
```

---

## 문서 변경 이력

| 날짜 | 버전 | 변경 사항 | 작성자 |
|------|------|----------|--------|
| 2026-04-22 | v1.0 | 초판 작성 — 실제 코드 검증 기반 | Claude + Sun Kim |
| 2026-04-26 | v1.1 | Migration 0015 Finance Workflow Gaps 6개 반영 | Claude + Sun Kim |
| 2026-04-26 | v1.2 | 섹션 W (워크플로우 데이터 룰 전체) 신설, 부록 A 업데이트 | Claude + Sun Kim |

---

*© Edubee.Co — 내부 개발 참조 문서*
*Single Source of Truth for Finance Module*
*최종 검토: Jason KIM 대표 필수*

