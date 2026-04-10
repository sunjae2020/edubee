#!/bin/bash
# ============================================================
# 브랜치 병합 후 자동 실행 스크립트
# 순서: 의존성 설치 → 스키마 업데이트 → 개발 데이터 내보내기
# ============================================================
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Post-merge 설정 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 의존성 설치
echo "[1/3] pnpm install..."
pnpm install --frozen-lockfile

# 2. 개발 DB 스키마 업데이트
echo "[2/3] DB 스키마 업데이트 (drizzle push)..."
pnpm --filter db push
echo "✅ 스키마 업데이트 완료"

# 3. 개발 DB 데이터 → dev_seed.sql 자동 내보내기
echo "[3/3] 개발 DB → dev_seed.sql 내보내기..."
if bash scripts/export-dev-data.sh; then
  echo "✅ dev_seed.sql 갱신 완료"
else
  echo "⚠️  dev_seed.sql 내보내기 실패 (DATABASE_URL 미설정 또는 pg_dump 오류)"
  echo "   수동 실행: bash scripts/export-dev-data.sh"
fi

echo ""
echo "✅ Post-merge 완료"
