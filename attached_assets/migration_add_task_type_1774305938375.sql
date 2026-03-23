-- ============================================================
-- 🐝  Edubee CRM — Migration: Add task_type to tasks
-- ============================================================
-- 파일명  : migration_add_task_type.sql
-- 작성일  : 2026-03-24
-- 목적    : tasks 테이블에 task_type 컬럼 추가
--           internal (내부 업무) / cs (고객 응대) 구분
-- 영향    : tasks 테이블 컬럼 1개 추가 + 인덱스 1개 추가
-- 롤백    : 하단 ROLLBACK 섹션 참조
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1. 컬럼 추가
-- ────────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) NOT NULL DEFAULT 'internal';

-- 값 규칙:
--   'internal' : 직원 내부 업무 (기존 Task)
--   'cs'       : 고객 응대 티켓 (Customer Support)

-- ────────────────────────────────────────────────────────────
-- STEP 2. 기존 데이터 마이그레이션
--   task_category = 'Support' 인 기존 레코드 → cs 로 전환
-- ────────────────────────────────────────────────────────────
UPDATE tasks
  SET task_type = 'cs'
WHERE task_category = 'Support'
  AND task_type = 'internal';   -- 혹시 재실행 시 중복 방지

-- ────────────────────────────────────────────────────────────
-- STEP 3. 인덱스 추가 (task_type 필터링 성능)
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);

-- ────────────────────────────────────────────────────────────
-- STEP 4. 검증 쿼리 (마이그레이션 후 결과 확인)
-- ────────────────────────────────────────────────────────────
-- 실행 후 아래 쿼리로 결과 검증:
--
-- SELECT task_type, COUNT(*) AS cnt
-- FROM tasks
-- GROUP BY task_type;
--
-- 기대 결과:
--   internal | n (기존 task 중 Support 제외)
--   cs       | m (기존 task_category='Support' 건수)
--   (기존 데이터가 없으면 internal 만 표시)

-- ────────────────────────────────────────────────────────────
-- ROLLBACK (필요 시)
-- ────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS idx_tasks_type;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS task_type;
