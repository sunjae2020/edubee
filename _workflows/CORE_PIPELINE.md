# CORE_PIPELINE.md — 핵심 비즈니스 파이프라인

> 최초 생성: 2026-04-19 | **최종 업데이트: 2026-04-26 (Migration 0015 반영)**
> 소스: routes/crm-leads.ts, crm-quotes.ts, crm-contracts.ts, finance.ts, accounting-payments.ts

---

## 1. 전체 파이프라인 흐름 (Time Study 워크플로우 기준)

```
[상담]            [견적]              [계약]                [청구]              [수금]            [완료]
Lead           Quote            Contract             Invoice           Payment Header    Receipt
(QUALIFIED) ──→ (1:N QP) ──→ (1:1 Account) ──→ (1:N IP★) ──→ (1:N Lines) ──→ (1:1★)
   │               │                │                  │               │
   │          Quote Products    Contract Products  Invoice Products★  Payment Lines   Journal Entry
   │          (항목별 금액)      (AR/AP 일정)       (분할 청구★)      (Split)         (이중 분개)
   │                            product_cost_lines                                  product_cost_lines
   │                            (비용 의무)                                          (→ paid★)
   │
   └──→ [반복 청구] parent_invoice_id + is_recurring (guardian/accommodation billing_cycle★)
```

★ = Migration 0015 (2026-04-26) 적용

---

## 2. 단계별 상세

### STEP 1: Lead (리드) 생성

**생성 API:**
```
POST /api/leads
```

**필수 입력 필드:**
```json
{
  "fullName": "홍길동",
  "email": "student@example.com",
  "phone": "010-1234-5678",
  "nationality": "KR",
  "source": "web",
  "organisationId": "uuid"
}
```

**자동 생성:**
- `lead_ref_number` 자동 채번 (예: `LD-2604-0001`)
- `status` 기본값: `new`

**다음 단계 트리거:**
- Lead `status = QUALIFIED` → Quote 생성 (`quotes.lead_id` 연결)

---

### STEP 2: Quote (견적) 생성

**생성 API:**
```
POST /api/quotes
POST /api/quote-products
```

**데이터 룰:**
- `quotes.lead_id` → Lead 연결 (1:N, 하나의 Lead에서 여러 Quote 생성 가능)
- `quote_products.quote_id` → Quote 항목 (1:N)
- Quote는 최대 1개의 Contract로만 변환 (`contracts.quote_id` UNIQUE★)
- 변환 후 Quote는 잠김 (수정 불가)

**Quote Products 필드:**
- `name`, `price`, `quantity`, `service_module_type`
- `is_initial_payment` — 초기 납입 여부
- `provider_account_id` — 파트너 기관

**상태 전이:**
```
Draft → Sent → Accepted → (Contract 생성, Quote 잠김)
             → Declined
      → Expired (expiryDate 초과)
```

---

### STEP 3: Application (신청서)

**생성 API:**
```
POST /api/applications
POST /api/camp-applications   (캠프 전용)
```

**Application → Contract 연결:**
- `contracts.application_id` (UNIQUE FK)
- 하나의 Application에 하나의 Contract만 생성 가능

---

### STEP 4: Contract (계약) 생성

**생성 API:**
```
POST /api/contracts
```

**데이터 룰:**
- Contract는 반드시 1개의 Account에 귀속 (`contracts.account_id`, Student/Client 타입)
- Quote에서 변환 시 모든 Quote Products → Contract Products 스냅샷 복사 (가격·커미션 시점 보존)
- `contracts.quote_id` UNIQUE FK — Quote → Contract 1:1 보장★

**Contract Products (AR/AP):**
```
POST /api/contract-products
```
- `ar_amount` — 학생에게 받을 금액
- `ap_amount` — 파트너에게 지급할 금액
- `ar_due_date`, `ap_due_date`
- `ar_status` 기본: `scheduled` / `ap_status` 기본: `pending`
- `ap_trigger` 기본: `on_ar_paid`★ — AR 완납 시 AP `pending→ready` 자동 전환 트리거
- `invoice_count`★ — 분할 청구 횟수 누적
- **⚠️ 검증**: `ap_due_date < ar_due_date` → 400 에러 (crm-contracts.ts:652)

