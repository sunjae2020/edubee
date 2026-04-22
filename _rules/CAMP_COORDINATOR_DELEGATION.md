---
title: Camp Coordinator Cross-Tenant Delegation — Design Rules
scope: Edubee CRM — Camp Module · Multi-Tenant SaaS Layer
version: 1.1
created: 2026-04-22
updated: 2026-04-22
authoritative: true
location: _rules/CAMP_COORDINATOR_DELEGATION.md
applies_to:
  - lib/db/src/schema/camp.ts
  - lib/db/src/schema/settings.ts
  - artifacts/api-server/src/routes/camp-applications.ts
  - artifacts/api-server/src/routes/camp-services.ts
  - artifacts/api-server/src/routes/contracts.ts
  - artifacts/api-server/src/middleware/requireDelegatedOrOwnerAccess.ts
  - artifacts/edubee-admin/src/pages/admin/camp-package-group-detail.tsx
  - artifacts/edubee-admin/src/pages/admin/delegated-packages.tsx
see_also:
  - _context/USER_ROLES.md
  - _context/SAAS_ONBOARDING.md
  - _schema/DB_SCHEMA_OVERVIEW.md
  - _schema/DRIZZLE_PATTERNS.md
  - _schema/API_ENDPOINTS.md
  - _workflows/PERMISSION_MATRIX.md
  - _workflows/CORE_PIPELINE.md
  - _workflows/FINANCE_WORKFLOW.md
  - _rules/REGRESSION_LOG.md
---

# 🐝 Camp Coordinator 위임 (Cross-Tenant Delegation) — 설계 규칙

> **본 문서는 Claude Code 가 Camp Coordinator 관련 기능을 구현·수정할 때 반드시 따라야 하는 규칙(Rules) 문서입니다.**
> 이 규칙에 위배되는 코드 생성 금지. 수정 필요 시 사용자의 명시적 승인("진행해") 후 재작성.
> 본 문서는 `_rules/` 디렉토리에 위치하며, 다른 문서보다 **우선 적용(authoritative)** 됩니다.

---

## 0. TL;DR (엔지니어용 한 줄 요약)

Package Group Detail 의 `Camp Coordinator` 필드에 다른 테넌트를 지정하면,
그 테넌트는 **해당 Package Group 파생 트리 범위 안에서만** View / Edit / Soft Delete 권한을 가진다.
Hard Delete 및 재무 확정(Finalise) 권한은 **Owner Tenant 전용**이다.

---

## 1. 용어 정의 (Terminology)

> 용어 상세는 `_context/GLOSSARY.md` 와 동기화할 것.

| 용어 | 정의 |
|------|------|
| **Owner Tenant** | Package Group 을 생성·소유한 유학원 (예: `my agency`) |
| **Coordinator Tenant** | Package Group 운영을 위임받은 테넌트 (예: `tsh.edubee.co`) |
| **Delegation Scope** | 위임된 Package Group 에서 파생되는 모든 레코드 트리 |
| **Delegated Access** | Coordinator Tenant 사용자가 Delegation Scope 에 한해 갖는 제한적 권한 |
| **Revocation** | Owner 가 위임을 철회하는 행위 (Soft 방식, 30일 유예) |

---

## 2. 핵심 설계 원칙 (Core Principles)

### P1. 소유와 운영의 분리
- Owner 는 **자산(Package Group)** 을 소유
- Coordinator 는 **운영권** 을 위임받음
- 재무 귀속(수익·커미션 최종 배분)은 언제나 Owner 에게 귀속

### P2. 테넌트 격리 원칙 불변
- 위임은 **한 개의 Package Group 단위**로만 성립
- 동일 Coordinator Tenant 라도 **다른 Package Group 의 데이터는 절대 노출 금지**

### P3. Soft Delete Only
- Coordinator Tenant 는 **어떤 경우에도 Hard Delete 불가**
- 모든 삭제는 `status='Inactive'` 또는 `deleted_at=NOW()` 처리

### P4. 이중 방어선 (Defense in Depth)
- API 미들웨어 + DB RLS(Row Level Security) **둘 다** 적용
- 둘 중 하나만 의존하는 구조 금지

### P5. 감사 추적 의무
- 모든 Delegated Access 액션은 `tenant_audit_logs` 에 `acting_org_id` 와 `target_org_id` 를 분리 기록

---

## 3. Delegation Scope 정의 (필수 준수)

