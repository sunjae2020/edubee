# 🐝 Edubee CRM — Phase 1: Multi-Tenant (Shared DB) 구현 프롬프트
# Replit AI Agent 전용
# 작성일: 2026-04-03 | 버전: v1.0

---

## 📌 프로젝트 컨텍스트

**Edubee CRM**은 유학원 전용 SaaS CRM 플랫폼이다.

| 항목 | 내용 |
|------|------|
| 스택 | React + TypeScript + Vite / Node.js + Express + Drizzle ORM + PostgreSQL |
| 플랫폼 | Replit |
| 현재 단계 | MVP 단계 — 단일 테넌트(Time Study) 운영 중 |
| 이번 목표 | **Shared DB + organisation_id 기반 Multi-Tenant 구조 구현** |
| 전략 | 방법 A — 같은 앱 내 Role 기반 분리 |

**핵심 원칙: 기존 작동 코드를 절대 깨지 않는다**

---

## 🛡️ 모든 작업 전 필수 분석 단계

코드를 수정하기 전에 반드시 아래를 먼저 수행한다:

1. 관련 파일 전체를 읽는다
2. 실제로 무엇이 문제인지 확인한다
3. 수정할 파일 목록과 변경 내용을 나에게 먼저 보고한다
4. 내가 명시적으로 **"진행해"** 라고 하기 전까지 수정하지 않는다
   (단, 내가 **"바로 해줘"** 라고 요청한 경우는 즉시 진행)

---

## 🛡️ 수정 시 안전 규칙

**반드시 지킬 것:**
- 분석에서 확인된 문제만 수정한다
- 파일 하나씩 수정 후 TypeScript 오류 확인
- 이미 정상 작동하는 코드는 건드리지 않는다
- SaaS 확장성(멀티테넌트, 플랜별 권한)을 고려한 구조로 설계

**절대 하지 말 것:**
- DB 컬럼 삭제 또는 이름 변경
- 현재 작업과 무관한 파일 수정
- 인증/권한 관련 코드 임의 수정
- 스키마를 읽지 않고 필드명 추측
- 여러 파일을 한 번에 대량 수정

---

## 🎯 Phase 1 구현 목표

다음 4개 Task를 순서대로 구현한다.
각 Task 완료 후 반드시 검증하고 나에게 보고한 뒤 다음 Task로 넘어간다.

```
Task 1 → DB 스키마 확장
Task 2 → 백엔드 API (테넌트 미들웨어 + Settings API)
Task 3 → 프론트엔드 Settings 페이지 UI
Task 4 → Super Admin 라우트 (기본 구조)
```

---

## ✅ Task 1: DB 스키마 확장

### 1-1. 기존 `organisations` 테이블 컬럼 추가

> ⚠️ 기존 컬럼은 절대 삭제/수정하지 않는다. ADD COLUMN IF NOT EXISTS만 사용한다.

`/db/schema.ts`의 `organisations` 테이블에 아래 필드를 추가한다:

```typescript
// ① 서브도메인 & 접속 설정
subdomain: varchar('subdomain', { length: 100 }).unique(),
customDomain: varchar('custom_domain', { length: 255 }),

// ② 브랜딩
logoUrl: varchar('logo_url', { length: 1000 }),
faviconUrl: varchar('favicon_url', { length: 1000 }),
primaryColor: varchar('primary_color', { length: 20 }).default('#F5821F'),
secondaryColor: varchar('secondary_color', { length: 20 }).default('#1C1917'),
accentColor: varchar('accent_color', { length: 20 }).default('#FEF0E3'),
customCss: text('custom_css'),

// ③ 회사 정보 추가
companyEmail: varchar('company_email', { length: 255 }),
abn: varchar('abn', { length: 50 }),
timezone: varchar('timezone', { length: 100 }).default('Australia/Sydney'),
defaultCurrency: varchar('default_currency', { length: 10 }).default('AUD'),
defaultLanguage: varchar('default_language', { length: 20 }).default('en'),

// ④ SaaS 플랜 & 구독
planType: varchar('plan_type', { length: 50 }).default('starter'),
  // 허용값: 'starter' | 'professional' | 'enterprise'
planStatus: varchar('plan_status', { length: 50 }).default('trial'),
  // 허용값: 'trial' | 'active' | 'suspended' | 'cancelled'
trialEndsAt: timestamp('trial_ends_at'),
subscriptionId: varchar('subscription_id', { length: 255 }),
maxUsers: integer('max_users').default(5),
maxStudents: integer('max_students').default(100),

// ⑤ 기능 플래그
features: jsonb('features').default('{}'),
  // 예: { "camp_module": true, "accounting": false, "ai_assistant": false }

// ⑥ 운영 메타
onboardedAt: timestamp('onboarded_at'),
lastLoginAt: timestamp('last_login_at'),
ownerEmail: varchar('owner_email', { length: 255 }),
```

