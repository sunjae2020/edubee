#!/bin/bash
# ============================================================
# 프로덕션 빌드 스크립트 (배포 시 자동 실행)
#
# 단계:
#   1. API 서버 TypeScript 컴파일
#   2. 현재 개발 DB → dev_seed.sql 자동 스냅샷
#      (프로덕션 첫 시작 또는 FORCE_DEV_DATA_IMPORT=true 시 자동 임포트됨)
# ============================================================
set -e

echo "══════════════════════════════════════════"
echo "🏗️  Edubee 프로덕션 빌드 시작"
echo "══════════════════════════════════════════"
echo ""

# ── 1. TypeScript 컴파일 ──────────────────────────────────────
echo "[1/2] API 서버 빌드 중..."
pnpm --filter @workspace/api-server run build
echo "✅ 빌드 완료"
echo ""

# ── 2. 개발 DB → dev_seed.sql 스냅샷 ──────────────────────────
echo "[2/2] 개발 DB 데이터 스냅샷 생성 중..."
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
