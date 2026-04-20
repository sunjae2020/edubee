# Edubee CRM — Blue-Green 무중단 배포 가이드

> 작성일: 2026-04-20 | 버전: v1.0  
> 목적: Replit(Blue) 서비스 무중단 유지 → 새 환경(Green) 검증 후 DNS 전환  
> 도메인: www.edubee.co (GoDaddy → Cloudflare 관리)

---

## 개요

```
🔵 BLUE  = Replit (현재 운영 중 — 절대 중단하지 않음)
🟢 GREEN = Railway + Vercel + Supabase (새 환경)

전환 방식: DNS CNAME 변경 (Cloudflare TTL 60초)
롤백 시간: 1~5분 이내
```

---

## 전체 진행 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 로컬 환경 구성 | ✅ 완료 |
| Phase 2 | Railway 백엔드 배포 | 🟡 진행 중 |
| Phase 3 | Vercel 프론트엔드 배포 | 🔲 진행 예정 |
| Phase 4 | 최종 검증 (Smoke Test) | 🔲 진행 예정 |
| Phase 5 | DNS 전환 (Cloudflare) | 🔲 진행 예정 |

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

> 로컬 환경 구성 상세는 [SETUP.md](./SETUP.md) 참고

---

## Phase 2 — Railway 백엔드 배포

### 2-1. Railway 계정 및 프로젝트 생성

```
1. railway.app 접속
2. GitHub로 로그인
3. New Project → Deploy from GitHub repo
4. sunjae2020/edubee 선택
```

### 2-2. 서비스 설정

> ⚠️ **중요**: Root Directory는 반드시 **비워두거나 `/`로** 설정해야 합니다.  
> `artifacts/api-server`로 설정하면 workspace 패키지(@workspace/db 등)를 찾지 못해 빌드 실패합니다.

Railway 대시보드 → Settings → General:

```
Root Directory:  (비워두기 — 모노레포 루트)
Build Command:   pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build
Start Command:   node artifacts/api-server/dist/index.cjs
```

또는 루트의 `railway.toml` 파일로 자동 적용 (✅ 이미 생성됨):

```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build"

[deploy]
startCommand = "node artifacts/api-server/dist/index.cjs"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

커밋 & 푸시:

```bash
git add railway.toml .node-version
git commit -m "chore: Railway 배포 설정 추가"
git push origin master
```

### 2-3. Railway 환경변수 설정

Railway 대시보드 → Variables 탭 → Raw Editor에 아래 내용 붙여넣기:

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
```

> ⚠️ `ALLOWED_ORIGINS`는 Vercel 배포 완료 후 추가

> ⚠️ 실제 값은 로컬 `.env` 파일에서 복사
> ```bash
> cat ~/Edubee/.env
> ```

### 2-4. 빌드 명령어 확인

```bash
cat ~/Edubee/artifacts/api-server/package.json | grep '"build"\|"start"'
```

### 2-5. 배포 후 스테이징 URL 테스트

Railway가 제공하는 기본 URL로 테스트:

```bash
# 헬스체크
curl https://xxx.up.railway.app/api/health

# 로그인 테스트
curl -X POST https://xxx.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edubee.co","password":"Admin123!"}'
```

정상 응답 확인 후 Cloudflare에 스테이징 서브도메인 연결:

```
Cloudflare DNS → Add Record
Type:   CNAME
Name:   api-staging
Target: xxx.up.railway.app
Proxy:  DNS only (회색 구름)
TTL:    Auto
```

---

## Phase 3 — Vercel 프론트엔드 배포

### 3-1. Vercel CLI 설치 및 로그인

```bash
pnpm add -g vercel
vercel login
# GitHub 계정으로 로그인
```

### 3-2. edubee-admin 배포

```bash
cd ~/Edubee/artifacts/edubee-admin
vercel --prod
```

설정값 입력:

```
Project name:    edubee-admin
Framework:       Vite
Root directory:  artifacts/edubee-admin
Build command:   pnpm run build
Output dir:      dist/public
```

### 3-3. Vercel 환경변수 설정

Vercel 대시보드 → Project → Settings → Environment Variables:

```
BASE_PATH   = /
NODE_ENV    = production
```

> `VITE_API_URL`은 코드가 상대경로(`/api`)를 사용하므로 별도 설정 불필요

### 3-4. edubee-portal 배포

```bash
cd ~/Edubee/artifacts/edubee-portal
vercel --prod
```

### 3-5. edubee-website 배포

```bash
cd ~/Edubee/artifacts/edubee-website
vercel --prod
```

### 3-6. edubee-camp 배포

```bash
cd ~/Edubee/artifacts/edubee-camp
vercel --prod
```

### 3-7. 스테이징 서브도메인 연결 (Cloudflare)

| Cloudflare Name | Target (Vercel URL) |
|-----------------|---------------------|
| `app-staging` | `edubee-admin.vercel.app` |
| `portal-staging` | `edubee-portal.vercel.app` |
| `www-staging` | `edubee-website.vercel.app` |
| `camp-staging` | `edubee-camp.vercel.app` |

> 모두 `Proxy: DNS only (회색 구름)` 설정

### 3-8. Railway ALLOWED_ORIGINS 업데이트

Vercel URL 확인 후 Railway Variables에 추가:

```
ALLOWED_ORIGINS=https://edubee-admin.vercel.app,https://edubee-portal.vercel.app,https://app-staging.edubee.co,https://portal-staging.edubee.co,https://app.edubee.co,https://portal.edubee.co
```

---

## Phase 4 — 최종 검증 (Smoke Test)

