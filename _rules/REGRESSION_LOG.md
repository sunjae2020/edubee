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
