# DB_SCHEMA_OVERVIEW.md — Edubee CRM DB 스키마

> 생성일: 2026-04-19 | 소스: lib/db/src/schema/ (20개 파일)

---

## 1. 스키마 파일 목록

| 파일 | 포함 테이블 |
|------|------------|
| `users.ts` | `users`, `refresh_tokens`, `page_permissions`, `impersonation_logs`, `auth_logs` |
| `applications.ts` | `leads`, `applications`, `camp_applications` |
| `crm.ts` | `contacts`, `accounts`, `lead_activities`, `quotes`, `quote_products` |
| `contracts.ts` | `contracts`, `contract_products`, `payment_headers`, `payment_lines`, `journal_entries`, `chart_of_accounts` |
| `finance.ts` | `exchange_rates`, `banking`, `contract_finance_items`, `user_ledger` |
| `accounting.ts` | `invoices`, `transactions`, `receipts`, `account_ledger_entries` |
| `packages.ts` | `package_groups`, `packages`, `products`, `enrollment_spots` |
| `product-catalog.ts` | `product_types`, `promotions` |
| `documents.ts` | `documents` |
| `services.ts` | `accommodation_mgt`, `visa_services_mgt`, `internship_mgt`, `guardian_mgt` |
| `camp.ts` | `camp_applications`, `camp_photos` |
| `settings.ts` | `organisations`, `tenant_settings`, `lookup_values`, `menu_items` |
| `teams.ts` | `teams`, `team_members` |
| `kpi.ts` | `kpi_targets`, `kpi_actuals` |
| `reports.ts` | `reports` |
| `notes.ts` | `notes` |
| `security.ts` | `security_incidents`, `audit_logs` |
| `community.ts` | `community_posts`, `community_comments` |
| `i18n.ts` | `translations` |
| `platform-crm.ts` | `platform_leads`, `platform_organisations` |
| `account-service-profiles.ts` | `account_service_profiles` |
| `application-forms.ts` | `application_form_templates`, `application_form_submissions` |
| `chatDocuments.ts` | `chat_documents` |

---

## 2. 전체 핵심 테이블

### 🔵 인증 / 사용자
| 테이블 | 설명 | 주요 필드 |
|--------|------|-----------|
| `users` | 스태프 계정 | `id`, `email`, `role`, `staff_role`, `organisation_id`, `failed_login_attempts`, `locked_until` |
| `refresh_tokens` | JWT Refresh Token | `user_id`, `token`, `expires_at` |
| `page_permissions` | 역할별 페이지 접근 | `role`, `page_slug`, `can_access` |
| `impersonation_logs` | View-As 감사 로그 | `actor_user_id`, `target_user_id`, `started_at`, `ip_address` |
| `auth_logs` | 로그인 기록 | `user_type`, `email`, `action`, `ip_address` |

### 🟢 CRM 파이프라인
| 테이블 | 설명 | 주요 필드 |
|--------|------|-----------|
| `leads` | 잠재 고객 | `id`, `lead_ref_number`, `status`, `agent_id`, `assigned_staff_id`, `organisation_id` |
| `contacts` | 개인 연락처 | `id`, `passport_no`*(암호화)*, `privacy_consent`, `marketing_consent` |
| `accounts` | 법인/에이전시 | `id`, `account_type`, `portal_email`, `portal_role`, `organisation_id` |
| `quotes` | 견적 | `id`, `quote_ref_number`, `lead_id`, `quote_status`, `organisation_id` |
| `quote_products` | 견적 항목 | `id`, `quote_id`, `price`, `service_module_type` |
| `applications` | 프로그램 신청 | `id`, `application_number`, `lead_id`, `package_group_id`, `status` |
| `contracts` | 계약 | `id`, `contract_number`, `application_id`, `status`, `total_ar_amount`, `total_ap_amount` |
| `contract_products` | 계약 항목 (AR/AP) | `id`, `contract_id`, `ar_amount`, `ap_amount`, `ar_due_date`, `ap_due_date`, `ar_status`, `ap_status`, `commission_rate` |

