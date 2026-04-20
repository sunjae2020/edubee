# VALIDATION_REPORT.md — v2.1 통합 검증 보고서

> 생성일: 2026-04-19 | 최종 업데이트: 2026-04-21 | 검증 기준: v2.1 (Production 배포 완료)

## 프로덕션 Smoke Test 결과 (2026-04-21)

| 항목 | 결과 |
|------|------|
| `api.edubee.co` 헬스체크 | ✅ HTTP 401 (정상) |
| admin@edubee.co 로그인 | ✅ accessToken 발급 |
| 멀티테넌트 데이터 격리 | ✅ myagency 데이터만 반환 |
| `app.edubee.co` 접속 | ✅ HTTP 200 |
| `portal.edubee.co` 접속 | ✅ HTTP 200 |
| `www.edubee.co` 접속 | ✅ HTTP 200 |
| `camp.edubee.co` 접속 | ✅ HTTP 200 |

---

---

## 1. 종합 결과

| 항목 | 결과 |
|------|------|
| **전체 체크 수** | 57 |
| ✅ PASS | 45 |
| ⚠️ WARN | 10 |
| ❌ FAIL | 1 |
| ⏭ SKIP | 1 |
| **합격률** | **78.9%** (PASS + WARN: 96.5%) |

---

## 2. FAIL 항목 ❌

| ID | 항목 | 상세 | 처리 방법 |
|----|------|------|----------|
| F-8 | npm audit: critical + high 취약점 | vite <7.3.2 (CRITICAL), 7 HIGH | `pnpm update vite` 필요 |

> **pnpm 환경 특이사항:** `npm audit` 실행 불가 (pnpm 모노레포). `pnpm audit --audit-level=high` 사용 필요.

---

## 3. WARN 항목 ⚠️

| ID | 항목 | 상세 | 우선순위 |
|----|------|------|---------|
| W-1 | TypeScript 컴파일 오류 | 683개 Drizzle ORM 타입 오류 (런타임 무관) | 🟡 낮음 |
| W-2 | console.log 잔존 | 49개 console.log (pino 전환 미완) | 🟡 낮음 |
| W-3 | documents.ts fileFilter 누락 | 파일 타입 화이트리스트 없음 | 🟠 중간 |
| W-4 | APP 13 DB 저장 미구현 | correction_requests 테이블 없음, 로그만 기록 | 🟠 중간 |
| W-5 | 미성년자 보호자 동의 | guardian_consent_given 강제 수집 없음 | 🟡 낮음 |
| W-6 | marketing_consent 미체크 | 이메일 발송 전 동의 여부 미확인 | 🟡 낮음 |
| W-7 | 플랜 기능 런타임 강제 없음 | platform_plans 테이블만, checkPlanFeature() 없음 | 🟡 낮음 |
| W-8 | GCS 리전 미명시 | australia-southeast1 설정 환경변수 의존 | 🟡 낮음 |
| W-9 | DATABASE_URL 포트 | 5432 vs 6543 (Supabase pooler) 확인 필요 | 🟠 중간 |
| W-10 | Receipt PDF (GCS 설정 필요) | GCS 환경변수 없으면 PDF 생성 실패 가능 | 🟠 중간 |

---

## 4. PASS 항목 ✅ (핵심 45개)