### 1-2. 신규 테이블 3개 추가

`/db/schema.ts`에 아래 3개 테이블을 추가한다:

#### ① `tenantInvitations` — 직원 초대 관리

```typescript
export const tenantInvitations = pgTable('tenant_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('staff'),
    // 허용값: 'admin' | 'manager' | 'staff'
  token: varchar('token', { length: 500 }).notNull().unique(),
  invitedBy: uuid('invited_by').references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('Pending'),
    // 허용값: 'Pending' | 'Accepted' | 'Expired'
  createdOn: timestamp('created_on').notNull().defaultNow(),
  modifiedOn: timestamp('modified_on').notNull().defaultNow(),
});
```

#### ② `tenantAuditLogs` — 테넌트 중요 액션 로그

```typescript
export const tenantAuditLogs = pgTable('tenant_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(),
    // 예: 'UPDATE_BRANDING' | 'INVITE_USER' | 'CHANGE_PLAN' | 'UPDATE_COMPANY'
  entityType: varchar('entity_type', { length: 100 }),
  entityId: uuid('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdOn: timestamp('created_on').notNull().defaultNow(),
});
```

#### ③ `platformPlans` — SaaS 플랜 마스터 (Super Admin 전용)

```typescript
export const platformPlans = pgTable('platform_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
    // 예: 'Starter' | 'Professional' | 'Enterprise'
  code: varchar('code', { length: 50 }).notNull().unique(),
    // 예: 'starter' | 'professional' | 'enterprise'
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }),
  priceAnnually: decimal('price_annually', { precision: 10, scale: 2 }),
  maxUsers: integer('max_users'),
  maxStudents: integer('max_students'),
  features: jsonb('features'),
    // 예: { "camp_module": false, "accounting": true, "ai_assistant": false }
  isPopular: boolean('is_popular').default(false),
  status: varchar('status', { length: 20 }).notNull().default('Active'),
  createdOn: timestamp('created_on').notNull().defaultNow(),
  modifiedOn: timestamp('modified_on').notNull().defaultNow(),
});
```

### 1-3. Drizzle 마이그레이션 실행

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 1-4. 기본 플랜 데이터 시드

마이그레이션 완료 후 `platform_plans` 테이블에 기본 3개 플랜을 INSERT한다:

```sql
INSERT INTO platform_plans (name, code, price_monthly, price_annually, max_users, max_students, features, is_popular)
VALUES
  ('Starter',      'starter',      49.00,  490.00,  5,   200,  '{"camp_module":false,"accounting":false,"ai_assistant":false}', false),
  ('Professional', 'professional', 99.00,  990.00,  20,  1000, '{"camp_module":true,"accounting":true,"ai_assistant":false}',  true),
  ('Enterprise',   'enterprise',   199.00, 1990.00, 999, 9999, '{"camp_module":true,"accounting":true,"ai_assistant":true}',   false)
ON CONFLICT (code) DO NOTHING;
```

---

## ✅ Task 2: 백엔드 API

### 2-1. 테넌트 식별 미들웨어

`/server/src/middleware/tenantResolver.ts` 파일을 **신규 생성**한다:

```typescript
// 역할: 요청 헤더 또는 서브도메인에서 테넌트(organisation)를 식별하고
//       req.tenantId 에 organisation_id를 주입한다.
// MVP 단계: X-Organisation-Id 헤더 방식 사용
// 추후 확장: 서브도메인 자동 감지로 전환

export async function tenantResolver(req, res, next) {
  // 1. 헤더에서 organisation_id 추출 (프론트에서 로그인 후 전송)
  const orgId = req.headers['x-organisation-id'];
  
  // 2. orgId가 없으면 통과 (공개 라우트, 로그인 라우트 등)
  if (!orgId) return next();
  
  // 3. DB에서 organisation 존재 및 Active 상태 확인
  const org = await db.select().from(organisations)
    .where(and(eq(organisations.id, orgId), eq(organisations.status, 'Active')))
    .limit(1);
  
  if (!org.length) return res.status(401).json({ message: 'Invalid organisation' });
  
  // 4. req에 테넌트 정보 주입
  req.tenantId = orgId;
  req.tenant = org[0];
  next();
}
```

