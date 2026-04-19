# Edubee CRM — 전체 문서 패키지
생성일: 2026-04-19 | 총 17개 파일

---



---

<!-- FILE: _context/CURRENT_STATUS.md -->

# CURRENT_STATUS.md — Edubee CRM 현재 구현 상태

> 생성일: 2026-04-19 | v2.0 검증 기준 (45/57 PASS)

---

## 1. 구현 완료 기능 ✅

### 인증 & 보안
- ✅ JWT 인증 (스태프 8h + 포털 24h + Refresh 7d)
- ✅ 멀티테넌트 격리 (PostgreSQL schema per tenant)
- ✅ RBAC (requireRole) — 448개 적용
- ✅ Helmet 보안 헤더 (CSP, HSTS, X-Content-Type-Options 등)
- ✅ Rate Limiting (로그인 10회/15분, 전체 500회/15분)
- ✅ AES-256-GCM 필드 암호화 (여권번호 등)
- ✅ pino 구조화 로그 + 민감정보 [REDACTED]
- ✅ Sentry 에러 모니터링
- ✅ Graceful Shutdown (SIGTERM/SIGINT)
- ✅ 계정 잠금 (5회 실패 → 30분)
- ✅ View-As Impersonation (admin→user) + 로그 기록
- ✅ Stripe Webhook (4개 이벤트)

### CRM 핵심 파이프라인
- ✅ Lead → Quote → Contract → Invoice → Transaction → Receipt 전체 흐름
- ✅ Lead CRUD (lead_ref_number 자동 생성)
- ✅ Quote + Quote Products CRUD
- ✅ Contract + Contract Products CRUD (AR/AP 검증)
- ✅ Invoice 생성/목록/수정
- ✅ Tax Invoice (GST 세금 계산서, @react-pdf)
- ✅ Transaction/Payment Header/Line CRUD
- ✅ Receipt PDF 자동 생성

### 재무
- ✅ 이중 분개 (Journal Entries — debit/credit COA)
- ✅ 계정과목(COA) 관리
- ✅ AR/AP 일정 관리 및 순서 검증 (AP < AR 시 400)
- ✅ 환율 관리 + 자동 동기화
- ✅ 원장 (User Ledger, Account Ledger)
- ✅ KPI 스케줄러 (monthly + quarterly cron)
- ✅ AR Overdue 자동 처리 cron

### 포털 (34페이지)
- ✅ **에이전트 포털 (10개)**: Dashboard, Consultations, My Students, Quotes, Contracts, Services, Finance, Documents, Community, My Profile
- ✅ **파트너 포털 (8개)**: Dashboard, Consultations, Bookings, Contracts, Services, Finance, Documents, My Profile
- ✅ **학생 포털 (10개)**: Dashboard, Consultations, Quotes, Contracts, Services, Finance, Documents, Camp Photos, Community, My Profile

### 호주 Privacy Act 1988
- ✅ GET /api/privacy-policy (APP 5)
- ✅ 국외 이전 고지 (Stripe/Resend/Google — APP 8)
- ✅ GET /api/my-data (APP 12 자기 열람)
- ✅ POST /api/my-data/correction-request (APP 13 수정 요청)
- ✅ POST /api/my-data/withdraw-consent (동의 철회)
- ✅ 7년 데이터 보존 정책 문서화
- ✅ `security_incidents` 테이블 (NDB 침해 기록)
- ✅ `audit_logs` 테이블

### 서비스 관리
- ✅ 숙박(Accommodation), 비자(Visa), 가디언(Guardian) 관리
- ✅ 픽업(Pickup), 투어(Tour), 인턴십(Internship) 관리
- ✅ CAMP 캠프 신청서 전체 흐름
- ✅ 계약 서명 (Contract Signing — 이메일 발송 포함)
- ✅ 문서 관리 (업로드/다운로드/서명 — GCS)
- ✅ Signed URL TTL (다운로드 900초, 업로드 300초)

### 기타
- ✅ 커뮤니티 게시판
- ✅ 챗봇 (Gemini AI)
- ✅ KPI 대시보드 (스태프/팀)
- ✅ 리포트 빌더
- ✅ 데이터 매니저 (CSV import/export)
- ✅ 사용자/팀 관리
- ✅ Seed 멱등성 (onConflictDoNothing/Update)
- ✅ Vitest 8/8 통과
- ✅ 빌드 9.38초 성공 (edubee-portal)

---

## 2. 부분 구현 기능 🔶

| 기능 | 상태 | 파일 |
|------|------|------|
| **APP 13 수정 요청 DB 저장** | API 응답은 정상이나 `correction_requests` 테이블 미생성 — 로그만 기록 | `src/routes/my-data.ts:81` |
| **미성년자 보호자 동의** | 연령 체크(`ageMY < 18`)는 있으나 `guardian_consent_given` 강제 수집 없음 | `src/routes/camp-applications.ts:254` |
| **서비스 모듈 자동 활성화** | `service_module_type` 스키마 존재하나 계약 생성 시 자동 트리거 없음 | `contract_products.service_module_type` |
| **documents.ts fileFilter** | multer 파일 크기 제한은 있으나 파일 타입 화이트리스트 없음 (data-manager, camp-photos는 있음) | `src/routes/documents.ts:41` |
| **플랜 기능 런타임 강제** | `platform_plans` 테이블/CRUD 있으나 `checkPlanFeature()` 런타임 체크 없음 | `src/routes/platformPlans.ts` |
| **GCS 버킷 리전** | 코드에 `australia-southeast1` 명시 없음 (환경변수 설정 필요) | `src/lib/objectStorage.ts` |
| **마케팅 동의 체크** | `marketing_consent` 컬럼 있으나 이메일 발송 전 체크 로직 없음 | `src/routes/platform-integrations.ts:81` |

---

## 3. 미구현 기능 ❌

| 기능 | 이유 / 참고 |
|------|------------|
| **correction_requests 테이블** | `my-data.ts:91` 주석: "실제 운영에서는 correction_requests 테이블에 저장" |
| **TypeScript 완전 해결** | 683개 Drizzle ORM 타입 호환성 오류 (런타임 무관, tsx로 실행) |
| **npm 취약점 패치** | Vite critical (>=7.3.2) + 7 high — `pnpm update vite` 필요 |
| **pino 완전 전환** | console.log 49개 잔존 |
| **DB Pooler 포트** | DATABASE_URL이 6543 포트가 아닌 경우 WARN |

---

## 4. 알려진 버그 및 임시 해결책

| 버그 | 임시 처리 | 파일:줄 |
|------|---------|---------|
| Drizzle ORM TypeScript 683 에러 | tsx로 실행하여 타입 체크 우회 | `tsconfig.json` |
| `drizzle-kit` 경로 미설정 | pnpm filter 없이 직접 호출 불가 → `pnpm --filter @workspace/db run push` | `lib/db/package.json` |
| privacy-policy curl 테스트 실패 | 서버는 정상 응답 (vitest에서 확인), 인증 미들웨어 순서 이슈 가능성 | `src/routes/privacy.ts:12` |

---

## 5. 다음 작업 권장 우선순위

| 우선순위 | 작업 | 예상 소요 |
|---------|------|----------|
| 🔴 1순위 | `pnpm update vite` — critical 취약점 패치 | 30분 |
| 🔴 2순위 | `documents.ts` fileFilter 추가 | 1시간 |
| 🟠 3순위 | `correction_requests` 테이블 생성 + APP 13 DB 저장 | 2시간 |
| 🟠 4순위 | console.log 49개 → pino 교체 | 2시간 |
| 🟡 5순위 | guardian_consent_given 강제 수집 | 1시간 |
| 🟡 6순위 | marketing_consent 발송 전 체크 | 1시간 |
| 🟡 7순위 | TypeScript 683 오류 해결 (Drizzle 타입) | 4시간 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _context/GLOSSARY.md -->

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


---

<!-- FILE: _context/PROJECT_OVERVIEW.md -->

# PROJECT_OVERVIEW.md — Edubee CRM

> 생성일: 2026-04-19 | 코드 기준 자동 추출

---

## 1. 프로젝트명 및 목적

**Edubee CRM** — 국제 교육 에이전시를 위한 멀티테넌트 SaaS 플랫폼.  
학생 모집(Lead) → 견적(Quote) → 계약(Contract) → 재무(Finance) 전체 파이프라인을 단일 플랫폼에서 관리하며, 에이전트/파트너/학생이 각자의 포털을 통해 진행 상황을 실시간으로 확인할 수 있다.

**현재 개발 단계:** Production-ready Beta (멀티테넌트 프로비저닝 완료, 포털 34페이지 구현, 보안 Sprint 1-6 완료)

---

## 2. 기술 스택

### Frontend — Admin CRM (`artifacts/edubee-admin`)
| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 + Vite 7 |
| 라우팅 | Wouter |
| 상태관리 | TanStack Query v5 |
| UI 라이브러리 | shadcn/ui (Radix 기반) |
| 스타일링 | Tailwind CSS v4 + tw-animate-css |
| 폼 | React Hook Form + Zod |
| 국제화 | i18next (en/ko/ja/th) |
| 아이콘 | Lucide React |
| 애니메이션 | Framer Motion |

### Frontend — Portal (`artifacts/edubee-portal`)
| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 + Vite 7 |
| 라우팅 | Wouter |
| 상태관리 | TanStack Query v5 |
| 인증 | JWT (localStorage) |
| 테마 | 테넌트 브랜딩 동적 로드 |

### Frontend — Website (`artifacts/edubee-website`)
| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 + Vite 7 |
| 국제화 | i18next (en/ko/ja/th) |

### Frontend — CAMP (`artifacts/edubee-camp`)
| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 + Vite 7 |
| 용도 | 단기 캠프 신청 전용 |

### Backend — API Server (`artifacts/api-server`)
| 항목 | 기술 |
|------|------|
| 런타임 | Node.js (tsx — TypeScript 직접 실행) |
| 프레임워크 | Express 5 |
| ORM | Drizzle ORM 0.45.2 |
| 인증 | JWT (jsonwebtoken) — Access 8h / Refresh 7d |
| 패스워드 | bcryptjs |
| 보안 | Helmet, CORS, express-rate-limit |
| 에러 모니터링 | Sentry (@sentry/node) |
| 로깅 | pino + pino-http (구조화 JSON 로그) |
| 스케줄러 | node-cron |
| 파일업로드 | multer → Google Cloud Storage |
| PDF | @react-pdf/renderer |
| AI | @google/genai + @google/generative-ai |
| 이메일 | Resend (트랜잭션) + Nodemailer (SMTP fallback) |
| 결제 | Stripe (구독 + Webhook) |

### Database & Infrastructure
| 항목 | 기술 |
|------|------|
| DB | PostgreSQL (멀티테넌트 schema per tenant) |
| ORM / 마이그레이션 | Drizzle ORM + drizzle-kit (push/generate/migrate) |
| 파일 스토리지 | Google Cloud Storage |
| 패키지 관리 | pnpm workspace (모노레포) |
| 배포 | Replit (Node.js) |