Coordinator Tenant 가 접근 가능한 파생 레코드 트리는 **정확히 아래 구조로 한정**된다.

```
camp_package_groups (위임된 단 1건)
  └── camp_packages
       └── camp_applications
            └── leads (자동 전환)
                 └── contracts
                      ├── contract_products
                      ├── accounts / contacts (계약 귀속 고객만)
                      ├── SERVICE MGT (lib/db/src/schema/services.ts)
                      │    ├── pickup_mgt
                      │    ├── accommodation_mgt
                      │    ├── study_abroad_mgt (program_context='camp')  ← camp_institute_mgt 대체
                      │    ├── camp_tour_mgt   (lib/db/src/schema/camp.ts)
                      │    └── settlement_mgt
                      └── FINANCE
                           ├── invoices / invoice_products  (lib/db/src/schema/finance.ts)
                           ├── transactions (credit/debit)
                           ├── receipts                     (lib/db/src/schema/accounting.ts)
                           └── settlement_mgt               (lib/db/src/schema/services.ts)
```

> ⚠️ `camp_institute_mgt` 테이블은 2026-03-25에 DROPPED 됨.
> 캠프 기관 관리는 `study_abroad_mgt` (services.ts) 에서 `program_context = 'camp'` 필터로 처리.

**❌ 범위 밖 접근 예시 (반드시 403):**
- 다른 Package Group 의 Contract 조회
- Owner Tenant 의 일반 유학(비캠프) Contract 조회
- Owner Tenant 의 직원(User) / 팀(Team) 데이터 조회
- Owner Tenant 의 다른 Coordinator 위임 내역 조회

---

## 4. 권한 매트릭스 (Permission Matrix)

> 기존 `_workflows/PERMISSION_MATRIX.md` 의 역할별 권한과 **별도 레이어**로 적용된다.
> Coordinator Tenant 사용자는 **자사 내부 역할 권한 ∩ 위임 권한** 의 교집합만 행사 가능.

| 리소스 | View | Edit | Soft Delete | Hard Delete | Finalise |
|--------|:----:|:----:|:-----------:|:-----------:|:--------:|
| camp_package_groups (위임된 1건) | ✅ | ✅ | ✅ | ❌ | ❌ |
| camp_packages / camp_package_products | ✅ | ✅ | ✅ | ❌ | ❌ |
| camp_applications | ✅ | ✅ | ✅ | ❌ | ❌ |
| contracts | ✅ | ✅ | ✅ | ❌ | ❌ |
| accounts / contacts (계약 귀속) | ✅ | ✅ | ⚠️ 연결 해제만 | ❌ | ❌ |
| pickup_mgt / accommodation_mgt / study_abroad_mgt / camp_tour_mgt | ✅ | ✅ | ✅ | ❌ | ❌ |
| invoices / transactions / receipts | ✅ | ⚠️ 조건부 | ⚠️ 조건부 | ❌ | ❌ |
| settlement_mgt | ✅ | ✅ | ❌ | ❌ | ❌ (Owner 전용) |
| tenant_audit_logs / organisations 설정 | ❌ | ❌ | ❌ | ❌ | ❌ |

**⚠️ 조건부(Finance)** — `package_group_coordinators.permissions.manage_finance = true` 일 때만 허용. 기본값은 **OFF**.

---

## 5. 데이터 모델 확장 규칙 (DB Schema Rules)

> 스키마 변경은 `_schema/DB_SCHEMA_OVERVIEW.md` 및 `_schema/DRIZZLE_PATTERNS.md` 에 **동기화 반영 필수**.
> 모든 Drizzle 스키마 변경 후 `lib/db/drizzle/` 에 마이그레이션 SQL 파일 생성.

### 5.1 신규 테이블: `package_group_coordinators`

파일: `lib/db/src/schema/camp.ts` 에 추가