모든 항목이 ✅ 될 때까지 Phase 5로 넘어가지 않습니다.

### API 검증

```bash
# 1. 헬스체크
curl https://api-staging.edubee.co/api/health
# 기대값: {"success":false,"code":"UNAUTHORIZED",...}

# 2. 로그인
curl -X POST https://api-staging.edubee.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edubee.co","password":"Admin123!"}'
# 기대값: accessToken 반환

# 3. 멀티테넌트 격리
TOKEN="위에서 받은 accessToken"
curl https://api-staging.edubee.co/api/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organisation-Id: 24fafb4c-92d6-4818-9e4d-eef2355199e8"
# 기대값: myagency 데이터만 반환

# 4. RBAC 확인
curl -X POST https://api-staging.edubee.co/api/invoices \
  -H "Authorization: Bearer $TOKEN"
# 기대값: consultant → 403 Forbidden
```

### 브라우저 검증 체크리스트

```
□ https://app-staging.edubee.co 로그인 성공
□ https://portal-staging.edubee.co 로그인 성공
□ Admin 대시보드 데이터 표시
□ 파일 업로드 동작 (GCS 연결 확인)
□ PDF 생성 동작 (Tax Invoice)
□ 이메일 발송 동작 (Resend API)
□ 역할별 메뉴 분기 확인 (agent / partner / student)
□ 테넌트 테마 적용 확인 (오렌지 브랜드 컬러)
□ 모바일 반응형 확인
```

### Vitest 단위 테스트

```bash
cd ~/Edubee
pnpm --filter @workspace/api-server test
# 기대값: 8/8 PASS
```

---

## Phase 5 — DNS 전환 (Cloudflare)

> ⚠️ **Phase 4 모든 항목 ✅ 확인 후에만 진행**  
> ⚠️ **권장 시간: 트래픽이 가장 적은 시간대 (새벽 2~4시 AEST)**

### 5-1. TTL 낮추기 (전환 24시간 전)

Cloudflare 대시보드 → DNS:

```
현재 운영 레코드들의 TTL을 모두 60초로 변경
(기본값 3600초 → 60초로 단축하면 전환 후 전파 시간 1분 이내)
```

### 5-2. DNS 레코드 변경 순서

아래 순서대로 하나씩 변경합니다:

| 순서 | Name | 변경 전 (Blue) | 변경 후 (Green) | Proxy |
|------|------|---------------|----------------|-------|
| 1 | `api` | Replit API URL | Railway URL | ON ☁️ |
| 2 | `app` | Replit Admin URL | Vercel (edubee-admin) | ON ☁️ |
| 3 | `portal` | Replit Portal URL | Vercel (edubee-portal) | ON ☁️ |
| 4 | `www` | Replit Website URL | Vercel (edubee-website) | ON ☁️ |
| 5 | `camp` | Replit Camp URL | Vercel (edubee-camp) | ON ☁️ |

> Cloudflare Proxy(주황 구름)를 ON으로 설정하면 DDoS 방어 + SSL 자동 처리

### 5-3. 전환 후 확인

각 레코드 변경 후 즉시 확인:

```bash
# DNS 전파 확인
dig api.edubee.co
dig app.edubee.co

# 서비스 응답 확인
curl -I https://api.edubee.co/api/health
curl -I https://app.edubee.co
curl -I https://portal.edubee.co
```

### 5-4. 롤백 절차

문제 발생 시 즉시 Cloudflare에서 CNAME을 Replit URL로 원복:

```
Cloudflare → DNS
→ 해당 레코드 편집
→ Target을 Replit URL로 변경
→ 저장

소요 시간: 조작 1분 + DNS 전파 1~5분
```

### 5-5. Blue 환경 종료 (48시간 대기 후)

DNS 전환 후 48시간 동안 Replit을 유지하며 모니터링합니다.
이상 없으면 Replit 플랜을 Free로 다운그레이드하거나 해지합니다.

---

## 최종 DNS 구조 (전환 완료 후)

| 서브도메인 | 역할 | 호스팅 |
|-----------|------|--------|
| `api.edubee.co` | API 서버 | Railway |
| `app.edubee.co` | Admin CRM | Vercel |
| `portal.edubee.co` | 에이전트/파트너/학생 포털 | Vercel |
| `www.edubee.co` | 마케팅 웹사이트 | Vercel |
| `camp.edubee.co` | 캠프 신청 사이트 | Vercel |
| `db.edubee.co` | PostgreSQL | Supabase |

---

## 월 비용 예상 (전환 완료 후)

| 서비스 | 플랜 | 월 비용 |
|--------|------|--------|
| Railway (API 서버) | Starter | $5–15 |
| Vercel (프론트 4개) | Hobby/Pro | $0–20 |
| Supabase (DB) | Free/Pro | $0–25 |
| Cloudflare | Free | $0 |
| Claude Code | Pro | $20 |
| GoDaddy 도메인 | 연간 | ~$2/월 |
| **합계** | | **$27–82/월** |

---

## 관련 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| 로컬 환경 구성 | `SETUP.md` | 개발 환경 세팅 가이드 |
| 현재 구현 상태 | `_context/CURRENT_STATUS.md` | 45/57 검증 현황 |
| DB 스키마 | `_context/DB_SCHEMA_OVERVIEW.md` | 테이블 구조 |
| API 엔드포인트 | `_context/API_ENDPOINTS.md` | 전체 API 목록 |

---

*© Edubee.Co. 2026 — Blue-Green 무중단 배포 가이드 v1.0*
