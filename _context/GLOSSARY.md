# GLOSSARY.md — Edubee CRM 용어 사전

> 생성일: 2026-04-19 | 소스: lib/db/src/schema/, routes/, pages/

---

## 1. 도메인 용어 정의

| 용어(한국어) | 영어/코드명 | 설명 | 관련 테이블/컴포넌트 |
|-------------|------------|------|---------------------|
| 리드 | Lead | 잠재 고객 (문의 접수부터 계약 전까지). 국제 교육 희망 학생 또는 에이전시의 문의. | `leads` |
| 어카운트 | Account | 법인 또는 에이전시 단위 계정. 연락처(Contact)의 소속 기관. | `accounts` |
| 컨택트 | Contact | 개인 연락처. 여권 정보, 동의 상태 포함. | `contacts` |
| 견적 | Quote | 학생/에이전시에게 제안하는 서비스 묶음 + 금액. Draft → Sent → Accepted. | `quotes`, `quote_products` |
| 계약 | Contract | 견적 수락 후 생성되는 법적 계약. AR/AP 일정 포함. | `contracts`, `contract_products` |
| 신청서 | Application | 학생의 프로그램 참가 신청. 계약 생성의 선행 단계. | `applications` |
| 캠프 신청서 | Camp Application | 단기 캠프 전용 신청서. CAMP 아티팩트에서 처리. | `camp_applications` |
| 인보이스 | Invoice | 수입(AR) 또는 비용(AP) 청구서. | `invoices` |
| 세금 인보이스 | Tax Invoice | GST 포함 호주 세금 계산서 (ATO 기준 1/11). | `tax_invoices` |
| 트랜잭션 | Transaction | 실제 입금/출금 기록. | `transactions` |
| 영수증 | Receipt | 입금 확인 후 자동 발행되는 영수증 문서. | `receipts` |
| 결제 헤더 | Payment Header | 입금 또는 송금 이벤트의 헤더 레코드. | `payment_headers` |
| 결제 라인 | Payment Line | 결제 헤더의 세부 분개. | `payment_lines` |
| 분개 | Journal Entry | 이중 분개 회계 기록 (차변/대변 COA). | `journal_entries` |
| 계정과목 | Chart of Accounts (COA) | 계정 코드 체계. AR:1100, AP:2100 등. | `chart_of_accounts` |
| 수익 (AR) | Accounts Receivable | 학생 또는 에이전시로부터 받을 금액. | `contract_products.ar_amount` |
| 비용 (AP) | Accounts Payable | 학교/파트너에게 지급할 금액. | `contract_products.ap_amount` |
| 커미션 | Commission | 에이전트 또는 스태프에게 지급하는 수수료. | `contract_products.commission_rate` |
| 코스트 센터 | Cost Center | 비용 분류 코드. `CC-AGENT`, `CC-INSTITUTE`, `CC-HOTEL` 등. | `contract_finance_items.cost_center` |
| 원장 | Ledger | 스태프/에이전트별 수익/비용 누적 기록. | `user_ledger`, `account_ledger_entries` |
| 패키지 그룹 | Package Group | 프로그램 그룹 (예: "English + Homestay"). | `package_groups` |
| 패키지 | Package | 구체적인 프로그램 구성. | `packages` |
| 서비스 모듈 | Service Module | 계약에 연결된 추가 서비스 (숙박, 픽업, 투어 등). | `service_module_type` |
| 테넌트 | Tenant | 플랫폼을 사용하는 에이전시 조직. PostgreSQL schema로 격리. | `organisations` |
| 포털 | Portal | 에이전트/파트너/학생이 직접 접근하는 외부 포털 (`/portal`). | `artifacts/edubee-portal` |
| 임퍼소네이션 | Impersonation / View-As | admin이 다른 사용자로 로그인하여 화면을 보는 기능. | `impersonation_logs` |

---

## 2. 역할 약자

