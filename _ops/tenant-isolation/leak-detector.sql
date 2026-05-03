-- ─── Cross-tenant leak detector (READ-ONLY) ──────────────────────────────────
-- Usage: psql "$DATABASE_URL" -f leak-detector.sql
-- 모든 tenant 스키마에서 organisation_id가 NULL이거나 자기 tenant의 expected ID가
-- 아닌 모든 행을 식별. 결과만 출력하고 변경 없음.

DO $$
DECLARE
  v_schema text;
  v_table  text;
  v_expected uuid;
  v_total bigint;
  v_leak  bigint;
  v_null  bigint;
  rec record;
  rec2 record;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS leak_report(
    schema_name      text,
    table_name       text,
    total_rows       bigint,
    null_org_id      bigint,
    foreign_org_rows bigint,
    leak_org_ids     text
  );
  TRUNCATE leak_report;

  -- ── Active tenants (expand as needed) ──────────────────────────────────────
  FOR rec IN
    SELECT schema_name, expected_org_id::uuid FROM (VALUES
      ('timest',                        '7374edd3-bb70-4207-a82b-d9ced66e3cfc'),
      ('test-agency-au-177674023-cu0c', 'fa15f555-2ff7-40b0-8282-93c9bd559f67')
    ) t(schema_name, expected_org_id)
  LOOP
    v_schema   := rec.schema_name;
    v_expected := rec.expected_org_id;

    FOR rec2 IN
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = v_schema AND column_name = 'organisation_id'
      ORDER BY table_name
    LOOP
      v_table := rec2.table_name;
      EXECUTE format('SELECT count(*) FROM %I.%I', v_schema, v_table) INTO v_total;
      EXECUTE format('SELECT count(*) FROM %I.%I WHERE organisation_id IS NULL', v_schema, v_table) INTO v_null;
      EXECUTE format(
        'SELECT count(*) FROM %I.%I WHERE organisation_id IS NOT NULL AND organisation_id <> %L',
        v_schema, v_table, v_expected
      ) INTO v_leak;

      IF v_leak > 0 OR v_null > 0 OR v_total > 0 THEN
        DECLARE
          v_leaks text;
        BEGIN
          EXECUTE format(
            'SELECT string_agg(DISTINCT organisation_id::text, '', '') FROM %I.%I WHERE organisation_id IS NOT NULL AND organisation_id <> %L',
            v_schema, v_table, v_expected
          ) INTO v_leaks;

          INSERT INTO leak_report VALUES (v_schema, v_table, v_total, v_null, v_leak, v_leaks);
        END;
      END IF;
    END LOOP;
  END LOOP;
END $$;

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo '  CROSS-TENANT DATA LEAKS — rows where organisation_id ≠ expected'
\echo '════════════════════════════════════════════════════════════════════════'
SELECT schema_name, table_name, total_rows, foreign_org_rows AS leaked_rows, leak_org_ids
FROM leak_report WHERE foreign_org_rows > 0
ORDER BY foreign_org_rows DESC;

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo '  NULL organisation_id — rows missing tenant assignment'
\echo '════════════════════════════════════════════════════════════════════════'
SELECT schema_name, table_name, total_rows, null_org_id
FROM leak_report WHERE null_org_id > 0
ORDER BY null_org_id DESC;

\echo ''
\echo '════════════════════════════════════════════════════════════════════════'
\echo '  Healthy tables — all rows match expected org_id'
\echo '════════════════════════════════════════════════════════════════════════'
SELECT schema_name, table_name, total_rows
FROM leak_report
WHERE foreign_org_rows = 0 AND null_org_id = 0 AND total_rows > 0
ORDER BY schema_name, table_name;