### 2-2. Settings API 라우트

`/server/src/routes/settings.ts` 파일을 **신규 생성**한다.
아래 엔드포인트를 구현한다:

#### Company Profile (회사 정보)
```
GET    /api/settings/company          → 현재 테넌트 회사 정보 조회
PUT    /api/settings/company          → 회사 정보 업데이트
```

#### Branding (브랜딩)
```
GET    /api/settings/branding         → 현재 테넌트 브랜딩 설정 조회
PUT    /api/settings/branding         → 브랜딩 설정 업데이트 (색상, CSS)
POST   /api/settings/branding/logo    → 로고 이미지 업로드 (Supabase Storage)
POST   /api/settings/branding/favicon → 파비콘 업로드
```

#### Domain & Access
```
GET    /api/settings/domain           → 서브도메인 및 커스텀 도메인 조회
PUT    /api/settings/domain           → 서브도메인 변경
POST   /api/settings/domain/check     → 서브도메인 중복 확인 (body: { subdomain })
```

#### Plan & Billing
```
GET    /api/settings/plan             → 현재 플랜 정보 조회
GET    /api/settings/plans/available  → 전체 플랜 목록 조회 (platform_plans)
```

#### Users & Invitations
```
GET    /api/settings/users            → 현재 테넌트 소속 유저 목록
POST   /api/settings/invitations      → 직원 초대 이메일 발송
GET    /api/settings/invitations      → 초대 목록 조회
DELETE /api/settings/invitations/:id  → 초대 취소
```

### 2-3. Super Admin 미들웨어

`/server/src/middleware/superAdminOnly.ts` 파일을 **신규 생성**한다:

```typescript
// Super Admin 전용 라우트 보호 미들웨어
// 존재 자체를 숨기기 위해 403이 아닌 404 반환

export function superAdminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(404).json({ message: 'Not Found' });
  }
  next();
}
```

### 2-4. Super Admin API 라우트 (기본 구조)

`/server/src/routes/superadmin.ts` 파일을 **신규 생성**한다:

```
GET    /api/superadmin/tenants         → 전체 테넌트 목록 (페이지네이션)
GET    /api/superadmin/tenants/:id     → 테넌트 상세
PUT    /api/superadmin/tenants/:id     → 테넌트 플랜/상태 변경
GET    /api/superadmin/plans           → 플랜 목록
POST   /api/superadmin/plans           → 플랜 생성
PUT    /api/superadmin/plans/:id       → 플랜 수정
GET    /api/superadmin/stats           → 전체 통계 (테넌트 수, 활성 유저 등)
```

모든 `/api/superadmin/*` 라우트에는 `superAdminOnly` 미들웨어를 적용한다.

### 2-5. `server/src/index.ts` 라우트 등록

기존 라우트 등록 코드 아래에 신규 라우트를 추가한다:

```typescript
import settingsRoutes from './routes/settings';
import superAdminRoutes from './routes/superadmin';
import { tenantResolver } from './middleware/tenantResolver';
import { superAdminOnly } from './middleware/superAdminOnly';

// 테넌트 미들웨어 전역 적용 (인증 미들웨어 다음에)
app.use(tenantResolver);

// Settings 라우트
app.use('/api/settings', settingsRoutes);

// Super Admin 라우트 (superAdminOnly 미들웨어 내장)
app.use('/api/superadmin', superAdminRoutes);
```

---

## ✅ Task 3: 프론트엔드 Settings 페이지

### 3-1. 디자인 시스템 (반드시 준수)

아래 디자인 규칙을 Settings 페이지 전체에 적용한다:

```
색상:
  Primary Accent:  #F5821F  (버튼, 활성 상태)
  Neutral 900:     #1C1917  (제목, 본문)
  Neutral 600:     #57534E  (보조 텍스트)
  Neutral 200:     #E8E6E2  (구분선, 테두리)
  Neutral 100:     #F4F3F1  (카드 배경)
  Background:      #FAFAF9  (페이지 배경)

폰트: Inter (Google Fonts)
  제목: 18px / 600
  본문: 14px / 400
  레이블: 12px / 500 / uppercase

카드:
  border: 1px solid #E8E6E2
  border-radius: 12px
  padding: 24px
  box-shadow: 0 1px 3px rgba(0,0,0,0.06)

인풋:
  height: 40px
  border: 1.5px solid #E8E6E2
  border-radius: 8px
  focus: border-color #F5821F + box-shadow 0 0 0 3px rgba(245,130,31,0.15)

버튼(Primary):
  background: #F5821F / color: white
  border-radius: 8px / padding: 10px 20px / font-weight: 600
  hover: background #D96A0A

아이콘: Lucide React (stroke-width: 1.5, size: 16px 또는 20px)
```

### 3-2. 사이드바 네비게이션에 Settings 메뉴 추가

기존 사이드바 컴포넌트(`/client/src/components/Sidebar.tsx` 또는 해당 파일)에
**Settings 섹션**을 추가한다. 기존 메뉴는 절대 변경하지 않는다.

```
── (기존 메뉴들 유지) ──

⚙️  SETTINGS  ← 새 섹션 레이블
  🏢 Company Profile
  🎨 Branding
  🌐 Domain & Access
  👤 Users & Teams
  📦 Plan & Billing
```

사이드바 섹션 레이블 스타일:
```css
font-size: 11px;
font-weight: 500;
text-transform: uppercase;
letter-spacing: 0.08em;
color: #A8A29E;
margin: 16px 16px 4px;
```

### 3-3. Settings 페이지 파일 구조

아래 파일들을 신규 생성한다:

```
/client/src/pages/settings/
├── SettingsLayout.tsx        ← Settings 공통 레이아웃 (좌측 탭 네비)
├── CompanyProfile.tsx        ← 회사 정보 설정
├── Branding.tsx              ← 로고, 색상, CSS 설정
├── DomainAccess.tsx          ← 서브도메인 설정
├── UsersTeams.tsx            ← 직원 초대 및 권한 관리
└── PlanBilling.tsx           ← 플랜 및 구독 현황
```

### 3-4. 각 Settings 탭 상세 UI 명세

#### ① Company Profile (`CompanyProfile.tsx`)

섹션 구성:
```
[카드] 기본 정보
  - Company Name *        (text input)
  - Trading Name          (text input)
  - ABN                   (text input)
  - Phone Number          (text input)
  - Company Email         (text input, type="email")
  - Website URL           (text input, type="url")
  - Description           (textarea, 4행)

[카드] 주소
  - Address Line 1        (text input)
  - Address Line 2        (text input)
  - City / Suburb         (text input)
  - State                 (text input)
  - Postcode              (text input)
  - Country               (text input, default: Australia)

[카드] 지역화 설정
  - Timezone              (select: Australia/Sydney, Australia/Melbourne 등)
  - Default Currency      (select: AUD, USD, EUR, KRW 등)
  - Default Language      (select: English, 한국어 등)

[카드] 은행 정보
  - Bank Name             (text input)
  - Account Name          (text input)
  - BSB                   (text input)
  - Account Number        (text input)
  - SWIFT Code            (text input)

[저장 버튼] Save Changes (Primary 버튼, 우측 정렬)
```

#### ② Branding (`Branding.tsx`)

섹션 구성:
```
[카드] 로고
  - 현재 로고 미리보기 (100x100px 영역)
  - 로고 업로드 버튼 (PNG, JPG, SVG, 최대 2MB)
  - 파비콘 업로드 버튼 (ICO, PNG 32x32, 최대 500KB)
  - 업로드 후 미리보기 즉시 반영

[카드] 색상 설정
  - Primary Color   : 색상 피커 + HEX 입력 (기본값: #F5821F)
  - Secondary Color : 색상 피커 + HEX 입력 (기본값: #1C1917)
  - Accent Color    : 색상 피커 + HEX 입력 (기본값: #FEF0E3)
  - [미리보기 박스]: 선택한 색상으로 버튼/배지 샘플 실시간 표시

[카드] 고급 설정 (접을 수 있는 Collapsible 섹션)
  - Custom CSS        (코드 에디터 스타일 textarea)
  - 경고 문구: "잘못된 CSS는 UI를 깨뜨릴 수 있습니다. 주의하여 사용하세요."

[저장 버튼] Save Branding (Primary 버튼, 우측 정렬)
```

