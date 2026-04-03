# 🐝 Edubee CRM — Fix 7: onboardTenant 실패 시 오류 응답 처리
# Replit AI Agent 전용 | 즉시 실행 프롬프트
# 작성일: 2026-04-03

---

## 🎯 작업 목적

**문제:**
`POST /api/superadmin/tenants` 에서 `onboardTenant()` 실패 시
현재 코드가 `console.error` 로그만 남기고 **201 성공 응답을 반환**한다.
→ 시드 데이터가 없는 불완전한 테넌트가 "성공"으로 생성됨.

**목표:**
`onboardTenant()` 실패 시:
1. 생성된 `organisation` 을 Soft Delete (`status = 'Inactive'`)
2. **500 오류 응답** 반환
3. 개발 환경에서는 오류 상세 메시지 포함

---

## 🛡️ 안전 규칙

- `/server/src/routes/superadmin.ts` **한 파일만** 수정한다
- `POST /api/superadmin/tenants` 핸들러 안의 try/catch **블록만** 수정한다
- 다른 엔드포인트, 다른 파일은 건드리지 않는다
- 수정 후 `npx tsc --noEmit` 실행하여 TypeScript 오류 0개 확인

---

## 📋 작업 순서

### Step 1 — 파일 읽기

`/server/src/routes/superadmin.ts` 전체를 읽는다.
`POST /api/superadmin/tenants` (또는 `router.post('/tenants', ...)`) 핸들러를 찾는다.
현재 `onboardTenant()` 호출 부분의 try/catch 코드를 확인한다.

---

### Step 2 — try/catch 블록 수정

현재 코드 패턴:
```typescript
// ❌ 현재 — 실패해도 201 반환
try {
  await onboardTenant(newOrg.id);
} catch (err) {
  console.error('onboarding failed', err);
}
// 아래에서 201 반환 계속 진행됨
```

아래 코드로 교체한다:
```typescript
// ✅ 수정 후 — 실패 시 Soft Delete + 500 반환
try {
  await onboardTenant(newOrg.id);
} catch (err) {
  // 1. 부분 생성된 organisation Soft Delete
  await db
    .update(organisations)
    .set({ status: 'Inactive', modifiedOn: new Date() })
    .where(eq(organisations.id, newOrg.id));

  // 2. 오류 로그
  console.error('[ONBOARDING FAILED] organisationId:', newOrg.id, err);

  // 3. 500 오류 응답 반환 (201 아님)
  return res.status(500).json({
    success: false,
    message:
      '테넌트 온보딩 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    organisationId: newOrg.id,
    ...(process.env.NODE_ENV === 'development' && {
      error: (err as Error).message,
    }),
  });
}
```

> ⚠️ 교체 시 주의사항:
> - `db`, `organisations`, `eq` 가 파일 상단에 이미 import 되어 있는지 확인한다
> - 없으면 기존 import 구문에 추가한다 (새 import 줄 추가)
> - `newOrg.id` 변수명은 실제 코드의 변수명과 맞춘다
>   (예: `createdOrg.id`, `org.id` 등으로 다를 수 있음 — 확인 후 적용)

---

### Step 3 — TypeScript 검증

```bash
npx tsc --noEmit
```

오류 0개 확인. 오류 있으면 즉시 수정 후 재확인.

---

### Step 4 — 서버 재시작 및 동작 확인

서버를 재시작하고 아래 두 시나리오로 확인한다:

**시나리오 A — 정상 생성 (기존 동작 유지 확인)**
```
POST /api/superadmin/tenants
{
  "name": "Test Agency",
  "subdomain": "testagency99",
  "ownerEmail": "test@test.com",
  "planType": "starter"
}
기대: 201 반환 + allComplete: true (기존과 동일)
```

**시나리오 B — 실패 케이스 확인**
```
onboardingService.ts 에서 임시로 throw new Error('test') 추가
→ POST /api/superadmin/tenants 호출
기대: 500 반환 + { success: false, message: "..." }
확인 후 임시 throw 코드 즉시 제거
```

**DB 확인 (시나리오 B 후)**
```sql
SELECT id, name, status
FROM organisations
WHERE name = 'Test Agency'
ORDER BY created_on DESC
LIMIT 1;
-- status = 'Inactive' 이어야 함 (Soft Delete 확인)
```

---

## ✅ 완료 보고 형식

```
✅ Fix 7 완료

수정 파일:
  - /server/src/routes/superadmin.ts

수정 내용:
  - POST /tenants 핸들러의 onboardTenant try/catch 교체
  - 실패 시 organisation Soft Delete (status = 'Inactive')
  - 실패 시 500 오류 응답 반환
  - 개발 환경 오류 메시지 포함

검증:
  - TypeScript: 오류 0개
  - 서버 기동: 정상
  - 정상 생성 (시나리오 A): 201 반환 ✅
  - 실패 케이스 (시나리오 B): 500 반환 ✅
  - Soft Delete DB 확인: status = 'Inactive' ✅

다음: Fix 8~13 (도메인 API) 또는 Fix 14~15 (파일 업로드)
```
