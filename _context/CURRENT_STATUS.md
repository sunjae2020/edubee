# CURRENT_STATUS.md — Edubee CRM 현재 구현 상태

> 생성일: 2026-04-19 | 최종 업데이트: 2026-04-21 | v2.1 — Production 배포 완료

---

## 0. 프로덕션 배포 현황 (2026-04-21)

| 도메인 | 상태 | 호스팅 |
|--------|------|--------|
| `api.edubee.co` | ✅ 운영 중 | Railway |
| `app.edubee.co` | ✅ 운영 중 | Vercel |
| `portal.edubee.co` | ✅ 운영 중 | Vercel |
| `www.edubee.co` | ✅ 운영 중 | Vercel |
| `camp.edubee.co` | ✅ 운영 중 | Vercel |
| `edubee.co` (루트) | ⚠️ Vercel 검증 진행 중 | Vercel |

---

## 1. 구현 완료 기능 ✅

### 인증 & 보안
- ✅ JWT 인증 (스태프 8h + 포털 24h + Refresh 7d)
- ✅ 멀티테넌트 격리 (PostgreSQL schema per tenant)
- ✅ RBAC (requireRole) — 448개 적용
- ✅ Helmet 보안 헤더 (CSP, HSTS, X-Content-Type-Options 등)
- ✅ Rate Limiting (로그인 10회/15분, 전체 500회/15분)
- ✅ AES-256-GCM 필드 암호화 (여권번호 등)
- ✅ pino 구조화 로그 + 민감정보 [REDACTED]
- ✅ Sentry 에러 모니터링
- ✅ Graceful Shutdown (SIGTERM/SIGINT)
- ✅ 계정 잠금 (5회 실패 → 30분)
- ✅ View-As Impersonation (admin→user) + 로그 기록
- ✅ Stripe Webhook (4개 이벤트)

### CRM 핵심 파이프라인
- ✅ Lead → Quote → Contract → Invoice → Transaction → Receipt 전체 흐름
- ✅ Lead CRUD (lead_ref_number 자동 생성)
- ✅ Quote + Quote Products CRUD
- ✅ Contract + Contract Products CRUD (AR/AP 검증)
- ✅ Invoice 생성/목록/수정
- ✅ Tax Invoice (GST 세금 계산서, @react-pdf)
- ✅ Transaction/Payment Header/Line CRUD
- ✅ Receipt PDF 자동 생성

### 재무
- ✅ 이중 분개 (Journal Entries — debit/credit COA)
- ✅ 계정과목(COA) 관리
- ✅ AR/AP 일정 관리 및 순서 검증 (AP < AR 시 400)
- ✅ 환율 관리 + 자동 동기화
- ✅ 원장 (User Ledger, Account Ledger)
- ✅ KPI 스케줄러 (monthly + quarterly cron)
- ✅ AR Overdue 자동 처리 cron

### 포털 (34페이지)
- ✅ **에이전트 포털 (10개)**: Dashboard, Consultations, My Students, Quotes, Contracts, Services, Finance, Documents, Community, My Profile
- ✅ **파트너 포털 (8개)**: Dashboard, Consultations, Bookings, Contracts, Services, Finance, Documents, My Profile
- ✅ **학생 포털 (10개)**: Dashboard, Consultations, Quotes, Contracts, Services, Finance, Documents, Camp Photos, Community, My Profile

### 호주 Privacy Act 1988
- ✅ GET /api/privacy-policy (APP 5)
- ✅ 국외 이전 고지 (Stripe/Resend/Google — APP 8)
- ✅ GET /api/my-data (APP 12 자기 열람)
- ✅ POST /api/my-data/correction-request (APP 13 수정 요청)
- ✅ POST /api/my-data/withdraw-consent (동의 철회)
- ✅ 7년 데이터 보존 정책 문서화
- ✅ `security_incidents` 테이블 (NDB 침해 기록)
- ✅ `audit_logs` 테이블

### 서비스 관리
- ✅ 숙박(Accommodation), 비자(Visa), 가디언(Guardian) 관리
- ✅ 픽업(Pickup), 투어(Tour), 인턴십(Internship) 관리
- ✅ CAMP 캠프 신청서 전체 흐름
- ✅ 계약 서명 (Contract Signing — 이메일 발송 포함)
- ✅ 문서 관리 (업로드/다운로드/서명 — GCS)
- ✅ Signed URL TTL (다운로드 900초, 업로드 300초)

