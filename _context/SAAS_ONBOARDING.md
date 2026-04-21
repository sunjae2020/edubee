# Edubee SaaS — 멀티테넌트 온보딩 전체 기능 명세

> 작성일: 2026-04-21 | 코드 기준 자동 추출
> 대상: 신규 에이전시 가입 → 플랜 선택 → 결제 → 초기 데이터 세팅 전 과정

---

## 1. 전체 온보딩 흐름

```
[1] 회원가입 (3-Step)
     └─ Step 1: 기관 정보 입력
     └─ Step 2: 계정 유형 선택
     └─ Step 3: 플랜 + 서비스 모듈 선택
          ↓
[2] 백엔드 처리 (POST /api/auth/register)
     └─ 이메일 중복 확인
     └─ organisations 테이블에 신규 테넌트 생성
     └─ users 테이블에 admin 계정 생성
     └─ PostgreSQL Schema 자동 프로비저닝
     └─ 초기 마스터 데이터 시드 (onboardTenant)
     └─ 환영 이메일 발송 (Resend)
          ↓
[3] 로그인 → Admin CRM (app.edubee.co)
          ↓
[4] 플랜 업그레이드 (선택)
     └─ Stripe Checkout Session 생성
     └─ 카드 결제
     └─ Webhook → 플랜 활성화
          ↓
[5] 초기 데이터 설정
     └─ 테넌트 프로필 설정
     └─ 학교 파트너 등록
     └─ 서비스 모듈 활성화
     └─ 직원 초대
```

---

## 2. 회원가입 (3-Step Wizard)

### URL
```
https://app.edubee.co/admin/register
```

### Step 1 — 기관 정보

| 필드 | 필수 | 설명 |
|------|------|------|
| Organisation Name | ✅ | 에이전시명 (subdomain 자동 생성에 사용) |
| Phone Number | ✅ | 연락처 |
| Website URL | ❌ | 회사 웹사이트 |
| Address | ❌ | 주소 |
| First Name | ✅ | 관리자 이름 |
| Last Name | ✅ | 관리자 성 |
| Email | ✅ | 로그인 이메일 (중복 불가) |
| Password | ✅ | 최소 8자 |
| Confirm Password | ✅ | 비밀번호 확인 |

### Step 2 — 계정 유형

| 유형 | 설명 |
|------|------|
| **Education Agent** | 유학원 / 에이전시 (주요 대상) |
| **School / Institution** | 학교 및 교육기관 |
| **Student** | 개인 학생 계정 |
| **Provider / Partner** | 서비스 제공업체 / 파트너 |
| **Organisation** | 일반 법인 |

### Step 3 — 플랜 & 서비스 모듈

**플랜 선택:**

| 플랜 | 가격 (AUD + GST) | 학생 수 | 스토리지 | School DB | 원격지원 | 상태 |
|------|----------------|---------|---------|-----------|---------|------|
| **LITE** | $0 / 월 | 50명/월 | 10 MB | ❌ | ❌ | 이용 가능 |
| **PLUS** | $9.90 → **$0 (Beta)** | 무제한 | 100 MB | ❌ | ❌ | 이용 가능 |
| **BUSINESS** | $19.90 / 월 | 무제한 | 500 MB | ✅ | ❌ | 준비 중 |
| **ENTERPRISE** | $39.90 / 월 | 무제한 | 1 GB | ✅ | ✅ | 준비 중 |

> 기본 선택: **PLUS** (Beta 무료)

**서비스 모듈 선택 (복수 선택):**

| 모듈 | 설명 |
|------|------|
| Study Abroad Management | 학교 지원 & 비자 추적 (기본) |
| Airport Pickup | 도착 픽업 조율 |
| Accommodation | 홈스테이 & 렌탈 배치 |
| Internship & Employment | 취업 / 인턴십 배치 |
| Settlement Service | 정착 오리엔테이션 |
| Guardian Service | 학생 보호자 관리 |

---

## 3. 백엔드 등록 처리 (`POST /api/auth/register`)

