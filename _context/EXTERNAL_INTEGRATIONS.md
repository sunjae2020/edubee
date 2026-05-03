# Edubee CRM — 외부 연결 시스템 전체 목록

**최종 업데이트:** 2026-04-30
**작성 목적:** Edubee CRM이 연결된 모든 외부 서비스/SaaS/API의 역할, 인증 방식, 키, 활성 상태를 한 곳에 정리

---

## 📋 한눈에 보기

| 카테고리 | 서비스 | 상태 |
|----------|--------|------|
| 인프라 | Railway, Vercel, Supabase, Cloudflare, GitHub | ✅ 운영 중 |
| AI / LLM | OpenAI, Google Gemini | ✅ 연결됨 |
| 메시징 | Resend, Slack, Zapier, SMTP (테넌트별) | ✅ 연결됨 |
| 데이터 동기화 | Airtable, Google Drive | ✅ 연결됨 |
| 결제 | Stripe | ⚠️ 코드만 존재, 키 미설정 |
| 회계 | QuickBooks Online | 🧪 PoC (sandbox OAuth + test invoice) |
| 보안 | JWT, Field Encryption, Session | ✅ 활성 |

---

## 🛠️ 1. 인프라 / 호스팅

### 1-1. Railway — API 서버 호스팅
- **URL:** `https://api.edubee.co`
- **역할:** Node.js + Express API 서버 운영, 빌드 (Dockerfile)
- **인증 방식:** Railway CLI (`railway` v4.44)
- **계정:** Time Study (`sunjae@timest.com.au`)
- **CLI 명령:**
  ```bash
  railway logs       # 로그 조회
  railway variables  # 환경변수 관리
  railway up         # 배포
  ```
- **환경변수 위치:** Railway 대시보드 → Variables

### 1-2. Vercel — 프론트엔드 호스팅 (4개 앱)
- **앱 목록:**
  | 앱 | URL | 패키지 |
  |----|-----|--------|
  | Admin CRM | `https://app.edubee.co` | `edubee-admin` |
  | Portal | `https://portal.edubee.co` | `edubee-portal` |
  | Website | `https://www.edubee.co` | `edubee-website` |
  | Camp 신청 | `https://camp.edubee.co` | `edubee-camp` |
- **인증 방식:** Vercel CLI (`vercel` v51.8)
- **계정:** `sunjae2020`
- **배포 트리거:** `git push origin master` → Vercel 자동 빌드
- **API 프록시:** 각 앱의 `vercel.json` → `/api/*` → Railway

### 1-3. Supabase — PostgreSQL DB
- **호스트:** `aws-ap-northeast-1` (Tokyo)
- **포트:** 6543 (pgBouncer pooler)
- **대시보드:** https://supabase.com/dashboard
- **계정:** `sunjae@timest.com.au`
- **인증 방식:** `DATABASE_URL` 환경변수 (psql 직접 접속 가능)
- **주의:** 로컬 환경과 프로덕션이 **동일한 DB 공유** → DB 변경은 즉시 프로덕션 반영
- **마이그레이션:** Drizzle ORM (`pnpm db:push`)

### 1-4. GitHub — 소스 저장소
- **저장소:** `sunjae2020/edubee-crm` (private)
- **인증 방식:** `gh` CLI v2.92, macOS Keychain
- **계정:** `sunjae2020` (Time Study)
- **권한 (scopes):** `repo`, `workflow`, `gist`, `read:org`
- **CLI 명령:**
  ```bash
  gh pr create       # PR 생성
  gh issue list      # 이슈 조회
  gh workflow run    # GitHub Actions 실행
  ```
- **연동:** `master` 브랜치 push 시 Vercel 자동 배포 트리거

### 1-5. Cloudflare — DNS / SSL / CDN
- **도메인:** `edubee.co` (GoDaddy 등록)
- **역할:**
  - DNS 관리 (서브도메인 라우팅)
  - SSL/TLS 인증서 자동 발급
  - 리버스 프록시 (`api.edubee.co` → Railway)
  - DDoS 방어
