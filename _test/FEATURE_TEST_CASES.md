# FEATURE_TEST_CASES.md — 기능 테스트 케이스 목록

> 생성일: 2026-04-19 | 소스: __tests__/, routes/, 수동 테스트 기반

---

## 1. Vitest 단위 테스트 현황

**위치:** `artifacts/api-server/src/__tests__/`  
**결과:** 8/8 PASS (v2.0 검증 기준)  
**실행:** `pnpm --filter @workspace/api-server test`

| 테스트 파일 | 테스트 케이스 | 결과 |
|------------|-------------|------|
| `auth.test.ts` | JWT 생성/검증, 잘못된 시크릿 거부 | ✅ PASS |
| `crypto.test.ts` | AES-256-GCM 암호화/복호화 | ✅ PASS |
| `contracts.test.ts` | AR/AP 날짜 순서 검증 | ✅ PASS |
| `taxInvoice.test.ts` | GST 1/11 계산 정확도 | ✅ PASS |
| `rateLimit.test.ts` | Rate Limit 초과 시 429 반환 | ✅ PASS |
| `privacy.test.ts` | Privacy API 응답 형식 | ✅ PASS |
| `ledger.test.ts` | 이중 분개 차변/대변 균형 검증 | ✅ PASS |
| `tenantIsolation.test.ts` | 테넌트 간 데이터 격리 | ✅ PASS |

---

## 2. API 엔드포인트 수동 테스트 체크리스트

### 인증 (AUTH)
| TC # | 시나리오 | 입력 | 예상 출력 | 상태 |
|------|---------|------|----------|------|
| TC-AUTH-01 | 정상 로그인 (스태프) | `POST /api/auth/login` + 유효 자격증명 | 200, accessToken + refreshToken | ✅ |
| TC-AUTH-02 | 잘못된 비밀번호 | `POST /api/auth/login` + 잘못된 PW | 401, `INVALID_CREDENTIALS` | ✅ |
| TC-AUTH-03 | 5회 실패 후 잠금 | 동일 이메일로 5회 연속 실패 | 6번째: 403, `ACCOUNT_LOCKED` | ✅ |
| TC-AUTH-04 | 만료 토큰 | 8시간 후 요청 | 401, `INVALID_TOKEN` | ✅ |
| TC-AUTH-05 | Refresh Token 갱신 | `POST /api/auth/refresh` + 유효 refreshToken | 200, 새 accessToken | ✅ |
| TC-AUTH-06 | 포털 로그인 | `POST /api/portal/login` + portalEmail | 200, userType: "portal" | ✅ |
| TC-AUTH-07 | Rate Limit (로그인) | 11번 시도 / 15분 | 11번째: 429 | ✅ |
| TC-AUTH-08 | View-As (admin) | `X-View-As-User-Id` 헤더 | req.user가 대상 user로 변경 | ✅ |
| TC-AUTH-09 | View-As (consultant 시도) | `X-View-As-User-Id` + consultant 토큰 | 무시됨 (original user 유지) | ✅ |
| TC-AUTH-10 | 인증 없이 보호된 API | Authorization 헤더 없음 | 401, `UNAUTHORIZED` | ✅ |

---

### CRM 파이프라인

| TC # | 시나리오 | API | 예상 결과 | 상태 |
|------|---------|-----|----------|------|
| TC-CRM-01 | Lead 생성 | `POST /api/leads` | 201, lead_ref_number 자동 채번 | ✅ |
| TC-CRM-02 | Lead 목록 (테넌트 필터) | `GET /api/leads` + X-Organisation-Id | 해당 테넌트 리드만 반환 | ✅ |
| TC-CRM-03 | Quote 생성 | `POST /api/quotes` | 201, quote_ref_number 채번 | ✅ |
| TC-CRM-04 | Quote Products 추가 | `POST /api/quote-products` + quoteId | 201, 항목 추가 | ✅ |
| TC-CRM-05 | Contract 생성 | `POST /api/contracts` + applicationId | 201, contract_number 채번 | ✅ |
| TC-CRM-06 | Contract Products AR/AP | 유효한 ar_due_date + ap_due_date | 201 성공 | ✅ |
| TC-CRM-07 | AP > AR 날짜 검증 | ap_due_date > ar_due_date | 400 에러 | ✅ |
| TC-CRM-08 | Invoice 생성 | `POST /api/invoices` | 201, invoiceNumber 채번 | ✅ |
| TC-CRM-09 | 계약 소프트 삭제 | `DELETE /api/contracts/:id` | is_active: false | ✅ |
| TC-CRM-10 | 동일 Application 중복 계약 | 이미 Contract 있는 applicationId로 생성 | 400/409 오류 | ✅ |

---

### 재무 / 인보이스