### 🟡 재무 / 회계
| 테이블 | 설명 | 주요 필드 |
|--------|------|-----------|
| `payment_headers` | 입금/출금 헤더 | `id`, `payment_ref`, `contract_id`, `payment_date`, `payment_type`, `status` |
| `payment_lines` | 결제 세부 분개 | `id`, `payment_header_id`, `invoice_id`, `coa_code`, `amount` |
| `journal_entries` | 이중 분개 | `id`, `debit_coa`, `credit_coa`, `amount`, `entry_date` |
| `chart_of_accounts` | 계정과목 | `code`, `name`, `account_type` |
| `invoices` | 청구서 | `id`, `invoice_number`, `contract_id`, `invoice_type`, `status`, `amount` |
| `tax_invoices` | 세금 계산서 | `id`, `commission_amt`, `gst_amount`, `total_amount`, `is_gst_free` |
| `transactions` | 실입금/출금 | `id`, `contract_id`, `amount`, `type`, `status` |
| `receipts` | 영수증 | `id`, `payment_header_id`, `receipt_number` |
| `exchange_rates` | 환율 | `id`, `from_currency`, `to_currency`, `rate`, `effective_date` |
| `contract_finance_items` | 계약 재무 항목 | `id`, `contract_id`, `item_type`, `cost_center`, `estimated_amount`, `actual_amount` |
| `user_ledger` | 스태프 원장 | `id`, `contract_id`, `user_id`, `entry_type`, `cost_center`, `amount` |
| `banking` | 계좌 정보 | `id`, `bank_name`, `account_number`, `bsb`, `organisation_id` |

### 🟣 패키지 / 상품
| 테이블 | 설명 |
|--------|------|
| `package_groups` | 프로그램 그룹 |
| `packages` | 구체적 패키지 |
| `products` | 개별 상품 |
| `product_types` | 상품 유형 (study_abroad, camp 등) |
| `enrollment_spots` | 등록 가능 자리 |

### 🔴 Privacy & 보안
| 테이블 | 설명 |
|--------|------|
| `security_incidents` | NDB 보안 침해 기록 (APP 11) |
| `audit_logs` | 감사 로그 (민감 정보 [REDACTED]) |

---

## 3. ERD 핵심 관계

```
organisations (테넌트)
  └─1:N→ users (스태프)
  └─1:N→ leads
  └─1:N→ accounts (에이전시/파트너)
  └─1:N→ contacts

leads
  └─1:N→ applications
  └─1:N→ quotes
  └─1:1→ contracts (applicationId)

accounts
  └─1:N→ quotes (agentAccountId)
  └─1:N→ contracts (agentAccountId)

applications
  └─1:1→ contracts

contracts
  └─1:N→ contract_products (AR/AP 항목)
  └─1:N→ payment_headers
  └─1:N→ invoices
  └─1:N→ contract_finance_items
  └─1:N→ user_ledger

payment_headers
  └─1:N→ payment_lines
  └─1:N→ journal_entries (이중 분개)
  └─1:1→ receipts
```

---

## 4. 멀티테넌트 구조

- **방식**: PostgreSQL schema per tenant (`AsyncLocalStorage` 컨텍스트)
- **public schema**: 플랫폼 공통 (users, organisations, platform_leads 등)
- **tenant schema** (예: `myagency`): 테넌트별 리드/계약/재무 데이터 격리
- **TenantResolver 미들웨어**: `X-Organisation-Id` 헤더 → `req.tenant`
- **`runWithTenantSchema(slug, fn)`**: 쿼리 실행 시 schema 자동 전환

---

## 5. Soft Delete 처리 방식

| 패턴 | 사용 테이블 |
|------|------------|
| `is_active: boolean` | `leads`, `contracts`, `users` |
| `is_deleted: boolean` | `contract_finance_items` |
| `status` 값 변경 | `invoices` (void), `contracts` (cancelled), `transactions` |
| Hard Delete | 일부 설정 테이블 |

---

## 6. 공통 필드 패턴

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` (defaultRandom) | 기본키 (모든 테이블) |
| `organisation_id` | `uuid` (FK → organisations) | 멀티테넌트 격리키 |
| `created_at` / `created_on` | `timestamp` (defaultNow) | 생성 시각 |
| `updated_at` / `modified_on` | `timestamp` (defaultNow) | 수정 시각 |
| `created_by` | `uuid` (FK → users) | 생성자 |

---

## 7. 주요 인덱스

| 테이블 | 인덱스 컬럼 | 목적 |
|--------|------------|------|
| `contacts` | `email`, `english_name`, `original_name`, `status`, `created_on` | 검색/정렬 |
| `leads` | `account_id`, `agent_id`, `assigned_staff_id`, `contact_id`, `status` | 필터링 |
| `contracts` | `account_id`, `application_id`, `status`, `created_at` | 조회 |
| `users` | `email` (unique) | 로그인 |
| `contract_finance_items` | `contract_id`, `(item_type, status)` | 재무 집계 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
