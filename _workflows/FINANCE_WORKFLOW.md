# FINANCE_WORKFLOW.md — 재무 처리 워크플로우

> 생성일: 2026-04-19 | 소스: routes/finance.ts, accounting-transactions.ts, contract-finance.ts, taxInvoiceService.ts

---

## 1. Transaction 생성 흐름

### Credit 생성 프로세스 (학생 입금 — AR 처리)

```
1. 계약 활성화 → contract_products에 AR 항목 생성
   (ar_amount, ar_due_date, ar_status='scheduled')

2. Invoice 생성
   POST /api/invoices
   invoiceType: 'client_invoice' | 'agent_invoice'
   status: 'sent'

3. 학생 입금 확인 → Payment Header 생성
   POST /api/payment-headers
   paymentType: 'AR_RECEIPT'
   receivedFrom: accounts.id

4. Payment Lines 생성
   POST /api/payment-lines
   coaCode: '1100' (AR COA)
   amount: 입금액

5. Journal Entry 자동 생성 (이중 분개)
   debitCoa: '1000' (Cash)
   creditCoa: '1100' (AR)

6. Ledger Entry 생성
   ledgerService.createLedgerEntry()
   → user_ledger에 credit 기록

7. Invoice status → 'paid' (또는 'partial')
8. AR status → 'paid'
9. Receipt PDF 자동 생성 → GCS 업로드
10. (선택) 이메일 발송 → sendMail()
```

---

### Debit 생성 프로세스 (파트너/학교 송금 — AP 처리)

```
1. 계약 활성화 → contract_products에 AP 항목 생성
   (ap_amount, ap_due_date, ap_status='pending')

2. AP Invoice 생성 (파트너 청구서 수령)
   invoiceType: 'ap_invoice'

3. 파트너 송금 → Payment Header 생성
   paymentType: 'AP_PAYMENT'
   paidTo: accounts.id (파트너)

4. Payment Lines 생성
   coaCode: '2100' (AP COA)

5. Journal Entry (이중 분개)
   debitCoa: '2100' (AP)
   creditCoa: '1000' (Cash)

6. AP status → 'paid'
```

---

## 2. Invoice 자동 발행 로직

**현재 구현 상태:** 수동 생성 방식 (자동 due_date 기반 발행 **미구현**)

- `index.ts:72` — AR Overdue 처리 cron (매일 실행): `ar_due_date` 초과 항목 → `ar_status = 'overdue'`
- Invoice 자동 발행 cron은 없음 → 스태프가 수동으로 `POST /api/invoices` 호출

---

## 3. 커미션 계산 로직

### 커미션 타입 (`contract_products.commission_type`)
| 타입 | 계산 방법 |
|------|----------|
| `percentage` | `ar_amount × commission_rate / 100` |
| `fixed` | `commission_fixed` 고정값 |
| `null` | 커미션 없음 |

### Tax Invoice 커미션 (에이전시 → 세금계산서)
```typescript
// taxInvoiceService.ts:135
const gstAmt = calculateGst(commissionAmt, isGstFree);
const totalAmt = parseFloat((commissionAmt + gstAmt).toFixed(2));

// GST 계산 (ATO 1/11 방식 — isGstFree=false인 경우)
// commissionAmt * 10/110 = commissionAmt / 11
```

### 관련 테이블
- `contract_products`: `commission_type`, `commission_rate`, `commission_fixed`
- `contract_finance_items`: `commission_type`, `commission_rate`, `cost_center`
- `tax_invoices`: `commission_amt`, `gst_amount`, `total_amount`, `is_gst_free`

---

## 4. Cost Center 분류

| Cost Center 코드 | 설명 |
|-----------------|------|
| `RC-CAMP` | Revenue: 캠프 수익 |
| `RC-DIRECT` | Revenue: 직접 수익 |
| `CC-AGENT` | Cost: 에이전트 커미션 |
| `CC-INSTITUTE` | Cost: 학교/기관 비용 |
| `CC-HOTEL` | Cost: 숙박 파트너 |
| `CC-PICKUP` | Cost: 픽업 서비스 |
| `CC-TOUR` | Cost: 투어 서비스 |
| `CC-SETTLEMENT` | Cost: 정산 |
| `CC-MISC` | Cost: 기타 |

**파일:** `lib/db/src/schema/finance.ts` — `contractFinanceItems.itemCategory`

---

## 5. Receipt 자동 발행 조건

| 조건 | 동작 |
|------|------|
| Payment Header 처리 완료 | `receiptPdfService.ts`가 PDF 생성 |
| PDF 생성 성공 | GCS에 업로드, Signed URL 발급 (TTL: 900초) |
| (선택) `resend.apiKey` 설정됨 | 이메일로 Receipt 첨부 발송 |

**파일:** `artifacts/api-server/src/services/receiptPdfService.ts`

---

## 6. 계정과목 (COA) 체계

| 코드 범위 | 유형 | 예시 |
|----------|------|------|
| `1000~1999` | 자산 (Assets) | 1000: Cash, 1100: AR |
| `2000~2999` | 부채 (Liabilities) | 2100: AP |
| `3000~3999` | 수익 (Revenue) | 3100~3300: 수익 항목 |
| `4000~4999` | 비용 (Expenses) | |
| `5000~` | 자본 (Equity) | |

---

## 7. My Accounting (스태프 개인 회계)

에이전트/스태프 본인이 볼 수 있는 회계 뷰:
- `/my-accounting/settlements` — 내 정산 내역
- `/my-accounting/invoices` — 내 인보이스
- `/my-accounting/revenue` — 내 수익 요약

**API:** `routes/my-accounting.ts`

---

## 8. 미구현 재무 기능

| 기능 | 상태 |
|------|------|
| Invoice 자동 발행 (due_date 기반) | ❌ 미구현 |
| 자동 AR Overdue 알림 이메일 | ⚠️ cron은 있으나 이메일 발송 없음 |
| 다중 통화 자동 환산 | ⚠️ exchange_rates 테이블 있으나 자동 적용 미확인 |
| 은행 조정 (Bank Reconciliation) | ❌ 미구현 |
| 결산 마감 처리 | ❌ 미구현 |
| `correction_requests` DB 저장 | ❌ 로그만 기록 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
