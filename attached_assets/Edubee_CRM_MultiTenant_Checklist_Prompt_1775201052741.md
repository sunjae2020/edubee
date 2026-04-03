# 🐝 Edubee CRM — Multi-Tenant 구현 검증 체크리스트
# Replit AI Agent 전용
# 작성일: 2026-04-03 | 버전: v1.1 (Subdomain / Custom Domain 네임서버 설정 추가)
# 목적: Phase 1 멀티테넌트 구현이 올바르게 완료됐는지 전체 검증

---

## 📌 검증 지시사항

이 프롬프트는 **코드를 수정하지 않는다.**
오직 읽고, 확인하고, 결과를 보고하는 것만 한다.

각 항목을 순서대로 확인한 후 아래 3가지 중 하나로 표시한다:

```
✅ PASS  — 정상 구현됨
❌ FAIL  — 미구현 또는 오류
⚠️ WARN  — 구현됐으나 개선 필요
```

모든 항목 확인 후 **최종 보고서**를 아래 형식으로 출력한다:

```
📊 검증 결과 요약
  PASS : N개
  FAIL : N개
  WARN : N개

❌ FAIL 항목 목록 (수정 필요):
  - [항목명]: [이유]

⚠️ WARN 항목 목록 (개선 권장):
  - [항목명]: [이유]

🔧 권장 수정 순서:
  1. [가장 중요한 항목]
  2. ...
```

---

## 🗄️ SECTION A: DB 스키마 검증

> `/db/schema.ts` 파일을 읽고 아래 항목을 확인한다.
> SQL로 직접 확인이 필요한 항목은 해당 쿼리를 실행한다.

### A-1. organisations 테이블 신규 컬럼 존재 여부

아래 SQL을 실행하여 컬럼 존재를 확인한다:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organisations'
ORDER BY ordinal_position;
```

확인 항목:

| 컬럼명 | 타입 | 기본값 | 체크 |
|--------|------|--------|------|
| `subdomain` | varchar | null | □ |
| `custom_domain` | varchar | null | □ |
| `logo_url` | varchar | null | □ |
| `favicon_url` | varchar | null | □ |
| `primary_color` | varchar | `#F5821F` | □ |
| `secondary_color` | varchar | `#1C1917` | □ |
| `accent_color` | varchar | `#FEF0E3` | □ |
| `custom_css` | text | null | □ |
| `company_email` | varchar | null | □ |
| `abn` | varchar | null | □ |
| `timezone` | varchar | `Australia/Sydney` | □ |
| `default_currency` | varchar | `AUD` | □ |
| `default_language` | varchar | `en` | □ |
| `plan_type` | varchar | `starter` | □ |
| `plan_status` | varchar | `trial` | □ |
| `trial_ends_at` | timestamp | null | □ |
| `subscription_id` | varchar | null | □ |
| `max_users` | integer | `5` | □ |
| `max_students` | integer | `100` | □ |
| `features` | jsonb | `{}` | □ |
| `onboarded_at` | timestamp | null | □ |
| `last_login_at` | timestamp | null | □ |
| `owner_email` | varchar | null | □ |
| `dns_verified` | boolean | `false` | □ |
| `ssl_status` | varchar | `pending` | □ |
| `domain_verified_at` | timestamp | null | □ |
| `dns_txt_token` | varchar | null | □ |

> ✅ PASS 조건: 26개 컬럼 모두 존재
> ❌ FAIL 조건: 1개라도 누락

---

### A-2. 신규 테이블 4개 존재 여부

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tenant_invitations',
    'tenant_audit_logs',
    'platform_plans',
    'domain_configs'
  );
```

| 테이블명 | 존재 여부 | 체크 |
|----------|-----------|------|
| `tenant_invitations` | □ | □ |
| `tenant_audit_logs` | □ | □ |
| `platform_plans` | □ | □ |
| `domain_configs` | □ | □ |

---

### A-2-1. domain_configs 테이블 컬럼 구조

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'domain_configs'
ORDER BY ordinal_position;
```

| 컬럼명 | 타입 | 설명 | 체크 |
|--------|------|------|------|
| `id` | uuid | PK | □ |
| `organisation_id` | uuid | FK → organisations | □ |
| `domain_type` | varchar | `subdomain` \| `custom` | □ |
| `domain_value` | varchar | 실제 도메인값 (예: `abc` 또는 `crm.agency.com`) | □ |
| `full_domain` | varchar | 전체 URL (예: `abc.edubee.com`) | □ |
| `dns_record_type` | varchar | `CNAME` \| `A` \| `TXT` | □ |
| `dns_target` | varchar | 가리켜야 할 대상값 | □ |
| `txt_verification_token` | varchar | TXT 레코드 인증 토큰 (랜덤 생성) | □ |
| `verification_status` | varchar | `pending` \| `verified` \| `failed` | □ |
| `verified_at` | timestamp | 인증 완료 시각 | □ |
| `ssl_status` | varchar | `pending` \| `issuing` \| `active` \| `failed` | □ |
| `ssl_issued_at` | timestamp | SSL 인증서 발급 시각 | □ |
| `ssl_expires_at` | timestamp | SSL 만료 시각 | □ |
| `last_checked_at` | timestamp | 마지막 DNS 확인 시각 | □ |
| `check_attempts` | integer | DNS 확인 시도 횟수 | □ |
| `error_message` | text | 실패 시 오류 내용 | □ |
| `status` | varchar | `Active` \| `Inactive` | □ |
| `created_on` | timestamp | 생성일 | □ |
| `modified_on` | timestamp | 수정일 | □ |