**product_cost_lines (비용 의무):**
- `contract_product_id` 당 N개 (sub_agent, super_agent, referral, incentive, other)
- `coa_code` 기반 CoA 연결
- `status='pending'` → AP 송금 완료 시 `'paid'` + `payment_header_id` 기록

**상태 전이:**
```
draft → active → completed
             → on_hold
             → cancelled
```

---

### STEP 5: Invoice + Invoice Products (청구)

**API:**
```
GET  /api/invoices
POST /api/invoices
POST /api/invoice-products   (분할 청구 라인★)
```

**데이터 룰:**
- Invoice는 반드시 1개의 Contract + 1개의 Account에 귀속 (`invoices.account_id`★)
- 1 Contract Product → N Invoice Products (분할 청구★)
  - `invoice_products.contract_product_id` + `invoice_products.invoice_id`
  - Contract Product의 `invoice_count` 누적 카운터로 분할 횟수 추적★
- Invoice 1:N Invoice Products (`invoices.id → invoice_products.invoice_id`)

**반복 청구 (Recurring):**
- `invoices.parent_invoice_id` — 부모 Invoice 참조 (자기 참조)
- `invoices.is_recurring = true`, `invoices.recurring_cycle`, `invoices.recurring_seq`
- 서비스 종료일(`guardian_mgt.service_end_date`) 도달 시 생성 중단 (스케줄러 미구현)
- 미납 해당월만 `Overdue` 처리 (이후 월은 정상 생성)

**billing_cycle 대상 서비스:**
- `guardian_mgt.billing_cycle` (monthly / per_term)
- `accommodation_mgt.billing_cycle` (monthly / per_term)★

**Invoice 상태 전이:**
```
draft → sent → paid → (Receipt 자동 생성)
           → overdue (due_date 초과 + cron)
           → void
           → partial
```

---

### STEP 6: Payment Header + Lines (수금/송금)

**API:**
```
POST /api/accounting/payments    (New Accounting — 권장)
POST /api/payment-headers        (Legacy)
POST /api/payment-lines
```

**데이터 룰:**
- Payment Header 1건 + Payment Lines N건 구조 (Split Transaction)
- 1번 송금이 여러 Invoice·항목에 분할 배분 가능
- Payment Line → Invoice 또는 Contract Product에 직접 연결
- 분할 합계 = Header `total_amount` (앱 레벨 검증)

**자동 처리:**
1. Payment Header INSERT
2. Payment Lines INSERT (N건)
3. Journal Entries 자동 생성 (라인별 DR/CR 페어)
4. `transactions` INSERT (Legacy 호환)
5. `product_cost_lines.status → 'paid'` (AP 송금인 경우)
6. AR 완납 감지 → Contract Product `ap_status → 'ready'` 전환 (`ap_trigger='on_ar_paid'`★)

**결제 타입 (payment_type):**

| 타입 | 용도 |
|------|------|
| `trust_receipt` | 학생 학비 등 Trust 입금 |
| `direct` | 서비스피 직접 수령 |
| `trust_transfer` | 학교 학비 송금 (AP) |
| `commission` | 커미션 수령 |
| `cost_payment` | 파트너 비용 지급 |
| `service_fee_camp` | 캠프 서비스피 (Camp 전용) |
| `camp_tour_ap` | 캠프 투어 AP (Camp 전용) |

---

### STEP 7: Receipt (영수증)

**데이터 룰:**
- Payment Header 1:1 Receipt (`receipts.payment_header_id`★)
- Payment Header 처리 완료 → `receiptPdfService.ts`가 PDF 자동 생성
- GCS 업로드 → Signed URL (TTL: 900초)
- (선택) 이메일 발송

---

### STEP 8: Journal Entry (이중 분개)

**자동 생성 엔진:**
- `journalEntryService.ts` → `DR_CR_MAP` (splitType별 세분화)
- `accounting-payments.ts` → `JE_MAP` (단순화)

**⚠️ 두 매핑 엔진이 공존** — 새 paymentType 추가 시 양쪽 모두 업데이트 필수
상세 내용 → `FINANCE_SYSTEM_GUIDE.md` §4.2 참조