```ts
// lib/db/src/schema/camp.ts
import { organisations } from "./settings";  // 기존 import 에 추가

export const packageGroupCoordinators = pgTable("package_group_coordinators", {
  id:                uuid("id").primaryKey().defaultRandom(),
  packageGroupId:    uuid("package_group_id").notNull()
                       .references(() => campPackageGroups.id),
  ownerOrgId:        uuid("owner_org_id").notNull()
                       .references(() => organisations.id),
  coordinatorOrgId:  uuid("coordinator_org_id").notNull()
                       .references(() => organisations.id),
  permissions:       jsonb("permissions").notNull().$type<{
    view: boolean;
    edit: boolean;
    soft_delete: boolean;
    manage_finance: boolean;        // 기본 false
  }>(),
  grantedByUserId:   uuid("granted_by_user_id").notNull()
                       .references(() => users.id),
  grantedAt:         timestamp("granted_at").notNull().defaultNow(),
  acceptedAt:        timestamp("accepted_at"),
  revokedAt:         timestamp("revoked_at"),
  revokedByUserId:   uuid("revoked_by_user_id").references(() => users.id),
  status:            varchar("status", { length: 20 }).notNull().default("Pending"),
  // Pending | Active | Revoked | Expired
  notes:             text("notes"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  modifiedAt:        timestamp("modified_at").notNull().defaultNow(),
});
```

### 5.2 `organisation_id` 추가 — Camp 핵심 테이블 (Step 1 범위)

**Step 1** 에서 추가하는 최소 범위 (Delegation Feature 필수):

| 테이블 | 스키마 파일 | 컬럼 |
|--------|------------|------|
| `camp_package_groups` | `lib/db/src/schema/camp.ts` | `organisation_id UUID NOT NULL` |
| `camp_packages` | `lib/db/src/schema/camp.ts` | `organisation_id UUID NOT NULL` |
| `camp_applications` | `lib/db/src/schema/camp.ts` | `organisation_id UUID NOT NULL` |

**Step 2 이후** 확장 (전체 SaaS 멀티테넌시):

- `contracts`, `contract_products` — `lib/db/src/schema/contracts.ts`
  - ⚠️ `contracts` 에는 이미 `campProviderId` (캠프 공급자 org FK) 가 존재. 소유 테넌트용 `organisationId` 를 별도 추가할 것.
- `invoices`, `invoice_products`, `transactions` — `lib/db/src/schema/finance.ts`
- `receipts` — `lib/db/src/schema/accounting.ts`
- `accounts`, `contacts`, `leads` — `lib/db/src/schema/crm.ts`, `applications.ts`
- `*_mgt` 테이블 전체 — `lib/db/src/schema/services.ts`, `camp.ts`

**⚠️ 마이그레이션 전략:**
```sql
-- 1. 컬럼 추가 (nullable 로 먼저)
ALTER TABLE camp_package_groups ADD COLUMN organisation_id UUID REFERENCES organisations(id);

-- 2. 기존 레코드 백필 (단일 테넌트 시절 데이터 → 첫 번째 org)
UPDATE camp_package_groups
SET organisation_id = (SELECT id FROM organisations ORDER BY created_on LIMIT 1)
WHERE organisation_id IS NULL;

-- 3. NOT NULL 제약 추가
ALTER TABLE camp_package_groups ALTER COLUMN organisation_id SET NOT NULL;
```

### 5.3 DB 제약 (Constraint) 규칙

```sql
-- 동일 Package Group 에 활성 Coordinator 는 1개만 허용
CREATE UNIQUE INDEX idx_pgc_unique_active
  ON package_group_coordinators(package_group_id)
  WHERE status = 'Active';

-- Owner 와 Coordinator 는 같은 테넌트일 수 없음
ALTER TABLE package_group_coordinators
  ADD CONSTRAINT chk_pgc_different_orgs
  CHECK (owner_org_id <> coordinator_org_id);
```

### 5.4 금지 사항 (Schema)
- ❌ 기존 컬럼 삭제 또는 이름 변경 금지
- ❌ `organisation_id` 를 NULL 허용으로 최종 확정하지 말 것 (SaaS 격리 무력화)
- ❌ `package_group_coordinators` 테이블을 Hard Delete 금지 (상태 변경만)
- ❌ `camp_institute_mgt` 신규 참조 금지 (DROPPED — `study_abroad_mgt` 사용)

---

## 6. 런타임 접근 제어 규칙 (Middleware Rules)

### 6.1 미들웨어 계약

신규 파일: `artifacts/api-server/src/middleware/requireDelegatedOrOwnerAccess.ts`

```ts
// artifacts/api-server/src/middleware/requireDelegatedOrOwnerAccess.ts
import { Request, Response, NextFunction } from "express";
import { AuthUser } from "./authenticate";  // 기존 AuthUser 재사용

interface DelegatedAccessOptions {
  resource: 'camp_package_group' | 'camp_package' | 'camp_application'
           | 'contract' | 'invoice' | 'settlement_mgt' | string;
  action: 'view' | 'edit' | 'soft_delete' | 'finalise';
}

export function requireDelegatedOrOwnerAccess(opts: DelegatedAccessOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Section 6.2 검증 순서 참조
  };
}
```