> ✅ PASS 조건: 19개 컬럼 모두 존재

---

### A-3. platform_plans 기본 데이터 확인

```sql
SELECT code, name, price_monthly, max_users, max_students, is_popular, status
FROM platform_plans
ORDER BY price_monthly;
```

| code | name | price_monthly | max_users | is_popular | 체크 |
|------|------|--------------|-----------|------------|------|
| `starter` | Starter | 49.00 | 5 | false | □ |
| `professional` | Professional | 99.00 | 20 | true | □ |
| `enterprise` | Enterprise | 199.00 | 999 | false | □ |

---

### A-4. tenant_invitations 테이블 컬럼 구조

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_invitations'
ORDER BY ordinal_position;
```

필수 컬럼: `id`, `organisation_id`, `email`, `role`, `token`, `invited_by`, `accepted_at`, `expires_at`, `status`, `created_on`, `modified_on`

> ✅ PASS 조건: 11개 컬럼 모두 존재

---

### A-5. tenant_audit_logs 테이블 컬럼 구조

필수 컬럼: `id`, `organisation_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `created_on`

> ✅ PASS 조건: 10개 컬럼 모두 존재

---

## 🖥️ SECTION B: 백엔드 API 검증

> `/server/src/` 하위 파일들을 읽고 구현 여부를 확인한다.

### B-1. 미들웨어 파일 존재 여부

| 파일 경로 | 존재 여부 | 체크 |
|-----------|-----------|------|
| `/server/src/middleware/tenantResolver.ts` | □ | □ |
| `/server/src/middleware/superAdminOnly.ts` | □ | □ |

---

### B-2. tenantResolver 미들웨어 구현 확인

`/server/src/middleware/tenantResolver.ts` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| `X-Organisation-Id` 헤더에서 orgId 추출 | □ |
| orgId 없을 때 `next()` 호출 (공개 라우트 통과) | □ |
| DB에서 organisation Active 상태 확인 | □ |
| 유효하지 않은 orgId → 401 반환 | □ |
| `req.tenantId` 에 organisation_id 주입 | □ |
| `req.tenant` 에 organisation 객체 주입 | □ |

---

### B-3. superAdminOnly 미들웨어 구현 확인

`/server/src/middleware/superAdminOnly.ts` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| `req.user.role !== 'superadmin'` 조건 검사 | □ |
| 비인가 접근 시 **404** 반환 (403이 아닌 404 — 존재 숨김) | □ |
| superadmin일 때 `next()` 호출 | □ |

---

### B-4. Settings API 라우트 구현 확인

`/server/src/routes/settings.ts` 파일을 읽고 아래 엔드포인트 구현 여부 확인:

**Company Profile**
| 엔드포인트 | 구현 | 인증 체크 | tenantId 필터 | 체크 |
|------------|------|-----------|--------------|------|
| `GET /api/settings/company` | □ | □ | □ | □ |
| `PUT /api/settings/company` | □ | □ | □ | □ |

**Branding**
| 엔드포인트 | 구현 | 인증 체크 | tenantId 필터 | 체크 |
|------------|------|-----------|--------------|------|
| `GET /api/settings/branding` | □ | □ | □ | □ |
| `PUT /api/settings/branding` | □ | □ | □ | □ |
| `POST /api/settings/branding/logo` | □ | □ | □ | □ |
| `POST /api/settings/branding/favicon` | □ | □ | □ | □ |

**Domain & Access**
| 엔드포인트 | 구현 | 인증 체크 | tenantId 필터 | 체크 |
|------------|------|-----------|--------------|------|
| `GET /api/settings/domain` | □ | □ | □ | □ |
| `PUT /api/settings/domain/subdomain` | □ | □ | □ | □ |
| `POST /api/settings/domain/subdomain/check` | □ | □ | □ | □ |
| `PUT /api/settings/domain/custom` | □ | □ | □ | □ |
| `POST /api/settings/domain/custom/verify` | □ | □ | □ | □ |
| `GET /api/settings/domain/custom/status` | □ | □ | □ | □ |
| `DELETE /api/settings/domain/custom` | □ | □ | □ | □ |
| `GET /api/settings/domain/dns-instructions` | □ | □ | □ | □ |

**Plan & Billing**
| 엔드포인트 | 구현 | 인증 체크 | tenantId 필터 | 체크 |
|------------|------|-----------|--------------|------|
| `GET /api/settings/plan` | □ | □ | □ | □ |
| `GET /api/settings/plans/available` | □ | □ | n/a | □ |

**Users & Invitations**
| 엔드포인트 | 구현 | 인증 체크 | tenantId 필터 | 체크 |
|------------|------|-----------|--------------|------|
| `GET /api/settings/users` | □ | □ | □ | □ |
| `POST /api/settings/invitations` | □ | □ | □ | □ |
| `GET /api/settings/invitations` | □ | □ | □ | □ |
| `DELETE /api/settings/invitations/:id` | □ | □ | □ | □ |

---

### B-5. Super Admin API 라우트 구현 확인

`/server/src/routes/superadmin.ts` 파일을 읽고 확인:

| 엔드포인트 | 구현 | superAdminOnly 미들웨어 적용 | 체크 |
|------------|------|------------------------------|------|
| `GET /api/superadmin/tenants` | □ | □ | □ |
| `GET /api/superadmin/tenants/:id` | □ | □ | □ |
| `PUT /api/superadmin/tenants/:id` | □ | □ | □ |
| `POST /api/superadmin/tenants` | □ | □ | □ |
| `GET /api/superadmin/plans` | □ | □ | □ |
| `POST /api/superadmin/plans` | □ | □ | □ |
| `PUT /api/superadmin/plans/:id` | □ | □ | □ |
| `GET /api/superadmin/stats` | □ | □ | □ |
| `GET /api/superadmin/tenants/:id/seed-status` | □ | □ | □ |

