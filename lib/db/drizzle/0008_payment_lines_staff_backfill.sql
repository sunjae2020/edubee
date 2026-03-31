-- ============================================================
-- Fix: payment_lines.staff_id backfill
-- payment_headers.created_by → payment_lines.staff_id
-- 대상: staff_id = NULL 인 전체 레코드
-- ============================================================

-- [Step 1] 기존 NULL 레코드 backfill
UPDATE payment_lines pl
SET staff_id = ph.created_by
FROM payment_headers ph
WHERE pl.payment_header_id = ph.id
  AND pl.staff_id IS NULL
  AND ph.created_by IS NOT NULL;

-- [Step 2] 결과 확인
SELECT
  CASE WHEN staff_id IS NULL THEN 'NULL' ELSE '입력됨' END AS staff_link,
  COUNT(*) AS count
FROM payment_lines
GROUP BY 1;

-- 예상 결과: '입력됨' 68건, 'NULL' 0건