#### ③ Domain & Access (`DomainAccess.tsx`)

섹션 구성:
```
[카드] 서브도메인 설정
  - 현재 서브도메인 표시: [subdomain].edubee.com
  - 변경 입력 필드: [text input].edubee.com
  - [Check Availability] 버튼 → 중복 확인 API 호출
  - 가능/불가 상태 표시 (✅ Available / ❌ Already taken)
  - [Save Subdomain] 버튼 (Available 확인 후 활성화)
  - 주의 문구: "서브도메인 변경 시 기존 URL은 더 이상 접속되지 않습니다."

[카드] 커스텀 도메인 (Pro 이상 플랜)
  - 커스텀 도메인 입력 필드 (예: crm.myagency.com.au)
  - Starter 플랜인 경우: 잠금 표시 + "Professional 플랜으로 업그레이드 필요" 안내
  - 설정 안내문: DNS CNAME 설정 방법 안내
```

#### ④ Users & Teams (`UsersTeams.tsx`)

섹션 구성:
```
[헤더] 현재 유저 수: N / 최대 N명 (플랜 한도 표시)

[카드] 직원 초대
  - Email Address *   (text input, type="email")
  - Role              (select: Admin | Manager | Staff)
  - [Send Invitation] 버튼

[카드] 현재 유저 목록 (테이블)
  컬럼: 이름 | 이메일 | 역할 | 상태 | 마지막 로그인 | 액션(비활성화)
  
[카드] 대기 중인 초대 목록 (테이블)
  컬럼: 이메일 | 역할 | 초대일 | 만료일 | 상태 | 액션(취소)

역할별 권한 설명 (툴팁 또는 별도 표시):
  - SuperAdmin: 모든 기능 + Super Admin Panel 접근
  - Admin: 모든 CRM 기능 + Settings 전체 접근
  - Manager: CRM 기능 + 제한된 Settings (회사 정보 조회만)
  - Staff: CRM 기능만 (Settings 접근 불가)
```

#### ⑤ Plan & Billing (`PlanBilling.tsx`)

섹션 구성:
```
[카드] 현재 플랜
  - 플랜 이름 (예: Professional)
  - 상태 배지 (Active / Trial / Suspended)
  - Trial 상태: "D-N일 남음" 표시 (trialEndsAt 기준)
  - 구독 시작일 / 갱신일
  - 현재 사용량: 유저 N/N명 | 학생 N/N명

[카드] 플랜 비교 (3컬럼 카드)
  Starter | Professional | Enterprise
  각 플랜 카드:
    - 가격 (월/연)
    - 주요 기능 목록 (features JSONB 기반)
    - 현재 플랜 표시 or [Upgrade] 버튼
    - Professional 카드: "Most Popular" 배지 표시

[카드] 결제 정보 (MVP: 추후 Stripe 연동 예정)
  - "결제 시스템은 준비 중입니다. 플랜 변경은 관리자에게 문의하세요." 안내
```

### 3-5. URL 라우팅 설정

`/client/src/App.tsx` (또는 라우팅 파일)에 Settings 라우트를 추가한다:

```typescript
// Settings 라우트 추가 (기존 라우트 변경 없음)
<Route path="/settings" element={<SettingsLayout />}>
  <Route index element={<Navigate to="/settings/company" replace />} />
  <Route path="company"  element={<CompanyProfile />} />
  <Route path="branding" element={<Branding />} />
  <Route path="domain"   element={<DomainAccess />} />
  <Route path="users"    element={<UsersTeams />} />
  <Route path="plan"     element={<PlanBilling />} />
</Route>
```

---

## ✅ Task 4: Super Admin 라우트 (기본 구조)

### 4-1. Super Admin 페이지 파일 구조

```
/client/src/pages/superadmin/
├── SuperAdminLayout.tsx      ← Super Admin 전용 레이아웃 (별도 사이드바)
├── SuperAdminDashboard.tsx   ← 전체 통계 대시보드
└── TenantList.tsx            ← 테넌트 목록 및 관리
```

### 4-2. Super Admin 전용 레이아웃

`SuperAdminLayout.tsx`는 일반 CRM 레이아웃과 완전히 분리된 별도 레이아웃으로 구성한다.

