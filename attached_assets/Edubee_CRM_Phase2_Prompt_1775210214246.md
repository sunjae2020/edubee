# 🐝 Edubee CRM — Phase 2: 멀티테넌트 런타임 구현
# Replit AI Agent 전용
# 작성일: 2026-04-03 | 버전: v1.0
# 전제: Phase 1 + BugFix(Fix 1~17) 완료 상태

---

## 📌 Phase 2 개요

Phase 1이 **구조(DB·API·UI)** 를 만들었다면,
Phase 2는 **테넌트가 실제로 분리되어 동작**하도록 런타임을 완성한다.

| Task | 내용 | 핵심 효과 |
|------|------|-----------|
| **Task 1** | 서브도메인 자동 감지 미들웨어 | `abc.edubee.com` 접속 → 자동으로 ABC 테넌트 데이터만 표시 |
| **Task 2** | CSS 변수 런타임 주입 | 테넌트별 로고·색상이 UI에 즉시 반영 |
| **Task 3** | CRM 핵심 테이블 `organisation_id` FK 추가 | 데이터 완전 격리 완성 |

**핵심 원칙: 기존 작동 코드를 절대 깨지 않는다**

---

## 🛡️ 모든 작업 전 필수 분석 단계

코드를 수정하기 전에 반드시:

1. 관련 파일 전체를 읽는다
2. 실제로 무엇이 문제인지 확인한다
3. 수정할 파일 목록과 변경 내용을 나에게 먼저 보고한다
4. 내가 명시적으로 **"진행해"** 라고 하기 전까지 수정하지 않는다
   (단, 내가 **"바로 해줘"** 라고 요청한 경우는 즉시 진행)

---

## 🛡️ 수정 시 안전 규칙

**반드시 지킬 것:**
- Task 하나씩 완료 후 TypeScript 오류 확인 + 서버 재시작 확인
- `ADD COLUMN IF NOT EXISTS` 만 사용 — 기존 컬럼 삭제/변경 금지
- 기존 정상 작동 API에 `organisation_id` 필터 추가 시
  **NULL 허용 기간** 설계로 기존 데이터 유지

**절대 하지 말 것:**
- DB 컬럼 삭제 또는 이름 변경
- 기존 API 경로 변경
- 인증 미들웨어 임의 수정
- 여러 테이블을 한 번에 대량 마이그레이션

---

## ✅ Task 1: 서브도메인 자동 감지 미들웨어

### 개념

```
현재 (Phase 1 MVP):
  프론트가 X-Organisation-Id 헤더를 수동으로 전송
  → 로그인 후 선택한 org를 헤더에 포함

Phase 2 목표:
  abc.edubee.com 접속 → 서버가 호스트명에서 'abc' 추출
  → organisations 테이블에서 subdomain = 'abc' 조회
  → req.tenantId 자동 주입
  → 프론트 헤더 불필요
```

---

### 1-1. 사전 확인

아래 파일들을 읽는다:

```
/server/src/middleware/tenantResolver.ts   ← 현재 구현 확인
/server/src/index.ts                       ← 미들웨어 등록 순서 확인
.env                                        ← APP_DOMAIN 변수 존재 여부 확인
```

---

### 1-2. tenantResolver.ts 확장

기존 `X-Organisation-Id` 헤더 방식을 유지하면서
**서브도메인 자동 감지 로직을 앞에 추가**한다.
(두 방식 모두 지원 — 하위 호환)

`/server/src/middleware/tenantResolver.ts` 를 수정한다:

```typescript
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { organisations } from '../db/schema';
import { and, eq } from 'drizzle-orm';

// .env 에서 BASE_DOMAIN 읽기 (없으면 'edubee.com' 기본값)
const BASE_DOMAIN = process.env.APP_DOMAIN ?? 'edubee.com';

// 예약어 — 테넌트로 처리하지 않을 서브도메인
const SYSTEM_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'superadmin', 'app',
  'mail', 'static', 'cdn', 'dev', 'staging',
]);

/**
 * 테넌트 식별 미들웨어
 * 우선순위:
 *   1순위: X-Organisation-Id 헤더 (기존 방식 — Phase 1 호환)
 *   2순위: 서브도메인 자동 감지 (Phase 2 신규)
 *   3순위: 둘 다 없으면 통과 (공개 라우트, 로그인 등)
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ── 1순위: 헤더 방식 (기존 Phase 1 호환) ──────────────────
    const headerOrgId = req.headers['x-organisation-id'] as string | undefined;

    if (headerOrgId) {
      const [org] = await db
        .select()
        .from(organisations)
        .where(
          and(
            eq(organisations.id, headerOrgId),
            eq(organisations.status, 'Active')
          )
        )
        .limit(1);

      if (org) {
        req.tenantId = org.id;
        req.tenant   = org;
        return next();
      }
      // 헤더가 있지만 유효하지 않으면 401
      res.status(401).json({ message: 'Invalid organisation' });
      return;
    }

    // ── 2순위: 서브도메인 자동 감지 ───────────────────────────
    const host = req.hostname; // 예: 'abc.edubee.com' 또는 'localhost'

    const subdomain = extractSubdomain(host, BASE_DOMAIN);

    if (subdomain && !SYSTEM_SUBDOMAINS.has(subdomain)) {
      const [org] = await db
        .select()
        .from(organisations)
        .where(
          and(
            eq(organisations.subdomain, subdomain),
            eq(organisations.status, 'Active')
          )
        )
        .limit(1);

      if (org) {
        req.tenantId = org.id;
        req.tenant   = org;
        return next();
      }
      // 서브도메인이 있지만 매핑된 테넌트가 없으면 404
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }

    // ── 3순위: 테넌트 식별 없음 — 통과 ───────────────────────
    // 공개 라우트, 로그인, superadmin 등
    next();
  } catch (err) {
    console.error('[tenantResolver]', err);
    next(err);
  }
}

/**
 * 호스트명에서 서브도메인 추출
 * 예: 'abc.edubee.com' → 'abc'
 *     'localhost'       → null
 *     'edubee.com'      → null (루트 도메인)
 */
function extractSubdomain(host: string, baseDomain: string): string | null {
  // localhost, IP 주소 제외
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
    return null;
  }

  // 포트 제거 (예: 'abc.edubee.com:3000' → 'abc.edubee.com')
  const cleanHost = host.split(':')[0];

  // baseDomain 이 포함된 경우만 처리
  if (!cleanHost.endsWith(`.${baseDomain}`)) {
    return null;
  }

  // 서브도메인 추출
  const sub = cleanHost.slice(0, cleanHost.length - baseDomain.length - 1);

  // 중첩 서브도메인 제외 (예: 'a.b.edubee.com' → null)
  if (sub.includes('.')) {
    return null;
  }

  return sub || null;
}
```

---

### 1-3. .env 설정 추가

`.env` 파일을 읽고 `APP_DOMAIN` 변수가 없으면 추가한다:

```bash
# 서브도메인 감지용 베이스 도메인
APP_DOMAIN=edubee.com
```

---

### 1-4. Express Request 타입 확장

TypeScript가 `req.tenantId` 와 `req.tenant` 를 인식하도록
타입 선언 파일을 확인하거나 생성한다.

파일 경로 확인 (아래 중 존재하는 것 사용):
```
/server/src/types/express.d.ts
/server/src/@types/express/index.d.ts
/server/src/types.d.ts
```

없으면 `/server/src/types/express.d.ts` 신규 생성:

```typescript
// Express Request 타입에 멀티테넌트 필드 추가
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
    tenant?:   Record<string, unknown>; // organisations 테이블 레코드
  }
}
```

---

### 1-5. Task 1 검증

```bash
npx tsc --noEmit   # TypeScript 오류 0개

# 서버 재시작 후 확인
# 시나리오 A: 헤더 방식 (기존 동작 유지)
GET /api/settings/company
Header: X-Organisation-Id: [유효한 UUID]
→ 기대: 200 (기존과 동일)

# 시나리오 B: 서브도메인 방식 (신규)
# Replit 환경에서는 직접 서브도메인 테스트 어려우므로
# 아래 쿼리로 로직 검증
```