---

### B-6. 라우트 등록 확인

`/server/src/index.ts` (또는 메인 서버 파일)를 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| `tenantResolver` 미들웨어 전역 등록됨 | □ |
| `tenantResolver`가 인증 미들웨어 **다음**에 등록됨 | □ |
| `/api/settings` 라우트 등록됨 | □ |
| `/api/superadmin` 라우트 등록됨 | □ |

---

### B-7. 데이터 격리 보안 검증 (핵심)

Settings 라우트의 각 쿼리를 읽고, **모든 DB 쿼리에 `organisation_id` 필터**가 적용됐는지 확인:

```typescript
// ✅ 올바른 패턴 (반드시 이래야 함)
WHERE organisation_id = req.tenantId

// ❌ 위험한 패턴 (절대 안 됨 — 전체 테넌트 데이터 노출)
SELECT * FROM organisations  // organisation_id 필터 없음
```

| 확인 항목 | 체크 |
|-----------|------|
| `GET /api/settings/company` — tenantId WHERE 조건 있음 | □ |
| `PUT /api/settings/company` — tenantId WHERE 조건 있음 | □ |
| `GET /api/settings/branding` — tenantId WHERE 조건 있음 | □ |
| `GET /api/settings/users` — tenantId WHERE 조건 있음 | □ |
| `GET /api/settings/invitations` — tenantId WHERE 조건 있음 | □ |
| `GET /api/settings/domain` — tenantId WHERE 조건 있음 | □ |

> ❌ FAIL 조건: 단 하나라도 organisation_id 필터 누락 → 즉시 수정 필요 (보안 취약점)

---

## 🎨 SECTION C: 프론트엔드 Settings UI 검증

> `/client/src/` 하위 파일들을 읽고 확인한다.

### C-1. Settings 페이지 파일 존재 여부

| 파일 경로 | 존재 여부 | 체크 |
|-----------|-----------|------|
| `/client/src/pages/settings/SettingsLayout.tsx` | □ | □ |
| `/client/src/pages/settings/CompanyProfile.tsx` | □ | □ |
| `/client/src/pages/settings/Branding.tsx` | □ | □ |
| `/client/src/pages/settings/DomainAccess.tsx` | □ | □ |
| `/client/src/pages/settings/UsersTeams.tsx` | □ | □ |
| `/client/src/pages/settings/PlanBilling.tsx` | □ | □ |

---

### C-2. 라우팅 등록 확인

`/client/src/App.tsx` (또는 라우팅 파일)를 읽고 확인:

| 라우트 | 등록 여부 | 체크 |
|--------|-----------|------|
| `/settings` → SettingsLayout | □ | □ |
| `/settings/company` → CompanyProfile | □ | □ |
| `/settings/branding` → Branding | □ | □ |
| `/settings/domain` → DomainAccess | □ | □ |
| `/settings/users` → UsersTeams | □ | □ |
| `/settings/plan` → PlanBilling | □ | □ |
| `/settings` → redirect to `/settings/company` | □ | □ |

---

### C-3. 사이드바 Settings 메뉴 확인

사이드바 컴포넌트를 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| "SETTINGS" 섹션 레이블 추가됨 | □ |
| 🏢 Company Profile 메뉴 항목 있음 | □ |
| 🎨 Branding 메뉴 항목 있음 | □ |
| 🌐 Domain & Access 메뉴 항목 있음 | □ |
| 👤 Users & Teams 메뉴 항목 있음 | □ |
| 📦 Plan & Billing 메뉴 항목 있음 | □ |
| 기존 메뉴 항목 변경 없음 (추가만 됨) | □ |

---

### C-4. CompanyProfile.tsx 구현 확인

`CompanyProfile.tsx` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| **기본 정보 카드**: Company Name, Trading Name, ABN, Phone, Email, Website, Description | □ |
| **주소 카드**: Address Line 1/2, City, State, Postcode, Country | □ |
| **지역화 카드**: Timezone, Currency, Language select 드롭다운 | □ |
| **은행 정보 카드**: Bank Name, Account Name, BSB, Account Number, SWIFT | □ |
| `GET /api/settings/company` 마운트 시 데이터 로드 | □ |
| `PUT /api/settings/company` 저장 버튼 클릭 시 호출 | □ |
| 저장 성공/실패 토스트 또는 알림 표시 | □ |
| Edubee 디자인 시스템 색상 준수 (`#F5821F` Primary) | □ |

---

### C-5. Branding.tsx 구현 확인

`Branding.tsx` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| **로고 카드**: 현재 로고 미리보기 영역 있음 | □ |
| 로고 업로드 버튼 (PNG, JPG, SVG 허용) | □ |
| 파비콘 업로드 버튼 (ICO, PNG 허용) | □ |
| 업로드 후 미리보기 즉시 반영 | □ |
| **색상 카드**: Primary / Secondary / Accent 색상 피커 | □ |
| HEX 값 직접 입력 가능 | □ |
| 색상 변경 시 미리보기 실시간 반영 | □ |
| **고급 설정**: Custom CSS 입력 영역 (Collapsible) | □ |
| CSS 경고 문구 표시됨 | □ |
| `GET /api/settings/branding` 마운트 시 로드 | □ |
| `PUT /api/settings/branding` 저장 호출 | □ |
| `POST /api/settings/branding/logo` 로고 업로드 호출 | □ |

---