사이드바 메뉴:
```
🐝 Edubee Admin

📊 Dashboard
🏢 Tenants          (전체 유학원 목록)
💳 Plans            (플랜 마스터)
📈 Analytics        (사용량 통계, 추후 구현)
💰 Billing          (수납 현황, 추후 구현)
```

헤더에 **"SUPER ADMIN"** 배지를 표시하여 일반 CRM과 구분한다.

### 4-3. Super Admin URL 라우트

```typescript
// /superadmin/* 는 superadmin Role만 접근 가능
<Route path="/superadmin" element={<SuperAdminGuard />}>
  <Route element={<SuperAdminLayout />}>
    <Route index element={<SuperAdminDashboard />} />
    <Route path="tenants" element={<TenantList />} />
  </Route>
</Route>
```

`SuperAdminGuard` 컴포넌트: 현재 유저의 role이 `superadmin`이 아니면 404 페이지로 리다이렉트한다.

### 4-4. TenantList 테이블 UI

컬럼 구성:
```
회사명 | 서브도메인 | 플랜 | 상태 | 유저 수 | 학생 수 | 가입일 | 액션
```

각 행 액션:
- [View] — 테넌트 상세 (모달 또는 상세 페이지)
- [Plan 변경] — 드롭다운으로 플랜 변경
- [Suspend / Activate] — 상태 토글

---

## ✅ 수정 후 필수 검증

모든 Task 완료 후 아래 순서로 반드시 확인한다:

1. `npx tsc --noEmit` → TypeScript 오류 **0개** 확인
2. 서버 정상 기동 → import 오류, 런타임 오류 없음
3. DB 확인 → `SELECT * FROM organisations LIMIT 3;` 실행하여 신규 컬럼 존재 확인
4. DB 확인 → `SELECT * FROM platform_plans;` 실행하여 3개 기본 플랜 데이터 확인
5. API 확인 → `GET /api/settings/company` 정상 응답 확인
6. 프론트 확인 → `/settings/company` 페이지 정상 로드 확인
7. 프론트 확인 → `/settings/branding` 색상 피커 정상 작동 확인

---

## ✅ 작업 완료 보고 형식

각 Task 완료 시 반드시 아래 형식으로 보고한다:

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과:
   - TypeScript: [오류 0개 / N개 오류]
   - 서버 기동: [정상 / 오류 내용]
   - DB 쿼리: [결과 요약]
   - API 응답: [정상 / 오류 내용]
⚠️  다음에 할 작업: [Task N: 설명]
```

---

## 📋 Phase 1 완료 체크리스트

```
Task 1 — DB 스키마
  □ organisations 테이블 컬럼 추가 (기존 컬럼 변경 없음)
  □ tenant_invitations 테이블 생성
  □ tenant_audit_logs 테이블 생성
  □ platform_plans 테이블 생성
  □ Drizzle 마이그레이션 실행 완료
  □ 기본 플랜 3개 시드 완료

Task 2 — 백엔드
  □ tenantResolver 미들웨어 생성
  □ superAdminOnly 미들웨어 생성
  □ /api/settings/* 라우트 구현
  □ /api/superadmin/* 라우트 구현 (기본)
  □ index.ts 라우트 등록

Task 3 — 프론트엔드 Settings
  □ 사이드바 Settings 섹션 추가
  □ SettingsLayout.tsx
  □ CompanyProfile.tsx
  □ Branding.tsx (색상 피커 포함)
  □ DomainAccess.tsx (중복 확인 포함)
  □ UsersTeams.tsx (초대 기능 포함)
  □ PlanBilling.tsx (플랜 비교 카드)
  □ App.tsx 라우트 등록

Task 4 — Super Admin
  □ SuperAdminLayout.tsx
  □ SuperAdminDashboard.tsx
  □ TenantList.tsx
  □ SuperAdminGuard 컴포넌트
  □ App.tsx 라우트 등록
```

---

## 🔮 Phase 2 예고 (이번 범위 외)

이번 Phase 1이 완료된 후, Phase 2에서 구현할 항목:
- 서브도메인 기반 자동 테넌트 감지 (Express 미들웨어)
- 테넌트 테마 CSS 변수 런타임 주입
- 모든 CRM 핵심 테이블에 `organisation_id` FK 추가 마이그레이션
- 직원 초대 이메일 실제 발송 (SendGrid 또는 Nodemailer)
- Stripe 결제 연동

---

*Edubee CRM — Phase 1 Multi-Tenant Prompt v1.0 | 2026-04-03*