```sql
-- extractSubdomain 로직 수동 검증
-- 'abc.edubee.com' → 'abc' 추출 확인 (코드 리뷰)
SELECT subdomain, name, status
FROM organisations
WHERE subdomain IS NOT NULL
LIMIT 5;
```

---

## ✅ Task 2: CSS 변수 런타임 주입

### 개념

```
현재:
  모든 테넌트가 동일한 Edubee Orange(#F5821F) 색상 사용

Phase 2 목표:
  ABC 유학원 → primary_color: #0066CC → 파란색 버튼/헤더
  XYZ 유학원 → primary_color: #2D8A4E → 초록색 버튼/헤더

구현 방법:
  서버: GET /api/settings/theme → 테넌트 브랜딩 JSON 반환
  프론트: 앱 초기화 시 CSS 변수를 document.documentElement에 주입
```

---

### 2-1. 백엔드: 테마 API 엔드포인트

`/server/src/routes/settings.ts` 를 읽고 하단에 추가:

```typescript
// ─────────────────────────────────────────────────────────────
// GET /api/settings/theme — 테넌트 테마 설정 반환 (공개 엔드포인트)
// 인증 불필요 — 서브도메인으로 테넌트 식별 후 브랜딩 반환
// 앱 초기화 시 첫 번째 API 호출로 사용
// ─────────────────────────────────────────────────────────────
router.get('/theme', async (req, res) => {
  try {
    // tenantResolver 에서 주입된 tenant 사용
    const org = req.tenant as Record<string, unknown> | undefined;

    // 테넌트가 없으면 Edubee 기본 테마 반환
    if (!org) {
      return res.json(getDefaultTheme());
    }

    return res.json({
      organisationId:   org.id,
      companyName:      org.name,
      logoUrl:          org.logoUrl   ?? null,
      faviconUrl:       org.faviconUrl ?? null,
      primaryColor:     org.primaryColor   ?? '#F5821F',
      secondaryColor:   org.secondaryColor ?? '#1C1917',
      accentColor:      org.accentColor    ?? '#FEF0E3',
      customCss:        org.customCss      ?? null,
      // 메타 정보
      subdomain:        org.subdomain      ?? null,
      planType:         org.planType       ?? 'starter',
      features:         org.features       ?? {},
    });
  } catch (err) {
    console.error('[GET /settings/theme]', err);
    return res.json(getDefaultTheme());  // 오류 시도 기본 테마 반환
  }
});

// Edubee 기본 테마 (테넌트 없을 때 fallback)
function getDefaultTheme() {
  return {
    organisationId:  null,
    companyName:     'Edubee CRM',
    logoUrl:         null,
    faviconUrl:      null,
    primaryColor:    '#F5821F',
    secondaryColor:  '#1C1917',
    accentColor:     '#FEF0E3',
    customCss:       null,
    subdomain:       null,
    planType:        'starter',
    features:        {},
  };
}
```

---

### 2-2. 프론트엔드: 테마 훅 생성

**파일 경로:** `/client/src/hooks/useTenantTheme.ts` (신규)

