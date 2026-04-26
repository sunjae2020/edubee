# DB_SCHEMA_OVERVIEW.md — Edubee CRM DB 스키마

> 최초 생성: 2026-04-19 | **최종 업데이트: 2026-04-26 (Migration 0015 반영)**
> 소스: lib/db/src/schema/ (24개 파일)

---

## 1. 스키마 파일 목록 (실제 테이블 위치 기준)

| 파일 | 포함 테이블 |
|------|------------|
| `users.ts` | `users`, `refresh_tokens`, `page_permissions`, `impersonation_logs`, `auth_logs` |
| `applications.ts` | `leads`, `applications`, `camp_applications` |
| `crm.ts` | `contacts`, `accounts`, `account_contacts`, `lead_activities`, `quotes`, `quote_products`, `schooling_consultations` |
| `contracts.ts` | `contracts`, `contract_products`, `contract_signing_requests` |
| `finance.ts` | `exchange_rates`, `banking`, `contract_finance_items`, `user_ledger`, `invoices`, `invoice_products`★, `transactions`, `receipts`, `account_ledger_entries` |
| `accounting.ts` | `chart_of_accounts`, `product_cost_lines`, `payment_headers`, `payment_lines`, `journal_entries`, `agent_commission_configs`, `tax_invoices`, `payment_statements`, `cost_centers`, `payment_infos` |
| `packages.ts` | `package_groups`, `packages`, `products`, `enrollment_spots`, `interview_schedules` |
| `product-catalog.ts` | `product_types`, `promotions` |
| `documents.ts` | `documents` |
| `services.ts` | `accommodation_mgt`, `internship_mgt`, `guardian_mgt`, `study_abroad_mgt` |
| `camp.ts` | `camp_applications`, `camp_photos` |
| `settings.ts` | `organisations`, `tenant_settings`, `lookup_values`, `platform_settings` |
| `teams.ts` | `teams`, `team_members` |
| `kpi.ts` | `kpi_targets`, `kpi_actuals` |
| `reports.ts` | `reports` |
| `notes.ts` | `notes` |
| `security.ts` | `security_incidents`, `audit_logs`, `tenant_audit_logs` |
| `community.ts` | `community_posts`, `community_comments` |
| `i18n.ts` | `translations` |
| `platform-crm.ts` | `platform_leads`, `platform_organisations` |
| `account-service-profiles.ts` | `account_service_profiles` |
| `application-forms.ts` | `application_form_templates`, `application_form_submissions` |
| `chatDocuments.ts` | `chat_documents` |
| `airtable.ts` | `airtable_sync_map` |

★ = Migration 0015 (2026-04-26) 신설

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
| `accounts` | 법인/에이전시/학교 | `id`, `account_type`, `portal_email`, `portal_role`, `organisation_id` |
| `account_contacts` | Contact-Account 연결 (M:N) | `account_id`, `contact_id`, `role` |
| `quotes` | 견적 | `id`, `quote_ref_number`, `lead_id`, `quote_status`, `organisation_id` |
| `quote_products` | 견적 항목 | `id`, `quote_id`, `price`, `service_module_type` |
| `applications` | 프로그램 신청 | `id`, `application_number`, `lead_id`, `package_group_id`, `status` |
| `contracts` | 계약 | `id`, `contract_number`, `application_id`, `account_id`, `quote_id`(UNIQUE FK)★, `status`, `total_ar_amount`, `total_ap_amount` |
| `contract_products` | 계약 항목 (AR/AP) | `id`, `contract_id`, `ar_amount`, `ap_amount`, `ar_status`, `ap_status`, `ap_trigger`★(`on_ar_paid`), `invoice_count`★ |

★ = Migration 0015 추가/변경

### 🟡 재무 / 회계

