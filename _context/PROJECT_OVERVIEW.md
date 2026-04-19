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