- **인증 방식:** wrangler CLI v4.86 설치됨
- **API 서버 설정:** `trust proxy: 1` (Cloudflare + Railway 다중 프록시 처리)

---

## 🤖 2. AI / LLM

### 2-1. OpenAI
- **역할:** AI 챗봇, RAG (Retrieval-Augmented Generation), 문서 처리
- **환경변수:**
  - `AI_INTEGRATIONS_OPENAI_API_KEY`
  - `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **사용처:** `artifacts/edubee-admin/src/pages/admin/ChatbotAdminPage.tsx`, RAG 시스템

### 2-2. Google Gemini
- **역할:** 멀티 LLM 지원 (보조), 한국어 처리 강화
- **환경변수:**
  - `AI_INTEGRATIONS_GEMINI_API_KEY`
  - `AI_INTEGRATIONS_GEMINI_BASE_URL`
  - `GEMINI_API_KEY` (별도 키)
- **패키지:** `@workspace/integrations-gemini-ai` (workspace 내부 패키지)

---

## 📧 3. 메시징 / 알림

### 3-1. Resend — 트랜잭션 이메일 (플랫폼 기본)
- **역할:** 시스템 발송 이메일 (가입 인증, 비밀번호 재설정, 알림)
- **환경변수:** `RESEND_API_KEY`
- **서비스 파일:** `artifacts/api-server/src/services/emailService.ts`
- **테넌트별 SMTP fallback:** Nodemailer 기반

### 3-2. SMTP (테넌트별 자체 메일 서버)
- **역할:** 테넌트가 자체 메일 서버로 발송 (브랜딩 일치)
- **저장 위치:** `organisations.integrations.smtp` (DB JSONB)
- **설정 필드:** host, port, user, password, fromEmail, fromName
- **UI:** Settings → Integrations → Custom SMTP

### 3-3. Slack — CRM 이벤트 알림 *(2026-04-30 추가)*
- **역할:** 신규 계약/상태 변경/학생 등록/결제 수령 시 Slack 채널 알림
- **연결 방식:** Incoming Webhook URL (테넌트별)
- **저장 위치:** `organisations.integrations.slack` (DB JSONB)
- **설정 필드:** webhookUrl, enabled, events (이벤트별 on/off)
- **테스트 엔드포인트:** `POST /api/slack/test`
- **UI:** Settings → Integrations → Slack

### 3-4. Zapier — 5,000+ 앱 연동
- **역할:** Zapier Webhook 트리거로 외부 앱 자동화
- **저장 위치:** `organisations.integrations.zapier` (DB JSONB)
- **설정 필드:** webhookUrl, enabled
- **UI:** Settings → Integrations → Zapier

---

## 💾 4. 외부 데이터 / 파일

### 4-1. Airtable — 양방향 데이터 동기화
- **역할:** Student / Partner / Contract / Contract Products / Payments 동기화
- **연결 방식:** Personal Access Token (PAT) + Base ID (테넌트별 다중 Base 지원)
- **저장 위치:**
  - 토큰: `organisations.airtable_token` (암호화)
  - Base 목록: `airtable_bases` 테이블
- **동기화 주기:**
  - 수동 (Manual)
  - 자동 (every 6h, 하루 4회)
- **방향:** Inbound (Airtable → CRM) / Outbound (CRM → Airtable) / Both
- **서비스 파일:** `artifacts/api-server/src/services/airtableService.ts`
- **스케줄러:** `AirtableScheduler` (Australia/Sydney 타임존)
- **UI:** Settings → Integrations → Airtable

### 4-2. Google Drive — 학생 폴더 자동 생성
- **역할:** Student Account 생성 시 Google Drive에 학생별 폴더 자동 생성, 표준 서브폴더 템플릿(Visa/Application/Contracts/Receipts/Other) 자동 생성, Account 페이지에서 파일 목록 보기
- **연결 방식:** Multi-tenant OAuth 2.0 — 테넌트가 자체 Google Cloud 프로젝트의 Client ID/Secret 입력 (전역 환경변수 미사용)
- **OAuth Redirect URI:** `https://api.edubee.co/api/google-drive/callback`
- **저장 위치:** `organisations.integrations.google` (JSONB)
  - `clientId`, `clientSecret` — 테넌트별 OAuth 자격증명
  - `accessToken`, `refreshToken`, `expiryDate` — OAuth 토큰
  - `rootFolderId` — 새 폴더 생성 위치(선택)
  - `autoCreateOnAccount` — Account 생성 시 자동 폴더 생성 토글
  - `subfolderTemplate: string[]` — 자동 생성할 표준 서브폴더 (최대 20개)
  - `auditLog` — 최근 50개 활동 기록 (credentials/oauth/folder/settings)