#### 공유 (Legacy + New Accounting)
| 테이블 | 파일 | 설명 | 주요 필드 |
|--------|------|------|-----------|
| `invoices` | `finance.ts` | 통합 청구서 | `id`, `invoice_number`, `contract_id`, `account_id`★, `invoice_type`, `status`, `parent_invoice_id`, `is_recurring`, `recurring_cycle` |
| `invoice_products` | `finance.ts` ★신설 | 분할 청구 라인 (1 CP → N IP) | `id`, `invoice_id`, `contract_product_id`, `amount`, `unit_price`, `quantity` |
| `transactions` | `finance.ts` | 실입금/출금 기록 | `id`, `contract_id`, `amount`, `transaction_type`, `status` |
| `receipts` | `finance.ts` | 영수증 | `id`, `receipt_number`, `invoice_id`, `payment_header_id`★ |
| `exchange_rates` | `finance.ts` | 환율 | `id`, `from_currency`, `to_currency`, `rate`, `effective_date` |
| `banking` | `finance.ts` | 계좌 정보 | `id`, `bank_name`, `account_number`, `bsb`, `organisation_id` |
| `account_ledger_entries` | `finance.ts` | 계정별 원장 | `account_id`, `source_type`, `entry_type`, `amount` |

#### Legacy Finance 전용
| 테이블 | 파일 | 설명 | 주요 필드 |
|--------|------|------|-----------|
| `contract_finance_items` | `finance.ts` | Camp/Agent 재무 항목 | `id`, `contract_id`, `item_type`, `cost_center`, `estimated_amount`, `status` |
| `user_ledger` | `finance.ts` | 스태프 개인 원장 | `id`, `contract_id`, `user_id`, `entry_type`, `cost_center`, `amount` |

#### New Accounting System 전용
| 테이블 | 파일 | 설명 | 주요 필드 |
|--------|------|------|-----------|
| `chart_of_accounts` | `accounting.ts` | 계정과목 | `code`(UNIQUE), `name`, `account_type` |
| `product_cost_lines` | `accounting.ts` | Product 비용 의무 | `id`, `contract_product_id`, `cost_type`, `coa_code`, `status`, `payment_header_id` |
| `payment_headers` | `accounting.ts` | 자금 이동 헤더 | `id`, `payment_ref`, `contract_id`, `payment_date`, `payment_type`, `status` |
| `payment_lines` | `accounting.ts` | Split 분할 라인 | `id`, `payment_header_id`, `invoice_id`, `contract_product_id`, `coa_code`, `amount` |
| `journal_entries` | `accounting.ts` | 이중 분개 (자동) | `id`, `debit_coa`, `credit_coa`, `amount`, `payment_header_id`, `auto_generated` |
| `agent_commission_configs` | `accounting.ts` | 파트너 커미션 조건 | `partner_id`, `school_id`, `commission_type`, `payment_method` |
| `tax_invoices` | `accounting.ts` | 학교용 세금계산서 | `id`, `contract_product_id`, `commission_amount`, `gst_amount`, `is_gst_free` |
| `payment_statements` | `accounting.ts` | 결제 명세서 | `id`, `statement_ref`, `contract_id`, `total_paid_amount` |
| `cost_centers` | `accounting.ts` | Cost Center 코드 마스터 | `code`, `name`, `status` |
| `payment_infos` | `accounting.ts` | 결제 수단 마스터 | `id`, `name`, `payment_method`, `currency` |

### 🟣 패키지 / 상품
| 테이블 | 설명 |
|--------|------|
| `package_groups` | 프로그램 그룹 |
| `packages` | 구체적 패키지 |
| `products` | 개별 상품 |
| `product_types` | 상품 유형 (study_abroad, camp 등) |
| `enrollment_spots` | 등록 가능 자리 |
| `interview_schedules` | 면접 일정 |

### 🩶 서비스 모듈
| 테이블 | 설명 | 주요 필드 |
|--------|------|-----------|
| `accommodation_mgt` | 숙소 관리 | `contract_id`, `accommodation_type`, `billing_cycle`★, `status` |
| `guardian_mgt` | 가디언 관리 | `contract_id`, `billing_cycle`, `service_start_date`, `service_end_date` |
| `internship_mgt` | 인턴십 관리 | `contract_id`, `position_title`, `start_date`, `end_date` |
| `study_abroad_mgt` | 유학 관리 | `contract_id`, `visa_type`, `coe_number`, `program_context` |

★ = Migration 0015 추가

### 🔴 Privacy & 보안
| 테이블 | 설명 |
|--------|------|
| `security_incidents` | NDB 보안 침해 기록 (APP 11) |
| `audit_logs` | 감사 로그 (민감 정보 [REDACTED]) |
| `tenant_audit_logs` | 테넌트별 감사 로그 |

