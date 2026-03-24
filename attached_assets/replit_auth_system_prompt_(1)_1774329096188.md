# Edubee CRM — 내부/외부 사용자 인증 시스템 정의 및 구현 프롬프트
# Replit Agent에 그대로 붙여넣기용

---

## 🎯 작업 목표

내부 직원(Staff)과 외부 파트너(Portal) 두 가지 사용자 유형에 대한
완전한 인증(Login/Password) 시스템을 정의하고 구현한다.

**핵심 요구사항:**
- 내부 직원: 이메일 + 패스워드 로그인 → users 테이블
- 외부 파트너: 이메일 + 패스워드 로그인 → accounts 테이블 (portal 컬럼)
- 외부 파트너 패스워드: Accounts 상세 페이지에서 Admin이 확인 및 수정 가능
- 단일 로그인 URL(/login) → 사용자 유형 자동 감지 → 각각 다른 대시보드로 이동

---

## 📋 작업 전 필수 분석 (먼저 읽을 파일 목록)

아래 파일들을 순서대로 전부 읽고 현재 상태를 파악하라:

1. `/db/schema.ts` → users, accounts 테이블 현재 컬럼 정의 확인
2. `/server/src/routes/auth.ts` (또는 login.ts, users.ts) → 현재 로그인 API 확인
3. `/server/src/middleware/auth.ts` → 현재 JWT/세션 미들웨어 확인
4. `/client/src/pages/Login.tsx` (또는 유사 파일) → 현재 로그인 화면 확인
5. `/client/src/pages/Accounts.tsx` (또는 AccountDetail.tsx) → Account 상세 페이지 확인

읽은 후 아래를 나에게 먼저 보고하라:
- 현재 로그인 방식: JWT / 세션 / 기타
- JWT secret 위치: .env의 키 이름
- 현재 비밀번호 해싱 라이브러리: bcrypt / argon2 / 기타
- accounts 테이블에 portal 관련 컬럼이 이미 있는지 여부

---

## 🏗 전체 인증 아키텍처 정의

```
┌─────────────────────────────────────────────────────────┐
│  단일 로그인 엔드포인트: POST /api/auth/login             │
│                                                         │
│  1. email로 users 테이블 조회                            │
│     → 있으면: 내부 직원 인증                              │
│     → 없으면: accounts 테이블 portal_email 조회           │
│               → 있으면: 외부 파트너 인증                  │
│               → 없으면: 401 Unauthorized                 │
│                                                         │
│  2. 비밀번호 검증 (bcryptjs)                             │
│                                                         │
│  3. JWT 발급                                            │
│     → 내부: { id, email, userType:'staff', staffRole }  │
│     → 외부: { id, email, userType:'portal', portalRole,  │
│              accountId }                                │
│                                                         │
│  4. 리다이렉트                                           │
│     → staff: /dashboard (내부 CRM)                     │
│     → portal: /portal/dashboard (외부 파트너 포털)       │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ STEP 1 — DB 마이그레이션

### 1-A. users 테이블 컬럼 추가
```sql
-- 내부 직원 업무 직책 (기존 role 컬럼 유지, 추가만)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS staff_role VARCHAR(50) DEFAULT 'education_agent',
  -- super_admin | admin | camp_coordinator | education_agent | bookkeeper | finance_manager
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until          TIMESTAMP,
  ADD COLUMN IF NOT EXISTS password_reset_token  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
  ADD COLUMN IF NOT EXISTS invited_at            TIMESTAMP,
  ADD COLUMN IF NOT EXISTS invite_token          VARCHAR(255);
  -- password_hash는 기존에 있음 (확인 후 없으면 추가)
  -- ADD COLUMN IF NOT EXISTS password_hash VARCHAR(500);

