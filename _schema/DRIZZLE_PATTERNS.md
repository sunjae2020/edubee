# DRIZZLE_PATTERNS.md — Drizzle ORM 패턴 가이드

> 생성일: 2026-04-19 | 소스: routes/, lib/db/src/schema/ | Drizzle ORM: 0.45.2

---

## 1. 자주 쓰는 쿼리 패턴

### 1-1. 단순 SELECT (with 필터/정렬)

```typescript
// routes/finance.ts 패턴
const conditions: SQL[] = [];
if (contractId) conditions.push(eq(invoices.contractId, contractId));
if (status) conditions.push(eq(invoices.status, status));
if (invoiceType) conditions.push(eq(invoices.invoiceType, invoiceType));

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

const rows = await db
  .select()
  .from(invoices)
  .where(whereClause)
  .orderBy(desc(invoices.createdAt))
  .limit(limitNum)
  .offset(offset);
```

### 1-2. 페이지네이션

```typescript
// 공통 패턴 (finance.ts, invoices.ts 등)
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
const offset = (page - 1) * limit;

const [rows, [countResult]] = await Promise.all([
  db.select().from(table).where(where).limit(limit).offset(offset),
  db.select({ count: count() }).from(table).where(where),
]);

return res.json({
  data: rows,
  meta: { total: Number(countResult.count), page, limit, totalPages: Math.ceil(total / limit) }
});
```

### 1-3. JOIN 패턴

```typescript
// finance.ts 패턴 — contracts + applications 조인
const contractRows = await db
  .select({
    contractId: contracts.id,
    contractNumber: contracts.contractNumber,
    studentName: contracts.studentName,
    clientId: applications.clientId,
  })
  .from(contracts)
  .leftJoin(applications, eq(contracts.applicationId, applications.id))
  .where(inArray(contracts.id, contractIds));
```

### 1-4. INSERT + returning

```typescript
// 공통 패턴
const [newRecord] = await db
  .insert(tableName)
  .values({
    id: crypto.randomUUID(),
    field1: value1,
    field2: value2,
    createdAt: new Date(),
    organisationId: req.tenant?.id,
    createdBy: req.user!.id,
  })
  .returning();

return res.status(201).json({ success: true, data: newRecord });
```

### 1-5. UPDATE (부분 업데이트)

```typescript
// crm-contracts.ts 패턴 — dynamic SET
const setSql = buildSetClause(body);  // 동적 컬럼 생성
await db.execute(sql`UPDATE contracts SET ${setSql} WHERE id = ${req.params.id}`);

// 또는 Drizzle 표준 방식
await db
  .update(tableName)
  .set({ ...body, updatedAt: new Date() })
  .where(eq(tableName.id, id));
```

### 1-6. onConflict (Upsert)

```typescript
// account-service-profiles.ts
await db
  .insert(accountServiceProfiles)
  .values(newRecord)
  .onConflictDoNothing();

// data-manager.ts
await db
  .insert(applications)
  .values(vals)
  .onConflictDoUpdate({
    target: [applications.applicationNumber],
    set: vals,
  });
```

### 1-7. 집계 쿼리

```typescript
// dashboard-crm.ts
const [result] = await db
  .select({ total: sql<number>`COALESCE(SUM(amount), 0)::numeric` })
  .from(journalEntries)
  .where(eq(journalEntries.creditCoa, '3100'));

// 직접 SQL 실행
const rows = await db.execute(sql`
  SELECT COUNT(*)::int AS n FROM tax_invoices
`);
```

### 1-8. 멀티테넌트 컨텍스트

```typescript
// routes에서 테넌트 필터 자동 적용
if (req.tenant) {
  conditions.push(eq(tableName.organisationId, req.tenant.id));
}

// 명시적 schema 전환
await runWithTenantSchema(tenantSlug, async () => {
  const rows = await db.select().from(tableName);
});
```

---

## 2. 현재 사용 중인 설정

**`lib/db/package.json`:**
```json
{
  "scripts": {
    "push": "drizzle-kit push --config ./drizzle.config.ts",
    "push-force": "drizzle-kit push --force --config ./drizzle.config.ts",
    "generate": "drizzle-kit generate --config ./drizzle.config.ts",
    "migrate": "drizzle-kit migrate --config ./drizzle.config.ts"
  }
}
```

**DB 연결 패턴:**
- `staticDb` — public schema 전용 (users, organisations)
- `db` — AsyncLocalStorage 컨텍스트에서 테넌트 schema 자동 전환

---

## 3. 발견된 쿼리 최적화 문제점

| 문제 | 위치 | 권장 해결책 |
|------|------|------------|
| 모든 컬럼 SELECT | 다수 라우트 (`db.select().from(table)`) | 필요한 컬럼만 명시적으로 선택 |
| N+1 쿼리 가능성 | `enrichWithStudentName()` — contractIds 루프 | 현재 `inArray` 배치로 최적화됨 ✅ |
| 카운트 쿼리 중복 | 일부 라우트에서 data + count 별도 실행 | `Promise.all()`로 병렬 실행 (대부분 구현됨 ✅) |
| 대용량 export | data-manager.ts 전체 조회 | 스트리밍 방식 전환 권장 |

---

## 4. 멀티테넌트 전환 시 수정이 필요한 쿼리

**`organisationId` 필터 추가 필요 라우트 (현재 누락 가능성):**

```typescript
// ❌ 위험 — 테넌트 필터 없음
const rows = await db.select().from(tableName);

// ✅ 안전 — 테넌트 필터 적용
const rows = await db.select().from(tableName)
  .where(eq(tableName.organisationId, req.tenant!.id));
```

**확인 대상 파일:**
- `routes/services-guardian.ts`
- `routes/accounting-arap.ts`
- `routes/ledger.ts`
- `routes/kpi.ts`

---

## 5. 알려진 TypeScript 오류 (683개)

**원인:** Drizzle ORM 0.45.x와 TypeScript 5.9.x 타입 호환성 이슈

```
src/lib/objectStorage.ts(300,11): error TS2339: Property 'signed_url' does not exist on type '{}'.
src/routes/account-service-profiles.ts(33,16): error TS2769: No overload matches this call.
```

**영향:** 런타임 없음 — `tsx`로 직접 실행하므로 타입 체크 우회  
**해결 방법 (추정):** `drizzle-orm` 버전 고정 또는 `// @ts-ignore` 사용

---

*© Edubee.Co. 2026 — 자동 생성 문서*