### C-6. DomainAccess.tsx 구현 확인

`DomainAccess.tsx` 파일을 읽고 확인:

#### 서브도메인 설정 카드
| 확인 항목 | 체크 |
|-----------|------|
| 현재 서브도메인 표시 (`[subdomain].edubee.com` 형식) | □ |
| 서브도메인 변경 입력 필드 있음 | □ |
| `.edubee.com` suffix 고정 표시됨 | □ |
| 소문자·숫자·하이픈만 허용 (입력 유효성 검사) | □ |
| [Check Availability] 버튼 → 중복 확인 API 호출 | □ |
| Available ✅ / Already taken ❌ 상태 표시 | □ |
| [Save Subdomain] 버튼 → Available 확인 후에만 활성화 | □ |
| 서브도메인 변경 경고 문구 표시 ("기존 URL로 접속 불가") | □ |

#### 서브도메인 DNS 안내 카드
| 확인 항목 | 체크 |
|-----------|------|
| 서브도메인은 Edubee가 자동 관리함을 안내하는 문구 있음 | □ |
| Wildcard DNS (`*.edubee.com`) 자동 적용 설명 있음 | □ |
| 서브도메인 저장 즉시 접속 가능함을 안내 | □ |
| 현재 서브도메인 URL 복사 버튼 있음 | □ |

#### 커스텀 도메인 설정 카드 (Professional 이상)
| 확인 항목 | 체크 |
|-----------|------|
| 커스텀 도메인 입력 필드 있음 (예: `crm.myagency.com.au`) | □ |
| Starter 플랜 → 🔒 잠금 + 업그레이드 안내 표시 | □ |
| [Add Custom Domain] 버튼 있음 | □ |
| 도메인 추가 시 `domain_configs` 레코드 생성 API 호출 | □ |
| 현재 인증 상태 배지 표시 (Pending / Verified / Failed) | □ |
| [Remove Custom Domain] 버튼 있음 (인증 완료 후에도 제거 가능) | □ |

#### DNS 설정 안내 카드 (커스텀 도메인 추가 후 표시)
| 확인 항목 | 체크 |
|-----------|------|
| **CNAME 설정 안내** 박스 표시됨 | □ |
| Type: `CNAME` 표시 + 복사 버튼 | □ |
| Name/Host: `crm` (또는 `@`) 표시 + 복사 버튼 | □ |
| Value/Target: `[subdomain].edubee.com` 표시 + 복사 버튼 | □ |
| TTL: `3600` 또는 `Auto` 권장값 표시 | □ |
| **TXT 인증 레코드 안내** 박스 표시됨 | □ |
| Type: `TXT` 표시 + 복사 버튼 | □ |
| Name/Host: `_edubee-verify.[도메인]` 표시 + 복사 버튼 | □ |
| Value: 랜덤 생성된 인증 토큰 (`edubee-verify=xxxxxxxx`) 표시 + 복사 버튼 | □ |
| 주요 DNS 제공업체별 설정 링크 안내 (Cloudflare / GoDaddy / Namecheap / Route53 / Crazy Domains) | □ |
| DNS 전파 소요 시간 안내 문구 ("최대 48시간 소요될 수 있음") | □ |

#### DNS 인증 확인 카드
| 확인 항목 | 체크 |
|-----------|------|
| [Verify DNS] 버튼 있음 → `POST /api/settings/domain/custom/verify` 호출 | □ |
| 인증 중 로딩 스피너 표시 | □ |
| **인증 성공 시**: ✅ "도메인 인증 완료" + 인증 일시 표시 | □ |
| **인증 실패 시**: ❌ 실패 원인 메시지 표시 | □ |
| 실패 시 해결 가이드 링크 또는 accordion 안내 표시 | □ |
| 마지막 확인 시각 표시 (`last_checked_at`) | □ |
| DNS 확인 시도 횟수 표시 (`check_attempts`) | □ |

#### SSL 인증서 상태 카드
| 확인 항목 | 체크 |
|-----------|------|
| SSL 상태 배지 표시 (Pending / Issuing / Active / Failed) | □ |
| **Active 시**: ✅ 인증서 발급일 + 만료일 표시 | □ |
| **만료 30일 전**: ⚠️ 갱신 예정 안내 표시 | □ |
| SSL은 DNS 인증 완료 후 자동 발급됨 안내 문구 | □ |
| Let's Encrypt 또는 사용 중인 인증 기관 명시 | □ |

---

### C-7. UsersTeams.tsx 구현 확인

`UsersTeams.tsx` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| 현재 유저 수 / 최대 유저 수 표시 (플랜 한도) | □ |
| **초대 카드**: Email + Role(select) + Send Invitation 버튼 | □ |
| Role 선택 옵션: Admin / Manager / Staff | □ |
| `POST /api/settings/invitations` 초대 발송 호출 | □ |
| **현재 유저 테이블**: 이름/이메일/역할/상태/마지막 로그인/액션 | □ |
| **대기 중 초대 테이블**: 이메일/역할/초대일/만료일/상태/취소 | □ |
| `DELETE /api/settings/invitations/:id` 취소 호출 | □ |
| 역할별 권한 설명 표시 (툴팁 또는 별도 영역) | □ |

---

### C-8. PlanBilling.tsx 구현 확인

`PlanBilling.tsx` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| **현재 플랜 카드**: 플랜 이름 + 상태 배지 표시 | □ |
| Trial 상태 시 "D-N일 남음" 표시 | □ |
| 유저 사용량 표시 (N/N명) | □ |
| 학생 사용량 표시 (N/N명) | □ |
| **플랜 비교 카드 3종**: Starter / Professional / Enterprise | □ |
| Professional 카드 "Most Popular" 배지 표시 | □ |
| 현재 플랜 강조 표시 | □ |
| `GET /api/settings/plans/available` 플랜 목록 로드 | □ |
| 결제 준비 중 안내 문구 표시 | □ |