-- 기존 role → staff_role 초기 매핑
UPDATE users SET staff_role = 'super_admin'      WHERE role = 'SuperAdmin' AND staff_role IS NULL;
UPDATE users SET staff_role = 'admin'            WHERE role = 'Admin'      AND staff_role IS NULL;
UPDATE users SET staff_role = 'education_agent'  WHERE role = 'User'       AND staff_role IS NULL;
```

### 1-B. accounts 테이블 컬럼 추가 (외부 파트너 포털 로그인)
```sql
-- 외부 파트너 포털 접근 정보 (기존 컬럼 변경 없이 추가만)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS portal_access           BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_role             VARCHAR(50),
  -- institute | hotel | pickup | tour | parent_client
  ADD COLUMN IF NOT EXISTS portal_email            VARCHAR(255),
  ADD COLUMN IF NOT EXISTS portal_password_hash    VARCHAR(500),
  -- ⚠️  평문 패스워드는 절대 저장 안 함. bcrypt hash만 저장.
  -- Admin이 "패스워드 확인"할 때는 임시 패스워드 발급 방식 사용.
  ADD COLUMN IF NOT EXISTS portal_temp_password    VARCHAR(100),
  -- Admin이 설정한 임시 패스워드 (첫 로그인 후 변경 강제)
  ADD COLUMN IF NOT EXISTS portal_temp_pw_expires  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS portal_must_change_pw   BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_last_login_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS portal_failed_attempts  INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portal_locked_until     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS portal_invited_at       TIMESTAMP;

-- accounts.email과 portal_email 관계:
-- accounts.email = 비즈니스 연락 이메일 (공개, 여러 명이 볼 수 있음)
-- accounts.portal_email = 포털 로그인 전용 이메일 (1인 1계정)
-- 두 값이 같아도 되고 달라도 됨
```

### 1-C. 인증 로그 테이블 (선택적, 보안 감사용)
```sql
CREATE TABLE IF NOT EXISTS auth_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type     VARCHAR(10) NOT NULL,   -- staff | portal
  user_id       UUID,                   -- users.id 또는 accounts.id
  email         VARCHAR(255),
  action        VARCHAR(50) NOT NULL,   -- login_success | login_fail | logout | password_change | password_reset
  ip_address    VARCHAR(45),
  user_agent    VARCHAR(500),
  created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);
```

---

## ✅ STEP 2 — Drizzle ORM schema.ts 업데이트

`/db/schema.ts`에서 **기존 컬럼은 절대 수정하지 말고**, 각 테이블 정의에 컬럼만 추가하라.

### users 테이블에 추가할 컬럼:
```typescript
staffRole:             varchar("staff_role", { length: 50 }).default("education_agent"),
failedLoginAttempts:   integer("failed_login_attempts").notNull().default(0),
lockedUntil:           timestamp("locked_until"),
passwordResetToken:    varchar("password_reset_token", { length: 255 }),
passwordResetExpires:  timestamp("password_reset_expires"),
invitedAt:             timestamp("invited_at"),
inviteToken:           varchar("invite_token", { length: 255 }),
```

### accounts 테이블에 추가할 컬럼:
```typescript
portalAccess:          boolean("portal_access").notNull().default(false),
portalRole:            varchar("portal_role", { length: 50 }),
portalEmail:           varchar("portal_email", { length: 255 }),
portalPasswordHash:    varchar("portal_password_hash", { length: 500 }),
portalTempPassword:    varchar("portal_temp_password", { length: 100 }),
portalTempPwExpires:   timestamp("portal_temp_pw_expires"),
portalMustChangePw:    boolean("portal_must_change_pw").notNull().default(false),
portalLastLoginAt:     timestamp("portal_last_login_at"),
portalFailedAttempts:  integer("portal_failed_attempts").notNull().default(0),
portalLockedUntil:     timestamp("portal_locked_until"),
portalInvitedAt:       timestamp("portal_invited_at"),
```

### auth_logs 테이블 추가:
```typescript
export const authLogs = pgTable("auth_logs", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userType:  varchar("user_type", { length: 10 }).notNull(),
  userId:    uuid("user_id"),
  email:     varchar("email", { length: 255 }),
  action:    varchar("action", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 타입 및 상수 추가:
```typescript
// 내부 직원 역할
export const STAFF_ROLES = [
  "super_admin",
  "admin",
  "camp_coordinator",
  "education_agent",
  "bookkeeper",
  "finance_manager",
] as const;
export type StaffRole = typeof STAFF_ROLES[number];

// 외부 파트너 포털 역할
export const PORTAL_ROLES = [
  "institute",
  "hotel",
  "pickup",
  "tour",
  "parent_client",
] as const;
export type PortalRole = typeof PORTAL_ROLES[number];

// 인증된 사용자 타입
export type AuthUserType = "staff" | "portal";

// JWT payload 타입
export interface StaffJwtPayload {
  userType: "staff";
  id: string;
  email: string;
  staffRole: StaffRole;
  role: string;      // 기존 role 필드 유지 (하위 호환)
}

export interface PortalJwtPayload {
  userType: "portal";
  accountId: string;
  email: string;
  portalRole: PortalRole;
  accountName: string;
}

export type JwtPayload = StaffJwtPayload | PortalJwtPayload;
```

---

## ✅ STEP 3 — 인증 라우트 구현

`/server/src/routes/auth.ts` 파일을 아래 스펙으로 교체하거나 새로 생성하라.
(bcryptjs가 없으면: `npm install bcryptjs && npm install -D @types/bcryptjs`)

```typescript
// /server/src/routes/auth.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db";
import { users, accounts, authLogs } from "../../db/schema";
import { eq, or } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = "8h";     // 내부 직원: 8시간
const PORTAL_JWT_EXPIRES = "24h"; // 외부 파트너: 24시간
const MAX_FAILED = 5;         // 5회 실패 시 잠금
const LOCK_MINUTES = 30;      // 30분 잠금

// ──────────────────────────────────────────
// POST /api/auth/login
// 내부/외부 통합 로그인 엔드포인트
// ──────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const ip = req.ip || req.socket.remoteAddress || "";
  const ua = req.headers["user-agent"] || "";

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required" });
  }

  // ─ STEP 1: 내부 직원 먼저 조회
  const staffUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .then((r) => r[0] ?? null);

  if (staffUser) {
    // 계정 상태 체크
    if (staffUser.status !== "Active") {
      return res.status(401).json({ success: false, error: "Account is inactive. Contact your administrator." });
    }

    // 잠금 체크
    if (staffUser.lockedUntil && new Date(staffUser.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(staffUser.lockedUntil).getTime() - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Account locked. Try again in ${remaining} minute(s).`,
      });
    }

    // 패스워드 미설정 (초대 전 상태)
    if (!staffUser.passwordHash) {
      return res.status(401).json({ success: false, error: "Password not set. Please check your invitation email." });
    }

    // 패스워드 검증
    const valid = await bcrypt.compare(password, staffUser.passwordHash);
    if (!valid) {
      const newAttempts = (staffUser.failedLoginAttempts ?? 0) + 1;
      const lockData = newAttempts >= MAX_FAILED
        ? { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
        : {};
      await db.update(users).set({ failedLoginAttempts: newAttempts, ...lockData }).where(eq(users.id, staffUser.id));
      await logAuth(db, "staff", staffUser.id, email, "login_fail", ip, ua);
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    // 로그인 성공 — 실패 카운트 초기화
    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    }).where(eq(users.id, staffUser.id));
    await logAuth(db, "staff", staffUser.id, email, "login_success", ip, ua);

    const payload: StaffJwtPayload = {
      userType: "staff",
      id: staffUser.id,
      email: staffUser.email,
      staffRole: (staffUser.staffRole || "education_agent") as StaffRole,
      role: staffUser.role,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      success: true,
      token,
      userType: "staff",
      user: {
        id: staffUser.id,
        firstName: staffUser.firstName,
        lastName: staffUser.lastName,
        email: staffUser.email,
        staffRole: staffUser.staffRole,
        role: staffUser.role,
      },
      redirectTo: "/dashboard",
    });
  }

  // ─ STEP 2: 외부 파트너 조회 (portal_email 기준)
  const portalAccount = await db
    .select()
    .from(accounts)
    .where(eq(accounts.portalEmail, email.toLowerCase().trim()))
    .then((r) => r[0] ?? null);

  if (!portalAccount) {
    return res.status(401).json({ success: false, error: "Invalid email or password." });
  }

  // 포털 접근 활성화 체크
  if (!portalAccount.portalAccess) {
    return res.status(401).json({ success: false, error: "Portal access is not enabled for this account." });
  }

  if (portalAccount.status !== "Active") {
    return res.status(401).json({ success: false, error: "Account is inactive. Contact your administrator." });
  }

  // 잠금 체크
  if (portalAccount.portalLockedUntil && new Date(portalAccount.portalLockedUntil) > new Date()) {
    const remaining = Math.ceil((new Date(portalAccount.portalLockedUntil).getTime() - Date.now()) / 60000);
    return res.status(429).json({
      success: false,
      error: `Account locked. Try again in ${remaining} minute(s).`,
    });
  }

  if (!portalAccount.portalPasswordHash) {
    return res.status(401).json({ success: false, error: "Portal password not set. Contact your administrator." });
  }

  // 임시 패스워드 체크 (Admin이 설정한 경우)
  let isTemp = false;
  if (portalAccount.portalTempPassword) {
    if (portalAccount.portalTempPwExpires && new Date(portalAccount.portalTempPwExpires) < new Date()) {
      return res.status(401).json({ success: false, error: "Temporary password has expired. Contact your administrator." });
    }
    // 임시 패스워드와 직접 비교 (평문)
    if (password === portalAccount.portalTempPassword) {
      isTemp = true;
    }
  }

  // 일반 패스워드 검증
  const valid = isTemp || await bcrypt.compare(password, portalAccount.portalPasswordHash);
  if (!valid) {
    const newAttempts = (portalAccount.portalFailedAttempts ?? 0) + 1;
    const lockData = newAttempts >= MAX_FAILED
      ? { portalLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
      : {};
    await db.update(accounts).set({ portalFailedAttempts: newAttempts, ...lockData }).where(eq(accounts.id, portalAccount.id));
    await logAuth(db, "portal", portalAccount.id, email, "login_fail", ip, ua);
    return res.status(401).json({ success: false, error: "Invalid email or password." });
  }

  // 성공 — 임시 패스워드였으면 변경 강제 플래그
  await db.update(accounts).set({
    portalFailedAttempts: 0,
    portalLockedUntil: null,
    portalLastLoginAt: new Date(),
    ...(isTemp ? { portalMustChangePw: true } : {}),
  }).where(eq(accounts.id, portalAccount.id));
  await logAuth(db, "portal", portalAccount.id, email, "login_success", ip, ua);

  const payload: PortalJwtPayload = {
    userType: "portal",
    accountId: portalAccount.id,
    email: portalAccount.portalEmail!,
    portalRole: portalAccount.portalRole as PortalRole,
    accountName: portalAccount.name,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: PORTAL_JWT_EXPIRES });

  return res.json({
    success: true,
    token,
    userType: "portal",
    mustChangePassword: isTemp || portalAccount.portalMustChangePw,
    user: {
      accountId: portalAccount.id,
      accountName: portalAccount.name,
      email: portalAccount.portalEmail,
      portalRole: portalAccount.portalRole,
    },
    redirectTo: "/portal/dashboard",
  });
});

// ──────────────────────────────────────────
// POST /api/auth/logout
// ──────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response) => {
  // JWT는 stateless이므로 클라이언트에서 토큰 삭제
  // 필요시 blacklist 테이블 추가 가능
  res.json({ success: true });
});

// ──────────────────────────────────────────
// POST /api/auth/change-password
// 로그인된 사용자 본인 패스워드 변경
// ──────────────────────────────────────────
router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const authUser = (req as any).user as JwtPayload;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  if (authUser.userType === "staff") {
    const user = await db.select().from(users).where(eq(users.id, authUser.id)).then((r) => r[0]);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    // 현재 패스워드 확인 (기존 패스워드가 있는 경우)
    if (user.passwordHash && currentPassword) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ success: false, error: "Current password is incorrect." });
    }

    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, authUser.id));
    await logAuth(db, "staff", authUser.id, authUser.email, "password_change", req.ip || "", req.headers["user-agent"] || "");

  } else {
    // portal user
    await db.update(accounts).set({
      portalPasswordHash: newHash,
      portalTempPassword: null,
      portalTempPwExpires: null,
      portalMustChangePw: false,
    }).where(eq(accounts.id, authUser.accountId));
    await logAuth(db, "portal", authUser.accountId, authUser.email, "password_change", req.ip || "", req.headers["user-agent"] || "");
  }

  res.json({ success: true, message: "Password changed successfully." });
});

// ──────────────────────────────────────────
// 헬퍼: 인증 로그 기록
// ──────────────────────────────────────────
async function logAuth(
  db: any,
  userType: string,
  userId: string,
  email: string,
  action: string,
  ip: string,
  ua: string
) {
  try {
    await db.insert(authLogs).values({ userType, userId, email, action, ipAddress: ip, userAgent: ua });
  } catch (e) {
    console.error("[auth log error]", e);
  }
}

export default router;
```

---

## ✅ STEP 4 — 인증 미들웨어 업데이트

`/server/src/middleware/auth.ts` 파일을 아래로 교체하라:

```typescript
// /server/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../db/schema"; // 실제 경로로 수정

const JWT_SECRET = process.env.JWT_SECRET!;

// req.user 타입 선언
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── 인증 필수 미들웨어
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }
}

// ── 내부 직원 전용 미들웨어
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.userType !== "staff") {
      return res.status(403).json({ success: false, error: "Staff access required." });
    }
    next();
  });
}

// ── Admin 이상 권한 미들웨어
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireStaff(req, res, () => {
    const adminRoles = ["super_admin", "admin"];
    const user = req.user as StaffJwtPayload;
    if (!adminRoles.includes(user.staffRole)) {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }
    next();
  });
}

// ── Super Admin 전용 미들웨어
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireStaff(req, res, () => {
    const user = req.user as StaffJwtPayload;
    if (user.staffRole !== "super_admin") {
      return res.status(403).json({ success: false, error: "Super Admin access required." });
    }
    next();
  });
}

// ── 외부 파트너 전용 미들웨어
export function requirePortal(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.userType !== "portal") {
      return res.status(403).json({ success: false, error: "Portal access required." });
    }
    next();
  });
}
```

---

## ✅ STEP 5 — Account 상세 페이지에 포털 패스워드 관리 UI 추가

`/client/src/pages/AccountDetail.tsx` (또는 `/client/src/pages/Accounts.tsx`)를 수정하라.

**추가할 섹션: "Portal Access" 탭 또는 섹션**

계정 유형이 `School | Agent | Provider | Partner`인 경우 포털 접근 섹션을 표시한다.
(Student 계정에는 표시하지 않음 — 학생은 포털 사용자 아님)

```
Account 상세 페이지 레이아웃:
  ├── 기존 탭들 (Details, Contacts, Contracts 등) — 건드리지 않음
  └── [Portal Access] 탭 (신규 추가)
       ├── 포털 접근 토글 (Enable/Disable)
       ├── Portal Role 선택 드롭다운
       │   (institute | hotel | pickup | tour | parent_client)
       ├── Portal Email 입력 (로그인 아이디)
       ├── ─────────────────────────────
       ├── 임시 패스워드 발급 섹션
       │   ├── [Generate Temp Password] 버튼
       │   │   → 8자리 랜덤 패스워드 생성
       │   │   → 화면에 표시 (Admin이 복사해서 전달)
       │   │   → accounts.portal_temp_password에 저장
       │   │   → 만료: 발급 후 72시간
       │   │   → 최초 로그인 후 변경 강제
       │   └── 현재 임시 패스워드 상태 표시
       │       (발급됨 / 만료됨 / 없음)
       ├── ─────────────────────────────
       ├── 패스워드 직접 설정 섹션 (Super Admin만)
       │   ├── New Password 입력
       │   ├── Confirm Password 입력
       │   └── [Set Password] 버튼
       └── 마지막 로그인 일시, 잠금 상태 표시
```

**백엔드 API (Account 포털 관리용):**

`/server/src/routes/accounts.ts`에 아래 엔드포인트를 추가하라:

```typescript
// GET /api/accounts/:id/portal
// 포털 접근 정보 조회 (패스워드 해시 제외)
router.get("/:id/portal", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const account = await db.select({
    portalAccess:       accounts.portalAccess,
    portalRole:         accounts.portalRole,
    portalEmail:        accounts.portalEmail,
    portalLastLoginAt:  accounts.portalLastLoginAt,
    portalMustChangePw: accounts.portalMustChangePw,
    portalLockedUntil:  accounts.portalLockedUntil,
    portalFailedAttempts: accounts.portalFailedAttempts,
    portalInvitedAt:    accounts.portalInvitedAt,
    portalTempPwExpires: accounts.portalTempPwExpires,
    // portal_password_hash는 절대 반환하지 않음
    // portal_temp_password도 반환하지 않음 (발급 시에만 1회 표시)
  }).from(accounts).where(eq(accounts.id, id)).then(r => r[0]);

  if (!account) return res.status(404).json({ success: false, error: "Account not found" });

  res.json({
    success: true,
    data: {
      ...account,
      hasTempPassword: !!account.portalTempPwExpires &&
                       new Date(account.portalTempPwExpires) > new Date(),
    }
  });
});

// PATCH /api/accounts/:id/portal
// 포털 기본 정보 업데이트 (접근 활성화, 역할, 이메일)
router.patch("/:id/portal", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { portalAccess, portalRole, portalEmail } = req.body;

  // portal_email 중복 체크
  if (portalEmail) {
    const existing = await db.select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.portalEmail, portalEmail.toLowerCase().trim()))
      .then(r => r[0]);
    if (existing && existing.id !== id) {
      return res.status(400).json({ success: false, error: "This email is already used by another portal account." });
    }
  }

  await db.update(accounts).set({
    ...(portalAccess !== undefined && { portalAccess }),
    ...(portalRole    !== undefined && { portalRole }),
    ...(portalEmail   !== undefined && { portalEmail: portalEmail.toLowerCase().trim() }),
    modifiedOn: new Date(),
  }).where(eq(accounts.id, id));

  res.json({ success: true });
});

// POST /api/accounts/:id/portal/temp-password
// 임시 패스워드 발급 (Admin 이상)
router.post("/:id/portal/temp-password", requireAdmin, async (req, res) => {
  const { id } = req.params;

  // 8자리 랜덤 패스워드 생성 (영문 대소문자 + 숫자)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const tempPw = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72시간

  await db.update(accounts).set({
    portalTempPassword:  tempPw,       // 평문 저장 (1회용)
    portalTempPwExpires: expires,
    portalMustChangePw:  true,
    modifiedOn: new Date(),
  }).where(eq(accounts.id, id));

  // 응답에만 1회 노출 — DB에는 평문 저장하나 해시된 비밀번호와 구분됨
  res.json({
    success: true,
    tempPassword: tempPw,
    expiresAt: expires,
    message: "Copy this password and send it to the portal user. It expires in 72 hours.",
  });
});

// POST /api/accounts/:id/portal/set-password
// 패스워드 직접 설정 (Super Admin만)
router.post("/:id/portal/set-password", requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await db.update(accounts).set({
    portalPasswordHash:   hash,
    portalTempPassword:   null,
    portalTempPwExpires:  null,
    portalMustChangePw:   false,
    portalFailedAttempts: 0,
    portalLockedUntil:    null,
    modifiedOn: new Date(),
  }).where(eq(accounts.id, id));

  res.json({ success: true, message: "Portal password set successfully." });
});

// POST /api/accounts/:id/portal/unlock
// 계정 잠금 해제 (Admin 이상)
router.post("/:id/portal/unlock", requireAdmin, async (req, res) => {
  await db.update(accounts).set({
    portalFailedAttempts: 0,
    portalLockedUntil:    null,
    modifiedOn: new Date(),
  }).where(eq(accounts.id, req.params.id));
  res.json({ success: true });
});
```

---

## ✅ STEP 6 — 프론트엔드 Portal Access 탭 UI 구현

Account 상세 페이지에서 Portal Access 탭/섹션을 구현하라.

**대상 파일:** Account 상세 페이지 (읽은 후 실제 파일명에 맞게 적용)

**UI 컴포넌트 구성:**

```tsx
// PortalAccessPanel.tsx (새 컴포넌트 파일로 분리)
// /client/src/components/accounts/PortalAccessPanel.tsx

import { useState, useEffect } from "react";
import { Shield, Key, RefreshCw, Unlock, Eye, EyeOff, Copy, Check } from "lucide-react";

interface Props {
  accountId: string;
  accountType: string;  // School | Agent | Provider | Partner | Student
}