### 기타
- ✅ 커뮤니티 게시판
- ✅ 챗봇 (Gemini AI)
- ✅ KPI 대시보드 (스태프/팀)
- ✅ 리포트 빌더
- ✅ 데이터 매니저 (CSV import/export)
- ✅ 사용자/팀 관리
- ✅ Seed 멱등성 (onConflictDoNothing/Update)
- ✅ Vitest 8/8 통과
- ✅ 빌드 9.38초 성공 (edubee-portal)

---

## 2. 부분 구현 기능 🔶

| 기능 | 상태 | 파일 |
|------|------|------|
| **APP 13 수정 요청 DB 저장** | API 응답은 정상이나 `correction_requests` 테이블 미생성 — 로그만 기록 | `src/routes/my-data.ts:81` |
| **미성년자 보호자 동의** | 연령 체크(`ageMY < 18`)는 있으나 `guardian_consent_given` 강제 수집 없음 | `src/routes/camp-applications.ts:254` |
| **서비스 모듈 자동 활성화** | `service_module_type` 스키마 존재하나 계약 생성 시 자동 트리거 없음 | `contract_products.service_module_type` |
| **documents.ts fileFilter** | multer 파일 크기 제한은 있으나 파일 타입 화이트리스트 없음 (data-manager, camp-photos는 있음) | `src/routes/documents.ts:41` |
| **플랜 기능 런타임 강제** | `platform_plans` 테이블/CRUD 있으나 `checkPlanFeature()` 런타임 체크 없음 | `src/routes/platformPlans.ts` |
| **GCS 버킷 리전** | 코드에 `australia-southeast1` 명시 없음 (환경변수 설정 필요) | `src/lib/objectStorage.ts` |
| **마케팅 동의 체크** | `marketing_consent` 컬럼 있으나 이메일 발송 전 체크 로직 없음 | `src/routes/platform-integrations.ts:81` |

---

## 3. 미구현 기능 ❌

| 기능 | 이유 / 참고 |
|------|------------|
| **correction_requests 테이블** | `my-data.ts:91` 주석: "실제 운영에서는 correction_requests 테이블에 저장" |
| **TypeScript 완전 해결** | 683개 Drizzle ORM 타입 호환성 오류 (런타임 무관, tsx로 실행) |
| **npm 취약점 패치** | Vite critical (>=7.3.2) + 7 high — `pnpm update vite` 필요 |
| **pino 완전 전환** | console.log 49개 잔존 |
| **DB Pooler 포트** | DATABASE_URL이 6543 포트가 아닌 경우 WARN |

---

## 4. 알려진 버그 및 임시 해결책

| 버그 | 임시 처리 | 파일:줄 |
|------|---------|---------|
| Drizzle ORM TypeScript 683 에러 | tsx로 실행하여 타입 체크 우회 | `tsconfig.json` |
| `drizzle-kit` 경로 미설정 | pnpm filter 없이 직접 호출 불가 → `pnpm --filter @workspace/db run push` | `lib/db/package.json` |
| privacy-policy curl 테스트 실패 | 서버는 정상 응답 (vitest에서 확인), 인증 미들웨어 순서 이슈 가능성 | `src/routes/privacy.ts:12` |

---

## 5. 다음 작업 권장 우선순위

| 우선순위 | 작업 | 예상 소요 |
|---------|------|----------|
| 🔴 1순위 | `pnpm update vite` — critical 취약점 패치 | 30분 |
| 🔴 2순위 | `documents.ts` fileFilter 추가 | 1시간 |
| 🟠 3순위 | `correction_requests` 테이블 생성 + APP 13 DB 저장 | 2시간 |
| 🟠 4순위 | console.log 49개 → pino 교체 | 2시간 |
| 🟡 5순위 | guardian_consent_given 강제 수집 | 1시간 |
| 🟡 6순위 | marketing_consent 발송 전 체크 | 1시간 |
| 🟡 7순위 | TypeScript 683 오류 해결 (Drizzle 타입) | 4시간 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