---

## 🔐 SECTION D: Super Admin 검증

> `/client/src/pages/superadmin/` 하위 파일들을 읽고 확인한다.

### D-1. Super Admin 파일 존재 여부

| 파일 경로 | 존재 여부 | 체크 |
|-----------|-----------|------|
| `/client/src/pages/superadmin/SuperAdminLayout.tsx` | □ | □ |
| `/client/src/pages/superadmin/SuperAdminDashboard.tsx` | □ | □ |
| `/client/src/pages/superadmin/TenantList.tsx` | □ | □ |

---

### D-2. SuperAdminGuard 구현 확인

SuperAdminGuard 컴포넌트를 찾아 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| SuperAdminGuard 컴포넌트 존재함 | □ |
| `role !== 'superadmin'` 조건 검사 | □ |
| 비인가 시 404 페이지로 리다이렉트 (403 또는 CRM 메인 아님) | □ |
| `/superadmin/*` 라우트에 적용됨 | □ |

---

### D-3. SuperAdminLayout 구현 확인

`SuperAdminLayout.tsx` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| 일반 CRM 레이아웃과 **완전히 분리**된 별도 레이아웃 | □ |
| 사이드바: Dashboard / Tenants / Plans 메뉴 있음 | □ |
| 헤더에 "SUPER ADMIN" 배지 표시 | □ |
| Edubee 브랜드 로고 또는 "🐝 Edubee Admin" 표시 | □ |

---

### D-4. TenantList 구현 확인

`TenantList.tsx` 파일을 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| 테넌트 목록 테이블 있음 | □ |
| 테이블 컬럼: 회사명 / 서브도메인 / 플랜 / 상태 / 유저 수 / 학생 수 / 가입일 / 액션 | □ |
| [View] 액션 버튼 있음 | □ |
| [Plan 변경] 액션 있음 | □ |
| [Suspend / Activate] 토글 있음 | □ |
| **"+ New Tenant" 버튼** 있음 | □ |
| 테넌트 생성 모달 있음 | □ |
| 모달 필드: Company Name / Subdomain / Owner Email / Plan / Trial Period | □ |
| 서브도메인 실시간 중복 확인 기능 있음 | □ |
| 생성 중 단계별 로딩 상태 표시 (3단계) | □ |

---

## 🌱 SECTION E: 온보딩 시드 로직 검증

> `/server/src/services/onboardingService.ts` 파일을 읽고 확인한다.

### E-1. 파일 존재 및 함수 구조

| 확인 항목 | 체크 |
|-----------|------|
| `/server/src/services/onboardingService.ts` 파일 존재 | □ |
| `onboardTenant(organisationId)` 함수 export 됨 | □ |
| **트랜잭션 1개로 전체 묶음** (원자성 보장) | □ |
| 실패 시 전체 롤백되는 구조 | □ |
| 완료 후 `organisations.onboarded_at` 업데이트 | □ |

---

### E-2. 각 시드 함수 구현 확인

| 시드 함수 | 구현 | ON CONFLICT DO NOTHING | organisation_id 포함 | 체크 |
|-----------|------|------------------------|----------------------|------|
| `seedTaxRates` | □ | □ | □ | □ |
| `seedProductGroups` | □ | □ | □ | □ |
| `seedProductTypes` | □ | □ | □ | □ |
| `seedCostCenters` | □ | □ | □ | □ |
| `seedChartOfAccounts` | □ | □ | □/n.a. | □ |
| `seedPaymentInfo` | □ | □ | □ | □ |
| `seedDefaultTeam` | □ | □ | □ | □ |

---

### E-3. 시드 데이터 수량 확인

실제로 테스트 테넌트가 존재한다면 아래 SQL로 수량 확인:

```sql
-- 아래 쿼리에서 :org_id 를 실제 테넌트 UUID로 교체
SELECT
  (SELECT COUNT(*) FROM tax_rates        WHERE organisation_id = :org_id) AS tax_rates,
  (SELECT COUNT(*) FROM product_groups   WHERE organisation_id = :org_id) AS product_groups,
  (SELECT COUNT(*) FROM product_types    WHERE organisation_id = :org_id) AS product_types,
  (SELECT COUNT(*) FROM cost_centers     WHERE organisation_id = :org_id) AS cost_centers,
  (SELECT COUNT(*) FROM payment_infos    WHERE organisation_id = :org_id) AS payment_infos,
  (SELECT COUNT(*) FROM teams            WHERE organisation_id = :org_id) AS teams;
```

| 항목 | 기대값 | 실제값 | 체크 |
|------|--------|--------|------|
| tax_rates | 3 | □ | □ |
| product_groups | 7 | □ | □ |
| product_types | 14 | □ | □ |
| cost_centers | 5 | □ | □ |
| payment_infos | 1 | □ | □ |
| teams | 1 | □ | □ |

> 테스트 테넌트가 없는 경우 → `POST /api/superadmin/tenants` 로 테스트 테넌트 생성 후 확인

---

### E-4. seedProductTypes service_module_type 매핑 확인

```sql
SELECT name, service_module_type
FROM product_types
WHERE organisation_id = :org_id
ORDER BY service_module_type;
```