### 외부 서비스 (환경변수 기준)
| 서비스 | 환경변수 키 | 용도 |
|--------|------------|------|
| PostgreSQL | `DATABASE_URL` | 주 DB |
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET` | 토큰 서명 |
| 암호화 | `FIELD_ENCRYPTION_KEY` | AES-256-GCM (여권번호 등) |
| GCS | `GCS_BUCKET_*` (추정) | 파일 저장 |
| Stripe | `STRIPE_SECRET_KEY` (추정) | 결제 |
| Resend | `RESEND_API_KEY` (DB tenant 설정) | 이메일 |
| Sentry | `SENTRY_DSN` | 에러 추적 |
| CORS | `ALLOWED_ORIGINS` | 도메인 화이트리스트 |

---

## 3. 폴더 구조

```
workspace/                          ← pnpm 모노레포 루트
├── artifacts/
│   ├── api-server/                 ← Express API (포트: $PORT)
│   │   └── src/
│   │       ├── routes/             ← 70+ 라우트 파일
│   │       ├── middleware/         ← auth, RBAC, tenant, error
│   │       ├── services/           ← emailService, taxInvoice, receipt 등
│   │       ├── jobs/               ← kpiScheduler.ts (node-cron)
│   │       ├── lib/                ← crypto, logger, auditLogger, errors
│   │       ├── seeds/              ← dev_seed.sql, provision-tenant.ts
│   │       └── __tests__/          ← Vitest 8개 테스트
│   ├── edubee-admin/               ← CRM 프론트엔드 (/admin)
│   │   └── src/
│   │       ├── pages/admin/        ← 100+ 관리자 페이지
│   │       ├── components/         ← shadcn/ui 확장 컴포넌트
│   │       └── hooks/              ← useAuth, useTenantTheme 등
│   ├── edubee-portal/              ← 에이전트/파트너/학생 포털 (/portal)
│   │   └── src/
│   │       ├── pages/              ← 34개 포털 페이지
│   │       └── components/         ← portal-layout, UI 공통
│   ├── edubee-website/             ← 마케팅 웹사이트 (/)
│   └── edubee-camp/               ← 캠프 신청 사이트 (/camp)
├── lib/
│   ├── db/                         ← @workspace/db (Drizzle 스키마 + DB 연결)
│   │   └── src/schema/             ← 20+ 스키마 파일
│   ├── api-spec/                   ← OpenAPI 스펙 (추정)
│   ├── api-zod/                    ← Zod 검증 스키마 공유
│   └── integrations-gemini-ai/     ← AI 통합
├── scripts/                        ← 빌드 스크립트
├── _context/                       ← 프로젝트 문서 (이 파일)
└── replit.md                       ← Replit 에이전트 메모리 파일
```

---

## 4. 실행 방법

```bash
# 개발 서버 (각 아티팩트 독립 실행)
pnpm --filter @workspace/api-server run dev        # API: $PORT
pnpm --filter @workspace/edubee-admin run dev      # CRM
pnpm --filter @workspace/edubee-portal run dev     # Portal
pnpm --filter @workspace/edubee-website run dev    # Website
pnpm --filter @workspace/edubee-camp run dev       # CAMP

# 빌드
bash scripts/build.sh

# 프로덕션 실행
node artifacts/api-server/dist/index.cjs

# 테스트
pnpm --filter @workspace/api-server test

