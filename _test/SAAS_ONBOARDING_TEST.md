# Edubee SaaS — 온보딩 전 과정 테스트 가이드라인

> 작성일: 2026-04-21
> 환경: https://api.edubee.co | https://app.edubee.co | https://portal.edubee.co
> 전제: admin@edubee.co / Admin123! (슈퍼어드민 계정)

---

## 테스트 전체 구조

```
T-01  이메일 중복 확인
T-02  회원가입 Step 1 — 기관 정보 검증
T-03  회원가입 Step 2 — 계정 유형 선택
T-04  회원가입 Step 3 — 플랜 선택 (LITE)
T-05  회원가입 Step 3 — 플랜 선택 (PLUS Beta)
T-06  회원가입 완료 — 테넌트 프로비저닝
T-07  환영 이메일 수신 확인
T-08  신규 테넌트 로그인
T-09  초기 마스터 데이터 시드 확인
T-10  테넌트 멀티테넌트 격리 확인
T-11  Stripe Checkout 세션 생성
T-12  Stripe Webhook — 결제 성공
T-13  Stripe Webhook — 결제 실패 (suspended)
T-14  Stripe 고객 포털 접근
T-15  포털 계정 생성 (에이전트)
T-16  포털 로그인 및 역할 라우팅
T-17  초기 데이터 설정 — 학교 등록
T-18  초기 데이터 설정 — 직원 초대
T-19  슈퍼어드민 테넌트 현황 확인
T-20  플랜 기능 제한 확인
```

---

## T-01 이메일 중복 확인

**목적:** 이미 존재하는 이메일로 가입 시도 시 차단

```bash
# 존재하는 이메일
curl "https://api.edubee.co/api/auth/check-email?email=admin@edubee.co"
```

**기대값:**
```json
{ "available": false, "message": "This email is already registered." }
```

```bash
# 존재하지 않는 이메일
curl "https://api.edubee.co/api/auth/check-email?email=newuser@test.com"
```

**기대값:**
```json
{ "available": true }
```

---

## T-02 회원가입 — 필수 필드 검증

**목적:** 필수 항목 누락 시 400 에러 반환

```bash
curl -X POST https://api.edubee.co/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organisation": { "name": "" },
    "user": { "email": "test@test.com", "password": "Test1234!" },
    "account": { "plan": "PLUS" }
  }'
```

**기대값:** `HTTP 400` — 필수 필드 오류

---

## T-03 회원가입 — 이메일 중복

**목적:** 기존 이메일로 가입 시 409 에러

```bash
curl -X POST https://api.edubee.co/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organisation": { "name": "Test Agency" },
    "user": {
      "first_name": "Test", "last_name": "User",
      "email": "admin@edubee.co",
      "password": "Test1234!"
    },
    "account": { "account_type": "Agent", "plan": "LITE" }
  }'
```

**기대값:** `HTTP 409` — `EMAIL_ALREADY_EXISTS`

---

## T-04 회원가입 완료 — LITE 플랜

**목적:** 신규 테넌트 생성 전체 흐름 확인

```bash
curl -X POST https://api.edubee.co/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organisation": {
      "name": "Test Agency AU",
      "phone_number": "+61 2 9999 8888",
      "organization_url": "https://testagency.com.au",
      "address_line_1": "Level 1, 100 Kent St, Sydney NSW 2000"
    },
    "user": {
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email": "sarah@testagency.com.au",
      "password": "TestPass123!"
    },
    "account": {
      "account_type": "Agent",
      "plan": "LITE"
    },
    "service_modules": ["study_abroad", "accommodation"]
  }'
```

**기대값:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "userType": "staff",
  "redirectTo": "/dashboard"
}
```

**체크 항목:**
- [ ] `accessToken` 포함
- [ ] `userType` = "staff"
- [ ] HTTP 200

---

## T-05 테넌트 프로비저닝 확인

**목적:** 가입 후 PostgreSQL Schema가 자동 생성됐는지 확인

```bash
# T-04에서 받은 토큰 사용
TOKEN="위에서 받은 accessToken"

# 대시보드 데이터 호출 (테넌트 스키마 쿼리 필요)
curl https://api.edubee.co/api/dashboard/v2/overview \
  -H "Authorization: Bearer $TOKEN"
```

**기대값:** `HTTP 200` — 대시보드 데이터 반환 (빈 데이터여도 200)

```bash
# 리드 목록 (빈 배열이어야 함 — 신규 테넌트)
curl https://api.edubee.co/api/leads \
  -H "Authorization: Bearer $TOKEN"
```

**기대값:**
```json
{ "data": [], "total": 0 }
```

---

## T-06 초기 마스터 데이터 시드 확인

**목적:** onboardTenant 실행 후 기본 마스터 데이터 존재 확인

```bash
TOKEN="신규 테넌트 accessToken"