- **만료 알림:** 토큰 만료 7일 전부터 Settings 페이지에 경고 배너 표시
- **UI:** Settings → Integrations → Google Drive (4-step 셋업), Account Detail → Drive 폴더 위젯 + 파일 목록

### 4-3. Google Calendar / Gmail (MCP)
- **역할:** Claude Code 환경에서 직접 호출 가능한 MCP 도구
- **사용처:** 개발/관리 보조 (사용자 워크플로우 지원)
- **연결 방식:** Claude MCP 채널 (별도 OAuth)

---

## 💰 5. 결제 / 환율

### 5-1. Stripe ⚠️ 미활성
- **역할 (예정):** SaaS 구독 결제 + Webhook (`subscriptions`, `customer.created` 등)
- **상태:** 코드는 존재 (`stripe@21.0.1`, `stripeService.ts`), **`STRIPE_SECRET_KEY` 환경변수 미설정으로 비활성**
- **활성화 방법:** Railway Variables에 `STRIPE_SECRET_KEY` 추가

### 5-2. QuickBooks Online — Bookkeeping (PoC, 2026-04-30 추가)
- **역할 (PoC):** 테넌트별 OAuth 2.0 연결 + 테스트 인보이스 push (회계 동기화 PoC)
- **연결 방식:** OAuth 2.0 (Intuit Developer App, 테넌트가 자체 Client ID/Secret 입력)
- **저장 위치:** `organisations.integrations.quickbooks` (DB JSONB) — clientId, clientSecret, environment, realmId, accessToken, refreshToken, expiresAt, refreshExpiresAt
- **환경:** `sandbox` (기본) / `production` (테넌트 선택)
- **OAuth Redirect URI:** `https://api.edubee.co/api/quickbooks/callback`
- **엔드포인트:**
  - `PUT  /api/quickbooks/credentials` — Client ID/Secret/environment 저장
  - `GET  /api/quickbooks/auth-url` — 인증 URL 생성
  - `GET  /api/quickbooks/callback` — Intuit OAuth 콜백 (code + realmId 교환)
  - `GET  /api/quickbooks/status` — 연결 상태
  - `GET  /api/quickbooks/company-info` — 연결 검증 (CompanyInfo 조회)
  - `POST /api/quickbooks/disconnect` — 토큰 폐기
  - `POST /api/quickbooks/test-invoice` — 테스트 인보이스 생성 `{ customerName, amount, description? }`
- **다음 단계:**
  - Intuit Developer Sandbox 앱 등록 (사용자 작업)
  - Settings → Integrations UI에 QuickBooks 카드 추가
  - 실제 매핑: `contracts/contract_products` → Invoice, `payments` → Payment, `commissions` → Bill
  - Account/Item 매핑 테이블 설계 (Edubee Product → QBO Item)

### 5-3. 환율 API
- **역할:** 다통화 결제(USD/AUD/KRW/JPY) 환율 자동 동기화
- **서비스 파일:** `artifacts/api-server/src/services/exchangeRateSync.ts`
- **외부 API:** (미확정 — 코드 확인 필요)

---

## 🔐 6. 보안 / 세션

