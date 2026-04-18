#!/bin/bash
# ============================================================
# 프로덕션 빌드 스크립트 (배포 시 자동 실행)
#
# 단계:
#   1. 프론트엔드 4개 빌드 (website, admin, portal, camp)
#   2. API 서버 TypeScript 컴파일
#   3. 현재 개발 DB → dev_seed.sql 자동 스냅샷
# ============================================================
set -e

echo "══════════════════════════════════════════"
echo "🏗️  Edubee 프로덕션 빌드 시작"
echo "══════════════════════════════════════════"
echo ""

# ── 1. 프론트엔드 빌드 ────────────────────────────────────────
echo "[1/3] 프론트엔드 앱 빌드 중..."

echo "  → edubee-website"
pnpm --filter @workspace/edubee-website run build

echo "  → edubee-admin"
pnpm --filter @workspace/edubee-admin run build

echo "  → edubee-portal"
pnpm --filter @workspace/edubee-portal run build

echo "  → edubee-camp"
pnpm --filter @workspace/edubee-camp run build

echo "✅ 프론트엔드 빌드 완료"
echo ""

# ── 2. API 서버 TypeScript 컴파일 ──────────────────────────────
echo "[2/3] API 서버 빌드 중..."
pnpm --filter @workspace/api-server run build
echo "✅ API 서버 빌드 완료"
echo ""

# ── 3. 개발 DB → dev_seed.sql 스냅샷 ──────────────────────────
echo "[3/3] 개발 DB 데이터 스냅샷 생성 중..."
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL 없음 — 스냅샷 건너뜀 (기존 dev_seed.sql 유지)"
elif bash scripts/export-dev-data.sh; then
  echo "✅ dev_seed.sql 스냅샷 완료"
else
  echo "⚠️  스냅샷 실패 — 기존 dev_seed.sql을 계속 사용합니다"
fi

echo ""
echo "══════════════════════════════════════════"
echo "✅ 프로덕션 빌드 완료"
echo "══════════════════════════════════════════"