```typescript
import { useEffect, useState } from 'react';

interface TenantTheme {
  organisationId: string | null;
  companyName:    string;
  logoUrl:        string | null;
  faviconUrl:     string | null;
  primaryColor:   string;
  secondaryColor: string;
  accentColor:    string;
  customCss:      string | null;
  subdomain:      string | null;
  planType:       string;
  features:       Record<string, boolean>;
}

const DEFAULT_THEME: TenantTheme = {
  organisationId: null,
  companyName:    'Edubee CRM',
  logoUrl:        null,
  faviconUrl:     null,
  primaryColor:   '#F5821F',
  secondaryColor: '#1C1917',
  accentColor:    '#FEF0E3',
  customCss:      null,
  subdomain:      null,
  planType:       'starter',
  features:       {},
};

/**
 * 테넌트 테마를 로드하고 CSS 변수로 document에 주입
 * App.tsx 또는 최상위 컴포넌트에서 1회 호출
 */
export function useTenantTheme() {
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await fetch('/api/settings/theme');
        if (!res.ok) throw new Error('Theme fetch failed');

        const data: TenantTheme = await res.json();
        setTheme(data);
        applyThemeToDom(data);
      } catch (err) {
        console.warn('[useTenantTheme] 기본 테마 사용:', err);
        applyThemeToDom(DEFAULT_THEME);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  return { theme, isLoading };
}

/**
 * 테마를 CSS 변수로 document.documentElement에 주입
 * 모든 CSS 에서 var(--color-primary) 로 사용 가능
 */
function applyThemeToDom(theme: TenantTheme): void {
  const root = document.documentElement;

  // ── 색상 변수 ──────────────────────────────────────
  root.style.setProperty('--color-primary',       theme.primaryColor);
  root.style.setProperty('--color-primary-dark',  darken(theme.primaryColor, 15));
  root.style.setProperty('--color-primary-light', lighten(theme.primaryColor, 90));
  root.style.setProperty('--color-secondary',     theme.secondaryColor);
  root.style.setProperty('--color-accent',        theme.accentColor);

  // ── 파비콘 동적 교체 ──────────────────────────────
  if (theme.faviconUrl) {
    const link =
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ??
      (() => {
        const el = document.createElement('link');
        el.rel = 'icon';
        document.head.appendChild(el);
        return el;
      })();
    link.href = theme.faviconUrl;
  }

  // ── 페이지 타이틀 업데이트 ───────────────────────
  if (theme.companyName) {
    document.title = `${theme.companyName} — CRM`;
  }

  // ── 커스텀 CSS 주입 ──────────────────────────────
  if (theme.customCss) {
    const existing = document.getElementById('tenant-custom-css');
    if (existing) {
      existing.textContent = theme.customCss;
    } else {
      const style = document.createElement('style');
      style.id = 'tenant-custom-css';
      style.textContent = theme.customCss;
      document.head.appendChild(style);
    }
  }
}

// ── 색상 유틸 (간단한 밝기 조정) ────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** 색상을 어둡게 (percentage: 0~100) */
function darken(hex: string, percentage: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - percentage / 100;
  return rgbToHex(
    Math.round(rgb[0] * factor),
    Math.round(rgb[1] * factor),
    Math.round(rgb[2] * factor)
  );
}

/** 색상을 밝게 (percentage: 0~100, 높을수록 흰색에 가까움) */
function lighten(hex: string, percentage: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = percentage / 100;
  return rgbToHex(
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor)
  );
}
```

---

### 2-3. 프론트엔드: App.tsx 에 훅 연결

`/client/src/App.tsx` 를 읽고 앱 최상단에 `useTenantTheme()` 를 추가한다.

```typescript
import { useTenantTheme } from './hooks/useTenantTheme';

function App() {
  // 앱 초기화 시 테넌트 테마 로드 + CSS 변수 주입
  const { theme, isLoading: themeLoading } = useTenantTheme();

  // 테마 로딩 중 스플래시 (선택 — 깜빡임 방지)
  if (themeLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#FAFAF9',
      }}>
        <div style={{ fontSize: '24px' }}>🐝</div>
      </div>
    );
  }

  return (
    // ... 기존 Router, Routes 코드 그대로 유지
  );
}
```

> ⚠️ 기존 App.tsx 구조를 읽고 `useTenantTheme()` 호출만 추가한다.
> 기존 라우트, 컴포넌트 구조는 절대 변경하지 않는다.

---

### 2-4. CSS 변수 사용 가이드

기존 컴포넌트에서 하드코딩된 `#F5821F` 색상을 점진적으로 CSS 변수로 교체한다.
**이번 Task에서는 변수 주입만 구현하고, 기존 CSS는 변경하지 않는다.**
(기존 컴포넌트의 점진적 마이그레이션은 별도 작업)