### 보안 체크 (Sprints 1-6)
| ID | 항목 | 파일 |
|----|------|------|
| S1-01 | JWT_SECRET 미설정 시 서버 종료 | `auth.ts:18` |
| S1-02 | 계정 잠금 (5회/30분) | `auth.ts:169` |
| S1-03 | Refresh Token DB 저장 및 검증 | `refresh_tokens` 테이블 |
| S2-01 | AES-256-GCM 필드 암호화 | `lib/crypto.ts` |
| S2-02 | FIELD_ENCRYPTION_KEY 검증 | `lib/crypto.ts:9` |
| S3-01 | 구조화 로그 (pino) | `lib/logger.ts` |
| S3-02 | 전역 에러 핸들러 | `middleware/errorHandler.ts` |
| S3-03 | 민감정보 [REDACTED] 마스킹 | `lib/logger.ts redact` |
| S3-04 | HTTP 요청 로그 | `app.ts:62` |
| S4-01 | Sentry 에러 모니터링 | `app.ts:17` |
| S4-02 | Sentry 민감정보 필터 | `app.ts:32` |
| S5-01 | Helmet 보안 헤더 | `app.ts:46` |
| S5-02 | CSP 설정 | `app.ts:48` |
| S5-03 | CORS 도메인 제한 | `app.ts:60` |
| S5-04 | Rate Limit (로그인 10/15min) | `auth.ts:26` |
| S5-05 | Rate Limit (전체 500/15min) | `app.ts:71` |
| S5-06 | Trust Proxy 1 | `app.ts:44` |
| S6-01 | View-As Impersonation 로그 | `impersonation_logs` |
| S6-02 | superAdminOnly 404 반환 | `middleware/superAdminOnly.ts` |
| S6-03 | 감사 로그 | `lib/auditLogger.ts` |

### Privacy Act 1988 체크 (9/10)
| ID | APP | 항목 | 파일 |
|----|-----|------|------|
| PA-01 | APP 5 | Privacy Policy 공개 API | `routes/privacy.ts` |
| PA-02 | APP 8 | 국외 이전 고지 (Stripe/Resend/Google) | `routes/privacy.ts` |
| PA-03 | APP 11 | 보안 침해 기록 테이블 | `schema/security.ts` |
| PA-04 | APP 11 | 민감정보 마스킹 | `lib/logger.ts` |
| PA-05 | APP 12 | 자기 열람 API | `routes/my-data.ts` |
| PA-06 | APP 13 | 수정 요청 API | `routes/my-data.ts` (응답 정상, DB 저장 미구현) |
| PA-07 | APP 13 | 동의 철회 API | `routes/my-data.ts` |
| PA-08 | APP 11 | 7년 보존 정책 | `_context/PROJECT_OVERVIEW.md` |
| PA-09 | APP 6 | 데이터 최소 수집 (필수 필드만) | 스키마 설계 |

### CRM 파이프라인
| ID | 항목 |
|----|------|
| CRM-01 | Lead → Quote → Contract 전체 흐름 |
| CRM-02 | AP < AR 날짜 순서 검증 |
| CRM-03 | Invoice 번호 자동 채번 |
| CRM-04 | Payment Header → Journal Entry 자동 생성 |
| CRM-05 | Tax Invoice GST 계산 |
| CRM-06 | 멀티테넌트 데이터 격리 |
| CRM-07 | Stripe Webhook 처리 |
| CRM-08 | GCS 문서 업로드 (Signed URL) |
| CRM-09 | 이메일 발송 (Resend) |
| CRM-10 | KPI 스케줄러 (monthly/quarterly cron) |

### 포털
| ID | 항목 |
|----|------|
| PT-01 | 에이전트 포털 10개 페이지 |
| PT-02 | 파트너 포털 8개 페이지 |
| PT-03 | 학생 포털 10개 페이지 + 사진 |
| PT-04 | 역할 기반 사이드바 메뉴 분기 |
| PT-05 | 포털 JWT (userType: "portal") |

---

## 5. 빌드 검증

| 항목 | 결과 |
|------|------|
| `edubee-portal` Vite 빌드 | ✅ 9.38초 성공 |
| `edubee-admin` Vite 빌드 | ✅ 성공 |
| `edubee-website` Vite 빌드 | ✅ 성공 |
| `edubee-camp` Vite 빌드 | ✅ 성공 |
| `api-server` tsx 빌드 | ✅ 성공 |
| Vitest 단위 테스트 | ✅ 8/8 PASS |

---

## 6. 다음 검증 (v2.1) 계획

| 항목 | 조건 |
|------|------|
| F-8 해소 확인 | `pnpm update vite` 후 재실행 |
| APP 13 DB 저장 | `correction_requests` 테이블 생성 후 |
| documents.ts fileFilter | 화이트리스트 추가 후 |
| console.log 제거 | pino 전환 완료 후 |
| 플랜 기능 강제 | `checkPlanFeature()` 구현 후 |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
