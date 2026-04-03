# 🐝 Edubee CRM — Fix 16~17: SuperAdminGuard + 예약어 차단 (최종 Fix)
# Replit AI Agent 전용 | 즉시 실행 프롬프트
# 작성일: 2026-04-03
# 이 프롬프트로 Phase 1 BugFix 전체가 완료됩니다

---

## 🎯 작업 목적

| Fix | 영역 | 내용 |
|-----|------|------|
| Fix 16 | 프론트엔드 | `SuperAdminGuard` 컴포넌트 신규 생성 + App.tsx 라우트 래핑 |
| Fix 17 | 백엔드 유틸 | `reservedSubdomains.ts` 유틸 파일 생성 + settings.ts 연결 |

---

## 🛡️ 안전 규칙

- Fix 16: **신규 파일 생성** + `App.tsx` 라우트 부분만 수정
- Fix 17: **신규 유틸 파일 생성** + `settings.ts` import 추가
- 기존 작동 중인 라우트, API, 컴포넌트 변경 없음
- 각 Fix 완료 후 `npx tsc --noEmit` 확인

---

## 📋 Fix 16: SuperAdminGuard 컴포넌트

### Step 16-1: 사전 확인

아래 파일들을 읽고 실제 구조를 파악한다:

```
1. /client/src/App.tsx
   → 현재 /superadmin/* 라우트 구조 확인
   → SuperAdminGuard가 이미 있는지 확인
   → 기존 AuthGuard 또는 ProtectedRoute 패턴 확인

2. 인증 훅 파일 찾기 (아래 중 존재하는 파일)
   /client/src/hooks/useAuth.ts
   /client/src/hooks/useAuth.tsx
   /client/src/context/AuthContext.tsx
   /client/src/store/authStore.ts
   → user 객체의 role 필드명 확인
     (예: user.role / user.userRole / user.type)

3. /client/src/components/guards/ 디렉터리 존재 여부 확인
   없으면 생성
```

---

### Step 16-2: SuperAdminGuard.tsx 신규 생성

확인한 실제 인증 훅 경로와 role 필드명에 맞춰 아래 파일을 생성한다.

**파일 경로:** `/client/src/components/guards/SuperAdminGuard.tsx`

```tsx
import { Navigate, Outlet } from 'react-router-dom';
// ⚠️ 아래 import 경로는 Step 16-1에서 확인한 실제 경로로 교체
import { useAuth } from '../../hooks/useAuth';

/**
 * SuperAdminGuard
 * - role === 'superadmin' 인 유저만 통과
 * - 그 외 유저는 /404 로 리다이렉트 (존재 자체를 숨김)
 * - 백엔드 superAdminOnly 미들웨어와 이중 보호
 */
export function SuperAdminGuard() {
  // ⚠️ user, isLoading 필드명은 실제 훅 반환값에 맞게 수정
  const { user, isLoading } = useAuth();

  // 인증 상태 로딩 중 → 아무것도 렌더링하지 않음
  if (isLoading) {
    return null;
  }

  // 로그인 안 된 경우 → 로그인 페이지로
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // superadmin 아닌 경우 → 404로 (존재 자체 숨김)
  // ⚠️ user.role 필드명은 실제 user 객체에 맞게 수정
  if (user.role !== 'superadmin') {
    return <Navigate to="/404" replace />;
  }

  // 통과: superadmin 확인됨
  return <Outlet />;
}
```

> **인증 훅이 없거나 구조가 다른 경우:**
> 기존 ProtectedRoute 또는 AuthGuard 컴포넌트의 패턴을 참고하여
> 동일한 방식으로 role 검사 로직만 추가한다.

---

### Step 16-3: App.tsx 라우트 래핑

`/client/src/App.tsx` 를 읽고 현재 `/superadmin` 라우트를 찾아
`SuperAdminGuard` 로 감싼다.

**현재 패턴 (예시 — 실제 코드 확인 필요):**
```tsx
// ❌ 현재: 가드 없음 또는 일반 가드만 있음
<Route path="/superadmin" element={<SuperAdminLayout />}>
  <Route index element={<SuperAdminDashboard />} />
  <Route path="tenants" element={<TenantList />} />
</Route>
```

**수정 후 패턴:**
```tsx
// ✅ 수정: SuperAdminGuard 로 래핑
import { SuperAdminGuard } from './components/guards/SuperAdminGuard';

<Route element={<SuperAdminGuard />}>
  <Route element={<SuperAdminLayout />}>
    <Route path="/superadmin"
           element={<SuperAdminDashboard />} />
    <Route path="/superadmin/tenants"
           element={<TenantList />} />
    <Route path="/superadmin/tenants/:id"
           element={<TenantDetail />} />
    <Route path="/superadmin/plans"
           element={<PlatformPlans />} />
  </Route>
</Route>
```