> `req.user.organisationId` 는 `string | null | undefined` 타입 (`AuthUser` 인터페이스 기준).
> 미들웨어 진입 시 null/undefined 검사 필수.

### 6.2 검증 순서 (변경 금지)

```
1. JWT 파싱 → req.user.organisationId 확정 (authenticate 미들웨어가 선행)
2. 요청 리소스 ID → 해당 리소스의 package_group_id 추출
3. 리소스의 organisation_id === req.user.organisationId 인 경우:
     → Owner 접근. 기존 requireRole 기반 권한 체크로 위임
4. 그렇지 않으면:
   SELECT * FROM package_group_coordinators
     WHERE package_group_id = ?
       AND coordinator_org_id = req.user.organisationId
       AND status = 'Active'
       AND revoked_at IS NULL
5. 매칭 없음 → 403 Forbidden
6. 매칭 있음 → permissions JSONB 에서 action 확인
   - action='finalise' → 항상 403 (Owner 전용)
   - action='edit' on finance → permissions.manage_finance 체크
7. 통과 시 응답 헤더에 X-Delegated-Access: true 부여
```

### 6.3 절대 하지 말 것
- ❌ 미들웨어 없이 직접 DB 쿼리하는 라우트 작성
- ❌ `req.user.organisationId` 를 클라이언트 요청 본문에서 덮어쓸 수 있게 하기
- ❌ Delegation 체크를 프론트엔드에서만 수행 (백엔드 반드시 이중 체크)

---

## 7. 워크플로 (State Machine)

### 7.1 Delegation 상태 전이

```
         [Owner 지정]              [Coordinator 수락]
 (none) ──────────────→ Pending ──────────────────→ Active
                           │                          │
                           │ [Coordinator 거절]        │ [Owner 철회]
                           ▼                          ▼
                        Rejected                   Revoked (30일 읽기전용 유예)
                                                      │
                                                      ▼ (30일 경과)
                                                    Expired (완전 차단)
```

### 7.2 단계별 필수 동작

| Stage | 담당 | 시스템 동작 |
|-------|------|-------------|
| 1. 지정 | Owner SA/AD | `package_group_coordinators` INSERT, status='Pending', 양측 알림 |
| 2. 수락 | Coordinator SA | `accepted_at=NOW(), status='Active'`, 사이드바 "Delegated Packages" 활성화 |
| 3. 운영 | Coordinator 직원 | UI 주황 배너 노출, 모든 액션 `tenant_audit_logs` 기록 |
| 4. 수정/삭제 | Coordinator | Soft Delete 만 허용, 감사 로그 필수 |
| 5. 재무 | Coordinator (권한 有) | Invoice/Transaction 가능, Finalise 는 Owner 대기 |
| 6. 철회 | Owner SA/AD | `revoked_at=NOW(), status='Revoked'`, 30일 후 Expired 자동 전환 |

---

## 8. UI/UX 규칙 (Frontend Rules)

> 디자인 토큰은 `_design/DESIGN_SYSTEM.md` · `_design/COLOR_STATUS_CODES.md` 준수.
> 페이지 레이아웃은 `_design/PAGE_LAYOUTS.md` 의 Detail View 패턴 재사용.

### 8.1 Owner 측

파일: `artifacts/edubee-admin/src/pages/admin/camp-package-group-detail.tsx`

- **Camp Coordinator** 선택 섹션 배치 (org 검색 + 권한 프리셋 선택)
- Coordinator 지정 시 확인 모달: "이 조치는 해당 테넌트에게 운영 권한을 부여합니다"
- 권한 프리셋: `운영 전담` / `운영 + 재무 읽기` / `운영 + 재무 관리`
- 활성 위임 목록 및 **Delegated Activity Feed** 표시

### 8.2 Coordinator 측

파일: `artifacts/edubee-admin/src/pages/admin/delegated-packages.tsx`

- 사이드바 **Delegated Packages** 메뉴 별도 구성 (본인 소유 메뉴와 분리)
- 모든 페이지 상단 **주황색 배너**:
  `⚠️ Operating on behalf of {owner_org_name} · Delegated scope only`
- 재무 탭은 `manage_finance=false` 인 경우 **읽기 전용 오버레이**
- Hard Delete 버튼은 아예 렌더링하지 않음 (DOM 상에도 존재 금지)