| TC # | 시나리오 | 예상 결과 | 상태 |
|------|---------|----------|------|
| TC-FIN-01 | Invoice 상태 전이 (paid) | status → 'paid' | ✅ |
| TC-FIN-02 | Payment Header 생성 → Journal Entry 자동 생성 | debit+credit 분개 생성 | ✅ |
| TC-FIN-03 | Receipt PDF 자동 생성 | PDF 생성 + GCS 업로드 | ⚠️ GCS 설정 필요 |
| TC-FIN-04 | Tax Invoice GST 계산 | commissionAmt × 1/11 | ✅ |
| TC-FIN-05 | AR Overdue cron | ar_due_date 초과 항목 상태 변경 | ✅ (매일 실행) |
| TC-FIN-06 | 환율 조회 | `GET /api/exchange-rates` | 200, 최신 환율 반환 | ✅ |
| TC-FIN-07 | 권한 없는 Invoice 생성 (consultant) | `POST /api/invoices` with consultant | 403 Forbidden | ✅ |

---

### 포털 테스트

| TC # | 시나리오 | 역할 | 예상 결과 | 상태 |
|------|---------|------|----------|------|
| TC-PRT-01 | 에이전트 로그인 | agent | 200, portalRole: "agent" | ✅ |
| TC-PRT-02 | 파트너 로그인 | hotel | 200, portalRole: "hotel" | ✅ |
| TC-PRT-03 | 학생 로그인 | student | 200, portalRole: "student" | ✅ |
| TC-PRT-04 | 에이전트 대시보드 조회 | agent | 200, 해당 학생 데이터만 | ✅ |
| TC-PRT-05 | 파트너가 에이전트 데이터 접근 시도 | hotel | 403 Forbidden | ✅ |
| TC-PRT-06 | 스태프 토큰으로 포털 API 접근 | staff JWT | 403 `FORBIDDEN` | ✅ |
| TC-PRT-07 | 포털 토큰으로 스태프 API 접근 | portal JWT | 403 or 401 | ✅ |
| TC-PRT-08 | 학생 캠프 사진 업로드 | student | 201, 이미지 저장 | ⚠️ GCS 필요 |
| TC-PRT-09 | 포털 메뉴 역할별 분기 | hotel | 파트너 메뉴 표시 | ✅ |
| TC-PRT-10 | 테넌트 테마 로드 | 모든 역할 | 테넌트 오렌지 색상 적용 | ✅ |

---

### 보안 / Privacy Act

| TC # | 시나리오 | 예상 결과 | 상태 |
|------|---------|----------|------|
| TC-SEC-01 | CORS 차단 | 허용 안 된 origin으로 요청 | CORS 에러 | ✅ |
| TC-SEC-02 | CSP 헤더 확인 | 모든 응답의 `Content-Security-Policy` | 헤더 존재 | ✅ |
| TC-SEC-03 | 민감정보 로그 마스킹 | passport_number 포함 요청 → 로그 확인 | `[REDACTED]` | ✅ |
| TC-SEC-04 | Privacy Policy 공개 API | `GET /api/privacy-policy` (인증 없이) | 200, 정책 내용 | ✅ |
| TC-SEC-05 | 자기 열람 (APP 12) | `GET /api/my-data` | 200, 본인 데이터만 | ✅ |
| TC-SEC-06 | 수정 요청 (APP 13) | `POST /api/my-data/correction-request` | 200, 요청 접수 | ⚠️ DB 저장 미구현 |
| TC-SEC-07 | superAdminOnly 차단 | org 있는 admin이 /superadmin 접근 | 404 | ✅ |
| TC-SEC-08 | 여권번호 암호화 저장 | contacts 생성 시 passportNo | DB에 암호화 값 저장 | ✅ |
| TC-SEC-09 | SQL Injection | 검색 파라미터에 SQL 구문 | Drizzle 준비문으로 차단 | ✅ |

---

## 3. 프론트엔드 체크리스트

| 항목 | 체크 내용 | 상태 |
|------|----------|------|
| 포털 로그인 화면 | 이메일/비밀번호 입력 → 역할별 대시보드 리다이렉트 | ✅ |
| 포털 사이드바 역할 분기 | agent/partner/student 각각 다른 메뉴 | ✅ |
| 테넌트 테마 | 로그인 후 테넌트 오렌지 색상 적용 | ✅ |
| 로그인 실패 토스트 | 잘못된 자격증명 → 에러 메시지 표시 | ✅ |
| 계약 상세 - 재무 탭 | AR/AP 항목, 상태 뱃지 | ✅ |
| 모바일 반응형 | 포털 hamburger 메뉴 | ✅ |
| 국제화(i18n) | Admin CRM en/ko 전환 | ✅ |
| Build 성공 | 각 아티팩트 `vite build` 오류 없음 | ✅ |

---

*© Edubee.Co. 2026 — 자동 생성 문서*