### 요청 구조
```json
{
  "organisation": {
    "name": "My Agency",
    "phone_number": "+61 2 1234 5678",
    "organization_url": "https://myagency.com.au",
    "address_line_1": "Sydney NSW 2000"
  },
  "user": {
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@myagency.com.au",
    "password": "SecurePass123!"
  },
  "account": {
    "account_type": "Agent",
    "plan": "PLUS"
  },
  "service_modules": ["study_abroad", "accommodation"]
}
```

### 처리 순서 (트랜잭션)

```
1. 이메일 중복 확인 (public.users)
2. organisations 테이블 INSERT
   - subdomain 자동 생성: "myagency-a3f2" (이름 + 4자리 랜덤)
   - planType: "plus", planStatus: "trial"
3. users 테이블 INSERT
   - role: "admin", staffRole: "education_agent"
   - bcrypt 비밀번호 해시
4. provisionTenantSchema(subdomain)
   - CREATE SCHEMA IF NOT EXISTS "myagency-a3f2"
   - 84개 테넌트 테이블 자동 생성
5. onboardTenant(orgId) — 마스터 데이터 시드
6. 환영 이메일 발송 (Resend)
7. JWT accessToken + refreshToken 반환
```

### 응답
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "userType": "staff",
  "redirectTo": "/dashboard",
  "user": { "id": "...", "email": "...", "role": "admin" }
}
```

---

## 4. 멀티테넌트 격리 구조

### PostgreSQL Schema per Tenant

```
public schema (플랫폼 공유)
├── organisations      ← 테넌트 목록
├── users              ← 스태프 계정
├── accounts           ← 포털 사용자 (에이전트/파트너/학생)
├── platform_plans     ← 구독 플랜 정의
└── auth_logs          ← 인증 로그

