# Edubee CRM — Blue-Green 무중단 배포 가이드

> 작성일: 2026-04-20 | 완료일: 2026-04-21 | 버전: v1.1 (완료 업데이트)
> 목적: Replit(Blue) → Railway + Vercel + Supabase(Green) Blue-Green 전환 완료 기록
> 도메인: edubee.co (GoDaddy 등록 → Cloudflare 관리)

---

## 개요

```
🔵 BLUE  = Replit (구 환경 — 2026-04-21 이후 종료)
🟢 GREEN = Railway + Vercel + Supabase (현재 운영 중)

전환 방식: DNS CNAME 변경 (Cloudflare TTL 60초)
전환 완료: 2026-04-21
```

---

## 전체 진행 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 로컬 환경 구성 | ✅ 완료 |
| Phase 2 | Railway 백엔드 배포 | ✅ 완료 |
| Phase 3 | Vercel 프론트엔드 배포 | ✅ 완료 |
| Phase 4 | 최종 검증 (Smoke Test) | ✅ 완료 |
| Phase 5 | DNS 전환 (Cloudflare) | ✅ 완료 |

---

## Phase 1 — 로컬 환경 구성 ✅ 완료

```
✅ GitHub 클론 (sunjae2020/edubee)
✅ pnpm 의존성 설치 (1588개 패키지)
✅ .env 환경변수 설정
✅ Supabase DB 연결 + 87개 테이블 생성
✅ myagency 테넌트 등록 + 데이터 이전 (contacts 38건, accommodation 21건)
✅ API 서버 기동 (port 3000)
✅ Admin CRM 기동 (port 3001) + 로그인 확인
✅ Portal 기동 (port 23810) + 로그인 확인
✅ Claude Code 연결 + CLAUDE.md 생성
```

---

## Phase 2 — Railway 백엔드 배포 ✅ 완료

### 최종 설정

**빌드 방식:** Dockerfile (Nixpacks frozen-lockfile 문제로 전환)

```dockerfile
FROM node:22-alpine
RUN npm install -g pnpm@10
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY pnpm-lock.yaml ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/api-server run build
EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.cjs"]
```

**railway.toml:**
```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "node artifacts/api-server/dist/index.cjs"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### Railway 환경변수 (Variables)

```
DATABASE_URL=postgresql://postgres.xtckeuewwmpbbkiahcoa:PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
JWT_SECRET=<값>
JWT_REFRESH_SECRET=<값>
FIELD_ENCRYPTION_KEY=<값>
SESSION_SECRET=<값>
RESEND_API_KEY=<값>
GEMINI_API_KEY=<값>
AI_INTEGRATIONS_GEMINI_API_KEY=<값>
AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
PLATFORM_ADMIN_USER_ID=639154e0-0f35-4e3b-a7c5-ee458b205fa1
APP_DOMAIN=edubee.co
NODE_ENV=production
TZ=UTC
FORCE_DEV_DATA_IMPORT=false
ALLOWED_ORIGINS=https://app.edubee.co,https://portal.edubee.co,https://www.edubee.co,https://camp.edubee.co,https://edubee-admin-iota.vercel.app,https://edubee-portal-one.vercel.app
```

### 배포 결과
- URL: `https://edubee-production.up.railway.app`
- 커스텀 도메인: `https://api.edubee.co`

---

## Phase 3 — Vercel 프론트엔드 배포 ✅ 완료

### vercel.json (4개 앱 공통)
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://edubee-production.up.railway.app/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 배포된 앱 & 도메인

| 앱 | Vercel URL | 커스텀 도메인 |
|----|-----------|-------------|
| edubee-admin | edubee-admin-iota.vercel.app | app.edubee.co |
| edubee-portal | edubee-portal-one.vercel.app | portal.edubee.co |
| edubee-website | edubee-website.vercel.app | www.edubee.co |
| edubee-camp | edubee-camp.vercel.app | camp.edubee.co |

### Vercel 환경변수
```
BASE_PATH=/
NODE_ENV=production
```

---