| 환경변수 | 역할 |
|----------|------|
| `JWT_SECRET` | Access Token 서명 (15분 만료) |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 (7일 만료) |
| `FIELD_ENCRYPTION_KEY` | DB 민감 필드 암호화 (Airtable PAT 등) |
| `SESSION_SECRET` | Express 세션 (`express-session`) |
| `ALLOWED_ORIGINS` | CORS 화이트리스트 |

---

## 📦 7. NPM 패키지로 본 외부 통합

| 패키지 | 버전 | 역할 |
|--------|------|------|
| `googleapis` | ^171.4.0 | Google Drive / Calendar / Gmail API |
| `resend` | ^6.9.4 | 트랜잭션 이메일 |
| `stripe` | ^21.0.1 | 결제 (현재 비활성) |
| `nodemailer` | (자동 의존) | 테넌트 SMTP fallback |
| `airtable` | (자체 fetch 구현) | Airtable REST API |
| `pg` | ^8.x | PostgreSQL 클라이언트 |
| `drizzle-orm` | ^0.x | 타입 안전 ORM |
| `jsonwebtoken` | - | JWT 토큰 |

---

## 🌍 8. 도메인 구조

```
edubee.co (Cloudflare DNS)
├── www.edubee.co       → Vercel (Website)
├── app.edubee.co       → Vercel (Admin CRM, *.app 가능 — 멀티테넌트)
│   ├── timest.app.edubee.co  → Time Study 테넌트
│   └── ...
├── portal.edubee.co    → Vercel (Agent/Partner/Student 포털)
├── camp.edubee.co      → Vercel (캠프 신청 폼)
└── api.edubee.co       → Cloudflare → Railway (API 서버)
```

**로컬 개발:**
- `localhost:3001` → Edubee 플랫폼 (superadmin)
- `timest.localhost:3001` → Time Study 테넌트 (subdomain 라우팅)
- `localhost:3000` → API 서버

---

## 🔄 데이터 흐름 다이어그램

```
[브라우저]
   ↓ HTTPS
[Cloudflare] (DNS, SSL, DDoS 방어)
   ↓
[Vercel CDN] ←─── git push (GitHub) ───→ [Vercel 자동 배포]
   ↓ /api/* proxy
[Railway API] ←─── git push (GitHub) ───→ [Railway 자동 배포]
   ↓
   ├─→ [Supabase PostgreSQL] (메인 데이터)
   ├─→ [Airtable] (양방향 동기화, 6시간마다)
   ├─→ [Google Drive] (학생 폴더)
   ├─→ [Resend] (트랜잭션 이메일)
   ├─→ [OpenAI / Gemini] (AI 응답)
   ├─→ [Slack Webhook] (이벤트 알림)
   ├─→ [Zapier Webhook] (외부 자동화)
   ├─→ [Stripe] (결제 — 현재 비활성)
   └─→ [QuickBooks Online] (회계 — PoC, sandbox)
```

---

## ⚠️ 점검 / TODO

- [ ] **Stripe 활성화** — `STRIPE_SECRET_KEY` 추가 후 SaaS 구독 결제 활성화
- [ ] **환율 API 확인** — `exchangeRateSync.ts`가 사용하는 외부 API 명시
- [ ] **Sentry 설정** — `SENTRY_DSN` 환경변수가 PROJECT_OVERVIEW.md에 언급되나 현재 .env에 미설정
- [ ] **Supabase CLI 설치** — Management API는 가능하나 CLI는 미설치
- [ ] **HubSpot, Make** — Coming Soon 상태 (Settings → Integrations에 placeholder)
- [ ] **QuickBooks 매핑 설계** — Edubee Product → QBO Item, Account/Tax 매핑, 다통화(AUD/KRW/JPY) 처리 정책 확정 후 Outbound 동기화 구현

---

## 📚 관련 문서

- `_context/PROJECT_OVERVIEW.md` — 프로젝트 전체 개요
- `_context/DEPLOYMENT_April 2026.md` — 배포 구조 상세
- `_workflows/FINANCE_SYSTEM_GUIDE.md` — Finance 통합 가이드
- `CLAUDE.md` — Claude Code 프로젝트 설정 (테스트 계정, 명령어)