# 세율 확인 (GST 10%, Exempt, Zero-rated)
curl https://api.edubee.co/api/tax-rates \
  -H "Authorization: Bearer $TOKEN"
```

**기대값:** 3개 세율 반환

```bash
# 계정과목 확인
curl https://api.edubee.co/api/accounting/coa \
  -H "Authorization: Bearer $TOKEN"
```

**기대값:** 계정과목 목록 반환

```bash
# 팀 확인
curl https://api.edubee.co/api/teams \
  -H "Authorization: Bearer $TOKEN"
```

**기대값:** Admin, Sales, Operations 팀 반환

---

## T-07 멀티테넌트 격리 확인

**목적:** 테넌트 A의 데이터가 테넌트 B에게 보이지 않아야 함

```bash
# 테넌트 A 토큰으로 테넌트 B 데이터 접근 시도
TOKEN_A="테넌트 A의 accessToken"
ORG_B_ID="테넌트 B의 organisationId"

curl https://api.edubee.co/api/leads \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Organisation-Id: $ORG_B_ID"
```

**기대값:** `HTTP 403` 또는 빈 데이터 (자신의 테넌트 데이터만 반환)

---

## T-08 신규 테넌트 로그인

**목적:** 가입한 계정으로 로그인 성공 확인

```bash
curl -X POST https://api.edubee.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah@testagency.com.au","password":"TestPass123!"}'
```

**기대값:**
```json
{
  "accessToken": "eyJ...",
  "userType": "staff",
  "redirectTo": "/dashboard",
  "user": {
    "role": "admin",
    "organisationId": "..."
  }
}
```

**체크 항목:**
- [ ] `role` = "admin"
- [ ] `organisationId` 포함
- [ ] `userType` = "staff"

---

## T-09 플랜 목록 조회 (공개 API)

**목적:** 인증 없이 플랜 목록 조회 가능

```bash
curl https://api.edubee.co/api/public/platform-plans
```

**기대값:** `HTTP 200` — 활성 플랜 목록 반환

---

## T-10 Stripe Checkout 세션 생성

**목적:** PLUS → BUSINESS 업그레이드 시 Checkout URL 생성

> ⚠️ STRIPE_SECRET_KEY 환경변수 설정 및 BUSINESS 플랜 Price ID 필요

```bash
TOKEN="관리자 accessToken"

curl -X POST https://api.edubee.co/api/settings/billing/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "business",
    "billingCycle": "monthly",
    "successUrl": "https://app.edubee.co/settings/billing?success=1",
    "cancelUrl": "https://app.edubee.co/settings/billing"
  }'
```

**기대값:**
```json
{ "url": "https://checkout.stripe.com/...", "sessionId": "cs_..." }
```

**기대값 (Price ID 미설정 시):**
```json
{ "error": "Stripe Price ID not configured..." }
```

---

## T-11 Stripe Webhook — 결제 성공

**목적:** checkout.session.completed 이벤트 → 플랜 활성화

```bash
# Stripe CLI로 테스트 이벤트 발송
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.organisationId="{orgId}" \
  --add checkout_session:metadata.planType="business"
```

**확인:**
```bash
TOKEN="슈퍼어드민 accessToken"
curl https://api.edubee.co/api/superadmin/stats \
  -H "Authorization: Bearer $TOKEN"
# organisations에서 해당 org의 planStatus = "active" 확인
```

---

## T-12 Stripe Webhook — 결제 실패

**목적:** invoice.payment_failed → planStatus = "suspended"

```bash
stripe trigger invoice.payment_failed
```

**확인:** 해당 org의 `planStatus` = "suspended"

---

## T-13 Stripe 고객 포털 접근

**목적:** 구독 관리 페이지 URL 생성

```bash
TOKEN="관리자 accessToken"

curl -X POST https://api.edubee.co/api/settings/billing/portal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"returnUrl": "https://app.edubee.co/settings/billing"}'
```

**기대값:**
- Stripe Customer ID 있는 경우: `{ "url": "https://billing.stripe.com/..." }`
- Stripe Customer ID 없는 경우: `HTTP 400`

---

## T-14 포털 계정 생성 (에이전트)

**목적:** Admin CRM에서 포털 사용자 생성 후 로그인 확인

### 14-1. Admin CRM에서 계정 생성

```
app.edubee.co → CRM → Accounts → 계정 선택 또는 신규 생성
→ Portal Access 탭
→ Portal Email: agent@partner.com
→ Portal Role: consultant
→ Portal Access: ON
→ Temp Password: Portal123!
→ Save
```

### 14-2. 포털 로그인 API 테스트

```bash
curl -X POST https://api.edubee.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@partner.com","password":"Portal123!"}'
```

**기대값:**
```json
{
  "accessToken": "eyJ...",
  "userType": "portal",
  "redirectTo": "/portal/dashboard",
  "account": {
    "portalRole": "consultant"
  }
}
```

---

## T-15 포털 역할별 접근 범위 확인

**목적:** 포털 사용자가 자신의 역할에 맞는 데이터만 조회

```bash
PORTAL_TOKEN="포털 accessToken"

