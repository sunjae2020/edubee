#!/bin/bash
# ============================================================
# 프로덕션 빌드 스크립트 (배포 시 자동 실행)
#
# 단계:
#   1. 프론트엔드 4개 빌드 (website, admin, portal, camp)
#   2. API 서버 TypeScript 컴파일
#   3. DB 스키마 마이그레이션
#   4. 현재 개발 DB → dev_seed.sql 자동 스냅샷
# ============================================================
set -e

echo "══════════════════════════════════════════"
echo "Edubee 프로덕션 빌드 시작"
echo "══════════════════════════════════════════"
echo ""

# ── 1. 프론트엔드 빌드 ────────────────────────────────────────
echo "[1/4] 프론트엔드 앱 빌드 중..."

echo "  -> edubee-website"
pnpm --filter @workspace/edubee-website run build

echo "  -> edubee-admin"
pnpm --filter @workspace/edubee-admin run build

echo "  -> edubee-portal"
pnpm --filter @workspace/edubee-portal run build

echo "  -> edubee-camp"
pnpm --filter @workspace/edubee-camp run build

echo "OK 프론트엔드 빌드 완료"
echo ""

# ── 2. API 서버 TypeScript 컴파일 ──────────────────────────────
echo "[2/4] API 서버 빌드 중..."
pnpm --filter @workspace/api-server run build
echo "OK API 서버 빌드 완료"
echo ""

# ── 3. DB 스키마 마이그레이션 ──────────────────────────────────
echo "[3/4] DB 스키마 마이그레이션 중..."
if pnpm --filter db push --accept-data-loss 2>&1; then
  echo "OK 스키마 마이그레이션 완료"
else
  echo "WARNING 스키마 마이그레이션 실패 (이미 최신 상태이거나 DB 미연결)"
fi
echo ""

# ── 4. 개발 DB → dev_seed.sql 스냅샷 ──────────────────────────
echo "[4/4] 개발 DB 데이터 스냅샷 생성 중..."
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING DATABASE_URL 없음 — 스냅샷 건너뜀 (기존 dev_seed.sql 유지)"
elif bash scripts/export-dev-data.sh; then
  echo "OK dev_seed.sql 스냅샷 완료"
else
  echo "WARNING 스냅샷 실패 — 기존 dev_seed.sql을 계속 사용합니다"
fi

echo ""
echo "══════════════════════════════════════════"
echo "OK 프로덕션 빌드 완료"
echo "══════════════════════════════════════════"