```css
/* 앞으로 신규 컴포넌트에서 이렇게 사용 */
.btn-primary {
  background: var(--color-primary, #F5821F);     /* fallback 포함 */
  color: white;
}
.btn-primary:hover {
  background: var(--color-primary-dark, #D96A0A);
}
.tag-highlight {
  background: var(--color-primary-light, #FEF0E3);
  color: var(--color-primary, #F5821F);
}
```

---

### 2-5. Task 2 검증

```bash
npx tsc --noEmit   # TypeScript 오류 0개
```

```
API 확인:
GET /api/settings/theme
(X-Organisation-Id 헤더 없이)
→ 기대: 200 { primaryColor: '#F5821F', ... } (기본 테마)

GET /api/settings/theme
(X-Organisation-Id: [유효한 UUID] 헤더 포함)
→ 기대: 200 { primaryColor: [테넌트 설정값], ... }
```

```
프론트 확인:
1. 앱 실행 후 브라우저 개발자 도구 → Elements → <html> 태그 확인
   → style="--color-primary: #F5821F; --color-primary-dark: ..." 속성 존재 ✅

2. 테넌트 Settings → Branding 에서 Primary Color 변경 후 저장
   → PUT /api/settings/branding 호출
   → 페이지 새로고침 시 변경된 색상 반영 ✅
```

---

## ✅ Task 3: CRM 핵심 테이블 organisation_id FK 추가

### 개념

```
현재: 모든 CRM 데이터가 organisation_id 없이 공유됨
      → 테넌트 A 직원이 테넌트 B 학생 데이터를 볼 수 있는 위험

Phase 2 목표: 모든 핵심 테이블에 organisation_id 추가
              → API에서 자동 필터링 → 완전 데이터 격리

안전 설계 원칙:
  1. NULL 허용 컬럼으로 추가 (기존 데이터 보존)
  2. 기존 Time Study 데이터에 organisation_id 일괄 업데이트
  3. 이후 NOT NULL 제약 단계적 추가 (별도 마이그레이션)
```

---

### 3-1. 우선순위별 테이블 분류

```
🔴 HIGH — 핵심 비즈니스 데이터 (즉시 필수)
  contacts, accounts, leads, quotes, contracts, invoices, transactions

🟡 MEDIUM — 연관 데이터 (다음 단계)
  lead_activities, tasks, quote_products, contract_products,
  invoice_products, credits, debits, receipts

🟢 LOW — 마스터 데이터 (공유 가능, 나중에)
  products, product_groups, product_types, tax_rates,
  commissions, promotions, files, users, teams
```

**이번 Task 3는 🔴 HIGH 7개 테이블만 진행한다.**

---

### 3-2. 사전 확인

아래 파일들을 읽는다:

```
/db/schema.ts  (또는 Drizzle 스키마 분할 파일들)
  → contacts, accounts, leads, quotes, contracts, invoices, transactions
    테이블 정의에서 organisation_id 컬럼 존재 여부 확인
  → 이미 있는 테이블은 건너뜀
  → 없는 테이블만 추가
```

```sql
-- DB에서 실제 현황 확인
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_schema = 'public'
ORDER BY table_name;
-- 이미 추가된 테이블 목록 파악
```

---

### 3-3. 스키마 파일에 organisation_id 추가

사전 확인에서 `organisation_id` 가 없는 테이블에 한해서만 추가한다.
기존 컬럼은 절대 변경하지 않는다.

```typescript
// 각 테이블에 추가할 컬럼 (NULL 허용 — 기존 데이터 보존)
organisationId: uuid('organisation_id')
  .references(() => organisations.id),
// NOT NULL 은 이번에 추가하지 않음 — 기존 데이터 보호

// contacts 테이블 예시
export const contacts = pgTable('contacts', {
  // ... 기존 컬럼 전체 유지 ...
  organisationId: uuid('organisation_id')
    .references(() => organisations.id),  // ← 추가
});

// accounts, leads, quotes, contracts, invoices, transactions
// 동일한 방식으로 추가
```