| service_module_type | 기대 항목 수 | 체크 |
|--------------------|-------------|------|
| `study_abroad` | 8개 | □ |
| `pickup` | 1개 | □ |
| `accommodation` | 1개 | □ |
| `internship` | 1개 | □ |
| `settlement` | 1개 | □ |
| `guardian` | 1개 | □ |
| `camp` | 1개 | □ |

---

### E-5. onboardTenant 호출 위치 확인

`/server/src/routes/superadmin.ts`를 읽고 확인:

| 확인 항목 | 체크 |
|-----------|------|
| `POST /api/superadmin/tenants` 에서 `onboardTenant()` 호출됨 | □ |
| organisations INSERT **완료 후** onboardTenant 호출 (순서 중요) | □ |
| onboardTenant 실패 시 오류 응답 반환 (부분 생성 방지) | □ |
| `GET /api/superadmin/tenants/:id/seed-status` API 구현됨 | □ |

---

## 🔒 SECTION F: 보안 & 격리 검증

### F-1. 테넌트 데이터 격리 핵심 체크

이것은 **가장 중요한 보안 검증**이다.
Settings 라우트와 일반 CRM 라우트 모두 확인한다.

```
아래 패턴이 단 하나라도 발견되면 즉시 FAIL 처리:

❌ SELECT * FROM contacts  (organisation_id 필터 없음)
❌ WHERE id = :id          (organisation_id 없이 ID만으로 조회)
❌ .findMany()             (organisation_id 없는 전체 조회)
```

| 확인 영역 | 안전 | 체크 |
|-----------|------|------|
| Settings API — 모든 SELECT에 organisation_id 필터 | □ | □ |
| Settings API — 모든 UPDATE에 organisation_id WHERE 조건 | □ | □ |
| 테넌트 A의 사용자가 테넌트 B 데이터에 접근 불가 | □ | □ |
| superadmin 라우트에 일반 유저 접근 불가 (404 반환) | □ | □ |

---

### F-2. subdomain UNIQUE 제약 확인

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'organisations'
  AND constraint_type = 'UNIQUE';
