# CORE_PIPELINE.md — 핵심 비즈니스 파이프라인

> 생성일: 2026-04-19 | 소스: routes/crm-leads.ts, crm-quotes.ts, crm-contracts.ts, finance.ts, invoices.ts

---

## 1. 전체 파이프라인 흐름

```
[문의 접수]          [견적 제안]        [계약 체결]         [재무 처리]         [완료]
Lead (신규)  ──→  Quote (Draft) ──→  Contract (draft) ──→  Invoice (sent) ──→  Receipt
   ↓                  ↓                    ↓                   ↓
Application       Quote Products       Contract Products   Payment Header
   ↓              (항목별 금액)          (AR/AP 일정)          (입금 기록)
Camp App                               Tax Invoice          Journal Entry
                                       (세금 계산서)         (이중 분개)
```

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
- `created_at` 자동 설정

**다음 단계 트리거:**
- 에이전트 또는 스태프가 리드를 담당 → `assigned_staff_id` 설정
- 상태를 `in_progress`로 전환 → Application 생성 또는 Quote 생성

---

### STEP 2: Quote (견적) 생성

**생성 API:**
```
POST /api/quotes
```

**필수 입력:**
- `lead_id` (선택) 또는 직접 연결 없이 생성 가능
- `quote_status` 기본: `Draft`
- Quote Products (항목): `quote_products` 테이블에 별도 추가

**Quote Products 추가:**
```
POST /api/quote-products
```
- `name`, `price`, `quantity`, `service_module_type`
- `is_initial_payment` — 초기 납입 여부
- `provider_account_id` — 파트너 기관

**상태 전이:**
```
Draft → Sent → Accepted → (Contract 생성)
      → Declined
      → Expired (expiryDate 초과)
```

**다음 단계 트리거:**
- Quote Status = `Accepted` → Contract 생성 가능

---

### STEP 3: Application (신청서)

**생성 API:**
```
POST /api/applications
POST /api/camp-applications   (캠프 전용)
```

**Application → Contract 연결:**
- `contracts.application_id` (unique FK)
- 하나의 Application에 하나의 Contract만 생성 가능

---

### STEP 4: Contract (계약) 생성

**생성 API:**
```
POST /api/contracts
```

**필수 입력:**
- `application_id` 또는 `quote_id`
- `total_amount`, `currency`

**자동 생성:**
- `contract_number` 채번 (예: `CN-2604-0001`)
- `status` 기본: `draft`
- `contract_products` — AR/AP 일정 항목 생성

**Contract Products (AR/AP):**
```
POST /api/contract-finance  (또는 crm-contracts 내부)
```
- `ar_amount` — 학생에게 받을 금액
- `ap_amount` — 파트너에게 지급할 금액
- `ar_due_date`, `ap_due_date` — AR/AP 납부 기한
- **⚠️ 검증**: `ap_due_date < ar_due_date` → 400 에러 (crm-contracts.ts:652)
- `commission_rate` / `commission_type` — 커미션 설정

**상태 전이:**
```
draft → active → completed
             → on_hold
             → cancelled
```

**Tax Invoice 자동 생성:**
- 계약 활성화 또는 커미션 확정 시 → `taxInvoiceService.ts`가 GST 계산서 생성
- GST 계산: `calculateGst(commissionAmt, isGstFree)` — ATO 1/11 표준 (추정)

---

### STEP 5: Invoice / Tax Invoice

**인보이스 API:**
```
GET  /api/invoices
POST /api/invoices
```
```
GET  /api/tax-invoices
POST /api/tax-invoices
```

**Invoice 번호 자동 채번:**
```typescript
`INV-${year}${month}-${random4digit}`
```

**Invoice 상태 전이:**
```
draft → sent → paid → (Receipt 자동 생성)
           → overdue (due_date 초과 + cron)
           → void
           → partial
```

---

### STEP 6: Payment Header (입금 처리)

**API:**
```
POST /api/payment-headers
POST /api/payment-lines
```

**자동 처리:**
- Payment Header 생성 → Payment Lines 생성 → Journal Entries (이중 분개) 생성
- `ledgerService.createLedgerEntry()` 호출 → `user_ledger` 기록
- Receipt PDF 자동 생성 (`receiptPdfService.ts`)

**결제 타입:**
- `AR_RECEIPT` — 학생 입금
- `AP_PAYMENT` — 파트너 송금
- `COMMISSION` — 에이전트 커미션 지급

---

### STEP 7: Receipt (영수증)

**생성 조건:**
- Payment Header 처리 완료 → `receiptPdfService.ts`가 PDF 자동 생성
- GCS에 업로드 → Signed URL로 다운로드

---

## 3. 상태 전이 다이어그램 요약

```
Lead:      new → in_progress → converted → (완료)
                             → lost
                             → on_hold

Quote:     Draft → Sent → Accepted → [Contract 생성]
                        → Declined
                → Expired

Application: pending → under_review → approved → [Contract 생성]
                                    → rejected

Contract:  draft → active → completed
                 → on_hold
                 → cancelled

Invoice:   draft → sent → paid → [Receipt 생성]
                       → overdue
                       → void
                       → partial

Contract Product (AR):
  scheduled → invoiced → partial → paid
            → overdue

Contract Product (AP):
  pending → invoiced → partial → paid
```

---

## 4. 자동화된 처리 목록

| 자동화 항목 | 트리거 | 위치 |
|------------|--------|------|
| lead_ref_number 채번 | Lead 생성 | `crm-leads.ts` |
| quote_ref_number 채번 | Quote 생성 | `crm-quotes.ts` |
| contract_number 채번 | Contract 생성 | `contracts.ts` |
| invoice_number 채번 | Invoice 생성 | `finance.ts` |
| Tax Invoice 생성 | 커미션 확정 | `taxInvoiceService.ts` |
| Receipt PDF | Payment 처리 | `receiptPdfService.ts` |
| Journal Entry (이중 분개) | Payment Line 생성 | `finance.ts` |
| Ledger Entry | Payment 생성 | `ledgerService.ts` |
| AR Overdue 처리 | 매일 cron | `index.ts:72` |
| KPI 집계 | 월/분기 cron | `kpiScheduler.ts:233,246` |
| 이메일 발송 | 계약 서명, 영수증 | `contract-signing.ts`, `mailer.ts` |

---

## 5. 절대 수정 금지 파이프라인 파일 ⚠️

| 파일 | 이유 |
|------|------|
| `contracts.ts` | contract_number 채번 + AR/AP 검증 로직 |
| `crm-contracts.ts` | AP/AR 날짜 순서 검증 (line 652) |
| `services/taxInvoiceService.ts` | GST 계산 + 세금계산서 생성 |
| `services/ledgerService.ts` | 이중 분개 원장 생성 |
| `services/receiptPdfService.ts` | Receipt PDF |
| `lib/db/src/schema/contracts.ts` | FK 관계, 핵심 필드 |
| `lib/db/src/schema/finance.ts` | 재무 스키마 |
| `middleware/authenticate.ts` | JWT 인증 |
| `middleware/tenantResolver.ts` | 멀티테넌트 격리 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
