# Edubee — Row-Level Security (RLS) 적용 계획

**선행 조건**: dev DB 분리 완료 (`01-DB-SEPARATION.md`)
**목표**: organisation_id 격리를 PostgreSQL이 강제하도록 — 코드 실수해도 누수 차단
**범위 (Phase 1)**: `accounts`, `contacts`, `contracts`, `payments`

---

## 작동 원리

```
[클라이언트] → [API] → tenantResolver → SET LOCAL app.current_org_id = '<uuid>'
                                                 ↓
                       SELECT/INSERT/UPDATE/DELETE
                                                 ↓
                            PostgreSQL이 정책 평가:
                  organisation_id = current_setting('app.current_org_id')::uuid
                                                 ↓
                       매치되지 않는 행은 결과에서 자동 제외
```

코드에서 `WHERE organisation_id = ?` 누락해도, RLS 정책이 강제로 필터링.

---

## 적용 순서 (각 단계 독립적으로 롤백 가능)

### Phase 0 — 사전 준비 (READ-ONLY)

```sql
-- 0.1 모든 organisation_id 컬럼이 NOT NULL 인지 확인
SELECT table_schema, table_name
FROM information_schema.columns
WHERE column_name='organisation_id' AND is_nullable='YES'
ORDER BY table_schema, table_name;
-- 결과 0행이어야 함. 있으면 NULL 행 추적/정리 후 NOT NULL 강제.

-- 0.2 모든 행이 유효한 org_id 보유
SELECT 'accounts',  count(*) FROM public.accounts  WHERE organisation_id NOT IN (SELECT id FROM public.organisations)
UNION ALL
SELECT 'contacts',  count(*) FROM public.contacts  WHERE organisation_id NOT IN (SELECT id FROM public.organisations)
UNION ALL
SELECT 'contracts', count(*) FROM public.contracts WHERE organisation_id NOT IN (SELECT id FROM public.organisations);
-- 모두 0 이어야 함. 아니면 cleanup-PROPOSAL.sql 먼저 실행.
```

### Phase 1 — Postgres 변수 + 미들웨어 추가

미들웨어 (`tenantResolver.ts`)에서 매 요청마다:

```typescript
// 매 요청 transaction 시작 시
await db.execute(sql`SET LOCAL app.current_org_id = ${tenantId}`);
```

⚠️ pgBouncer transaction mode에서는 `SET LOCAL`이 transaction 안에서만 유효 →
모든 tenant-scoped 쿼리를 `db.transaction(...)` 안에 감싸야 함.

또는 `db.execute('SET app.current_org_id = ...')` (session-level) — pgBouncer에서 누수 위험.

**권장**: drizzle middleware로 자동 transaction wrapping.

### Phase 2 — 정책 적용 (테이블당 1개씩, 점진적)

```sql
-- accounts 테이블 RLS 활성화
BEGIN;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE  ROW LEVEL SECURITY;  -- 테이블 owner도 규칙 적용

CREATE POLICY tenant_isolation_select ON public.accounts
  FOR SELECT
  USING (
    organisation_id = current_setting('app.current_org_id', true)::uuid
    OR current_setting('app.bypass_rls', true) = 'true'  -- super-admin escape hatch
  );

CREATE POLICY tenant_isolation_insert ON public.accounts
  FOR INSERT
  WITH CHECK (
    organisation_id = current_setting('app.current_org_id', true)::uuid
  );

CREATE POLICY tenant_isolation_update ON public.accounts
  FOR UPDATE
  USING (organisation_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organisation_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation_delete ON public.accounts
  FOR DELETE
  USING (organisation_id = current_setting('app.current_org_id', true)::uuid);

COMMIT;
```

### Phase 3 — Super-admin escape hatch

플랫폼 어드민용 `app.bypass_rls = 'true'`. 미들웨어:

```typescript
if (req.user?.role === "super_admin" && !req.tenant) {
  await db.execute(sql`SET LOCAL app.bypass_rls = 'true'`);
}
```

### Phase 4 — 검증

```sql
-- 사용자 역할로 직접 테스트
SET app.current_org_id = '7374edd3-bb70-4207-a82b-d9ced66e3cfc';
SELECT count(*) FROM public.accounts;  -- timest 테넌트 데이터만 보여야 함

SET app.current_org_id = 'fa15f555-2ff7-40b0-8282-93c9bd559f67';
SELECT count(*) FROM public.accounts;  -- test-agency-au 데이터만 보여야 함

RESET app.current_org_id;
SELECT count(*) FROM public.accounts;  -- 0 (NULL setting → 정책 매치 실패)
```

---

## 롤백

각 테이블별:

```sql
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_select ON public.accounts;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.accounts;
DROP POLICY IF EXISTS tenant_isolation_update ON public.accounts;
DROP POLICY IF EXISTS tenant_isolation_delete ON public.accounts;
```

---

## 적용 일정 제안

1. **Week 1** — dev DB 준비 + Phase 0 검증
2. **Week 1-2** — `accounts`만 적용, 1주일 모니터링
3. **Week 2** — `contacts` 적용
4. **Week 3** — `contracts` 적용
5. **Week 4** — `payments` 적용
6. **이후 점진적 확대** — 모든 organisation_id 컬럼 보유 테이블

각 단계마다 production 적용 전 dev에서 1주일 이상 stress test.