| 약자 | 전체명 | 코드값 |
|------|--------|--------|
| EC | Education Consultant | `consultant` |
| BK | Bookkeeper | `bookkeeper` |
| MGR | Manager | `manager` |
| SA | Super Admin (플랫폼) | `super_admin` |
| ADM | Admin (테넌트) | `admin` |
| CC | Camp Coordinator | `camp_coordinator` |

---

## 3. 주요 DB 컬럼명 ↔ 화면 레이블 매핑

| DB 컬럼명 | 화면 표시 레이블 | 테이블명 |
|-----------|----------------|----------|
| `lead_ref_number` | Lead Ref No. | `leads` |
| `quote_ref_number` | Quote No. | `quotes` |
| `contract_number` | Contract No. | `contracts` |
| `invoice_number` | Invoice No. | `invoices` |
| `application_number` | App No. | `applications` |
| `first_name` / `last_name` | First Name / Last Name | `contacts`, `leads` |
| `original_name` | Korean Name (원문명) | `contacts`, `leads` |
| `english_name` | English Name | `contacts`, `leads` |
| `quote_status` | Quote Status | `quotes` |
| `ar_amount` | AR Amount | `contract_products` |
| `ap_amount` | AP Amount | `contract_products` |
| `ar_due_date` | AR Due Date | `contract_products` |
| `ap_due_date` | AP Due Date | `contract_products` |
| `commission_rate` | Commission Rate (%) | `contract_products` |
| `commission_type` | Commission Type | `contract_products` |
| `portal_email` | Portal Login Email | `accounts` |
| `portal_role` | Portal Role | `accounts` |
| `privacy_consent` | Privacy Consent | `contacts`, `accounts` |
| `marketing_consent` | Marketing Consent | `contacts`, `accounts` |
| `cost_center` | Cost Center | `contract_finance_items` |
| `service_module_type` | Service Type | `contract_products` |
| `organisation_id` | Tenant / Organisation | (전 테이블) |
| `passport_no` | Passport No. *(암호화)* | `contacts` |
| `failed_login_attempts` | (내부) 로그인 실패 횟수 | `users` |
| `locked_until` | (내부) 잠금 해제 시각 | `users` |

---

## 4. API 경로 ↔ 기능 설명

| API 경로 | 메서드 | 기능 설명 |
|----------|--------|----------|
| `/api/auth/login` | POST | 스태프 + 포털 통합 로그인 |
| `/api/auth/refresh` | POST | Access Token 갱신 |
| `/api/auth/logout` | POST | 로그아웃 (Refresh Token 삭제) |
| `/api/auth/me` | GET | 현재 로그인 사용자 정보 |
| `/api/leads` | GET/POST | 리드 목록/생성 |
| `/api/leads/:id` | GET/PUT/DELETE | 리드 상세/수정/삭제 |
| `/api/quotes` | GET/POST | 견적 목록/생성 |
| `/api/contracts` | GET/POST | 계약 목록/생성 |
| `/api/invoices` | GET/POST | 인보이스 목록/생성 |
| `/api/transactions` | GET/POST | 트랜잭션 목록/생성 |
| `/api/finance` | GET | 재무 요약 |
| `/api/portal/*` | 다양 | 포털 전용 API (에이전트/파트너/학생) |
| `/api/my-data` | GET | 자기 열람권 (APP 12) |
| `/api/my-data/correction-request` | POST | 데이터 수정 요청 (APP 13) |
| `/api/my-data/withdraw-consent` | POST | 동의 철회 |
| `/api/privacy-policy` | GET | 개인정보처리방침 (공개) |
| `/api/tax-invoices` | GET/POST | 세금 계산서 |
| `/api/dashboard` | GET | CRM 대시보드 KPI |
| `/api/superadmin/*` | 다양 | 플랫폼 관리 (super_admin 전용) |
| `/api/health` | GET | 헬스체크 (공개) |
| `/api/webhook` | POST | Stripe Webhook |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