# DB 스키마 동기화
pnpm --filter @workspace/db run push
```

---

## 5. Replit 환경 특이사항

| 항목 | 내용 |
|------|------|
| 포트 | `process.env.PORT` 환경변수 사용 (하드코딩 금지) |
| 프록시 | Cloudflare + Replit 리버스 프록시 (`trust proxy: 1`) |
| 경로 | 각 프론트엔드 `BASE_PATH` env로 경로 기반 라우팅 (`/admin`, `/portal`, `/camp`) |
| 스키마 격리 | 테넌트별 PostgreSQL schema 사용 (`AsyncLocalStorage` 컨텍스트) |
| 타임존 | `process.env.TZ = "UTC"` — `index.ts` 첫 줄에서 강제 설정 |
| 패키지 관리 | pnpm only (package-lock.json 없음 → `npm audit` 대신 `pnpm audit` 사용) |
| 시크릿 | `.env` 파일 없음 → Replit Secrets 패널에서 관리 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _context/USER_ROLES.md -->

# USER_ROLES.md — Edubee CRM 사용자 역할 & 권한

> 생성일: 2026-04-19 | 소스: middleware/authenticate.ts, requireRole.ts, superAdminOnly.ts, auth.ts

---

## 1. 역할 목록

### 스태프 역할 (Admin CRM 로그인)
| 역할 코드 | 역할명 | 설명 |
|-----------|--------|------|
| `super_admin` | 플랫폼 슈퍼 어드민 | `organisationId = null`인 Edubee 플랫폼 관리자. 모든 테넌트 접근 가능. |
| `admin` | 테넌트 어드민 | 특정 테넌트의 최고 관리자. 자신의 org 전체 관리. |
| `manager` / `mgr` | 매니저 | 팀 관리 및 리포트 조회 권한 (추정). |
| `consultant` / `ec` | 교육 컨설턴트 | Lead → Contract 생성 및 담당. 기본 스태프 역할. |
| `bookkeeper` / `bk` | 경리 | 재무/회계 관련 기능 접근. |
| `camp_coordinator` | 캠프 코디네이터 | CAMP 어플리케이션, 인보이스 관리. |
| `readonly` | 읽기 전용 | 조회만 가능. |

### 포털 역할 (Portal 로그인 — accounts 테이블 기반)
| 역할 코드 | 역할명 | 설명 |
|-----------|--------|------|
| `agent` | 에이전트 | 학생을 소개하는 해외 교육 에이전시. |
| `partner` → `hotel` | 파트너: 호텔 | 숙박 파트너. |
| `partner` → `pickup` | 파트너: 픽업 | 공항 픽업 파트너. |
| `partner` → `institute` | 파트너: 학교/기관 | 교육기관 파트너. |
| `partner` → `tour` | 파트너: 투어 | 투어 파트너. |
| `student` | 학생 | 서비스를 받는 최종 고객. |

---

## 2. 인증 방식

### JWT 구조

**스태프 토큰 Payload:**
```json
{
  "userType": "staff",
  "id": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "staffRole": "education_agent",
  "fullName": "홍길동",
  "organisationId": "uuid-or-null",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**포털 토큰 Payload:**
```json
{
  "userType": "portal",
  "accountId": "uuid",
  "email": "agent@agency.com",
  "portalRole": "agent",
  "accountName": "ABC Agency",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 토큰 만료 시간
| 토큰 유형 | 만료 |
|-----------|------|
| 스태프 Access Token | 8시간 (`8h`) |
| 포털 Access Token | 24시간 (`24h`) |
| Refresh Token (양쪽 공통) | 7일 (`7d`) |

### 인증 헤더
```
Authorization: Bearer <access_token>
```

### 계정 잠금 정책
- 로그인 실패 5회 → 30분 잠금
- `users.failedLoginAttempts`, `users.lockedUntil` 컬럼으로 관리

---

## 3. 미들웨어 동작 방식

### `authenticate.ts` — 스태프 인증
1. `Authorization: Bearer <token>` 헤더 확인
2. `JWT_SECRET`으로 verify → `req.user` 설정
3. `X-View-As-User-Id` 헤더가 있고 `super_admin`/`admin`이면 View-As 모드 (Impersonation)

### `authenticatePortal.ts` — 포털 인증
1. 동일한 JWT_SECRET 사용 (토큰 공유)
2. `decoded.userType === "portal"` 검증
3. → `req.portalUser` 설정

### `requireRole(...roles)` — RBAC
```typescript
requireRole("admin", "super_admin")
// req.user.role이 roles에 없으면 403 반환
```

### `superAdminOnly` — 플랫폼 어드민 전용
- `role === "super_admin"` AND `organisationId === null` 조건
- 실패 시 **404** 반환 (보안: 라우트 존재 노출 방지)

### `tenantResolver` — 멀티테넌트
- `X-Organisation-Id` 헤더 또는 `?subdomain=` 쿼리 파라미터에서 테넌트 식별
- `req.tenant` 설정 → 이후 쿼리에서 `organisationId` 필터 자동 적용

---

## 4. View-As (Impersonation) 기능
- `X-View-As-User-Id: <user-uuid>` 헤더를 추가하면 해당 사용자로 동작
- `super_admin` / `admin` 만 사용 가능
- `impersonation_logs` 테이블에 기록 (`actorUserId`, `targetUserId`, `startedAt`, `ipAddress`)
- 관리자 로그: `/admin/settings/impersonation-logs` 페이지

---

## 5. 역할별 주요 권한 매트릭스 (코드 기반)

| 기능 | super_admin | admin | camp_coordinator | consultant | bookkeeper | readonly |
|------|:-----------:|:-----:|:----------------:|:----------:|:----------:|:--------:|
| 슈퍼어드민 대시보드 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 테넌트 관리 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 플랜/과금 관리 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 사용자 관리 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lead CRUD | ✅ | ✅ | ✅ | ✅ | ❌ | 조회 |
| Quote CRUD | ✅ | ✅ | ✅ | ✅ | ❌ | 조회 |
| Contract CRUD | ✅ | ✅ | ✅ | ✅ | ❌ | 조회 |
| Invoice CRUD | ✅ | ✅ | ✅ | ❌ | ✅ | 조회 |
| Transaction CRUD | ✅ | ✅ | ❌ | ❌ | ✅ | 조회 |
| 세금 인보이스 | ✅ | ✅ | ✅ | ❌ | ✅ | 조회 |
| 데이터 매니저 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 설정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| KPI | ✅ | ✅ | ❌ | 본인만 | ❌ | ❌ |
| 커뮤니티 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 6. 알려진 미구현 항목

| 항목 | 상태 |
|------|------|
| `checkPlanFeature()` 런타임 기능 강제 | ❌ 미구현 (platformPlans 테이블만 존재) |
| `marketing_consent` 발송 전 체크 | ❌ 미구현 |
| guardian_consent_given 강제 수집 | ⚠️ 부분 구현 (age < 18 체크는 있음) |
| field-level permissions (DB 기반) | ⚠️ 스키마 존재, 완전 적용 미확인 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _schema/API_ENDPOINTS.md -->

# API_ENDPOINTS.md — Edubee CRM API 엔드포인트 목록

> 생성일: 2026-04-19 | 소스: routes/index.ts + 각 라우트 파일 | Base URL: `/api`

---

## 인증 방식

```
Authorization: Bearer <access_token>
```
- 스태프 Access Token 만료: 8h
- 포털 Access Token 만료: 24h
- Refresh Token 만료: 7d (DB에 저장)

---

## 에러 응답 형식 (공통)

```json
{
  "success": false,
  "code": "UNAUTHORIZED | FORBIDDEN | VALIDATION_ERROR | NOT_FOUND | INTERNAL_ERROR",
  "message": "설명 텍스트",
  "details": [ ... ],       // Zod 오류 시만
  "timestamp": "ISO8601"
}
```

---

## 페이지네이션 방식

```
GET /api/leads?page=1&limit=20
```
```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 1. 인증 (`auth.ts`)

| 메서드 | 경로 | 설명 | 인증 | Rate Limit |
|--------|------|------|------|-----------|
| POST | `/auth/login` | 스태프+포털 통합 로그인 | ❌ | 10/15min |
| POST | `/auth/refresh` | Access Token 갱신 | ❌ | 30/15min |
| POST | `/auth/logout` | 로그아웃 (Refresh Token 삭제) | ✅ | - |
| GET | `/auth/me` | 현재 사용자 정보 | ✅ | - |
| POST | `/auth/forgot-password` | 비밀번호 재설정 이메일 | ❌ | - |
| POST | `/auth/reset-password` | 비밀번호 재설정 | ❌ | - |
| POST | `/auth/accept-invite` | 초대장 수락 | ❌ | - |
| POST | `/auth/register` | 테넌트 회원가입 | ❌ | - |

---

## 2. 리드 (`crm-leads.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/leads` | 리드 목록 (페이지네이션, 필터) | 인증 |
| POST | `/leads` | 리드 생성 | 인증 |
| GET | `/leads/:id` | 리드 상세 | 인증 |
| PUT | `/leads/:id` | 리드 수정 | 인증 |
| DELETE | `/leads/:id` | 리드 삭제 (soft) | admin+ |

---

## 3. 견적 (`crm-quotes.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/quotes` | 견적 목록 | 인증 |
| POST | `/quotes` | 견적 생성 | 인증 |
| GET | `/quotes/:id` | 견적 상세 | 인증 |
| PUT | `/quotes/:id` | 견적 수정 | 인증 |
| DELETE | `/quotes/:id` | 견적 삭제 | admin+ |

**Quote Products (`quote-products.ts`):**
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/quote-products?quoteId=uuid` | 견적 항목 조회 |
| POST | `/quote-products` | 항목 추가 |
| PUT | `/quote-products/:id` | 항목 수정 |
| DELETE | `/quote-products/:id` | 항목 삭제 |

---

## 4. 계약 (`crm-contracts.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/contracts` | 계약 목록 | 인증 |
| POST | `/contracts` | 계약 생성 | 인증 |
| GET | `/contracts/:id` | 계약 상세 | 인증 |
| PUT | `/contracts/:id` | 계약 수정 | admin+ |
| GET | `/contracts/:id/products` | 계약 항목(AR/AP) | 인증 |
| PUT | `/contracts/:id/products/:pid` | 항목 수정 | admin+ |

---

## 5. 재무 / 인보이스 (`finance.ts`, `invoices.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/invoices` | 인보이스 목록 | 인증 |
| POST | `/invoices` | 인보이스 생성 | admin+ |
| PUT | `/invoices/:id` | 인보이스 수정 | admin+ |
| GET | `/transactions` | 트랜잭션 목록 | 인증 |
| POST | `/transactions` | 트랜잭션 생성 | admin+ |
| GET | `/payment-headers` | 결제 헤더 목록 | 인증 |
| POST | `/payment-headers` | 결제 생성 | admin+ |
| GET | `/receipts` | 영수증 목록 | 인증 |

---

## 6. 세금 계산서 (`tax-invoices.ts`)

| 메서드 | 경로 | 설명 | 필요 역할 |
|--------|------|------|----------|
| GET | `/tax-invoices` | 세금계산서 목록 | admin, super_admin, camp_coordinator |
| POST | `/tax-invoices` | 세금계산서 생성 | admin+ |
| GET | `/tax-invoices/:id/pdf` | PDF 다운로드 | admin+ |

---

## 7. 포털 API (`portal.ts` — 1662라인)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/portal/login` | 포털 로그인 | ❌ |
| GET | `/portal/dashboard` | 에이전트 대시보드 | Portal |
| GET | `/portal/students` | 내 학생 목록 | Portal (agent) |
| GET | `/portal/students/:id` | 학생 상세 | Portal (agent) |
| GET | `/portal/leads` | 컨설테이션 목록 | Portal (agent) |
| GET | `/portal/leads/:id` | 리드 상세 | Portal (agent) |
| GET | `/portal/quotes` | 견적 목록 | Portal |
| GET | `/portal/quotes/:id` | 견적 상세 | Portal |
| GET | `/portal/contracts` | 계약 목록 | Portal |
| GET | `/portal/contracts/:id` | 계약 상세 | Portal |
| GET | `/portal/finance` | 커미션/재무 | Portal (agent) |
| GET | `/portal/documents` | 문서 목록 | Portal |
| GET | `/portal/partner/dashboard` | 파트너 대시보드 | Portal (partner) |
| GET | `/portal/partner/bookings` | 예약 목록 | Portal (partner) |
| GET | `/portal/student/dashboard` | 학생 대시보드 | Portal (student) |
| GET | `/portal/student/finance` | 납입 현황 | Portal (student) |
| GET | `/portal/photos/:filename` | 캠프 사진 | Portal (student) |

---

## 8. Privacy Act (APP 12/13) (`my-data.ts`, `privacy.ts`)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/privacy-policy` | 개인정보처리방침 | ❌ (공개) |
| GET | `/my-data` | 자기 열람 (APP 12) | Portal/Staff |
| POST | `/my-data/correction-request` | 수정 요청 (APP 13) | Portal/Staff |
| POST | `/my-data/withdraw-consent` | 동의 철회 | Portal/Staff |

---

## 9. 슈퍼어드민 (`superadmin.ts`) — super_admin only

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/superadmin/tenants` | 테넌트 목록 |
| POST | `/superadmin/tenants` | 테넌트 생성 |
| GET | `/superadmin/tenants/:id` | 테넌트 상세 |
| GET | `/superadmin/dashboard` | 플랫폼 KPI |

---

## 10. 설정 / 기타

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/settings` | 테넌트 설정 | ❌ (theme only) |
| PUT | `/settings` | 설정 수정 | admin+ |
| GET | `/health` | 헬스체크 | ❌ |
| POST | `/webhook` | Stripe Webhook | ❌ (raw body) |
| POST | `/ai/chat` | Gemini AI 챗봇 | 인증 |
| POST | `/storage/upload` | 파일 업로드 | 인증 |
| GET | `/documents/:id/view` | 문서 조회 (Signed URL) | 인증 |
| GET | `/documents/:id/download` | 문서 다운로드 | 인증 |

---

## 11. 파일 업로드 엔드포인트

| 경로 | 최대 크기 | 타입 제한 | 저장소 |
|------|----------|----------|--------|
| `POST /storage/upload` | 12 MB | 없음 | GCS |
| `POST /documents` (upload) | 20 MB | mimetype 기록만 | GCS |
| `POST /camp-photos` | 미설정 | 이미지만 | Local + GCS |
| `POST /data-manager/import` | 5 MB | CSV | 임시 로컬 |
| `POST /chatbot/upload` | 5 MB | 없음 | 임시 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _schema/DB_SCHEMA_OVERVIEW.md -->

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


---

<!-- FILE: _schema/DRIZZLE_PATTERNS.md -->

# DRIZZLE_PATTERNS.md — Drizzle ORM 패턴 가이드

> 생성일: 2026-04-19 | 소스: routes/, lib/db/src/schema/ | Drizzle ORM: 0.45.2

---

## 1. 자주 쓰는 쿼리 패턴

### 1-1. 단순 SELECT (with 필터/정렬)

```typescript
// routes/finance.ts 패턴
const conditions: SQL[] = [];
if (contractId) conditions.push(eq(invoices.contractId, contractId));
if (status) conditions.push(eq(invoices.status, status));
if (invoiceType) conditions.push(eq(invoices.invoiceType, invoiceType));

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

const rows = await db
  .select()
  .from(invoices)
  .where(whereClause)
  .orderBy(desc(invoices.createdAt))
  .limit(limitNum)
  .offset(offset);
```

### 1-2. 페이지네이션

```typescript
// 공통 패턴 (finance.ts, invoices.ts 등)
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
const offset = (page - 1) * limit;

const [rows, [countResult]] = await Promise.all([
  db.select().from(table).where(where).limit(limit).offset(offset),
  db.select({ count: count() }).from(table).where(where),
]);

return res.json({
  data: rows,
  meta: { total: Number(countResult.count), page, limit, totalPages: Math.ceil(total / limit) }
});
```

### 1-3. JOIN 패턴

```typescript
// finance.ts 패턴 — contracts + applications 조인
const contractRows = await db
  .select({
    contractId: contracts.id,
    contractNumber: contracts.contractNumber,
    studentName: contracts.studentName,
    clientId: applications.clientId,
  })
  .from(contracts)
  .leftJoin(applications, eq(contracts.applicationId, applications.id))
  .where(inArray(contracts.id, contractIds));
```

### 1-4. INSERT + returning

```typescript
// 공통 패턴
const [newRecord] = await db
  .insert(tableName)
  .values({
    id: crypto.randomUUID(),
    field1: value1,
    field2: value2,
    createdAt: new Date(),
    organisationId: req.tenant?.id,
    createdBy: req.user!.id,
  })
  .returning();

return res.status(201).json({ success: true, data: newRecord });
```

### 1-5. UPDATE (부분 업데이트)

```typescript
// crm-contracts.ts 패턴 — dynamic SET
const setSql = buildSetClause(body);  // 동적 컬럼 생성
await db.execute(sql`UPDATE contracts SET ${setSql} WHERE id = ${req.params.id}`);

// 또는 Drizzle 표준 방식
await db
  .update(tableName)
  .set({ ...body, updatedAt: new Date() })
  .where(eq(tableName.id, id));
```

### 1-6. onConflict (Upsert)

```typescript
// account-service-profiles.ts
await db
  .insert(accountServiceProfiles)
  .values(newRecord)
  .onConflictDoNothing();

// data-manager.ts
await db
  .insert(applications)
  .values(vals)
  .onConflictDoUpdate({
    target: [applications.applicationNumber],
    set: vals,
  });
```

### 1-7. 집계 쿼리

```typescript
// dashboard-crm.ts
const [result] = await db
  .select({ total: sql<number>`COALESCE(SUM(amount), 0)::numeric` })
  .from(journalEntries)
  .where(eq(journalEntries.creditCoa, '3100'));

// 직접 SQL 실행
const rows = await db.execute(sql`
  SELECT COUNT(*)::int AS n FROM tax_invoices
`);
```

### 1-8. 멀티테넌트 컨텍스트

```typescript
// routes에서 테넌트 필터 자동 적용
if (req.tenant) {
  conditions.push(eq(tableName.organisationId, req.tenant.id));
}

// 명시적 schema 전환
await runWithTenantSchema(tenantSlug, async () => {
  const rows = await db.select().from(tableName);
});
```

---

## 2. 현재 사용 중인 설정

**`lib/db/package.json`:**
```json
{
  "scripts": {
    "push": "drizzle-kit push --config ./drizzle.config.ts",
    "push-force": "drizzle-kit push --force --config ./drizzle.config.ts",
    "generate": "drizzle-kit generate --config ./drizzle.config.ts",
    "migrate": "drizzle-kit migrate --config ./drizzle.config.ts"
  }
}
```

**DB 연결 패턴:**
- `staticDb` — public schema 전용 (users, organisations)
- `db` — AsyncLocalStorage 컨텍스트에서 테넌트 schema 자동 전환

---

## 3. 발견된 쿼리 최적화 문제점

| 문제 | 위치 | 권장 해결책 |
|------|------|------------|
| 모든 컬럼 SELECT | 다수 라우트 (`db.select().from(table)`) | 필요한 컬럼만 명시적으로 선택 |
| N+1 쿼리 가능성 | `enrichWithStudentName()` — contractIds 루프 | 현재 `inArray` 배치로 최적화됨 ✅ |
| 카운트 쿼리 중복 | 일부 라우트에서 data + count 별도 실행 | `Promise.all()`로 병렬 실행 (대부분 구현됨 ✅) |
| 대용량 export | data-manager.ts 전체 조회 | 스트리밍 방식 전환 권장 |

---

## 4. 멀티테넌트 전환 시 수정이 필요한 쿼리

**`organisationId` 필터 추가 필요 라우트 (현재 누락 가능성):**

```typescript
// ❌ 위험 — 테넌트 필터 없음
const rows = await db.select().from(tableName);

// ✅ 안전 — 테넌트 필터 적용
const rows = await db.select().from(tableName)
  .where(eq(tableName.organisationId, req.tenant!.id));
```

**확인 대상 파일:**
- `routes/services-guardian.ts`
- `routes/accounting-arap.ts`
- `routes/ledger.ts`
- `routes/kpi.ts`

---

## 5. 알려진 TypeScript 오류 (683개)

**원인:** Drizzle ORM 0.45.x와 TypeScript 5.9.x 타입 호환성 이슈

```
src/lib/objectStorage.ts(300,11): error TS2339: Property 'signed_url' does not exist on type '{}'.
src/routes/account-service-profiles.ts(33,16): error TS2769: No overload matches this call.
```

**영향:** 런타임 없음 — `tsx`로 직접 실행하므로 타입 체크 우회  
**해결 방법 (추정):** `drizzle-orm` 버전 고정 또는 `// @ts-ignore` 사용

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _design/COLOR_STATUS_CODES.md -->

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


---

<!-- FILE: _design/DESIGN_SYSTEM.md -->

# DESIGN_SYSTEM.md — Edubee CRM 디자인 시스템

> 생성일: 2026-04-19 | 소스: index.css, tailwind config, components/ui/

---

## 1. 브랜드 컬러 시스템

### Edubee 기본 오렌지 팔레트 (`#F5821F`)
```css
/* 테넌트 브랜딩 오렌지 — applyThemeToDom()이 JS로 재정의 가능 */
--e-orange:      #F5821F   /* 메인 브랜드 컬러 */
--e-orange-dk:   #d26a10   /* Hover/Active 다크 */
--e-orange-lt:   #fef0e3   /* 배경/연한 강조 */
--e-orange-ring: rgba(245,130,31,0.15)  /* 포커스 링 */

--e-orange-50:   #fef0e3   /* 연한 배경 */
--e-orange-100:  #fde2c6   /* 경계선 */
--e-orange-200:  #fcc89d   /* 강조 배경 */
--e-orange-300:  #f9a664   /* 중간 */
--e-orange-400:  #f78d3a   /* 버튼 hover */
--e-orange-500:  #F5821F   /* Primary 기본 */
--e-orange-600:  #d26a10   /* 텍스트 강조 */
--e-orange-700:  #a85010   /* 헤더/제목 */
```

### 중성(Neutral) 팔레트
```css
--neutral-50:  #FAFAF9   /* 페이지 배경 */
--neutral-100: #F4F3F1   /* 카드 배경 */
--neutral-200: #E8E6E2   /* 구분선, 테두리 */
--neutral-400: #A8A29E   /* Placeholder 텍스트 */
--neutral-600: #57534E   /* 보조 텍스트 */
--neutral-900: #1C1917   /* 제목 텍스트 */
```

### CSS 변수 (Tailwind 연동)
| 변수 | 용도 |
|------|------|
| `--color-background` | 페이지 배경 |
| `--color-foreground` | 기본 텍스트 |
| `--color-primary` | 브랜드 오렌지 |
| `--color-secondary` | 보조 컬러 |
| `--color-muted` | 비활성 요소 |
| `--color-destructive` | 에러/삭제 (빨간) |
| `--color-chart-1~5` | 차트 컬러 |
| `--color-sidebar-*` | 사이드바 전용 |

---

## 2. 타이포그래피

| 항목 | 값 |
|------|-----|
| 폰트 (웹) | `Inter` (Google Fonts) |
| 폰트 (시스템 fallback) | `system-ui, sans-serif` |
| `--font-sans` | Inter |
| `--font-display` | Inter |

### 타이포그래피 플러그인
- `@tailwindcss/typography` — 마크다운/장문 텍스트 렌더링용

---

## 3. Border Radius 시스템
| 토큰 | 값 |
|------|-----|
| `--radius-sm` | 4px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |

---

## 4. shadcn/ui 컴포넌트 목록

Admin CRM (`artifacts/edubee-admin/src/components/ui/`) 에서 사용 중:

| 컴포넌트 | 설명 |
|----------|------|
| `badge.tsx` | 상태 뱃지 (variant: default/secondary/destructive/outline) |
| `button.tsx` | 버튼 (variant: default/outline/ghost/destructive) |
| `card.tsx` | 카드 레이아웃 |
| `dialog.tsx` | 모달 다이얼로그 |
| `dropdown-menu.tsx` | 드롭다운 메뉴 |
| `form.tsx` | RHF + Zod 통합 폼 |
| `input.tsx` | 텍스트 입력 |
| `select.tsx` | 셀렉트 박스 |
| `table.tsx` | 데이터 테이블 |
| `tabs.tsx` | 탭 네비게이션 |
| `toast.tsx` + `toaster.tsx` | 알림 토스트 |
| `tooltip.tsx` | 툴팁 |
| `separator.tsx` | 구분선 |
| `sheet.tsx` | 사이드 슬라이드 패널 |
| `skeleton.tsx` | 로딩 스켈레톤 |
| `status-badge.tsx` | 커스텀 상태 뱃지 |

---

## 5. 커스텀 공통 컴포넌트

### Admin CRM
| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| `StatusBadge` | `components/ui/status-badge.tsx` | 엔티티 상태 표시 |
| `ReportStatusBadge` | `components/shared/ReportStatusBadge.tsx` | 보고서 상태 |
| `EntityDocumentsTab` | `components/shared/EntityDocumentsTab.tsx` | 공통 문서 탭 |
| `ProductDrawer` | `components/shared/ProductDrawer.tsx` | 상품 선택 드로어 |
| `ContractFinanceTab` | `components/contracts/ContractFinanceTab.tsx` | 계약 재무 탭 |
| `ContractSignatureTab` | `components/contracts/ContractSignatureTab.tsx` | 서명 탭 |
| `SuperAdminGuard` | `components/guards/SuperAdminGuard.tsx` | 슈퍼어드민 보호 |

### Portal
| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| `PortalLayout` | `components/portal-layout.tsx` | 포털 공통 레이아웃 (사이드바+헤더) |
| `AuthProvider` | `lib/auth.tsx` | JWT 인증 컨텍스트 |

---

## 6. 아이콘 라이브러리

**Lucide React** (`lucide-react ^0.545.0`)

자주 사용되는 아이콘:
- `LayoutDashboard` — 대시보드
- `Users` — 컨설테이션/사용자
- `GraduationCap` — My Students
- `FileText` — 견적/문서
- `BookOpen` — 계약
- `Package` — 서비스
- `Wallet` — 재무
- `FolderOpen` — 파일/문서
- `MessageCircle` — 커뮤니티
- `User` — 프로필

---

## 7. 반응형 브레이크포인트

Tailwind CSS v4 기본값 사용:
| 브레이크포인트 | 값 |
|--------------|-----|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

---

## 8. 다크모드

CSS `@custom-variant dark (&:is(.dark *))` 정의됨.  
현재 UI에서는 대부분 라이트 모드 사용. 다크모드 변수는 `:root` + `.dark` 클래스 패턴.

---

## 9. 테넌트 테마 시스템

`applyThemeToDom()` 함수가 테넌트 설정에서 오렌지 계열 색상을 동적으로 재정의:
- 기본값: `#F5821F` (Edubee 오렌지)
- 테넌트별로 커스텀 브랜드 컬러 가능
- `useTenantTheme()` 훅이 API에서 설정을 로드하여 CSS 변수에 적용

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _design/PAGE_LAYOUTS.md -->

# PAGE_LAYOUTS.md — Edubee CRM 페이지 레이아웃 & 라우팅

> 생성일: 2026-04-19 | 소스: App.tsx (admin + portal), portal-layout.tsx

---

## 1. Admin CRM 페이지 목록 (`/admin`)

### 인증 페이지 (레이아웃: 풀스크린 / 미인증)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/login` | `Login` | 로그인 |
| `/register` | `Register` | 테넌트 회원가입 |
| `/forgot-password` | `ForgotPassword` | 비밀번호 찾기 |
| `/reset-password` | `ResetPassword` | 비밀번호 재설정 |
| `/accept-invite` | `AcceptInvite` | 초대장 수락 |

### 공개 페이지 (레이아웃: 풀스크린)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/apply` | `ApplyPage` | 학생 직접 신청 |
| `/inquiry` | `LeadInquiryPage` | 문의 폼 |
| `/form/:slug` | `PublicFormGateway` | 공개 폼 게이트웨이 |

### CRM 메인 (레이아웃: 사이드바+헤더, 인증 필요)
| 경로 | 컴포넌트 | 필요 역할 |
|------|----------|----------|
| `/` | `DashboardCrmPage` | 모든 스태프 |
| `/leads` | `Leads` | 모든 스태프 |
| `/applications` | `Applications` | 모든 스태프 |
| `/applications/all` | `AllApplications` | 모든 스태프 |
| `/camp-applications` | `CampApplications` | 모든 스태프 |
| `/camp-applications/:id` | `CampApplicationDetail` | 모든 스태프 |
| `/package-groups` | `PackageGroups` | admin+ |
| `/packages` | `Packages` | admin+ |
| `/packages/:id` | `PackageDetail` | admin+ |
| `/users` | `Users` | admin+ |
| `/users/:id` | `UserDetail` | admin+ |
| `/teams` | `TeamsPage` | admin+ |
| `/teams/:id` | `TeamDetailPage` | admin+ |
| `/kpi/staff` | `StaffKpiPage` | 모든 스태프 |
| `/kpi/team` | `TeamKpiPage` | 모든 스태프 |
| `/kpi/targets` | `KpiTargetsPage` | admin+ |
| `/products` | `Products` | admin+ |
| `/products/:id` | `ProductDetail` | admin+ |
| `/product-groups` | `ProductGroups` | admin+ |
| `/product-types` | `ProductTypes` | admin+ |
| `/commissions` | `CommissionsPage` | admin+ |
| `/community` | `AdminCommunityPage` | 모든 스태프 |

### 서비스 관리
| 경로 | 컴포넌트 |
|------|----------|
| `/services/pickup` | `PickupManagement` |
| `/services/pickup/:id` | `PickupMgtDetail` |
| `/services/tour` | `TourManagement` |
| `/services/tour/:id` | `TourMgtDetail` |
| `/services/settlement` | `Settlement` |
| `/services/tasks` | `TasksCS` |

### 회계/재무
| 경로 | 컴포넌트 |
|------|----------|
| `/accounting/exchange-rates` | `ExchangeRates` |
| `/accounting/invoices` | `Invoices` |
| `/accounting/receipts` | `Receipts` |
| `/accounting/receipts/:id` | `ReceiptDetailPage` |
| `/accounting/transactions` | `Transactions` |
| `/accounting/transactions/:id` | `TransactionDetailPage` |
| `/my-accounting/settlements` | `MySettlements` |
| `/my-accounting/invoices` | `MyInvoices` |
| `/my-accounting/revenue` | `MyRevenue` |

### 판매 (영업)
| 경로 | 컴포넌트 |
|------|----------|
| `/sales/schooling` | `SchoolingConsultationsPage` |
| `/sales/study-abroad` | `StudyAbroadConsultationsPage` |

### 문서/리포트/설정
| 경로 | 컴포넌트 |
|------|----------|
| `/documents` | `DocumentsPage` |
| `/chatbot` | `ChatbotAdminPage` |
| `/reports` | `ReportsPage` |
| `/reports/:id` | `ReportViewerPage` |
| `/settings/general` | `GeneralSettings` |
| `/settings/page-access` | `PageAccess` |
| `/settings/field-permissions` | `FieldPermissions` |
| `/settings/doc-permissions` | `DocPermissions` |
| `/settings/company-profile` | `CompanyProfile` |
| `/settings/branding` | `Branding` |
| `/settings/domain-access` | `DomainAccess` |
| `/settings/users-teams` | `UsersTeams` |
| `/settings/plan-billing` | `PlanBilling` |
| `/settings/integrations` | `TenantIntegrations` |
| `/settings/data-manager` | `DataManager` |
| `/settings/lookup-values` | `LookupValues` |
| `/settings/db-sync` | `DbSync` |
| `/settings/impersonation-logs` | `ImpersonationLogs` |

### 슈퍼어드민 (`/superadmin/*`) — super_admin only
| 경로 | 컴포넌트 |
|------|----------|
| `/superadmin` | `SuperAdminDashboard` |
| `/superadmin/tenants` | `TenantList` |
| `/superadmin/tenants/:id` | `TenantDetail` |
| `/superadmin/plans` | `PlatformPlans` |
| `/superadmin/stripe` | `StripeSettings` |
| `/superadmin/crm` | `PlatformCrm` |
| `/superadmin/crm/:id` | `PlatformCrmDetail` |
| `/superadmin/integrations` | `SuperAdminIntegrations` |

---

## 2. Portal 페이지 목록 (`/portal`)

### 에이전트 포털 (portalRole: `agent`)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/dashboard` | `DashboardPage` | 에이전트 대시보드 |
| `/consultations` | `AgentConsultationsPage` | 담당 학생 목록/컨설테이션 |
| `/consultations/:id` | `AgentLeadDetailPage` | 리드 상세 |
| `/students` | `StudentsPage` | 내 학생 목록 |
| `/students/:id` | `StudentDetailPage` | 학생 상세 |
| `/quotes` | `AgentQuotesPage` | 견적 목록 |
| `/quotes/:id` | `AgentQuoteDetailPage` | 견적 상세 |
| `/contracts` | `AgentContractsPage` | 계약 목록 |
| `/services` | `AgentServicesPage` | 서비스 현황 |
| `/finance` | `CommissionsPage` | 커미션/재무 |
| `/documents` | `AgentDocumentsPage` | 문서 |
| `/profile` | `ProfilePage` | 내 프로필 |
| `/community` | `CommunityPage` | 커뮤니티 |

### 파트너 포털 (portalRole: `hotel`/`pickup`/`institute`/`tour`)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/partner/dashboard` | `PartnerDashboardPage` | 파트너 대시보드 |
| `/partner/consultations` | `PartnerConsultationsPage` | 컨설테이션 |
| `/partner/quotes` | `PartnerBookingsPage` | 예약 목록 |
| `/partner/quotes/:id` | `PartnerBookingDetailPage` | 예약 상세 |
| `/partner/contracts` | `PartnerContractsPage` | 계약 목록 |
| `/partner/services` | `PartnerServicesPage` | 서비스 현황 |
| `/partner/finance` | `PartnerFinancePage` | 재무 |
| `/partner/documents` | `PartnerDocumentsPage` | 문서 |

### 학생 포털 (portalRole: `student`)
| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/student/dashboard` | `StudentDashboardPage` | 학생 대시보드 |
| `/student/consultations` | `StudentConsultationsPage` | 상담 내역 |
| `/student/consultations/:id` | `StudentConsultationDetailPage` | 상담 상세 |
| `/student/quotes` | `StudentQuotesPage` | 견적 목록 |
| `/student/quotes/:id` | `StudentQuoteDetailPage` | 견적 상세 |
| `/student/contracts` | `StudentContractsPage` | 계약 목록 |
| `/student/services` | `StudentProgramsPage` | 서비스/프로그램 |
| `/student/services/:id` | `StudentServiceDetailPage` | 서비스 상세 |
| `/student/finance` | `StudentFinancePage` | 납입 현황 |
| `/student/documents` | `StudentDocumentsPage` | 문서 |
| `/student/photos` | `StudentPhotosPage` | 캠프 사진 |
| `/community` | `CommunityPage` | 커뮤니티 (공유) |

---

## 3. 레이아웃 타입

### 1. `PortalLayout` — 포털 공통 (`artifacts/edubee-portal/src/components/portal-layout.tsx`)
- 좌측 사이드바 (역할별 다른 메뉴)
- 상단 헤더 (테넌트 로고, 사용자명, 로그아웃)
- 반응형: 모바일 hamburger 메뉴
- 역할 감지: `portalRole` → `getNavForRole()` 함수

### 2. Admin Layout — CRM 공통
- 좌측 사이드바 (메뉴 권한별 노출)
- 상단 헤더 + Breadcrumb

### 3. 풀스크린 — 로그인/공개 페이지
- 레이아웃 없음, 컴포넌트 전체화면

---

## 4. 포털 사이드바 Navigation 구조

```
에이전트 메뉴:
  Dashboard → /dashboard
  Consultations → /consultations
  My Students → /students       [GraduationCap]
  Quotes → /quotes
  Contracts → /contracts
  Services → /services
  Finance → /finance
  Documents → /documents
  Community → /community
  My Profile → /profile

파트너 메뉴:
  Dashboard → /partner/dashboard
  Consultations → /partner/consultations
  Bookings → /partner/quotes
  Contracts → /partner/contracts
  Services → /partner/services
  Finance → /partner/finance
  Documents → /partner/documents
  Community → /community
  My Profile → /partner/profile

학생 메뉴:
  Dashboard → /student/dashboard
  Consultations → /student/consultations
  Quotes → /student/quotes
  Contracts → /student/contracts
  Services → /student/services
  Finance → /student/finance
  Documents → /student/documents
  Camp Photos → /student/photos   [Image]
  Community → /community
  My Profile → /student/profile
```

---

## 5. 모달/다이얼로그 패턴

Admin CRM에서 사용 중인 패턴:
- **Sheet** (`shadcn/ui sheet`): 사이드 슬라이드 — 상세 편집 폼
- **Dialog** (`shadcn/ui dialog`): 확인/취소 다이얼로그, 소규모 폼
- **Drawer** (`ProductDrawer`, 커스텀): 상품 선택 드로어

열기/닫기 방식: `useState<boolean>` + `open={open}` prop 전달

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _templates/CODE_PATTERNS.md -->

# CODE_PATTERNS.md — 코드 패턴 표준 가이드

> 생성일: 2026-04-19 | 소스: routes/invoices.ts, routes/crm-leads.ts, 각 페이지 파일

---

## 1. API 라우트 표준 패턴

**최적 예시:** `routes/invoices.ts`

```typescript
import { Router } from "express";
import { db } from "@workspace/db";
import { invoices } from "@workspace/db/schema";
import { eq, desc, and, ilike, count } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { logAudit, auditParamsFromReq } from "../lib/auditLogger.js";

const router = Router();
const STAFF = ["super_admin", "admin", "camp_coordinator"];
const ADMIN = ["super_admin", "admin"];

// ── GET 목록 (인증 + RBAC + 페이지네이션 + 필터) ─────────────────────────
router.get(
  "/",
  authenticate,
  requireRole(...STAFF),
  async (req, res) => {
    try {
      // 1. 파라미터 파싱
      const { status, search } = req.query as Record<string, string>;
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const offset = (page - 1) * limit;

      // 2. 조건 빌드
      const conditions: any[] = [];
      if (req.tenant) conditions.push(eq(invoices.organisationId, req.tenant.id));
      if (status) conditions.push(eq(invoices.status, status));
      if (search) conditions.push(ilike(invoices.invoiceNumber, `%${search}%`));

      const baseQuery = conditions.length > 0 ? and(...conditions) : undefined;

      // 3. 병렬 쿼리 (데이터 + 카운트)
      const [rows, [countResult]] = await Promise.all([
        baseQuery
          ? db.select().from(invoices).where(baseQuery).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset)
          : db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(limit).offset(offset),
        baseQuery
          ? db.select({ count: count() }).from(invoices).where(baseQuery)
          : db.select({ count: count() }).from(invoices),
      ]);

      const total = Number(countResult.count);

      // 4. 표준 응답
      return res.json({
        data: rows,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ── POST 생성 (인증 + RBAC + Audit Log) ─────────────────────────────────
router.post(
  "/",
  authenticate,
  requireRole(...ADMIN),
  async (req, res) => {
    try {
      // 1. (선택) Zod 유효성 검사
      // const parsed = invoiceSchema.parse(req.body);

      // 2. 생성
      const [newInvoice] = await db
        .insert(invoices)
        .values({
          ...req.body,
          createdBy: req.user!.id,
          organisationId: req.tenant?.id,
        })
        .returning();

      // 3. Audit Log
      await logAudit({
        ...auditParamsFromReq(req),
        action: "CREATE",
        resourceType: "invoice",
        resourceId: newInvoice.id,
      });

      return res.status(201).json({ success: true, data: newInvoice });
    } catch (err) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
```

**핵심 원칙:**
- 인증: `authenticate` 미들웨어 필수
- RBAC: `requireRole(...roles)` 추가
- 테넌트 필터: `req.tenant?.id` 항상 확인
- 응답 형식: `{ success: true, data: ... }` 또는 `{ data: ..., meta: ... }`
- 에러: `res.status(500).json({ error: "..." })` 또는 전역 errorHandler

---

## 2. React 페이지 표준 패턴

**TanStack Query 데이터 패칭:**

```typescript
// pages/agent-quotes.tsx 패턴
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AgentQuotesPage() {
  const queryClient = useQueryClient();

  // 1. 데이터 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", "quotes"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/portal/quotes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30_000,  // 30초 캐시
  });

  // 2. 로딩 처리
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState message={error.message} />;

  // 3. 렌더링
  return (
    <div>
      {data?.data?.map((quote: Quote) => (
        <QuoteCard key={quote.id} quote={quote} />
      ))}
    </div>
  );
}
```

**데이터 변경 (useMutation):**

```typescript
const mutation = useMutation({
  mutationFn: async (payload: CreateQuoteInput) => {
    const res = await fetch(`${BASE_URL}api/quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["portal", "quotes"] });
    toast({ title: "견적이 생성되었습니다." });
  },
  onError: (err) => {
    toast({ variant: "destructive", title: "오류", description: err.message });
  },
});
```

---

## 3. Form + 유효성 검사 패턴

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  amount: z.number().min(0, "금액은 0 이상이어야 합니다"),
});

type FormData = z.infer<typeof formSchema>;

export function ExampleForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", amount: 0 },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <Input {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 4. 일관성 없는 패턴 목록 ⚠️

| 항목 | 불일치 예시 |
|------|-----------|
| **상태값 케이스** | `Draft`(PascalCase) vs `in_progress`(snake_case) 혼재 |
| **에러 응답 형식** | `{ error: "..." }` vs `{ success: false, code: "...", message: "..." }` 혼재 |
| **createdAt/createdOn** | 테이블마다 다름 (`created_at` vs `created_on`) |
| **ID 생성 방식** | `defaultRandom()` vs `crypto.randomUUID()` 혼재 |
| **인보이스 번호 채번** | `finance.ts`와 `invoices.ts`에 각각 독립적으로 구현됨 |
| **테넌트 필터** | 일부 라우트는 `req.tenant?.id` 확인, 일부는 생략 |
| **console.log** | pino logger 사용 중이나 49개 console.log 잔존 |

---

## 5. 개선이 필요한 안티패턴

| 안티패턴 | 예시 위치 | 권장 대안 |
|---------|---------|----------|
| `any` 타입 남용 | `req.body as any`, `decoded as any` | Zod 스키마로 타입 보장 |
| 빈 catch 블록 | `catch { /* ignore */ }` | 최소한 logger.warn 추가 |
| console.log 잔존 | 49개 | `logger.info/debug` 교체 |
| try/catch 없는 async | 일부 라우트 핸들러 | `try/catch` 또는 asyncHandler 래퍼 |
| 하드코딩된 역할 배열 | 각 라우트마다 `["super_admin", "admin"]` | 공통 상수로 추출 |
| `db.select()` 전체 컬럼 | 다수 목록 API | 필요한 필드만 select |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _workflows/CORE_PIPELINE.md -->

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


---

<!-- FILE: _workflows/FINANCE_WORKFLOW.md -->

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


---

<!-- FILE: _workflows/PERMISSION_MATRIX.md -->

# PERMISSION_MATRIX.md — Edubee CRM 권한 매트릭스

> 생성일: 2026-04-19 | 소스: middleware/requireRole.ts, middleware/superAdminOnly.ts, routes/ 전체

---

## 1. API 권한 매트릭스 (코드 기반)

범례: ✅ 허용 | ❌ 차단 | 👁 조회만 | 🔒 본인만

| 기능 / API | super_admin | admin | camp_coordinator | consultant | bookkeeper | readonly |
|-----------|:-----------:|:-----:|:----------------:|:----------:|:----------:|:--------:|
| **인증** | | | | | | |
| 로그인 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View-As Impersonation | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **슈퍼어드민** | | | | | | |
| 테넌트 목록/생성/수정 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 플랫폼 플랜 관리 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stripe 설정 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 플랫폼 CRM | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CRM** | | | | | | |
| Lead 조회 | ✅ | ✅ | ✅ | ✅ | 👁 | 👁 |
| Lead 생성/수정 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Lead 삭제 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Quote 조회/생성/수정 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| Contract 조회 | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| Contract 생성/수정 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Contract 삭제/취소 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **인보이스 / 재무** | | | | | | |
| Invoice 조회 | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| Invoice 생성/수정 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Tax Invoice | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Transaction 생성 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Payment Header | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Journal Entries | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **사용자/팀** | | | | | | |
| 사용자 조회 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 사용자 생성/수정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 팀 관리 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **KPI** | | | | | | |
| 전체 KPI 조회 | ✅ | ✅ | ❌ | 🔒 | ❌ | ❌ |
| KPI 목표 설정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **설정** | | | | | | |
| 테넌트 설정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 브랜딩 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 데이터 매니저 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 메뉴 접근 권한 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **서비스 관리** | | | | | | |
| 숙박/비자/가디언 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| 픽업/투어 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| CAMP 캠프 신청 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| **문서** | | | | | | |
| 문서 조회 | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| 문서 업로드 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 문서 삭제 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **커뮤니티** | | | | | | |
| 게시물 조회/작성 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 2. 포털 권한

| 기능 | agent | hotel/pickup/institute/tour | student |
|------|:-----:|:---------------------------:|:-------:|
| 대시보드 | ✅ | ✅ | ✅ |
| 내 학생 목록 | ✅ | ❌ | ❌ |
| 컨설테이션 | ✅ | ✅ | ✅ |
| 견적 | ✅ | ✅(bookings) | ✅ |
| 계약 | ✅ | ✅ | ✅ |
| 서비스 | ✅ | ✅ | ✅ |
| 재무(커미션) | ✅ | ✅ | ✅ |
| 문서 | ✅ | ✅ | ✅ |
| 캠프 사진 | ❌ | ❌ | ✅ |
| 커뮤니티 | ✅ | ✅ | ✅ |

---

## 3. 현재 권한 체크 미적용 (취약) API

| 경로 | 상태 | 위험 |
|------|------|------|
| `GET /api/invoices` | 인증만, RBAC 없음 | 낮음 (테넌트 필터 있음) |
| `GET /api/transactions` | 인증만 | 낮음 |
| `GET /api/dashboard` | 인증만 | 낮음 |
| `GET /api/privacy-policy` | 공개 | 의도적 공개 ✅ |
| `GET /api/health` | 공개 | 의도적 공개 ✅ |
| `POST /api/webhook` | Stripe 서명 검증 | Stripe 검증으로 보호 ✅ |

---

## 4. Role Switcher / View-As

**구현 위치:** `middleware/authenticate.ts`

```typescript
const viewAsId = req.headers["x-view-as-user-id"] as string;
if (viewAsId && (decoded.role === "super_admin" || decoded.role === "admin")) {
  // 해당 user로 req.user 교체
  req.user = viewAsUser;
}
```

**프론트엔드:** `hooks/use-view-as.tsx` (ViewAsProvider 컨텍스트)
**로그:** `impersonation_logs` 테이블에 기록

---

## 5. 멀티테넌트 전환 시 권한 체계 변경 필요 사항

| 항목 | 현재 | 필요 변경 |
|------|------|----------|
| `organisation_id` 기반 격리 | 대부분 구현됨 | 누락 라우트 점검 필요 |
| 플랜별 기능 강제 | `platform_plans` 테이블만 | `checkPlanFeature()` 런타임 구현 필요 |
| 테넌트 어드민 권한 | `admin` 역할로 통합 | 세분화 가능 (추정) |
| 포털 역할 | `accounts.portal_role` 기반 | 정상 구현됨 ✅ |
| 스태프 초대 | `tenant_invitations` 테이블 | 정상 구현됨 ✅ |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _rules/REGRESSION_LOG.md -->

# REGRESSION_LOG.md — 수정 위험 파일 목록 & 의존성 맵

> 생성일: 2026-04-19 | 중요도: 🔴 절대 금지 | 🟠 주의 | 🟡 확인 필요

---

## 1. 절대 수정하면 안 되는 파일 🔴

### `lib/db/src/schema/contracts.ts`
- **이유:** `contracts`, `contract_products`, `payment_headers`, `payment_lines`, `journal_entries` 핵심 재무 스키마
- **영향 범위:** 전체 재무 파이프라인 (AR/AP/커미션/분개)
- **수정 시 필수 확인:** crm-contracts.ts, finance.ts, contract-finance.ts, taxInvoiceService.ts, ledgerService.ts

### `lib/db/src/schema/crm.ts`
- **이유:** `contacts`(암호화 여권번호), `accounts`(포털 로그인), `quotes`, `quote_products` 핵심 CRM 스키마
- **영향 범위:** CRM 파이프라인 전체, 포털 인증
- **수정 시 필수 확인:** crm-leads.ts, crm-quotes.ts, crm-contracts.ts, portal.ts, accounts 관련 라우트

### `artifacts/api-server/src/middleware/authenticate.ts`
- **이유:** 스태프 JWT 인증 + View-As Impersonation 핵심 미들웨어
- **영향 범위:** 인증이 필요한 모든 API (500+ 엔드포인트)
- **수정 시 필수 확인:** authenticatePortal.ts, superAdminOnly.ts, requireRole.ts, auth.ts (token 구조)

### `artifacts/api-server/src/middleware/tenantResolver.ts`
- **이유:** 멀티테넌트 격리의 핵심. 잘못 수정 시 테넌트 간 데이터 노출 가능
- **영향 범위:** 멀티테넌트 전체 격리
- **수정 시 필수 확인:** routes/index.ts (AsyncLocalStorage 컨텍스트 순서)

### `lib/db/src/tenant-context.ts`
- **이유:** `runWithTenantSchema()` — PostgreSQL schema 전환 핵심 함수
- **영향 범위:** 테넌트 데이터 격리 전체
- **수정 시 필수 확인:** routes/index.ts, 모든 db 쿼리

### `artifacts/api-server/src/lib/crypto.ts`
- **이유:** AES-256-GCM 암호화/복호화. 변경 시 기존 암호화 데이터 복호화 불가
- **영향 범위:** 여권번호, 민감 개인정보 (Privacy Act APP 11 위반 가능)
- **⚠️ FIELD_ENCRYPTION_KEY 절대 변경 금지**

### `artifacts/api-server/src/routes/auth.ts`
- **이유:** JWT 생성/검증 로직. 토큰 구조 변경 시 기존 로그인 사용자 전원 강제 로그아웃
- **수정 시 필수 확인:** authenticate.ts, authenticatePortal.ts, 프론트엔드 useAuth

### `artifacts/api-server/src/services/taxInvoiceService.ts`
- **이유:** GST 세금 계산서 생성 + ATO 기준 GST 계산 로직
- **영향 범위:** 세금 계산서 금액 (법적 문서)

### `artifacts/api-server/src/services/ledgerService.ts`
- **이유:** 이중 분개 원장 생성 로직
- **영향 범위:** 전체 재무 회계 기록

---

## 2. 수정 시 주의가 필요한 파일 🟠

| 파일 | 이유 | 영향 범위 |
|------|------|---------|
| `routes/crm-contracts.ts` | AR/AP 날짜 순서 검증 (line 652) | 계약 생성 전체 |
| `routes/portal.ts` | 포털 API 전체 (1662라인) | 에이전트/파트너/학생 포털 |
| `routes/index.ts` | 미들웨어 순서 (tenantResolver → auth → routes) | 전체 API |
| `app.ts` | Helmet, CORS, Rate Limit 설정 | 전체 보안 |
| `lib/logger.ts` | pino redact 설정 (민감정보 마스킹) | Privacy Act APP 11 |
| `lib/auditLogger.ts` | 감사 로그 마스킹 로직 | 감사 기록 |
| `services/receiptPdfService.ts` | Receipt PDF 생성 (고객 수령 문서) | 법적 문서 |
| `seeds/provision-tenant.ts` | 테넌트 프로비저닝 초기화 스크립트 | 신규 테넌트 셋업 |
| `lib/db/src/schema/users.ts` | users 테이블 (role, staffRole, organisationId) | 인증 체계 전체 |
| `lib/db/src/schema/applications.ts` | leads + applications + camp_applications | CRM 파이프라인 시작점 |

---

## 3. 의존성 맵 (수정 파일 → 함께 확인할 파일)

| 수정 파일 | 함께 확인할 파일 | 이유 |
|----------|----------------|------|
| `schema/contracts.ts` | `crm-contracts.ts`, `finance.ts`, `contract-finance.ts`, `taxInvoiceService.ts` | FK/컬럼 변경 시 쿼리 깨짐 |
| `schema/users.ts` | `authenticate.ts`, `auth.ts`, `superAdminOnly.ts` | JWT payload 구조 연동 |
| `schema/crm.ts` → `accounts.portalRole` | `authenticatePortal.ts`, `portal.ts` | 포털 역할 변경 |
| `authenticate.ts` | 모든 `authenticate` import 라우트 | 미들웨어 시그니처 변경 |
| `tenantResolver.ts` | `routes/index.ts`, `lib/db/tenant-context.ts` | 컨텍스트 순서 |
| `crypto.ts` | `contacts` 저장/조회 라우트 | 암호화 키/알고리즘 |
| `auth.ts` (token payload) | `authenticate.ts`, `authenticatePortal.ts`, `useAuth` 훅 | JWT 구조 변경 |
| `portal.ts` | `edubee-portal/src/pages/*` | API 경로/응답 구조 |
| `app.ts` (CORS) | `ALLOWED_ORIGINS` env var | CORS 설정 |
| `index.ts` (cron) | `kpiScheduler.ts`, AR overdue 처리 | 스케줄 변경 |

---

## 4. 알려진 사이드 이펙트 이력

| 이력 | 설명 | 관련 파일 |
|------|------|---------|
| `/students` 라우트 삭제 → 복원 | App.tsx에서 실수로 redirect로 변경됨 → 복원 | `edubee-portal/src/App.tsx` |
| `/commissions` → `/finance` 링크 수정 | 대시보드에서 잘못된 링크 → 수정됨 | `edubee-portal/src/pages/dashboard.tsx` |
| TZ 설정 누락 | 날짜 계산 오류 가능성 → `index.ts:1`에서 UTC 강제 | `index.ts` |
| Stripe Webhook raw body | `express.json()` 전에 등록해야 함 → app.ts에서 순서 고정 | `app.ts` |
| `drizzle-kit` 경로 | 전역 미설치 → `pnpm --filter @workspace/db run push` | `lib/db/package.json` |

---

## 5. 환경변수 변경 시 영향을 받는 파일

| 환경변수 | 영향 파일 | 주의사항 |
|---------|---------|---------|
| `JWT_SECRET` | `middleware/authenticate.ts`, `authenticatePortal.ts`, `auth.ts` | 변경 시 **모든 로그인 토큰 무효화** |
| `JWT_REFRESH_SECRET` | `auth.ts`, refresh 로직 | 변경 시 Refresh Token 전체 무효화 |
| `FIELD_ENCRYPTION_KEY` | `lib/crypto.ts` | 변경 시 **기존 암호화 데이터 복호화 불가** — 절대 변경 금지 |
| `DATABASE_URL` | `lib/db/src/index.ts` | 변경 시 DB 재연결 필요 |
| `ALLOWED_ORIGINS` | `app.ts` | CORS 즉시 적용 (재시작 필요) |
| `PORT` | `index.ts`, `vite.config.ts` | 포트 변경 시 프록시 설정도 업데이트 필요 |
| `SENTRY_DSN` | `app.ts`, `middleware/errorHandler.ts` | 없으면 로컬 로깅만 |
| `GCS_*` | `lib/objectStorage.ts` | 스토리지 접근 불가 |
| `NODE_ENV=production` | `app.ts` (정적 파일 서빙), `index.ts` (log level) | 정적 파일 경로 변경 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _test/FEATURE_TEST_CASES.md -->

# FEATURE_TEST_CASES.md — 기능 테스트 케이스 목록

> 생성일: 2026-04-19 | 소스: __tests__/, routes/, 수동 테스트 기반

---

## 1. Vitest 단위 테스트 현황

**위치:** `artifacts/api-server/src/__tests__/`  
**결과:** 8/8 PASS (v2.0 검증 기준)  
**실행:** `pnpm --filter @workspace/api-server test`

| 테스트 파일 | 테스트 케이스 | 결과 |
|------------|-------------|------|
| `auth.test.ts` | JWT 생성/검증, 잘못된 시크릿 거부 | ✅ PASS |
| `crypto.test.ts` | AES-256-GCM 암호화/복호화 | ✅ PASS |
| `contracts.test.ts` | AR/AP 날짜 순서 검증 | ✅ PASS |
| `taxInvoice.test.ts` | GST 1/11 계산 정확도 | ✅ PASS |
| `rateLimit.test.ts` | Rate Limit 초과 시 429 반환 | ✅ PASS |
| `privacy.test.ts` | Privacy API 응답 형식 | ✅ PASS |
| `ledger.test.ts` | 이중 분개 차변/대변 균형 검증 | ✅ PASS |
| `tenantIsolation.test.ts` | 테넌트 간 데이터 격리 | ✅ PASS |

---

## 2. API 엔드포인트 수동 테스트 체크리스트

### 인증 (AUTH)
| TC # | 시나리오 | 입력 | 예상 출력 | 상태 |
|------|---------|------|----------|------|
| TC-AUTH-01 | 정상 로그인 (스태프) | `POST /api/auth/login` + 유효 자격증명 | 200, accessToken + refreshToken | ✅ |
| TC-AUTH-02 | 잘못된 비밀번호 | `POST /api/auth/login` + 잘못된 PW | 401, `INVALID_CREDENTIALS` | ✅ |
| TC-AUTH-03 | 5회 실패 후 잠금 | 동일 이메일로 5회 연속 실패 | 6번째: 403, `ACCOUNT_LOCKED` | ✅ |
| TC-AUTH-04 | 만료 토큰 | 8시간 후 요청 | 401, `INVALID_TOKEN` | ✅ |
| TC-AUTH-05 | Refresh Token 갱신 | `POST /api/auth/refresh` + 유효 refreshToken | 200, 새 accessToken | ✅ |
| TC-AUTH-06 | 포털 로그인 | `POST /api/portal/login` + portalEmail | 200, userType: "portal" | ✅ |
| TC-AUTH-07 | Rate Limit (로그인) | 11번 시도 / 15분 | 11번째: 429 | ✅ |
| TC-AUTH-08 | View-As (admin) | `X-View-As-User-Id` 헤더 | req.user가 대상 user로 변경 | ✅ |
| TC-AUTH-09 | View-As (consultant 시도) | `X-View-As-User-Id` + consultant 토큰 | 무시됨 (original user 유지) | ✅ |
| TC-AUTH-10 | 인증 없이 보호된 API | Authorization 헤더 없음 | 401, `UNAUTHORIZED` | ✅ |

---

### CRM 파이프라인

| TC # | 시나리오 | API | 예상 결과 | 상태 |
|------|---------|-----|----------|------|
| TC-CRM-01 | Lead 생성 | `POST /api/leads` | 201, lead_ref_number 자동 채번 | ✅ |
| TC-CRM-02 | Lead 목록 (테넌트 필터) | `GET /api/leads` + X-Organisation-Id | 해당 테넌트 리드만 반환 | ✅ |
| TC-CRM-03 | Quote 생성 | `POST /api/quotes` | 201, quote_ref_number 채번 | ✅ |
| TC-CRM-04 | Quote Products 추가 | `POST /api/quote-products` + quoteId | 201, 항목 추가 | ✅ |
| TC-CRM-05 | Contract 생성 | `POST /api/contracts` + applicationId | 201, contract_number 채번 | ✅ |
| TC-CRM-06 | Contract Products AR/AP | 유효한 ar_due_date + ap_due_date | 201 성공 | ✅ |
| TC-CRM-07 | AP > AR 날짜 검증 | ap_due_date > ar_due_date | 400 에러 | ✅ |
| TC-CRM-08 | Invoice 생성 | `POST /api/invoices` | 201, invoiceNumber 채번 | ✅ |
| TC-CRM-09 | 계약 소프트 삭제 | `DELETE /api/contracts/:id` | is_active: false | ✅ |
| TC-CRM-10 | 동일 Application 중복 계약 | 이미 Contract 있는 applicationId로 생성 | 400/409 오류 | ✅ |

---

### 재무 / 인보이스

| TC # | 시나리오 | 예상 결과 | 상태 |
|------|---------|----------|------|
| TC-FIN-01 | Invoice 상태 전이 (paid) | status → 'paid' | ✅ |
| TC-FIN-02 | Payment Header 생성 → Journal Entry 자동 생성 | debit+credit 분개 생성 | ✅ |
| TC-FIN-03 | Receipt PDF 자동 생성 | PDF 생성 + GCS 업로드 | ⚠️ GCS 설정 필요 |
| TC-FIN-04 | Tax Invoice GST 계산 | commissionAmt × 1/11 | ✅ |
| TC-FIN-05 | AR Overdue cron | ar_due_date 초과 항목 상태 변경 | ✅ (매일 실행) |
| TC-FIN-06 | 환율 조회 | `GET /api/exchange-rates` | 200, 최신 환율 반환 | ✅ |
| TC-FIN-07 | 권한 없는 Invoice 생성 (consultant) | `POST /api/invoices` with consultant | 403 Forbidden | ✅ |

---

### 포털 테스트

| TC # | 시나리오 | 역할 | 예상 결과 | 상태 |
|------|---------|------|----------|------|
| TC-PRT-01 | 에이전트 로그인 | agent | 200, portalRole: "agent" | ✅ |
| TC-PRT-02 | 파트너 로그인 | hotel | 200, portalRole: "hotel" | ✅ |
| TC-PRT-03 | 학생 로그인 | student | 200, portalRole: "student" | ✅ |
| TC-PRT-04 | 에이전트 대시보드 조회 | agent | 200, 해당 학생 데이터만 | ✅ |
| TC-PRT-05 | 파트너가 에이전트 데이터 접근 시도 | hotel | 403 Forbidden | ✅ |
| TC-PRT-06 | 스태프 토큰으로 포털 API 접근 | staff JWT | 403 `FORBIDDEN` | ✅ |
| TC-PRT-07 | 포털 토큰으로 스태프 API 접근 | portal JWT | 403 or 401 | ✅ |
| TC-PRT-08 | 학생 캠프 사진 업로드 | student | 201, 이미지 저장 | ⚠️ GCS 필요 |
| TC-PRT-09 | 포털 메뉴 역할별 분기 | hotel | 파트너 메뉴 표시 | ✅ |
| TC-PRT-10 | 테넌트 테마 로드 | 모든 역할 | 테넌트 오렌지 색상 적용 | ✅ |

---

### 보안 / Privacy Act

| TC # | 시나리오 | 예상 결과 | 상태 |
|------|---------|----------|------|
| TC-SEC-01 | CORS 차단 | 허용 안 된 origin으로 요청 | CORS 에러 | ✅ |
| TC-SEC-02 | CSP 헤더 확인 | 모든 응답의 `Content-Security-Policy` | 헤더 존재 | ✅ |
| TC-SEC-03 | 민감정보 로그 마스킹 | passport_number 포함 요청 → 로그 확인 | `[REDACTED]` | ✅ |
| TC-SEC-04 | Privacy Policy 공개 API | `GET /api/privacy-policy` (인증 없이) | 200, 정책 내용 | ✅ |
| TC-SEC-05 | 자기 열람 (APP 12) | `GET /api/my-data` | 200, 본인 데이터만 | ✅ |
| TC-SEC-06 | 수정 요청 (APP 13) | `POST /api/my-data/correction-request` | 200, 요청 접수 | ⚠️ DB 저장 미구현 |
| TC-SEC-07 | superAdminOnly 차단 | org 있는 admin이 /superadmin 접근 | 404 | ✅ |
| TC-SEC-08 | 여권번호 암호화 저장 | contacts 생성 시 passportNo | DB에 암호화 값 저장 | ✅ |
| TC-SEC-09 | SQL Injection | 검색 파라미터에 SQL 구문 | Drizzle 준비문으로 차단 | ✅ |

---

## 3. 프론트엔드 체크리스트

| 항목 | 체크 내용 | 상태 |
|------|----------|------|
| 포털 로그인 화면 | 이메일/비밀번호 입력 → 역할별 대시보드 리다이렉트 | ✅ |
| 포털 사이드바 역할 분기 | agent/partner/student 각각 다른 메뉴 | ✅ |
| 테넌트 테마 | 로그인 후 테넌트 오렌지 색상 적용 | ✅ |
| 로그인 실패 토스트 | 잘못된 자격증명 → 에러 메시지 표시 | ✅ |
| 계약 상세 - 재무 탭 | AR/AP 항목, 상태 뱃지 | ✅ |
| 모바일 반응형 | 포털 hamburger 메뉴 | ✅ |
| 국제화(i18n) | Admin CRM en/ko 전환 | ✅ |
| Build 성공 | 각 아티팩트 `vite build` 오류 없음 | ✅ |

---

*© Edubee.Co. 2026 — 자동 생성 문서*


---

<!-- FILE: _test/VALIDATION_REPORT.md -->

# VALIDATION_REPORT.md — v2.0 통합 검증 보고서

> 생성일: 2026-04-19 | 검증 기준: v2.0 (Sprints 1-6 완료, 포털 34페이지)

---

## 1. 종합 결과

| 항목 | 결과 |
|------|------|
| **전체 체크 수** | 57 |
| ✅ PASS | 45 |
| ⚠️ WARN | 10 |
| ❌ FAIL | 1 |
| ⏭ SKIP | 1 |
| **합격률** | **78.9%** (PASS + WARN: 96.5%) |

---

## 2. FAIL 항목 ❌

| ID | 항목 | 상세 | 처리 방법 |
|----|------|------|----------|
| F-8 | npm audit: critical + high 취약점 | vite <7.3.2 (CRITICAL), 7 HIGH | `pnpm update vite` 필요 |

> **pnpm 환경 특이사항:** `npm audit` 실행 불가 (pnpm 모노레포). `pnpm audit --audit-level=high` 사용 필요.

---

## 3. WARN 항목 ⚠️

| ID | 항목 | 상세 | 우선순위 |
|----|------|------|---------|
| W-1 | TypeScript 컴파일 오류 | 683개 Drizzle ORM 타입 오류 (런타임 무관) | 🟡 낮음 |
| W-2 | console.log 잔존 | 49개 console.log (pino 전환 미완) | 🟡 낮음 |
| W-3 | documents.ts fileFilter 누락 | 파일 타입 화이트리스트 없음 | 🟠 중간 |
| W-4 | APP 13 DB 저장 미구현 | correction_requests 테이블 없음, 로그만 기록 | 🟠 중간 |
| W-5 | 미성년자 보호자 동의 | guardian_consent_given 강제 수집 없음 | 🟡 낮음 |
| W-6 | marketing_consent 미체크 | 이메일 발송 전 동의 여부 미확인 | 🟡 낮음 |
| W-7 | 플랜 기능 런타임 강제 없음 | platform_plans 테이블만, checkPlanFeature() 없음 | 🟡 낮음 |
| W-8 | GCS 리전 미명시 | australia-southeast1 설정 환경변수 의존 | 🟡 낮음 |
| W-9 | DATABASE_URL 포트 | 5432 vs 6543 (Supabase pooler) 확인 필요 | 🟠 중간 |
| W-10 | Receipt PDF (GCS 설정 필요) | GCS 환경변수 없으면 PDF 생성 실패 가능 | 🟠 중간 |

---

## 4. PASS 항목 ✅ (핵심 45개)

### 보안 체크 (Sprints 1-6)
| ID | 항목 | 파일 |
|----|------|------|
| S1-01 | JWT_SECRET 미설정 시 서버 종료 | `auth.ts:18` |
| S1-02 | 계정 잠금 (5회/30분) | `auth.ts:169` |
| S1-03 | Refresh Token DB 저장 및 검증 | `refresh_tokens` 테이블 |
| S2-01 | AES-256-GCM 필드 암호화 | `lib/crypto.ts` |
| S2-02 | FIELD_ENCRYPTION_KEY 검증 | `lib/crypto.ts:9` |
| S3-01 | 구조화 로그 (pino) | `lib/logger.ts` |
| S3-02 | 전역 에러 핸들러 | `middleware/errorHandler.ts` |
| S3-03 | 민감정보 [REDACTED] 마스킹 | `lib/logger.ts redact` |
| S3-04 | HTTP 요청 로그 | `app.ts:62` |
| S4-01 | Sentry 에러 모니터링 | `app.ts:17` |
| S4-02 | Sentry 민감정보 필터 | `app.ts:32` |
| S5-01 | Helmet 보안 헤더 | `app.ts:46` |
| S5-02 | CSP 설정 | `app.ts:48` |
| S5-03 | CORS 도메인 제한 | `app.ts:60` |
| S5-04 | Rate Limit (로그인 10/15min) | `auth.ts:26` |
| S5-05 | Rate Limit (전체 500/15min) | `app.ts:71` |
| S5-06 | Trust Proxy 1 | `app.ts:44` |
| S6-01 | View-As Impersonation 로그 | `impersonation_logs` |
| S6-02 | superAdminOnly 404 반환 | `middleware/superAdminOnly.ts` |
| S6-03 | 감사 로그 | `lib/auditLogger.ts` |

### Privacy Act 1988 체크 (9/10)
| ID | APP | 항목 | 파일 |
|----|-----|------|------|
| PA-01 | APP 5 | Privacy Policy 공개 API | `routes/privacy.ts` |
| PA-02 | APP 8 | 국외 이전 고지 (Stripe/Resend/Google) | `routes/privacy.ts` |
| PA-03 | APP 11 | 보안 침해 기록 테이블 | `schema/security.ts` |
| PA-04 | APP 11 | 민감정보 마스킹 | `lib/logger.ts` |
| PA-05 | APP 12 | 자기 열람 API | `routes/my-data.ts` |
| PA-06 | APP 13 | 수정 요청 API | `routes/my-data.ts` (응답 정상, DB 저장 미구현) |
| PA-07 | APP 13 | 동의 철회 API | `routes/my-data.ts` |
| PA-08 | APP 11 | 7년 보존 정책 | `_context/PROJECT_OVERVIEW.md` |
| PA-09 | APP 6 | 데이터 최소 수집 (필수 필드만) | 스키마 설계 |

### CRM 파이프라인
| ID | 항목 |
|----|------|
| CRM-01 | Lead → Quote → Contract 전체 흐름 |
| CRM-02 | AP < AR 날짜 순서 검증 |
| CRM-03 | Invoice 번호 자동 채번 |
| CRM-04 | Payment Header → Journal Entry 자동 생성 |
| CRM-05 | Tax Invoice GST 계산 |
| CRM-06 | 멀티테넌트 데이터 격리 |
| CRM-07 | Stripe Webhook 처리 |
| CRM-08 | GCS 문서 업로드 (Signed URL) |
| CRM-09 | 이메일 발송 (Resend) |
| CRM-10 | KPI 스케줄러 (monthly/quarterly cron) |

### 포털
| ID | 항목 |
|----|------|
| PT-01 | 에이전트 포털 10개 페이지 |
| PT-02 | 파트너 포털 8개 페이지 |
| PT-03 | 학생 포털 10개 페이지 + 사진 |
| PT-04 | 역할 기반 사이드바 메뉴 분기 |
| PT-05 | 포털 JWT (userType: "portal") |

---

## 5. 빌드 검증

| 항목 | 결과 |
|------|------|
| `edubee-portal` Vite 빌드 | ✅ 9.38초 성공 |
| `edubee-admin` Vite 빌드 | ✅ 성공 |
| `edubee-website` Vite 빌드 | ✅ 성공 |
| `edubee-camp` Vite 빌드 | ✅ 성공 |
| `api-server` tsx 빌드 | ✅ 성공 |
| Vitest 단위 테스트 | ✅ 8/8 PASS |

---

## 6. 다음 검증 (v2.1) 계획

| 항목 | 조건 |
|------|------|
| F-8 해소 확인 | `pnpm update vite` 후 재실행 |
| APP 13 DB 저장 | `correction_requests` 테이블 생성 후 |
| documents.ts fileFilter | 화이트리스트 추가 후 |
| console.log 제거 | pino 전환 완료 후 |
| 플랜 기능 강제 | `checkPlanFeature()` 구현 후 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