myagency-a3f2 schema (테넌트 전용)
├── contacts           ← 학생 / CRM 연락처
├── leads              ← 잠재 고객
├── quotes             ← 견적서
├── contracts          ← 계약서
├── invoices           ← 인보이스
├── transactions       ← 결제 내역
├── schools            ← 학교 파트너
├── journal_entries    ← 분개 (이중 분개)
└── ... (총 84개 테이블)
```

### 테넌트 식별
- HTTP 헤더: `X-Organisation-Id: {uuid}`
- 서브도메인: `myagency.edubee.co` → 자동 추출
- JWT payload: `organisationId` 포함

---

## 5. 초기 마스터 데이터 시드 (onboardTenant)

가입 즉시 자동으로 생성되는 데이터:

### 세율 (Tax Rates)
| 항목 | 비율 |
|------|------|
| GST 10% | 10% |
| GST Exempt | 0% |
| GST Zero-rated | 0% |

### 상품 그룹 (Product Groups, 7종)
- Language Course, Academic Program, Vocational (VET)
- Short Course, Camp Program, Placement Service, Support Service

### 계정과목 (Chart of Accounts)
- 수익 계정: Service Revenue, Commission Income 등
- 비용 계정: Operating Expenses 등
- 자산/부채 계정: AR, AP 등

### 기본 팀 (Teams)
- Admin, Sales, Operations 팀 기본 생성

### 비용 센터 (Cost Centers)
- Head Office, Branch 기본 생성

### 결제 방법 (Payment Infos)
- Bank Transfer, Credit Card 기본 생성

---

## 6. 구독 플랜 & 결제 (Stripe)

### 플랜 업그레이드 흐름

```
Admin CRM → Settings → Billing
→ 플랜 선택 + 결제 주기 (Monthly / Annually)
→ POST /api/settings/billing/checkout
→ Stripe Checkout Session 생성
→ Stripe 결제 페이지 (카드 입력)
→ Webhook: checkout.session.completed
→ organisations.planType 업데이트
→ organisations.planStatus = "active"
```

### Stripe Webhook 이벤트 처리 (`POST /api/webhook/stripe`)

| 이벤트 | 처리 |
|--------|------|
| `checkout.session.completed` | planStatus → `active`, 기능 활성화 |
| `invoice.payment_succeeded` | planStatus → `active` (갱신 성공) |
| `invoice.payment_failed` | planStatus → `suspended` (결제 실패) |
| `customer.subscription.deleted` | planStatus → `cancelled` (구독 취소) |

### 플랜 상태 (planStatus)

| 상태 | 설명 |
|------|------|
| `trial` | 가입 직후 기본값 |
| `active` | 결제 완료 / 무료 플랜 활성 |
| `suspended` | 결제 실패 |
| `cancelled` | 구독 해지 |

### 고객 포털 (Stripe Billing Portal)
```
POST /api/settings/billing/portal
→ Stripe Customer Portal URL 생성
→ 구독 관리 / 카드 변경 / 취소 가능
```

---

## 7. 포털 계정 생성 (에이전트 / 파트너 / 학생)

Admin CRM에서 외부 포털 사용자를 별도 생성합니다.

### 생성 경로
```
Admin CRM → CRM → Accounts → 계정 선택 → Portal Access 탭
→ Portal Email 입력
→ Portal Role 설정 (consultant / hotel / institute / student 등)
→ Portal Access: ON
→ 임시 비밀번호 설정 → 초대 이메일 발송
```

### 포털 로그인
```
https://portal.edubee.co
→ Email + Password 입력
→ 역할별 대시보드 자동 라우팅
```

### 포털 역할별 접근 범위

| 역할 | 접근 범위 |
|------|----------|
| `consultant` (에이전트) | 대시보드, 상담, 학생, 견적, 계약, 서비스, 재무, 문서 |
| `hotel` / `institute` (파트너) | 대시보드, 상담, 예약, 계약, 서비스, 재무, 문서 |
| `student` (학생) | 대시보드, 상담, 견적, 계약, 서비스, 재무, 문서 |

---

## 8. 초기 데이터 설정 가이드

가입 후 운영 시작 전 설정해야 할 항목:

### 필수 설정

| 순서 | 항목 | 경로 |
|------|------|------|
| 1 | 테넌트 프로필 / 로고 | Settings → Organisation |
| 2 | 브랜드 색상 (테마) | Settings → Branding |
| 3 | 이메일 발신 설정 | Settings → Email (Resend API Key) |
| 4 | 학교 파트너 등록 | CRM → Schools → Add School |
| 5 | 상품/코스 등록 | Products → Add Product |
| 6 | 직원 계정 생성 | Settings → Users → Invite |
| 7 | 서비스 모듈 활성화 | Settings → Service Modules |

### 권장 설정

| 항목 | 경로 |
|------|------|
| 수수료율 설정 | CRM → Schools → Commission |
| 세금 계산서 설정 | Settings → Finance → Tax |
| 환율 설정 | Settings → Finance → Currency |
| Stripe 연동 | Settings → Integrations → Stripe |
| 포털 계정 생성 | CRM → Accounts → Portal Access |

---

## 9. 슈퍼 어드민 (플랫폼 관리자)

플랫폼 전체를 관리하는 최상위 계정입니다.

### 접근
```
JWT role = "super_admin"
organisationId = null (테넌트 비소속)
```

### 기능
| 기능 | 엔드포인트 |
|------|-----------|
| 전체 테넌트 목록 | GET /api/superadmin/stats |
| 플랫폼 플랜 관리 | POST/PUT /api/platform-plans |
| Stripe 연동 확인 | GET /api/superadmin/integrations |
| 사용자 임시 전환 | View-As Impersonation |

---

## 10. 관련 API 엔드포인트 요약

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/auth/register` | POST | 신규 테넌트 가입 |
| `/api/auth/login` | POST | 스태프 / 포털 통합 로그인 |
| `/api/auth/check-email` | GET | 이메일 중복 확인 |
| `/api/auth/invite` | POST | 직원 초대 |
| `/api/public/platform-plans` | GET | 플랜 목록 (인증 불필요) |
| `/api/settings/billing/checkout` | POST | Stripe Checkout 세션 생성 |
| `/api/settings/billing/portal` | POST | Stripe 고객 포털 URL |
| `/api/webhook/stripe` | POST | Stripe Webhook 수신 |
| `/api/superadmin/stats` | GET | 플랫폼 전체 통계 |

---

*© Edubee.Co. 2026 — SaaS 온보딩 기능 명세 v1.0*
