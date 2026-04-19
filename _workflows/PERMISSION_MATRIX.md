# PERMISSION_MATRIX.md — Edubee CRM 권한 매트릭스

> 생성일: 2026-04-19 | 소스: middleware/requireRole.ts, middleware/superAdminOnly.ts, routes/ 전체

---

## 1. API 권한 매트릭스 (코드 기반)

범례: ✅ 허용 | ❌ 차단 | 👁 조회만 | 🔒 본인만

| 기능 / API | super_admin | admin | camp_coordinator | consultant | bookkeeper | readonly |
|-----------|:-----------:|:-----:|:----------------:|:----------:|:----------:|:--------:|
| **인증** | | | | | | |
| 로그인 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View-As Impersonation | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **슈퍼어드민** | | | | | | |
| 테넌트 목록/생성/수정 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 플랫폼 플랜 관리 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Stripe 설정 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 플랫폼 CRM | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CRM** | | | | | | |
| Lead 조회 | ✅ | ✅ | ✅ | ✅ | 👁 | 👁 |
| Lead 생성/수정 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Lead 삭제 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Quote 조회/생성/수정 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| Contract 조회 | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| Contract 생성/수정 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Contract 삭제/취소 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **인보이스 / 재무** | | | | | | |
| Invoice 조회 | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| Invoice 생성/수정 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Tax Invoice | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Transaction 생성 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Payment Header | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Journal Entries | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **사용자/팀** | | | | | | |
| 사용자 조회 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 사용자 생성/수정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 팀 관리 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **KPI** | | | | | | |
| 전체 KPI 조회 | ✅ | ✅ | ❌ | 🔒 | ❌ | ❌ |
| KPI 목표 설정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **설정** | | | | | | |
| 테넌트 설정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 브랜딩 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 데이터 매니저 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 메뉴 접근 권한 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **서비스 관리** | | | | | | |
| 숙박/비자/가디언 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| 픽업/투어 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| CAMP 캠프 신청 | ✅ | ✅ | ✅ | ✅ | ❌ | 👁 |
| **문서** | | | | | | |
| 문서 조회 | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| 문서 업로드 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 문서 삭제 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **커뮤니티** | | | | | | |
| 게시물 조회/작성 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 2. 포털 권한

| 기능 | agent | hotel/pickup/institute/tour | student |
|------|:-----:|:---------------------------:|:-------:|
| 대시보드 | ✅ | ✅ | ✅ |
| 내 학생 목록 | ✅ | ❌ | ❌ |
| 컨설테이션 | ✅ | ✅ | ✅ |
| 견적 | ✅ | ✅(bookings) | ✅ |
| 계약 | ✅ | ✅ | ✅ |
| 서비스 | ✅ | ✅ | ✅ |
| 재무(커미션) | ✅ | ✅ | ✅ |
| 문서 | ✅ | ✅ | ✅ |
| 캠프 사진 | ❌ | ❌ | ✅ |
| 커뮤니티 | ✅ | ✅ | ✅ |

---

## 3. 현재 권한 체크 미적용 (취약) API

| 경로 | 상태 | 위험 |
|------|------|------|
| `GET /api/invoices` | 인증만, RBAC 없음 | 낮음 (테넌트 필터 있음) |
| `GET /api/transactions` | 인증만 | 낮음 |
| `GET /api/dashboard` | 인증만 | 낮음 |
| `GET /api/privacy-policy` | 공개 | 의도적 공개 ✅ |
| `GET /api/health` | 공개 | 의도적 공개 ✅ |
| `POST /api/webhook` | Stripe 서명 검증 | Stripe 검증으로 보호 ✅ |

---

## 4. Role Switcher / View-As

**구현 위치:** `middleware/authenticate.ts`

```typescript
const viewAsId = req.headers["x-view-as-user-id"] as string;
if (viewAsId && (decoded.role === "super_admin" || decoded.role === "admin")) {
  // 해당 user로 req.user 교체
  req.user = viewAsUser;
}
```

**프론트엔드:** `hooks/use-view-as.tsx` (ViewAsProvider 컨텍스트)
**로그:** `impersonation_logs` 테이블에 기록

---

## 5. 멀티테넌트 전환 시 권한 체계 변경 필요 사항

| 항목 | 현재 | 필요 변경 |
|------|------|----------|
| `organisation_id` 기반 격리 | 대부분 구현됨 | 누락 라우트 점검 필요 |
| 플랜별 기능 강제 | `platform_plans` 테이블만 | `checkPlanFeature()` 런타임 구현 필요 |
| 테넌트 어드민 권한 | `admin` 역할로 통합 | 세분화 가능 (추정) |
| 포털 역할 | `accounts.portal_role` 기반 | 정상 구현됨 ✅ |
| 스태프 초대 | `tenant_invitations` 테이블 | 정상 구현됨 ✅ |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