```

| 확인 항목 | 체크 |
|-----------|------|
| `subdomain` 컬럼에 UNIQUE 제약 존재 | □ |
| `tenant_invitations.token` 에 UNIQUE 제약 존재 | □ |

---

### F-3. TypeScript 타입 안전성 확인

```bash
npx tsc --noEmit
```

| 확인 항목 | 체크 |
|-----------|------|
| TypeScript 컴파일 오류 0개 | □ |

---

## 🧪 SECTION G: 런타임 동작 검증

> 실제 API를 호출하여 런타임 동작을 확인한다.

### G-1. 서버 기동 확인

| 확인 항목 | 체크 |
|-----------|------|
| 서버 정상 기동됨 (import 오류 없음) | □ |
| `/api/settings/*` 라우트 등록 로그 확인 | □ |
| `/api/superadmin/*` 라우트 등록 로그 확인 | □ |

---

### G-2. Settings API 응답 확인

유효한 테넌트 헤더로 아래 API를 호출한다:
```
Header: X-Organisation-Id: [유효한 organisation UUID]
```

| API 호출 | 기대 응답 | 체크 |
|----------|-----------|------|
| `GET /api/settings/company` | 200 + 회사 정보 JSON | □ |
| `GET /api/settings/branding` | 200 + 색상/로고 JSON | □ |
| `GET /api/settings/domain` | 200 + subdomain JSON | □ |
| `GET /api/settings/plan` | 200 + 플랜 정보 JSON | □ |
| `GET /api/settings/plans/available` | 200 + 3개 플랜 배열 | □ |
| `GET /api/settings/users` | 200 + 유저 배열 | □ |
| `GET /api/settings/invitations` | 200 + 초대 배열 | □ |
| `POST /api/settings/domain/check` | 200 + `{ available: true/false }` | □ |

---

### G-3. 인증 없는 요청 차단 확인

```
Header 없이 (또는 잘못된 organisation_id로) 요청:
```

| API 호출 | 기대 응답 | 체크 |
|----------|-----------|------|
| `GET /api/settings/company` (헤더 없음) | 401 또는 next() | □ |
| `GET /api/superadmin/tenants` (일반 유저) | 404 | □ |
| `GET /api/superadmin/tenants` (헤더 없음) | 404 | □ |

---

### G-4. 테넌트 생성 + 온보딩 E2E 확인

```bash
# 테스트 테넌트 생성 (superadmin 권한으로)
POST /api/superadmin/tenants
{
  "name": "Test Agency",
  "subdomain": "testagency",
  "ownerEmail": "test@testagency.com",
  "planType": "starter"
}
```

| 확인 항목 | 체크 |
|-----------|------|
| 201 응답 반환 | □ |
| 응답에 `tenant.id` 포함됨 | □ |
| DB에 organisations 레코드 생성됨 | □ |
| `onboarded_at` 타임스탬프 기록됨 | □ |
| seed-status API → `allComplete: true` | □ |
| tax_rates 3개 생성됨 | □ |
| product_groups 7개 생성됨 | □ |
| product_types 14개 생성됨 | □ |

---

## 🌐 SECTION H: DNS / 네임서버 설정 전체 검증

> 이 섹션은 도메인 연결의 전체 흐름이 올바르게 설계됐는지 확인한다.
> 코드 구조 확인 + 실제 동작 시뮬레이션을 모두 수행한다.

---

### H-1. 서브도메인 동작 구조 확인

서브도메인 방식은 **Edubee 인프라에서 직접 관리**하므로
테넌트가 별도 DNS 설정 없이 즉시 사용 가능해야 한다.

| 확인 항목 | 체크 |
|-----------|------|
| 서브도메인 저장 즉시 접속 가능한 구조 (별도 DNS 작업 불필요) | □ |
| 서브도메인 미들웨어가 `*.edubee.com` 패턴을 인식하는 구조 | □ |
| `subdomain` 컬럼 UNIQUE 제약으로 중복 방지 | □ |
| 서브도메인 변경 시 이전 URL 무효화 처리 로직 있음 | □ |
| 예약된 서브도메인 차단 목록 존재 여부 확인 | □ |

**예약어 차단 목록 확인** — 아래 단어들은 서브도메인으로 사용 불가해야 한다:
```
admin, superadmin, api, www, mail, ftp, support, billing,
app, static, cdn, dev, staging, test, demo, edubee
```

| 확인 항목 | 체크 |
|-----------|------|
| 예약어 차단 목록이 코드에 정의됨 | □ |
| `POST /api/settings/domain/subdomain/check` 에서 예약어 차단 | □ |
| 예약어 입력 시 "사용 불가" 메시지 반환 | □ |

---

### H-2. domain_configs 테이블 데이터 흐름 확인

커스텀 도메인 추가 → 인증 → SSL 발급의 전체 상태 전환이 설계됐는지 확인:

```
커스텀 도메인 입력
        │
        ▼
domain_configs INSERT
verification_status = 'pending'
ssl_status = 'pending'
txt_verification_token = 랜덤 생성 (예: edubee-verify-a1b2c3d4)
        │
        ▼
사용자가 DNS에 TXT + CNAME 레코드 설정
        │
        ▼
[Verify DNS] 버튼 클릭
→ POST /api/settings/domain/custom/verify
→ 실제 DNS 조회 (dns.resolve() 또는 dig)
        │
   ┌────┴────┐
   성공       실패
   │          │
   ▼          ▼
verification_status = 'verified'   verification_status = 'failed'
ssl_status = 'issuing'             error_message 기록
verified_at = NOW()                check_attempts + 1
        │
        ▼
SSL 인증서 자동 발급 (Let's Encrypt / Caddy)
ssl_status = 'active'
ssl_issued_at = NOW()
ssl_expires_at = NOW() + 90일
```

| 확인 항목 | 체크 |
|-----------|------|
| 위 상태 전환 흐름이 백엔드 코드에 반영됨 | □ |
| `txt_verification_token` 최초 생성 시 랜덤값 부여 | □ |
| DNS 조회 로직 구현됨 (`dns.resolve()` 또는 외부 API) | □ |
| 인증 성공 시 `verification_status = 'verified'` 업데이트 | □ |
| 인증 실패 시 `error_message` 기록 | □ |
| `check_attempts` 카운터 증가 로직 있음 | □ |
| `last_checked_at` 업데이트 로직 있음 | □ |

---

### H-3. DNS 인증 API 구현 상세 확인

`/server/src/routes/settings.ts` 에서 도메인 관련 API를 읽고 확인:

#### `POST /api/settings/domain/custom/verify` 구현
| 확인 항목 | 체크 |
|-----------|------|
| TXT 레코드 실제 DNS 조회 수행 | □ |
| 조회된 TXT값과 `txt_verification_token` 비교 | □ |
| CNAME 레코드 존재 여부도 함께 확인 | □ |
| 결과에 따라 `domain_configs` 상태 업데이트 | □ |
| 응답에 `status`, `checkedAt`, `errorMessage` 포함 | □ |

#### `GET /api/settings/domain/dns-instructions` 구현
| 확인 항목 | 체크 |
|-----------|------|
| CNAME 레코드 설정 정보 반환 (type, name, value) | □ |
| TXT 인증 레코드 설정 정보 반환 (type, name, value) | □ |
| 테넌트별 고유 `txt_verification_token` 포함 | □ |

#### `GET /api/settings/domain/custom/status` 구현
| 확인 항목 | 체크 |
|-----------|------|
| `verification_status` 반환 | □ |
| `ssl_status` 반환 | □ |
| `ssl_expires_at` 반환 (active 상태일 때) | □ |
| `last_checked_at` 반환 | □ |
| `check_attempts` 반환 | □ |

---

### H-4. DNS 설정 안내 정보 정확성 확인

UI에 표시되는 DNS 설정 안내값이 올바른지 확인:

#### 서브도메인용 (자동 관리 — 사용자 설정 불필요)
```
Edubee 인프라 DNS 설정 (내부 확인):
  *.edubee.com  →  CNAME 또는 A 레코드  →  Replit/서버 IP
```

| 확인 항목 | 체크 |
|-----------|------|
| 와일드카드 DNS 설정이 인프라 레벨에서 완료됨 안내 있음 | □ |
| 사용자에게 "별도 설정 불필요"임을 명확히 안내 | □ |

#### 커스텀 도메인용 (사용자가 직접 설정)

UI에 표시되는 값이 아래 형식인지 확인:

```
─── CNAME 레코드 ───────────────────────────────────
Type  : CNAME
Host  : crm  (또는 사용자가 원하는 서브도메인 부분)
Value : [subdomain].edubee.com
TTL   : 3600 (또는 Auto)

─── TXT 인증 레코드 ─────────────────────────────────
Type  : TXT
Host  : _edubee-verify
Value : edubee-verify=[랜덤토큰]
TTL   : 3600
```

| 확인 항목 | 체크 |
|-----------|------|
| CNAME Value가 테넌트의 실제 서브도메인을 가리킴 | □ |
| TXT Value의 토큰이 테넌트별 고유값 | □ |
| 각 필드 옆에 📋 복사 버튼 있음 | □ |
| 복사 버튼 클릭 시 클립보드에 복사됨 | □ |

#### DNS 제공업체별 설정 가이드 링크 확인
| 제공업체 | 안내 링크 또는 설명 | 체크 |
|----------|---------------------|------|
| Cloudflare | □ | □ |
| GoDaddy | □ | □ |
| Namecheap | □ | □ |
| AWS Route53 | □ | □ |
| Crazy Domains (호주) | □ | □ |
| Melbourne IT (호주) | □ | □ |

---

### H-5. SSL 인증서 처리 확인

| 확인 항목 | 체크 |
|-----------|------|
| SSL 발급 방식 코드에 명시됨 (Let's Encrypt / Caddy / Nginx / 외부 서비스) | □ |
| DNS 인증 완료 후 SSL 자동 발급 트리거 로직 있음 | □ |
| SSL 상태 `pending → issuing → active` 전환 로직 있음 | □ |
| SSL 만료 30일 전 갱신 예정 알림 로직 있음 (또는 TODO 주석) | □ |
| SSL 발급 실패 시 `ssl_status = 'failed'` + 오류 기록 | □ |

> ⚠️ MVP 단계에서 실제 SSL 자동 발급이 미구현인 경우:
> `ssl_status = 'pending'` 유지 + UI에 "준비 중" 안내로 처리 가능 (WARN 처리)

---

### H-6. 도메인 설정 런타임 E2E 시나리오 확인

아래 시나리오를 API 호출로 순서대로 확인한다:

**시나리오 1: 서브도메인 가용성 확인**
```bash
POST /api/settings/domain/subdomain/check
{ "subdomain": "testagency" }
# 기대: { "available": true }

POST /api/settings/domain/subdomain/check
{ "subdomain": "admin" }
# 기대: { "available": false, "reason": "reserved" }
```

| 확인 항목 | 체크 |
|-----------|------|
| 존재하지 않는 서브도메인 → `available: true` | □ |
| 이미 사용 중인 서브도메인 → `available: false` | □ |
| 예약어 서브도메인 → `available: false, reason: "reserved"` | □ |

**시나리오 2: 커스텀 도메인 DNS 안내 조회**
```bash
GET /api/settings/domain/dns-instructions
Header: X-Organisation-Id: [테넌트 UUID]
# 기대: CNAME + TXT 레코드 설정 정보 반환
```

| 확인 항목 | 체크 |
|-----------|------|
| CNAME 레코드 정보 반환됨 | □ |
| TXT 레코드 + 고유 토큰 반환됨 | □ |
| 응답이 테넌트별로 다름 (격리 확인) | □ |

**시나리오 3: DNS 인증 상태 조회**
```bash
GET /api/settings/domain/custom/status
Header: X-Organisation-Id: [테넌트 UUID]
# 기대: { verification_status, ssl_status, last_checked_at, check_attempts }
```

| 확인 항목 | 체크 |
요---|------|
| 응답에 `verification_status` 포함 | □ |
| 응답에 `ssl_status` 포함 | □ |
| 응답에 `last_checked_at` 포함 | □ |

---

## 📊 최종 보고서 출력 형식

모든 항목 확인 완료 후 반드시 아래 형식으로 보고한다:

```
╔══════════════════════════════════════════════════════╗
║   🐝 Edubee CRM Multi-Tenant 검증 결과 보고서         ║
║   검증일: YYYY-MM-DD                                  ║
╚══════════════════════════════════════════════════════╝

📊 섹션별 결과:
  A. DB 스키마          : PASS N개 / FAIL N개 / WARN N개
  B. 백엔드 API         : PASS N개 / FAIL N개 / WARN N개
  C. 프론트 Settings    : PASS N개 / FAIL N개 / WARN N개
  D. Super Admin        : PASS N개 / FAIL N개 / WARN N개
  E. 온보딩 시드         : PASS N개 / FAIL N개 / WARN N개
  F. 보안 & 격리         : PASS N개 / FAIL N개 / WARN N개
  G. 런타임 동작         : PASS N개 / FAIL N개 / WARN N개
  H. DNS / 네임서버      : PASS N개 / FAIL N개 / WARN N개

  ─────────────────────────────────────────
  전체 합계             : PASS N개 / FAIL N개 / WARN N개
  전체 완성도           : N% (PASS / 전체)

🚨 FAIL 항목 (즉시 수정 필요):
  1. [섹션-번호] [항목명]: [이유 및 수정 방향]
  2. ...

⚠️  WARN 항목 (개선 권장):
  1. [섹션-번호] [항목명]: [이유 및 개선 방향]
  2. ...

✅ 완전히 구현된 영역:
  - [섹션명]: 전체 PASS

🔧 권장 수정 순서 (우선순위 높은 순):
  1. 🔴 [보안 관련 FAIL 항목 최우선]
  2. 🔴 [DB 스키마 FAIL]
  3. 🔴 [DNS 인증 흐름 FAIL — 커스텀 도메인 핵심]
  4. 🟡 [API FAIL]
  5. 🟡 [프론트 FAIL]
  6. 🟢 [WARN 항목 — SSL 자동화 등]

📌 다음 단계 권장사항:
  - FAIL 0개 달성 후 Phase 2 진행 가능
  - Phase 2 내용: 서브도메인 자동 감지 미들웨어, CSS 변수 런타임 주입,
    핵심 CRM 테이블 organisation_id FK 추가, 이메일 발송, Stripe 연동,
    SSL 자동 발급 자동화 (Let's Encrypt / Caddy 연동)
```

---

*Edubee CRM — Multi-Tenant 검증 체크리스트 v1.1 (DNS/네임서버 설정 추가) | 2026-04-03*
