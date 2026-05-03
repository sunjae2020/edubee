# Edubee — Dev / Prod DB 분리 가이드

**작성**: 2026-04-30
**중요도**: 🔴 모든 다른 안정화 작업의 전제조건

---

## 왜 분리가 필요한가

오늘(2026-04-30) 진단 결과 다음 사실 확인:

1. `.env`의 `DATABASE_URL`이 **production Supabase**(`aws-1-ap-northeast-1.pooler.supabase.com`)를 가리킴
2. 로컬 `pnpm run dev` 실행 시 다음 작업이 **모두 production DB에 직접 적용**됨:
   - `FORCE_DEV_DATA_IMPORT=true` → seed SQL을 production에 임포트
   - `seedUsersIfEmpty` → 모든 데모 사용자 비밀번호를 `Admin123!`로 리셋
   - `seedMenuAllocation` → 메뉴 카테고리/아이템 덮어씀
   - `seedChartOfAccounts` → CoA 시드 INSERT
   - `syncAllTenantSchemas` → 모든 테넌트 스키마를 public 스키마와 동기화
3. 결과: production data 손실, 사용자 계정 동작 불안, "데이터 섞임" 현상

**임시 차단** (2026-04-30 적용): `FORCE_DEV_DATA_IMPORT=false` + `RUN_DEV_SEEDS`/`RUN_SCHEMA_SYNC` flag gating

이건 미봉책. 영구 해결 = **별도 dev DB 사용**.

---

## 옵션 비교

| 방법 | 비용 | 격리 | 권장도 |
|---|---|---|---|
| **A. Supabase Branching** (Pro plan) | $25/월 | 완전 (완전 별도 DB) | ⭐ Best for SaaS |
| **B. 별도 무료 Supabase 프로젝트** | $0 | 완전 | ⭐ 빠른 시작 |
| **C. 로컬 PostgreSQL (Docker)** | $0 | 완전 (오프라인) | 개발자 워크스테이션 |
| **D. Supabase Schema-per-env** (`dev_*` schemas) | $0 | 부분 (같은 DB) | ❌ 권장 안 함 |

---

## 추천: 옵션 B + 옵션 C 병행

### Step 1 — 별도 dev Supabase 프로젝트 생성 (15분)

1. https://supabase.com/dashboard → **New Project**
2. Name: `edubee-dev`
3. Region: `ap-northeast-1` (동일)
4. Plan: Free tier
5. DB password 안전하게 저장
6. SQL Editor에서 production schema export → dev에 import:
   ```bash
   # On local machine
   pg_dump --schema-only "$PROD_DATABASE_URL" > /tmp/edubee-schema.sql
   psql "$DEV_DATABASE_URL" < /tmp/edubee-schema.sql
   ```

### Step 2 — `.env.development` 추가

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:<dev-password>@<dev-host>.supabase.com:6543/postgres
RUN_DEV_SEEDS=true               # 안전 — dev DB에만 영향
RUN_SCHEMA_SYNC=true              # 안전 — dev DB에만 영향
FORCE_DEV_DATA_IMPORT=false       # 명시적으로 끔, 필요 시 true
```

### Step 3 — `.env` (production) 정리

```bash
# .env (이젠 staging/production 전용)
NODE_ENV=production
DATABASE_URL=postgresql://postgres:...@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
RUN_DEV_SEEDS=false
RUN_SCHEMA_SYNC=false             # 마이그레이션은 별도 명령으로
FORCE_DEV_DATA_IMPORT=false
```

### Step 4 — 로컬 개발 명령어 변경

`pnpm run dev` 실행 시 `.env.development` 로드:
```bash
# package.json (api-server)
"dev": "NODE_ENV=development tsx ./src/index.ts"
```
→ dotenv가 `.env.development`를 자동 우선 로드 (NODE_ENV 기준).

또는 명시적으로:
```bash
env $(grep -v '^#' .env.development | xargs) pnpm run dev
```

### Step 5 — 안전장치 — production URL fence

production DB host가 환경변수에 있으면 dev 시드를 무조건 거부:
