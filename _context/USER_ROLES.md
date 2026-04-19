# USER_ROLES.md — Edubee CRM 사용자 역할 & 권한

> 생성일: 2026-04-19 | 소스: middleware/authenticate.ts, requireRole.ts, superAdminOnly.ts, auth.ts

---

## 1. 역할 목록

### 스태프 역할 (Admin CRM 로그인)
| 역할 코드 | 역할명 | 설명 |
|-----------|--------|------|
| `super_admin` | 플랫폼 슈퍼 어드민 | `organisationId = null`인 Edubee 플랫폼 관리자. 모든 테넌트 접근 가능. |
| `admin` | 테넌트 어드민 | 특정 테넌트의 최고 관리자. 자신의 org 전체 관리. |
| `manager` / `mgr` | 매니저 | 팀 관리 및 리포트 조회 권한 (추정). |
| `consultant` / `ec` | 교육 컨설턴트 | Lead → Contract 생성 및 담당. 기본 스태프 역할. |
| `bookkeeper` / `bk` | 경리 | 재무/회계 관련 기능 접근. |
| `camp_coordinator` | 캠프 코디네이터 | CAMP 어플리케이션, 인보이스 관리. |
| `readonly` | 읽기 전용 | 조회만 가능. |

### 포털 역할 (Portal 로그인 — accounts 테이블 기반)
| 역할 코드 | 역할명 | 설명 |
|-----------|--------|------|
| `agent` | 에이전트 | 학생을 소개하는 해외 교육 에이전시. |
| `partner` → `hotel` | 파트너: 호텔 | 숙박 파트너. |
| `partner` → `pickup` | 파트너: 픽업 | 공항 픽업 파트너. |
| `partner` → `institute` | 파트너: 학교/기관 | 교육기관 파트너. |
| `partner` → `tour` | 파트너: 투어 | 투어 파트너. |
| `student` | 학생 | 서비스를 받는 최종 고객. |

---

## 2. 인증 방식

### JWT 구조

**스태프 토큰 Payload:**
```json
{
  "userType": "staff",
  "id": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "staffRole": "education_agent",
  "fullName": "홍길동",
  "organisationId": "uuid-or-null",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**포털 토큰 Payload:**
```json
{
  "userType": "portal",
  "accountId": "uuid",
  "email": "agent@agency.com",
  "portalRole": "agent",
  "accountName": "ABC Agency",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 토큰 만료 시간
| 토큰 유형 | 만료 |
|-----------|------|
| 스태프 Access Token | 8시간 (`8h`) |
| 포털 Access Token | 24시간 (`24h`) |
| Refresh Token (양쪽 공통) | 7일 (`7d`) |

### 인증 헤더
```
Authorization: Bearer <access_token>
```

### 계정 잠금 정책
- 로그인 실패 5회 → 30분 잠금
- `users.failedLoginAttempts`, `users.lockedUntil` 컬럼으로 관리

---

## 3. 미들웨어 동작 방식

### `authenticate.ts` — 스태프 인증
1. `Authorization: Bearer <token>` 헤더 확인
2. `JWT_SECRET`으로 verify → `req.user` 설정
3. `X-View-As-User-Id` 헤더가 있고 `super_admin`/`admin`이면 View-As 모드 (Impersonation)

### `authenticatePortal.ts` — 포털 인증
1. 동일한 JWT_SECRET 사용 (토큰 공유)
2. `decoded.userType === "portal"` 검증
3. → `req.portalUser` 설정

### `requireRole(...roles)` — RBAC
```typescript
requireRole("admin", "super_admin")
// req.user.role이 roles에 없으면 403 반환
```

### `superAdminOnly` — 플랫폼 어드민 전용
- `role === "super_admin"` AND `organisationId === null` 조건
- 실패 시 **404** 반환 (보안: 라우트 존재 노출 방지)

### `tenantResolver` — 멀티테넌트
- `X-Organisation-Id` 헤더 또는 `?subdomain=` 쿼리 파라미터에서 테넌트 식별
- `req.tenant` 설정 → 이후 쿼리에서 `organisationId` 필터 자동 적용

---

## 4. View-As (Impersonation) 기능
- `X-View-As-User-Id: <user-uuid>` 헤더를 추가하면 해당 사용자로 동작
- `super_admin` / `admin` 만 사용 가능
- `impersonation_logs` 테이블에 기록 (`actorUserId`, `targetUserId`, `startedAt`, `ipAddress`)
- 관리자 로그: `/admin/settings/impersonation-logs` 페이지

---

## 5. 역할별 주요 권한 매트릭스 (코드 기반)

| 기능 | super_admin | admin | camp_coordinator | consultant | bookkeeper | readonly |
|------|:-----------:|:-----:|:----------------:|:----------:|:----------:|:--------:|
| 슈퍼어드민 대시보드 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 테넌트 관리 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 플랜/과금 관리 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 사용자 관리 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lead CRUD | ✅ | ✅ | ✅ | ✅ | ❌ | 조회 |
| Quote CRUD | ✅ | ✅ | ✅ | ✅ | ❌ | 조회 |
| Contract CRUD | ✅ | ✅ | ✅ | ✅ | ❌ | 조회 |
| Invoice CRUD | ✅ | ✅ | ✅ | ❌ | ✅ | 조회 |
| Transaction CRUD | ✅ | ✅ | ❌ | ❌ | ✅ | 조회 |
| 세금 인보이스 | ✅ | ✅ | ✅ | ❌ | ✅ | 조회 |
| 데이터 매니저 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 설정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| KPI | ✅ | ✅ | ❌ | 본인만 | ❌ | ❌ |
| 커뮤니티 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 6. 알려진 미구현 항목

| 항목 | 상태 |
|------|------|
| `checkPlanFeature()` 런타임 기능 강제 | ❌ 미구현 (platformPlans 테이블만 존재) |
| `marketing_consent` 발송 전 체크 | ❌ 미구현 |
| guardian_consent_given 강제 수집 | ⚠️ 부분 구현 (age < 18 체크는 있음) |
| field-level permissions (DB 기반) | ⚠️ 스키마 존재, 완전 적용 미확인 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