> ⚠️ **수정 범위 제한:**
> - `/superadmin/*` 라우트 부분만 수정
> - 기존 CRM 라우트 (`/`, `/contacts`, `/settings` 등) 절대 변경하지 않음
> - import 구문은 기존 import 블록 끝에 추가만 함

---

### Step 16-4: TypeScript 검증

```bash
npx tsc --noEmit
```

오류 발생 시:

| 오류 패턴 | 해결 방법 |
|-----------|-----------|
| `useAuth` not found | 실제 인증 훅 경로 재확인 후 import 수정 |
| `user.role` does not exist | user 객체 타입에서 실제 role 필드명 확인 |
| `Outlet` not found | `import { Navigate, Outlet } from 'react-router-dom'` 확인 |
| JSX 오류 | `tsconfig.json` 의 `jsx` 설정 확인 |

---

## 📋 Fix 17: 예약어 서브도메인 차단 유틸

### Step 17-1: 유틸 파일 신규 생성

**파일 경로:** `/server/src/utils/reservedSubdomains.ts`

```typescript
/**
 * 예약어 서브도메인 차단 목록
 * 이 목록의 단어는 서브도메인으로 사용할 수 없음
 * POST /api/settings/domain/subdomain/check
 * PUT  /api/settings/domain/subdomain
 * 두 엔드포인트에서 공통 사용
 */

export const RESERVED_SUBDOMAINS: readonly string[] = [
  // ── 시스템 핵심 ──────────────────────
  'admin',
  'superadmin',
  'api',
  'app',
  'www',
  'mail',
  'ftp',
  'smtp',
  'pop',
  'imap',
  'ns1',
  'ns2',
  'dns',

  // ── 인프라 ───────────────────────────
  'static',
  'cdn',
  'assets',
  'media',
  'upload',
  'uploads',
  'files',
  'images',

  // ── 개발 환경 ─────────────────────────
  'dev',
  'development',
  'staging',
  'test',
  'testing',
  'demo',
  'sandbox',
  'beta',
  'preview',
  'local',

  // ── 서비스 예약어 ─────────────────────
  'support',
  'help',
  'docs',
  'billing',
  'payment',
  'payments',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'portal',
  'dashboard',
  'console',
  'status',
  'monitor',

  // ── 브랜드 예약어 ─────────────────────
  'edubee',
  'crm',
  'platform',
] as const;

/**
 * 서브도메인이 예약어인지 확인
 * @param subdomain - 확인할 서브도메인 (대소문자 무관)
 * @returns true면 예약어 (사용 불가)
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(
    subdomain.toLowerCase().trim()
  );
}

/**
 * 예약어 목록 반환 (클라이언트 안내용)
 */
export function getReservedList(): readonly string[] {
  return RESERVED_SUBDOMAINS;
}
```

---

### Step 17-2: settings.ts 에 연결

`/server/src/routes/settings.ts` 를 읽고 아래를 수정한다.

**① 파일 상단 import 추가:**
```typescript
import {
  isReservedSubdomain,
} from '../utils/reservedSubdomains';
```

**② 기존 인라인 예약어 배열 교체:**

Fix 8 (PUT /domain/subdomain) 과 기존 check 엔드포인트에
인라인으로 작성된 RESERVED 배열이 있다면 `isReservedSubdomain()` 호출로 교체한다.

```typescript
// ❌ 수정 전 (Fix 8에서 인라인으로 작성한 부분)
const RESERVED = ['admin','superadmin','api', ...];
if (RESERVED.includes(subdomain)) { ... }

// ✅ 수정 후 (유틸 함수 사용)
if (isReservedSubdomain(subdomain)) {
  return res.status(400).json({
    available: false,
    reason: 'reserved',
    message: '시스템에서 사용 중인 예약어입니다.',
  });
}
```

**③ 기존 `POST /domain/subdomain/check` 엔드포인트에도 추가:**

해당 엔드포인트를 찾아 `isReservedSubdomain` 체크를 추가한다:

```typescript
// POST /domain/subdomain/check (기존 엔드포인트 — 로직만 추가)
router.post('/domain/subdomain/check', authenticate, async (req, res) => {
  const { subdomain } = req.body;

  if (!subdomain) {
    return res.status(400).json({ message: '서브도메인을 입력해 주세요.' });
  }

  // ✅ 예약어 체크 추가 (기존 로직 앞에 삽입)
  if (isReservedSubdomain(subdomain)) {
    return res.json({
      available: false,
      reason: 'reserved',
      message: '시스템에서 사용 중인 예약어입니다.',
    });
  }

  // 기존 중복 확인 로직 그대로 유지
  // ...
});
```