---

## 3. 상태 전이 다이어그램 요약

```
Lead:      new → in_progress → QUALIFIED → [Quote 생성]
                             → lost / on_hold

Quote:     Draft → Sent → Accepted → [Contract 생성, Quote 잠김★]
                        → Declined
                → Expired

Application: pending → under_review → approved → [Contract 생성]
                                    → rejected

Contract:  draft → active → completed
                 → on_hold
                 → cancelled

Invoice:   draft → sent → paid → [Receipt 생성]
                       → overdue (cron)
                       → void
                       → partial

Contract Product (AR):
  scheduled → invoiced → partial → paid
            → overdue

Contract Product (AP):
  pending → ready★(on_ar_paid) → invoiced → partial → paid

product_cost_lines:
  pending → paid (AP 송금 시)
```

★ = Migration 0015 (2026-04-26)

---

## 4. 자동화된 처리 목록

| 자동화 항목 | 트리거 | 위치 |
|------------|--------|------|
| `lead_ref_number` 채번 | Lead 생성 | `crm-leads.ts` |
| `quote_ref_number` 채번 | Quote 생성 | `crm-quotes.ts` |
| `contract_number` 채번 | Contract 생성 | `contracts.ts` |
| `invoice_number` 채번 | Invoice 생성 | `finance.ts` |
| CP → Invoice Products (분할)★ | Invoice 생성 | `finance.ts` — 앱 로직 |
| CP `invoice_count` 누적★ | Invoice Product 생성 | `contract_products` update |
| CP `ap_status → ready`★ | AR 완납 감지 | `ap_trigger='on_ar_paid'` — 앱 로직 구현 필요 |
| Tax Invoice 생성 | 커미션 확정 | `taxInvoiceService.ts` |
| Receipt PDF | Payment 처리 | `receiptPdfService.ts` |
| Journal Entry (이중 분개) | Payment Line 생성 | `journalEntryService.ts` |
| Ledger Entry | Payment 생성 | `ledgerService.ts` |
| AR Overdue 처리 | 매일 cron | `index.ts:72` |
| KPI 집계 | 월/분기 cron | `kpiScheduler.ts:233,246` |
| 이메일 발송 | 계약 서명, 영수증 | `contract-signing.ts`, `mailer.ts` |

★ = Migration 0015 추가 (일부 앱 로직 구현 필요)

---

## 5. 미구현 항목 (구현 필요)

| 항목 | 설명 | 우선순위 |
|------|------|---------|
| `ap_trigger` 실행 로직 | AR 완납 시 AP `pending→ready` 자동 전환 앱 코드 | 🔴 높음 |
| 반복 청구 스케줄러 | `is_recurring=true` Invoice 자동 생성 크론잡 | 🟠 중간 |
| Invoice 자동 발행 | due_date 기반 자동 발행 없음 → 수동 | 🟠 중간 |
| KPI 캐시 (`staff_kpi_periods`) | 실시간 쿼리 부담 해소 | 🟡 낮음 |
| 이중 분개 강제 검증 | `validateDoubleEntry()` 호출 미강제 | 🟡 낮음 |

---

## 6. 절대 수정 금지 파이프라인 파일 ⚠️

| 파일 | 이유 |
|------|------|
| `routes/contracts.ts` | contract_number 채번 + AR/AP 검증 로직 |
| `routes/crm-contracts.ts` | AP/AR 날짜 순서 검증 (line 652) |
| `services/taxInvoiceService.ts` | GST 계산 + 세금계산서 생성 |
| `services/ledgerService.ts` | 이중 분개 원장 생성 |
| `services/receiptPdfService.ts` | Receipt PDF |
| `lib/db/src/schema/contracts.ts` | FK 관계, 핵심 필드 |
| `lib/db/src/schema/finance.ts` | 재무 스키마 |
| `middleware/authenticate.ts` | JWT 인증 |
| `middleware/tenantResolver.ts` | 멀티테넌트 격리 |

---

*© Edubee.Co. 2026 — 최종 업데이트: 2026-04-26*