### 8.3 공통
- 색상: `#F5821F` (Edubee Orange) — 기존 디자인 시스템 준수 (`primaryColor` 기본값)
- 다국어: 모든 새 문자열은 `/client/src/locales/{en,ko,ja,th}/translation.json` 에 동시 추가

---

## 9. 감사 로그 규칙 (Audit Rules)

### 9.1 필수 기록 이벤트
- Delegation 생성 / 수락 / 거절 / 철회 / 만료
- Delegated Access 로 이루어진 모든 CREATE / UPDATE / SOFT_DELETE
- 권한 초과 시도 (403 발생)

### 9.2 `tenant_audit_logs` 확장

> ⚠️ 프로젝트는 `system_logs` 테이블을 사용하지 않음.
> 기존 `tenant_audit_logs` (`lib/db/src/schema/settings.ts`) 에 3개 컬럼을 추가하여 Delegation 감사 추적.

**기존 컬럼** (변경 금지):
```ts
organisationId  // Owner Tenant (또는 Acting Tenant)
userId
action, entityType, entityId
oldValues, newValues (jsonb)
ipAddress, createdOn
```

**추가 컬럼** (Step 6에서 마이그레이션):
```ts
actingOrgId:   uuid("acting_org_id").references(() => organisations.id),  // Coordinator Tenant
targetOrgId:   uuid("target_org_id").references(() => organisations.id),  // Owner Tenant (위임 시)
viaDelegation: boolean("via_delegation").notNull().default(false),
```

**필수 기록 action 값:**
```
'DELEGATION_GRANT' | 'DELEGATION_ACCEPT' | 'DELEGATION_REJECT'
| 'DELEGATION_REVOKE' | 'DELEGATION_EXPIRE'
| 'VIEW' | 'CREATE' | 'UPDATE' | 'SOFT_DELETE'
| 'FORBIDDEN_ATTEMPT'
```

---

## 10. 구현 우선순위 (Implementation Order)

Claude Code 는 아래 순서를 엄수하고, 각 Step 완료 후 **반드시 사용자 승인**을 받은 뒤 다음 Step 진행.

| Step | 작업 | 의존성 | 관련 파일 |
|:---:|------|--------|----------|
| 1 | `camp_package_groups`, `camp_packages`, `camp_applications` 에 `organisation_id` 추가 + 마이그레이션 | — | `lib/db/src/schema/camp.ts`, `lib/db/drizzle/0010_camp_organisation_id.sql` |
| 2 | `package_group_coordinators` 테이블 + Drizzle 스키마 | Step 1 | `lib/db/src/schema/camp.ts`, `lib/db/drizzle/0011_package_group_coordinators.sql` |
| 3 | `requireDelegatedOrOwnerAccess` 미들웨어 + 유틸 | Step 2 | `artifacts/api-server/src/middleware/requireDelegatedOrOwnerAccess.ts` |
| 4 | Owner 측 UI: Camp Package Group Detail 의 Coordinator 지정 모달 | Step 3 | `artifacts/edubee-admin/src/pages/admin/camp-package-group-detail.tsx` |
| 5 | Coordinator 측 UI: Delegated Packages 메뉴 + 주황 배너 | Step 3 | `artifacts/edubee-admin/src/pages/admin/delegated-packages.tsx` |
| 6 | 철회/만료 스케줄러 + `tenant_audit_logs` 확장 (3개 컬럼) | Step 2, 3 | `artifacts/api-server/src/`, `lib/db/src/schema/settings.ts` |
| 7 | 재무 제한 (`manage_finance` 플래그) 세부 적용 | Step 3, 5 | `artifacts/api-server/src/routes/` 재무 라우트 |

---

## 11. 검증 체크리스트 (QA Checklist)

코드 변경 후 **반드시 모두 ✅** 확인. 회귀 발생 시 `_rules/REGRESSION_LOG.md` 에 기록.