---

## 3. ERD 핵심 관계 (Finance Workflow 포함 최신)

```
organisations (테넌트)
  └─1:N→ users (스태프)
  └─1:N→ leads
  └─1:N→ accounts (에이전시/파트너/학교)
  └─1:N→ contacts

contacts ─M:N─ accounts (account_contacts)

leads
  └─1:N→ quotes          (quotes.lead_id)
  └─1:N→ applications

quotes
  └─1:N→ quote_products  (quote_products.quote_id)
  └─1:1→ contracts       (contracts.quote_id UNIQUE★)

applications
  └─1:1→ contracts       (contracts.application_id UNIQUE)

contracts
  └─1:1→ accounts        (contracts.account_id — 청구 대상)
  └─1:N→ contract_products (AR/AP 항목)
  └─1:N→ invoices
  └─1:N→ payment_headers
  └─1:N→ contract_finance_items (Legacy)
  └─1:N→ user_ledger     (Legacy)

contract_products
  └─1:N→ product_cost_lines  (비용 의무)
  └─1:N→ invoice_products★   (분할 청구 라인)
  └─1:N→ payment_lines       (결제 연결)

invoices
  └─1:N→ invoice_products★  (청구 라인 분할)
  └─1:N→ payment_lines       (결제 연결)
  └─1:1→ receipts            (영수증)
  └─1:N→ journal_entries     (분개 연결)
  └─self→ parent_invoice_id  (반복 청구 계층)

payment_headers
  └─1:N→ payment_lines       (Split Transaction)
  └─1:N→ journal_entries     (이중 분개 자동 생성)
  └─1:1→ receipts★           (receipts.payment_header_id)

payment_lines
  └─1:N→ journal_entries     (라인별 분개)
```

★ = Migration 0015 (2026-04-26) 추가/변경

---

## 4. 멀티테넌트 구조

- **방식**: PostgreSQL schema per tenant (`AsyncLocalStorage` 컨텍스트)
- **public schema**: 플랫폼 공통 (`users`, `organisations`, `platform_leads`, `platform_settings`, `airtable_sync_map` 등)
- **tenant schema** (예: `myagency`, `timest`): 테넌트별 리드/계약/재무 데이터 격리
- **TenantResolver 미들웨어**: 서브도메인 → `req.tenantId` (우선순위: 서브도메인 > X-Organisation-Id > JWT > fallback)
- **`runWithTenantSchema(slug, fn)`**: 쿼리 실행 시 schema 자동 전환

---

## 5. Soft Delete 처리 방식

| 패턴 | 사용 테이블 |
|------|------------|
| `is_active: boolean` | `leads`, `contracts`, `users`, `accommodation_mgt` |
| `is_deleted: boolean` | `contract_finance_items` |
| `status` 값 변경 | `invoices` (void), `contracts` (cancelled), `transactions` |
| Hard Delete | 일부 설정 테이블, `airtable_sync_map` |

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
| `invoice_products` | `invoice_id`, `contract_product_id` | 분할 청구 조회 |
| `invoices` | `account_id` | 계정별 Invoice 조회 |
| `receipts` | `payment_header_id` | Payment Header별 영수증 조회 |

---

## 8. Migration 이력

| 파일 | 내용 |
|------|------|
| `0000~0006` | 초기 스키마 (자동 생성) |
| `0007_kpi_tables.sql` | KPI 테이블 |
| `0008_payment_lines_staff_backfill.sql` | payment_lines.staff_id |
| `0009_correction_requests.sql` | correction_requests |
| `0010_camp_organisation_id.sql` | Camp org_id |
| `0010_menu_tables.sql` | 메뉴 테이블 |
| `0011_package_group_coordinators_fix.sql` | CC 위임 관계 |
| `0012_tenant_audit_logs_delegation.sql` | 테넌트 감사 로그 |
| `0013_fix_form_types.sql` | Form 유형 수정 |
| `0014_airtable_sync_map.sql` | Airtable 동기화 맵 |
| `0015_finance_workflow_gaps.sql` ★ | Finance 워크플로우 갭 6개 보완 |

---

*© Edubee.Co. 2026 — 최종 업데이트: 2026-04-26*