# 포털 사용자 자신의 정보
curl https://api.edubee.co/api/portal/me \
  -H "Authorization: Bearer $PORTAL_TOKEN"
```

**기대값:**
```json
{
  "id": "...",
  "name": "...",
  "portalRole": "consultant",
  "organisationId": "..."
}
```

```bash
# 포털에서 스태프 전용 API 접근 시도 (차단 확인)
curl https://api.edubee.co/api/users \
  -H "Authorization: Bearer $PORTAL_TOKEN"
```

**기대값:** `HTTP 403` — 권한 없음

---

## T-16 초기 데이터 설정 — 학교 등록

**목적:** 신규 테넌트에서 학교 파트너 등록

```bash
TOKEN="관리자 accessToken"

curl -X POST https://api.edubee.co/api/schools \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sydney English College",
    "country": "Australia",
    "city": "Sydney",
    "email": "info@sec.edu.au",
    "commissionRate": "15"
  }'
```

**기대값:** `HTTP 201` — 생성된 학교 데이터 반환

---

## T-17 초기 데이터 설정 — 직원 초대

**목적:** 관리자가 직원을 초대하여 접근 권한 부여

```bash
TOKEN="관리자 accessToken"

curl -X POST https://api.edubee.co/api/auth/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@testagency.com.au",
    "firstName": "Mike",
    "lastName": "Lee",
    "role": "staff",
    "staffRole": "education_agent"
  }'
```

**기대값:** `HTTP 200` — 초대 이메일 발송 완료

---

## T-18 슈퍼어드민 플랫폼 현황 확인

**목적:** 전체 테넌트 수 및 플랜 현황 조회

```bash
SUPER_TOKEN=$(curl -s -X POST https://api.edubee.co/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edubee.co","password":"Admin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

curl https://api.edubee.co/api/superadmin/stats \
  -H "Authorization: Bearer $SUPER_TOKEN"
```

**기대값:** 전체 테넌트 수, 활성 구독 수, 플랜별 분포 등

---

## T-19 플랜 기능 제한 확인 (LITE)

**목적:** LITE 플랜에서 제한된 기능 접근 시 적절한 응답

```bash
TOKEN="LITE 플랜 테넌트 accessToken"

# School Database 접근 (LITE: 미포함)
curl https://api.edubee.co/api/schools/database \
  -H "Authorization: Bearer $TOKEN"
```

**기대값:** `HTTP 403` — 플랜 업그레이드 필요 메시지

> ⚠️ 현재 `checkPlanFeature()` 런타임 강제 미구현 (CURRENT_STATUS.md W-7 참조)
> 현재는 403 대신 데이터 반환될 수 있음 — 추후 구현 예정

---

## T-20 브라우저 E2E 체크리스트

```
□ https://app.edubee.co/admin/register 접속
□ Step 1: 기관명, 연락처, 관리자 정보 입력 → Next
□ Step 2: Education Agent 선택 → Next
□ Step 3: PLUS 플랜 선택, Study Abroad 모듈 체크 → Register
□ 성공 화면 표시 (환영 메시지)
□ 로그인 페이지 이동
□ 가입한 이메일/비밀번호로 로그인
□ 대시보드 정상 표시
□ Settings → Organisation → 프로필 수정
□ CRM → Accounts → 포털 계정 생성
□ https://portal.edubee.co 포털 로그인
□ 역할에 맞는 메뉴 표시 확인
```

---

## 테스트 환경 변수

```bash
# 테스트용 신규 계정 (매 실행마다 고유 이메일 사용)
TEST_EMAIL="test+$(date +%s)@testagency.com.au"
TEST_PASSWORD="TestPass123!"
TEST_ORG="Test Agency $(date +%s)"

# API Base
API="https://api.edubee.co"
```

---

## 결과 판정 기준

| 등급 | 기준 |
|------|------|
| ✅ PASS | 기대값과 완전히 일치 |
| ⚠️ WARN | 기능 동작하나 세부 응답 불일치 |
| ❌ FAIL | 기대값 불일치 또는 오류 발생 |
| ⏭ SKIP | 외부 의존성 미설정 (Stripe 등) |

---

*© Edubee.Co. 2026 — SaaS 온보딩 테스트 가이드라인 v1.0*