export function PortalAccessPanel({ accountId, accountType }: Props) {
  // Student 계정에는 이 패널 표시 안 함
  if (accountType === "Student") return null;

  const [data, setData] = useState<PortalInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);  // 발급된 임시 PW (1회 표시)
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // 데이터 로드
  useEffect(() => { loadPortalInfo(); }, [accountId]);

  async function loadPortalInfo() {
    const res = await fetch(`/api/accounts/${accountId}/portal`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (json.success) setData(json.data);
  }

  // 포털 기본 정보 저장
  async function saveBasicInfo() {
    setSaving(true);
    await fetch(`/api/accounts/${accountId}/portal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        portalAccess: data?.portalAccess,
        portalRole:   data?.portalRole,
        portalEmail:  data?.portalEmail,
      }),
    });
    setSaving(false);
    setEditing(false);
    loadPortalInfo();
  }

  // 임시 패스워드 발급
  async function generateTempPassword() {
    if (!confirm("Generate a new temporary password? The previous one will be invalidated.")) return;
    const res = await fetch(`/api/accounts/${accountId}/portal/temp-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (json.success) {
      setTempPw(json.tempPassword);
      loadPortalInfo();
    }
  }

  // 패스워드 직접 설정
  async function setDirectPassword() {
    if (newPw !== confirmPw) return alert("Passwords do not match.");
    if (newPw.length < 8) return alert("Password must be at least 8 characters.");
    await fetch(`/api/accounts/${accountId}/portal/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ newPassword: newPw }),
    });
    setNewPw(""); setConfirmPw("");
    alert("Password set successfully.");
  }

  // 잠금 해제
  async function unlockAccount() {
    await fetch(`/api/accounts/${accountId}/portal/unlock`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    loadPortalInfo();
  }

  // 임시 PW 복사
  function copyTempPw() {
    if (tempPw) navigator.clipboard.writeText(tempPw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!data) return <div className="loading">Loading portal info...</div>;

  // 렌더: 아래 JSX를 Edubee 디자인 시스템에 맞게 적용
  return (
    <div className="portal-access-panel">

      {/* ── 헤더 */}
      <div className="panel-header">
        <Shield size={18} color="#F5821F" />
        <span className="panel-title">Portal Access</span>
        <span className={`status-badge ${data.portalAccess ? "active" : "inactive"}`}>
          {data.portalAccess ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* ── 기본 정보 섹션 */}
      <div className="section-card">
        <div className="section-title">Access Settings</div>

        <div className="field-row">
          <label>Portal Access</label>
          <input
            type="checkbox"
            checked={data.portalAccess}
            onChange={(e) => { setData({...data, portalAccess: e.target.checked}); setEditing(true); }}
          />
          <span className="field-hint">Enable to allow this account to log into the partner portal</span>
        </div>

        <div className="field-row">
          <label>Portal Role</label>
          <select
            value={data.portalRole || ""}
            onChange={(e) => { setData({...data, portalRole: e.target.value}); setEditing(true); }}
          >
            <option value="">— Select Role —</option>
            <option value="institute">Institute</option>
            <option value="hotel">Hotel</option>
            <option value="pickup">Pickup</option>
            <option value="tour">Tour</option>
            <option value="parent_client">Parent / Client</option>
          </select>
        </div>

        <div className="field-row">
          <label>Login Email</label>
          <input
            type="email"
            value={data.portalEmail || ""}
            onChange={(e) => { setData({...data, portalEmail: e.target.value}); setEditing(true); }}
            placeholder="portal-login@example.com"
          />
          <span className="field-hint">This email is used to log into the portal (may differ from business email)</span>
        </div>

        {editing && (
          <div className="action-row">
            <button className="btn-primary" onClick={saveBasicInfo} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button className="btn-secondary" onClick={() => { loadPortalInfo(); setEditing(false); }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── 패스워드 관리 섹션 */}
      <div className="section-card">
        <div className="section-title">
          <Key size={14} />
          Password Management
        </div>

        {/* 임시 패스워드 발급 */}
        <div className="subsection">
          <div className="subsection-label">Temporary Password</div>
          <div className="subsection-desc">
            Generate a one-time password to share with the partner.
            They must change it on first login. Expires in 72 hours.
          </div>

          {data.hasTempPassword && !tempPw && (
            <div className="info-badge warning">
              A temporary password is currently active (expires: {formatDate(data.portalTempPwExpires)})
            </div>
          )}

          {tempPw && (
            <div className="temp-pw-box">
              <div className="temp-pw-label">Temporary Password (copy and share now — shown only once)</div>
              <div className="temp-pw-display">
                <code>{showPw ? tempPw : "•".repeat(tempPw.length)}</code>
                <button onClick={() => setShowPw(!showPw)} className="icon-btn">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={copyTempPw} className="icon-btn">
                  {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          <button className="btn-secondary" onClick={generateTempPassword}>
            <RefreshCw size={13} />
            Generate Temp Password
          </button>
        </div>

        {/* 직접 패스워드 설정 (Super Admin만) */}
        {isSuperAdmin() && (
          <div className="subsection" style={{ marginTop: 16 }}>
            <div className="subsection-label">Set Password Directly (Super Admin only)</div>
            <input
              type="password"
              placeholder="New Password (min 8 chars)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="pw-input"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="pw-input"
              style={{ marginTop: 8 }}
            />
            <button
              className="btn-primary"
              onClick={setDirectPassword}
              disabled={!newPw || newPw !== confirmPw}
              style={{ marginTop: 8 }}
            >
              Set Password
            </button>
          </div>
        )}
      </div>

      {/* ── 로그인 현황 섹션 */}
      <div className="section-card">
        <div className="section-title">Login Status</div>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Last Login</span>
            <span className="status-value">
              {data.portalLastLoginAt ? formatDate(data.portalLastLoginAt) : "Never"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Failed Attempts</span>
            <span className={`status-value ${data.portalFailedAttempts >= 3 ? "warning" : ""}`}>
              {data.portalFailedAttempts} / 5
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Account Lock</span>
            <span className={`status-value ${data.portalLockedUntil ? "danger" : "ok"}`}>
              {data.portalLockedUntil && new Date(data.portalLockedUntil) > new Date()
                ? `Locked until ${formatDate(data.portalLockedUntil)}`
                : "Normal"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Password Status</span>
            <span className="status-value">
              {data.portalMustChangePw ? "⚠️ Must change on next login" : "Normal"}
            </span>
          </div>
        </div>

        {data.portalLockedUntil && new Date(data.portalLockedUntil) > new Date() && (
          <button className="btn-danger-outline" onClick={unlockAccount} style={{ marginTop: 12 }}>
            <Unlock size={13} />
            Unlock Account
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## ✅ STEP 7 — 서버 등록 및 환경변수 확인

### server/src/index.ts에 라우트 등록:
```typescript
import authRoutes from "./routes/auth";
app.use("/api/auth", authRoutes);
// 기존 accounts 라우트에 portal 엔드포인트가 추가됨 (Step 5에서)
```

### .env 확인 (없으면 추가):
```
JWT_SECRET=your-very-long-random-secret-key-here-minimum-32-chars
JWT_EXPIRES=8h
```

---

## ⛔ 절대 하지 말 것

- users 테이블의 기존 `role`, `password_hash`, `email` 컬럼 삭제 또는 변경
- accounts 테이블의 기존 컬럼 삭제 또는 변경
- 현재 로그인이 작동 중인 경우, 기존 로그인 엔드포인트를 삭제하지 말고 통합하거나 기존 유지
- bcrypt 라운드 수를 10 미만으로 설정 (보안상 최소 10, 권장 12)
- portal_password_hash를 API 응답에 포함하는 것

---

## ✅ 검증 체크리스트

```
1. npx tsc --noEmit → 오류 0개

2. DB 컬럼 확인:
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'users'
   AND column_name IN ('staff_role','failed_login_attempts','locked_until');
   → 3행 나와야 함

   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'accounts'
   AND column_name IN ('portal_access','portal_email','portal_password_hash','portal_temp_password');
   → 4행 나와야 함

3. 내부 직원 로그인 테스트:
   POST /api/auth/login
   { "email": "staff@example.com", "password": "..." }
   → userType: "staff", redirectTo: "/dashboard" 확인

4. 외부 파트너 로그인 테스트:
   (accounts 테이블에 portal_email, portal_password_hash 설정 후)
   POST /api/auth/login
   { "email": "partner@example.com", "password": "..." }
   → userType: "portal", redirectTo: "/portal/dashboard" 확인

5. 임시 패스워드 발급 테스트:
   POST /api/accounts/:id/portal/temp-password
   → tempPassword 8자리 반환 확인
   → DB에 portal_temp_password, portal_temp_pw_expires 저장 확인
   → 해당 임시 패스워드로 /api/auth/login 성공 확인
   → mustChangePassword: true 반환 확인

6. Account 상세 페이지:
   → Portal Access 탭 표시 확인 (School/Agent/Provider/Partner 타입)
   → Student 타입에는 탭 없음 확인
   → Generate Temp Password → 화면에 1회 표시 확인
   → 잠금 해제 버튼 작동 확인
```

---

## 완료 보고 형식

```
✅ 수정된 파일: [목록]
✅ 수정 내용: [설명]
✅ 검증 결과:
   - tsc: [결과]
   - DB 컬럼: [결과]
   - 내부 직원 로그인: [결과]
   - 외부 파트너 로그인: [결과]
   - 임시 패스워드: [결과]
   - Account UI: [결과]
⚠️ 다음에 할 작업: [있는 경우]
```