---

### 3-4. Drizzle 마이그레이션 실행

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

또는 직접 SQL:

```sql
-- 각 테이블에 컬럼 추가 (IF NOT EXISTS로 안전하게)
ALTER TABLE contacts     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE accounts     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE leads        ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE quotes       ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE contracts    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE invoices     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
```

---

### 3-5. 기존 데이터 organisation_id 업데이트

현재 DB에 있는 Time Study 데이터에 organisation_id 를 채운다.

```sql
-- 1. 현재 존재하는 organisation ID 확인
SELECT id, name, subdomain FROM organisations WHERE status = 'Active';

-- 2. 기존 데이터 일괄 업데이트 (조회 결과의 ID를 아래에 사용)
-- ⚠️ :org_id 를 위 쿼리에서 확인한 실제 UUID로 교체

UPDATE contacts     SET organisation_id = :org_id WHERE organisation_id IS NULL;
UPDATE accounts     SET organisation_id = :org_id WHERE organisation_id IS NULL;
UPDATE leads        SET organisation_id = :org_id WHERE organisation_id IS NULL;
UPDATE quotes       SET organisation_id = :org_id WHERE organisation_id IS NULL;
UPDATE contracts    SET organisation_id = :org_id WHERE organisation_id IS NULL;
UPDATE invoices     SET organisation_id = :org_id WHERE organisation_id IS NULL;
UPDATE transactions SET organisation_id = :org_id WHERE organisation_id IS NULL;

-- 3. 업데이트 결과 확인
SELECT
  'contacts'     AS tbl, COUNT(*) AS total, COUNT(organisation_id) AS with_org FROM contacts
UNION ALL SELECT
  'accounts',     COUNT(*), COUNT(organisation_id) FROM accounts
UNION ALL SELECT
  'leads',        COUNT(*), COUNT(organisation_id) FROM leads
UNION ALL SELECT
  'quotes',       COUNT(*), COUNT(organisation_id) FROM quotes
UNION ALL SELECT
  'contracts',    COUNT(*), COUNT(organisation_id) FROM contracts
UNION ALL SELECT
  'invoices',     COUNT(*), COUNT(organisation_id) FROM invoices
UNION ALL SELECT
  'transactions', COUNT(*), COUNT(organisation_id) FROM transactions;
-- total = with_org 이어야 함 (NULL 없음)
```

---

### 3-6. API 쿼리에 organisation_id 필터 추가

`/server/src/routes/` 하위 핵심 라우트 파일들을 읽고,
`contacts`, `accounts`, `leads`, `contracts`, `invoices`, `transactions`
각 테이블을 조회하는 **SELECT 쿼리에 organisation_id 필터를 추가**한다.

**패턴 (각 라우트 파일에 적용):**

```typescript
// ❌ 수정 전 — organisation_id 필터 없음 (모든 테넌트 데이터 노출)
const result = await db
  .select()
  .from(contacts)
  .where(eq(contacts.status, 'Active'));

// ✅ 수정 후 — 현재 테넌트 데이터만 조회
const organisationId = req.tenantId;

const result = await db
  .select()
  .from(contacts)
  .where(
    and(
      eq(contacts.status, 'Active'),
      organisationId
        ? eq(contacts.organisationId, organisationId)
        : undefined  // tenantId 없으면 필터 없음 (슈퍼어드민 용도)
    )
  );
```

**INSERT 쿼리에도 organisation_id 포함:**

```typescript
// ❌ 수정 전
await db.insert(contacts).values({ ...body });

// ✅ 수정 후
await db.insert(contacts).values({
  ...body,
  organisationId: req.tenantId,  // 반드시 포함
});
```

**적용 대상 파일 목록:**

```
/server/src/routes/contacts.ts
/server/src/routes/accounts.ts
/server/src/routes/leads.ts
/server/src/routes/quotes.ts    (또는 sales.ts)
/server/src/routes/contracts.ts
/server/src/routes/invoices.ts
/server/src/routes/transactions.ts (또는 finance.ts)
```

