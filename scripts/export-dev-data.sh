#!/bin/bash
# ============================================================
# 개발 DB → dev_seed.sql 내보내기 스크립트
# 배포 전 실행하여 최신 개발 데이터를 프로덕션에 준비합니다.
#
# 사용법:
#   bash scripts/export-dev-data.sh
#
# 결과물:
#   artifacts/api-server/src/seeds/dev_seed.sql
#   (git commit 후 배포하면 프로덕션 첫 시작 시 자동 임포트)
# ============================================================
set -e

DB_URL="${DATABASE_URL:?DATABASE_URL 환경변수가 설정되지 않았습니다}"
OUTPUT="artifacts/api-server/src/seeds/dev_seed.sql"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "📦 개발 DB 내보내기 시작..."
echo "   소스: $DB_URL (앞 40자: ${DB_URL:0:40}...)"
echo "   출력: $OUTPUT"

# ── 1. 헤더 ──────────────────────────────────────────────────
cat > "$OUTPUT" <<HEADER
-- ============================================================
-- 개발 DB → 프로덕션 DB 전체 동기화 스크립트
-- 생성일: ${TIMESTAMP}
-- 주의: 기존 데이터를 모두 삭제 후 개발 데이터로 대체합니다.
-- ============================================================

-- FK 비활성화
SET session_replication_role = 'replica';

HEADER

# ── 2. TRUNCATE (drizzle 내부 테이블 제외) ───────────────────
echo "🗑️  TRUNCATE 구문 생성 중..."
TRUNCATE_SQL=$(psql "$DB_URL" -t -A -c "
  SELECT 'TRUNCATE TABLE '
      || string_agg('public.' || tablename, ', ' ORDER BY tablename)
      || ' CASCADE;'
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'drizzle_%'
    AND tablename NOT IN ('__drizzle_migrations', '_seed_meta')
" 2>/dev/null || true)

if [ -n "$TRUNCATE_SQL" ]; then
  echo "$TRUNCATE_SQL" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
fi

# ── 3. 데이터 INSERT (pg_dump --inserts) ─────────────────────
echo "💾 INSERT 데이터 덤프 중... (시간이 걸릴 수 있습니다)"

pg_dump "$DB_URL" \
  --data-only \
  --inserts \
  --no-owner \
  --no-acl \
  --exclude-table='drizzle_*' \
  --exclude-table='__drizzle_migrations' \
  --exclude-table='_seed_meta' \
  2>/dev/null >> "$OUTPUT"

# ── 4. FK 재활성화 ────────────────────────────────────────────
cat >> "$OUTPUT" <<FOOTER

-- FK 재활성화
SET session_replication_role = 'origin';
FOOTER

LINE_COUNT=$(wc -l < "$OUTPUT")
FILE_SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "✅ 내보내기 완료: ${LINE_COUNT}줄, ${FILE_SIZE}"
echo ""
echo "다음 단계:"
echo "  1. 변경 사항을 git commit (dev_seed.sql 포함)"
echo "  2. 배포(Publish)하면 빈 프로덕션 DB에 자동 임포트됩니다"
echo "  3. 기존 프로덕션 DB 강제 덮어쓰기: Secrets에 FORCE_DEV_DATA_IMPORT=true 추가 후 재배포"