## Phase 4 — 최종 검증 (Smoke Test) ✅ 완료

```bash
# API 헬스체크
curl https://api.edubee.co/api/health
# 결과: {"success":false,"code":"UNAUTHORIZED",...} ✅

# 로그인
curl -X POST https://api.edubee.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edubee.co","password":"Admin123!"}'
# 결과: accessToken 발급 ✅

# 멀티테넌트 격리
curl https://api.edubee.co/api/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organisation-Id: 24fafb4c-92d6-4818-9e4d-eef2355199e8"
# 결과: myagency 데이터만 반환 ✅
```

### 도메인 HTTP 응답 확인
| 도메인 | HTTP |
|--------|------|
| api.edubee.co | ✅ 401 (정상) |
| app.edubee.co | ✅ 200 |
| portal.edubee.co | ✅ 200 |
| www.edubee.co | ✅ 200 |
| camp.edubee.co | ✅ 200 |

---

## Phase 5 — DNS 전환 (Cloudflare) ✅ 완료

### 최종 DNS 레코드

| Name | Type | Target | Proxy |
|------|------|--------|-------|
| `api` | CNAME | `uqgo070i.up.railway.app` | ON ☁️ |
| `app` | CNAME | `e20224a859cddd89.vercel-dns-017.com` | ON ☁️ |
| `portal` | CNAME | `1e657a069ad013ac.vercel-dns-017.com` | ON ☁️ |
| `www` | CNAME | `91b69541a7411bc0.vercel-dns-017.com` | OFF 🌥️ |
| `camp` | CNAME | `9865f41308749f7d.vercel-dns-017.com` | ON ☁️ |
| `@` | CNAME | `91b69541a7411bc0.vercel-dns-017.com` | ON ☁️ |
| `_vercel` | TXT | `vc-domain-verify=edubee.co,...` | — |
| `_vercel` | TXT | `vc-domain-verify=www.edubee.co,...` | — |

### 롤백 절차 (비상 시)

Railway 또는 Vercel 장애 발생 시:
```
Cloudflare → DNS
→ 해당 레코드 편집
→ Target을 이전 URL로 변경
→ 저장 (TTL 60초 → 1~5분 내 전파)
```

---

## 최종 DNS 구조

| 서브도메인 | 역할 | 호스팅 |
|-----------|------|--------|
| `api.edubee.co` | API 서버 | Railway |
| `app.edubee.co` | Admin CRM | Vercel |
| `portal.edubee.co` | 에이전트/파트너/학생 포털 | Vercel |
| `www.edubee.co` | 마케팅 웹사이트 | Vercel |
| `camp.edubee.co` | 캠프 신청 사이트 | Vercel |
| `db` | PostgreSQL | Supabase (aws-ap-northeast-1) |

---

## 월 비용 (운영 중)

| 서비스 | 플랜 | 월 비용 |
|--------|------|--------|
| Railway (API 서버) | Starter | $5–15 |
| Vercel (프론트 4개) | Hobby | $0 |
| Supabase (DB) | Free | $0 |
| Cloudflare | Free | $0 |
| GoDaddy 도메인 | 연간 | ~$2/월 |
| **합계** | | **$7–17/월** |

---

## 트러블슈팅 기록

| 문제 | 원인 | 해결 |
|------|------|------|
| Railway 빌드 실패 | Nixpacks `pnpm --frozen-lockfile` 강제 | Dockerfile로 전환 |
| 포털 화이트스크린 | BASE_PATH `/portal/` 미스매치 | `BASE_PATH=/` Vercel env 설정 |
| 로그인 HTTP 500 | CORS ALLOWED_ORIGINS 오류 | 실제 Vercel 도메인으로 업데이트 |
| app.edubee.co HTTP 525 | Vercel 커스텀 도메인 미등록 | Vercel Domains에 추가 |
| Cloudflare `api` CNAME 오류 | Record does not exist 상태 | 삭제 후 재생성 |

---

*© Edubee.Co. 2026 — 배포 완료 기록 v1.1*