> ⚠️ **파일명이 다를 수 있음.**
> `/server/src/routes/` 디렉터리를 읽어 실제 파일명 확인 후 적용.
> 파일마다 개별로 수정하고 TypeScript 확인 후 다음 파일로 넘어간다.

---

### 3-7. Task 3 검증

```bash
npx tsc --noEmit   # TypeScript 오류 0개
```

```sql
-- DB 컬럼 추가 확인
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_name IN
    ('contacts','accounts','leads','quotes','contracts','invoices','transactions')
ORDER BY table_name;
-- → 7개 row 반환

-- 기존 데이터 organisation_id 채워짐 확인
SELECT COUNT(*) FROM contacts WHERE organisation_id IS NULL;
-- → 0
```

```
API 격리 테스트:
1. 테넌트 A 헤더로 GET /api/contacts 호출
   → 테넌트 A 데이터만 반환

2. 테넌트 B 헤더로 GET /api/contacts 호출
   → 테넌트 B 데이터만 반환 (테넌트 A 데이터 없음)

3. 헤더 없이 GET /api/contacts 호출
   → 빈 배열 또는 401 (설계에 따라)
```

---

## 📋 Phase 2 완료 체크리스트

```
Task 1 — 서브도메인 자동 감지 미들웨어
  □ tenantResolver.ts 확장 (헤더 + 서브도메인 이중 지원)
  □ extractSubdomain() 유틸 함수 구현
  □ SYSTEM_SUBDOMAINS 예약어 차단 (Task 1 내부)
  □ .env APP_DOMAIN 변수 추가
  □ TypeScript express.d.ts 타입 선언
  □ 헤더 방식 기존 동작 유지 확인

Task 2 — CSS 변수 런타임 주입
  □ GET /api/settings/theme 엔드포인트 추가
  □ useTenantTheme.ts 훅 생성
  □ applyThemeToDom() 함수 구현
  □ App.tsx 에 useTenantTheme() 연결
  □ 파비콘 동적 교체 작동 확인
  □ document.title 테넌트명으로 변경 확인
  □ CSS 변수 document.documentElement 주입 확인

Task 3 — CRM 핵심 테이블 organisation_id FK
  □ schema.ts 7개 테이블 컬럼 추가 (NULL 허용)
  □ 마이그레이션 실행 완료
  □ 기존 데이터 organisation_id 업데이트 (NULL → org_id)
  □ contacts.ts   SELECT/INSERT 필터 추가
  □ accounts.ts   SELECT/INSERT 필터 추가
  □ leads.ts      SELECT/INSERT 필터 추가
  □ quotes.ts     SELECT/INSERT 필터 추가
  □ contracts.ts  SELECT/INSERT 필터 추가
  □ invoices.ts   SELECT/INSERT 필터 추가
  □ transactions.ts SELECT/INSERT 필터 추가
  □ 테넌트 격리 API 테스트 통과
```

---

## ✅ 작업 완료 보고 형식

각 Task 완료 시:

```
✅ Task N 완료

수정 파일: [목록]
수정 내용: [설명]

검증 결과:
  TypeScript: 오류 0개
  서버 기동:  정상
  DB 쿼리:    [결과 요약]
  API 응답:   [결과 요약]

⚠️ 다음: Task N+1 진행 대기
```

---

## 🔮 Phase 3 예고 (이번 범위 외)

Phase 2 완료 후 진행할 항목:

```
Phase 3
  - 직원 초대 이메일 실제 발송 (Nodemailer / SendGrid)
  - MEDIUM 우선순위 테이블 organisation_id 추가
    (lead_activities, tasks, credits, debits, receipts 등)
  - 플랜별 기능 제한 Feature Flags 실제 적용
  - Stripe 결제 연동 (구독 플랜 자동화)
  - SSL 인증서 자동화 (Let's Encrypt / Caddy)
```

---

*Edubee CRM — Phase 2 멀티테넌트 런타임 구현 프롬프트 v1.0 | 2026-04-03*