- [ ] `npx tsc --noEmit` → TypeScript 오류 0개 (`lib/db` 패키지 포함)
- [ ] 서버 기동 시 import/런타임 오류 없음
- [ ] `package_group_coordinators` 테이블 CRUD 쿼리 정상
- [ ] `camp_package_groups.organisation_id` 기존 데이터 백필 확인
- [ ] Owner Tenant 사용자는 기존대로 전체 조회 가능
- [ ] Coordinator Tenant 사용자는 위임된 Package Group 만 조회
- [ ] Coordinator 가 **다른** Package Group API 호출 → 403 반환
- [ ] Coordinator 의 Hard Delete 시도 → 403 반환
- [ ] `manage_finance=false` 일 때 Invoice PUT/DELETE → 403 반환
- [ ] 철회 후 30일 유예 동안 읽기 전용 동작 확인
- [ ] `tenant_audit_logs` 에 `acting_org_id`, `target_org_id`, `via_delegation` 정확히 기록
- [ ] 관련 API 엔드포인트 응답 필드 누락 없음
- [ ] 최신 3개 레코드 SELECT 로 DB 반영 확인

---

## 12. 금지 사항 요약 (DO NOT)

| 금지 항목 | 이유 |
|-----------|------|
| Coordinator 에게 Hard Delete 권한 부여 | 데이터 유실 및 감사 불가 |
| `organisation_id` NULL 허용 최종 확정 | 테넌트 격리 파괴 |
| 프론트엔드에서만 권한 체크 | 우회 공격 위험 |
| Owner === Coordinator 허용 | 권한 모호 및 감사 혼란 |
| 동일 Package Group 에 복수 활성 Coordinator | 운영 주체 충돌 |
| 위임 테이블 Hard Delete | 이력 추적 불가 |
| 재무 Finalise 를 Coordinator 에게 위임 | 수익 귀속 분쟁 |
| 인증 관련 기존 코드 임의 수정 | 시스템 전반 영향 위험 |
| `camp_institute_mgt` 신규 참조 | 테이블 DROPPED (2026-03-25) |
| `system_logs` 테이블 신규 생성 | 프로젝트는 `tenant_audit_logs` 사용 |

---

## 13. 교차 참조 (Cross-References)

본 규칙 적용 시 아래 문서들을 **함께 확인·동기화** 해야 합니다.

### 참조 필수 (Read First)
- `_context/PROJECT_OVERVIEW.md` — 프로젝트 전체 맥락
- `_context/USER_ROLES.md` — 역할별 기본 권한 (본 문서는 이 위에 위임 레이어 추가)
- `_context/SAAS_ONBOARDING.md` — 멀티테넌트 온보딩 플로우
- `_workflows/PERMISSION_MATRIX.md` — 기존 권한 매트릭스

### 동기화 대상 (Update When Implementing)
- `_schema/DB_SCHEMA_OVERVIEW.md` — `package_group_coordinators` 테이블 추가 반영
- `_schema/DRIZZLE_PATTERNS.md` — 신규 스키마 패턴 등록
- `_schema/API_ENDPOINTS.md` — 위임 관련 신규 엔드포인트 추가
- `_workflows/PERMISSION_MATRIX.md` — Delegated Access 레이어 추가 설명
- `_workflows/CORE_PIPELINE.md` — State Machine 반영
- `_workflows/FINANCE_WORKFLOW.md` — `manage_finance` 플래그 흐름 반영
- `_design/PAGE_LAYOUTS.md` — Package Group Detail 의 Coordinator 섹션 추가

### 핵심 스키마 파일 (Source of Truth)
- `lib/db/src/schema/camp.ts` — Camp 테이블 정의 (`campPackageGroups`, `campPackages`, `campApplications`, `campTourMgt`, `packageGroupCoordinators`)
- `lib/db/src/schema/services.ts` — `study_abroad_mgt`, `pickup_mgt`, `accommodation_mgt`, `settlement_mgt`
- `lib/db/src/schema/settings.ts` — `organisations`, `tenant_audit_logs`
- `lib/db/src/schema/contracts.ts` — `contracts` (주의: `campProviderId` 이미 존재)

---

## 14. 문서 변경 이력

| Version | Date | Author | Change |
|:-------:|------|--------|--------|
| 1.0 | 2026-04-22 | Design Session | 최초 작성 (Camp Coordinator 위임 규칙, `_rules/` 배치) |
| 1.1 | 2026-04-22 | Claude Code | 실제 프로젝트 구조 반영: 파일 경로 수정, `camp_institute_mgt` DROPPED 처리, `system_logs` → `tenant_audit_logs` 대체, Drizzle 스키마 패턴 업데이트, Step 1 범위 명확화 |

---

*© Edubee.Co — 내부 설계 규칙 문서.*
*본 문서는 `_rules/` 디렉토리에 위치하며, Claude Code 는 본 규칙을 우선 적용(authoritative)한다.*