---

### Step 17-3: TypeScript 검증

```bash
npx tsc --noEmit
```

---

## 📋 Fix 16~17 동작 검증

### Fix 16 검증 — SuperAdminGuard

```
시나리오 1: superadmin 유저로 /superadmin 접근
기대: SuperAdminLayout 정상 렌더링 ✅

시나리오 2: 일반 staff 유저로 /superadmin 직접 URL 입력
기대: /404 페이지로 리다이렉트 ✅

시나리오 3: 로그인 안 된 상태로 /superadmin 접근
기대: /login 페이지로 리다이렉트 ✅

시나리오 4: CRM 정상 접근 (기존 동작 유지 확인)
기대: / , /contacts, /settings 등 기존 페이지 정상 작동 ✅
```

### Fix 17 검증 — 예약어 차단

```
POST /api/settings/domain/subdomain/check
  body: { "subdomain": "admin" }
  기대: { "available": false, "reason": "reserved" }  ✅

POST /api/settings/domain/subdomain/check
  body: { "subdomain": "ADMIN" }  (대문자)
  기대: { "available": false, "reason": "reserved" }  ✅  (대소문자 무관)

POST /api/settings/domain/subdomain/check
  body: { "subdomain": "timestudy" }  (정상 서브도메인)
  기대: { "available": true }  ✅

PUT /api/settings/domain/subdomain
  body: { "subdomain": "edubee" }
  기대: 400 { "reason": "reserved" }  ✅

PUT /api/settings/domain/subdomain
  body: { "subdomain": "myagency" }
  기대: 200 { "success": true }  ✅
```

---

## 🏁 Phase 1 BugFix 전체 완료 검증

Fix 16~17 완료 후 **전체 17개 Fix의 최종 상태**를 한 번에 확인한다.

### 최종 DB 상태 확인

```sql
-- organisations 컬럼 전체 확인
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'organisations'
ORDER BY ordinal_position;

-- domain_configs 테이블 존재 확인
SELECT COUNT(*) as col_count
FROM information_schema.columns
WHERE table_name = 'domain_configs';
-- → 19

-- UNIQUE 제약 확인
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'organisations'
  AND constraint_type = 'UNIQUE';

-- platform_plans 데이터 확인
SELECT code, name, status FROM platform_plans;
```

### 최종 서버 검증

```bash
npx tsc --noEmit
# → 신규 파일 기준 오류 0개
```

---

## ✅ Fix 16~17 완료 보고 형식

```
✅ Fix 16 완료 — SuperAdminGuard

신규 파일:
  - /client/src/components/guards/SuperAdminGuard.tsx

수정 파일:
  - /client/src/App.tsx (/superadmin 라우트 래핑)

동작 확인:
  - superadmin 접근: 정상 렌더링 ✅
  - 일반 유저 접근: /404 리다이렉트 ✅
  - 기존 CRM 라우트: 영향 없음 ✅

─────────────────────────────────────────

✅ Fix 17 완료 — 예약어 서브도메인 차단

신규 파일:
  - /server/src/utils/reservedSubdomains.ts
    (예약어 N개 정의, isReservedSubdomain() 함수 export)

수정 파일:
  - /server/src/routes/settings.ts
    (인라인 RESERVED 배열 → isReservedSubdomain() 교체)

동작 확인:
  - "admin" 서브도메인: available: false, reason: reserved ✅
  - "ADMIN" 대문자: available: false ✅ (대소문자 무관)
  - "myagency" 정상 도메인: available: true ✅

─────────────────────────────────────────

🏁 Phase 1 BugFix 전체 완료

Fix 1~17 완료 상태:
  그룹 1 (DB 무결성)   Fix 1~3:  ✅
  그룹 2 (런타임 핵심)  Fix 4:    ✅
  그룹 3 (온보딩)      Fix 5~7:  ✅
  그룹 4 (도메인 API)  Fix 8~13: ✅
  그룹 5 (파일 업로드)  Fix 14~15: ✅
  그룹 6 (보안 보완)   Fix 16~17: ✅

TypeScript: 오류 0개 (신규 파일 기준)
서버 기동: 정상
DB 스키마: 완료

다음 단계: Phase 2
  - 서브도메인 자동 감지 미들웨어
  - CSS 변수 런타임 주입 (테넌트별 브랜딩 적용)
  - 핵심 CRM 테이블 organisation_id FK 추가
  - 이메일 초대 발송
```
