# 🐝 Edubee CRM — Replit 코드베이스 SaaS 아키텍처 & 호주 개인정보보호법 종합 감사 프롬프트

**버전:** v1.0 | **작성일:** 2026-04-19  
**목적:** 현재 Replit 코드베이스를 분석하여 SaaS 아키텍처 완성도 및 호주 개인정보보호법(Privacy Act 1988) 준수 여부를 자동 진단  
**결과물:** 섹션별 상태 보고서 + 우선순위 보완 작업 목록

---

## ⚠️ 실행 전 필수 지침 (Replit AI에게)

```
이 프롬프트는 코드를 수정하지 않는다.
오직 읽기(Read-Only) 분석만 수행한다.
아래 순서대로 파일을 읽고, 각 항목을 체크한 후
지정된 형식으로 결과를 보고하라.
파일이 존재하지 않으면 "❌ 파일 없음"으로 기록하라.
추측으로 결과를 채우지 말고, 실제 코드 근거를 함께 제시하라.
```

---

## 📋 감사 실행 순서

아래 **PHASE 1 → PHASE 6** 순서로 실행하고, 각 단계 완료 후 결과를 출력하라.  
전체를 한 번에 실행하지 말고, PHASE별로 완료 확인 후 다음으로 진행하라.

---

# PHASE 1 — 프로젝트 구조 파악

## 명령어 (순서대로 실행)

```bash
# 1. 전체 디렉토리 구조 파악
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
  | grep -v node_modules | grep -v dist | grep -v .next \
  | sort | head -100

# 2. 핵심 파일 존재 여부 확인
ls -la db/schema.ts 2>/dev/null && echo "✅ DB Schema 존재" || echo "❌ db/schema.ts 없음"
ls -la server/src/routes/ 2>/dev/null && echo "✅ Routes 디렉토리 존재" || echo "❌ server/src/routes/ 없음"
ls -la client/src/pages/ 2>/dev/null && echo "✅ Pages 디렉토리 존재" || echo "❌ client/src/pages/ 없음"
ls -la .env 2>/dev/null && echo "✅ .env 존재" || echo "⚠️ .env 없음 (Secrets 사용 중일 수 있음)"
ls -la package.json && echo "✅ package.json 존재"

# 3. 설치된 패키지 목록
cat package.json | grep -E '"dependencies"|"devDependencies"' -A 100 | head -80
```

## PHASE 1 보고 형식

```
=== PHASE 1: 프로젝트 구조 요약 ===
총 파일 수: [숫자]
핵심 파일: [목록]
주요 패키지:
  - ORM: [확인된 패키지]
  - Auth: [확인된 패키지]
  - Validation: [확인된 패키지]
  - File Storage: [확인된 패키지]
  - Email: [확인된 패키지]
  - Testing: [확인된 패키지]
```

---

# PHASE 2 — 멀티테넌시 & 데이터베이스 감사

## 파일 읽기

```bash
cat db/schema.ts
```

## 체크 항목 (각 항목: ✅ 확인됨 / ⚠️ 부분 적용 / ❌ 없음 / 🔍 불명확)

### [MT-1] organisation_id 전체 테이블 적용 여부
```bash
# schema.ts에서 organisation_id 컬럼 검색
grep -n "organisation_id\|organizationId\|tenant_id\|tenantId" db/schema.ts | head -30
```
> 판단 기준: 주요 테이블(contacts, accounts, leads, quotes, contracts, invoices, transactions)에 모두 존재하면 ✅, 일부만 있으면 ⚠️, 없으면 ❌

### [MT-2] Row Level Security (RLS) 정책 적용 여부
```bash
# 마이그레이션 파일 또는 DB 초기화 파일에서 RLS 검색
grep -rn "ROW LEVEL SECURITY\|ENABLE ROW\|CREATE POLICY\|row_security" . \
  --include="*.sql" --include="*.ts" | grep -v node_modules
```

### [MT-3] 테넌트 격리 미들웨어 존재 여부
```bash
grep -rn "organisation_id\|tenantId\|tenant_id" server/src/routes/ \
  server/src/middleware/ 2>/dev/null | head -30
```

### [MT-4] 플랜별 기능 제한 테이블 (plan_limits / feature_flags)
```bash
grep -n "plan_limits\|feature_flags\|planLimits\|featureFlags\|subscription" \
  db/schema.ts 2>/dev/null
```

### [DB-1] 인덱스 정의 여부
```bash
grep -n "index\|Index\|\.index\|createIndex" db/schema.ts | head -20
```

### [DB-2] Audit Log 테이블 존재 여부
```bash
grep -n "audit_log\|auditLog\|audit_trail\|change_log" db/schema.ts 2>/dev/null
```

### [DB-3] DB 마이그레이션 파일 존재
```bash
ls -la drizzle/ 2>/dev/null || ls -la migrations/ 2>/dev/null || echo "❌ 마이그레이션 디렉토리 없음"
```

## PHASE 2 보고 형식

```
=== PHASE 2: 멀티테넌시 & 데이터베이스 감사 결과 ===

[MT-1] organisation_id 전체 적용: [상태]
  근거: [실제 발견된 코드 라인 또는 "미발견"]

[MT-2] Row Level Security: [상태]
  근거: [실제 발견된 코드 또는 "미발견"]

[MT-3] 테넌트 격리 미들웨어: [상태]
  근거: [파일명:라인번호]

[MT-4] 플랜 제한 테이블: [상태]
  근거: [테이블명 또는 "미발견"]

[DB-1] 인덱스 전략: [상태]
  근거: [발견된 인덱스 목록 또는 "없음"]

[DB-2] Audit Log: [상태]
  근거: [테이블명 또는 "없음"]

[DB-3] 마이그레이션 관리: [상태]
  근거: [파일 목록 또는 "없음"]
```

---

# PHASE 3 — 인증 & 보안 감사

## 파일 읽기

```bash
# 미들웨어 파일 확인
cat server/src/middleware/auth.ts 2>/dev/null || \
cat server/src/middleware/index.ts 2>/dev/null || \
find server -name "auth*" -o -name "middleware*" | head -10 | xargs cat 2>/dev/null

# 라우트 파일 확인
ls server/src/routes/
```

## 체크 항목

### [SEC-1] JWT 구현 방식
```bash
grep -rn "jwt\|jsonwebtoken\|jose\|JWT_SECRET\|jwtSecret" \
  server/src/ --include="*.ts" | grep -v node_modules | head -20
```

### [SEC-2] Refresh Token 존재 여부
```bash
grep -rn "refreshToken\|refresh_token\|REFRESH" server/src/ --include="*.ts" | head -10
```

### [SEC-3] Rate Limiting 적용 여부
```bash
grep -rn "rateLimit\|rate-limit\|express-rate-limit\|throttle" \
  server/src/ package.json --include="*.ts" | grep -v node_modules | head -10
```

### [SEC-4] RBAC 구현 확인 (역할 목록)
```bash
grep -rn "role\|Role\|ROLE\|permission\|Permission" \
  server/src/middleware/ server/src/routes/ --include="*.ts" 2>/dev/null | head -20
```

### [SEC-5] CORS 설정 확인
```bash
grep -rn "cors\|CORS\|origin" server/src/ --include="*.ts" | head -10
```

### [SEC-6] Helmet (HTTP 보안 헤더) 적용 여부
```bash
grep -rn "helmet\|Helmet" server/src/ package.json | grep -v node_modules | head -5
```

### [SEC-7] 입력값 검증 (Zod / Joi / Yup)
```bash
grep -rn "zod\|Zod\|joi\|yup\|validate\|schema" \
  server/src/routes/ --include="*.ts" | head -20
```

### [SEC-8] SQL Injection 방지 (파라미터 바인딩 확인)
```bash
# 위험한 문자열 연결 패턴 탐지
grep -rn "query\s*+\s*\"\|sql\s*+\s*\`\|db.execute.*\$" \
  server/src/ --include="*.ts" | grep -v "//.*sql" | head -10
```

### [SEC-9] 환경변수 하드코딩 탐지
```bash
# 비밀번호/키 하드코딩 패턴 탐지
grep -rn "password.*=.*['\"][^'\"]\{6,\}\|secret.*=.*['\"][^'\"]\{6,\}\|apiKey.*=.*['\"][^'\"]\{10,\}" \
  server/src/ client/src/ --include="*.ts" --include="*.tsx" \
  | grep -v ".env\|process.env\|secrets\|node_modules" | head -10
```

## PHASE 3 보고 형식

```
=== PHASE 3: 인증 & 보안 감사 결과 ===

[SEC-1] JWT 구현: [상태] — [라이브러리명]
[SEC-2] Refresh Token: [상태]
[SEC-3] Rate Limiting: [상태] — [라이브러리명 또는 "없음"]
[SEC-4] RBAC 역할 목록: [발견된 역할들 나열]
[SEC-5] CORS 설정: [상태] — [설정값]
[SEC-6] Helmet: [상태]
[SEC-7] 입력값 검증: [상태] — [라이브러리명]
[SEC-8] SQL Injection 위험: [위험 패턴 발견 여부]
[SEC-9] 하드코딩 비밀값: [발견 건수 및 파일명]
```

---

# PHASE 4 — 파일/문서 관리 감사

## 체크 항목

### [FILE-1] 파일 업로드 구현 확인
```bash
grep -rn "multer\|upload\|fileUpload\|storage\|supabase.*storage\|s3" \
  server/src/ --include="*.ts" | grep -v node_modules | head -20
```

### [FILE-2] 파일 접근 권한 검증 확인
```bash
# 파일 다운로드/접근 라우트에서 인증 확인 여부
grep -rn "files\|download\|getFile\|fetchFile" \
  server/src/routes/ --include="*.ts" | head -15
```

### [FILE-3] Signed URL (임시 접근) 사용 여부
```bash
grep -rn "signedUrl\|signed_url\|createSignedUrl\|presign\|getSignedUrl" \
  server/src/ --include="*.ts" | grep -v node_modules | head -10
```

### [FILE-4] 파일 타입 검증 (악성 파일 업로드 방지)
```bash
grep -rn "mimetype\|mime_type\|fileFilter\|allowedTypes\|file_type" \
  server/src/ --include="*.ts" | head -10
```

### [FILE-5] 파일 용량 제한
```bash
grep -rn "fileSize\|file_size\|maxSize\|limits.*size\|MAX_FILE" \
  server/src/ --include="*.ts" | head -5
```

### [FILE-6] PDF 생성 엔진 존재 여부
```bash
grep -rn "pdf\|PDF\|react-pdf\|pdfkit\|puppeteer\|jsPDF\|html-pdf" \
  package.json server/src/ --include="*.ts" --include="*.json" | head -10
```

### [FILE-7] 파일 버전 관리 구현 여부
```bash
grep -n "version\|Version\|file_version\|fileVersion" db/schema.ts | grep -i file | head -5
```

## PHASE 4 보고 형식

```
=== PHASE 4: 파일/문서 관리 감사 결과 ===

[FILE-1] 파일 업로드 구현: [상태] — [스토리지 방식]
[FILE-2] 파일 접근 권한 검증: [상태]
[FILE-3] Signed URL: [상태]
[FILE-4] 파일 타입 검증: [상태]
[FILE-5] 파일 용량 제한: [상태] — [제한값 또는 "없음"]
[FILE-6] PDF 생성 엔진: [상태] — [라이브러리명]
[FILE-7] 파일 버전 관리: [상태]
```

---

# PHASE 5 — API 설계 & 성능 감사

## 체크 항목

### [API-1] API 버저닝 확인
```bash
grep -rn "\/v1\/\|\/v2\/\|apiVersion\|api_version" \
  server/src/ --include="*.ts" | head -10
```

### [API-2] API 문서화 (Swagger/OpenAPI)
```bash
grep -rn "swagger\|openapi\|@Api\|@ApiProperty" \
  server/src/ package.json | grep -v node_modules | head -5
```

### [API-3] 표준화된 에러 응답 형식
```bash
# 에러 핸들러 미들웨어 확인
grep -rn "errorHandler\|error.*middleware\|res.status.*json\|AppError" \
  server/src/ --include="*.ts" | head -15
```

### [API-4] 캐싱 전략 (Redis/메모리)
```bash
grep -rn "redis\|Redis\|cache\|Cache\|memcache\|node-cache" \
  server/src/ package.json | grep -v node_modules | head -10
```

### [API-5] 비동기 큐 / 백그라운드 작업
```bash
grep -rn "bull\|Bull\|pg-boss\|queue\|Queue\|worker\|cron\|schedule" \
  server/src/ package.json | grep -v node_modules | head -10
```

### [API-6] Webhook 구현 여부
```bash
grep -rn "webhook\|Webhook\|WebHook" \
  server/src/ --include="*.ts" | grep -v node_modules | head -5
```

### [API-7] 로깅 시스템
```bash
grep -rn "winston\|pino\|morgan\|logger\|Logger\|console.log" \
  server/src/ --include="*.ts" | grep -v node_modules | head -15
```

### [API-8] 모니터링/알람
```bash
grep -rn "sentry\|Sentry\|datadog\|newrelic\|prometheus\|APM" \
  server/src/ package.json | grep -v node_modules | head -5
```

## PHASE 5 보고 형식

```
=== PHASE 5: API 설계 & 성능 감사 결과 ===

[API-1] API 버저닝: [상태]
[API-2] API 문서화: [상태]
[API-3] 에러 응답 표준화: [상태] — [발견된 패턴]
[API-4] 캐싱: [상태] — [사용 기술]
[API-5] 비동기 큐: [상태]
[API-6] Webhook: [상태]
[API-7] 로깅: [상태] — [사용 라이브러리]
[API-8] 모니터링: [상태]
```

---

# PHASE 6 — 🇦🇺 호주 개인정보보호법 (Privacy Act 1988) 컴플라이언스 감사

> **적용 법률:** Privacy Act 1988 (Cth), Australian Privacy Principles (APPs) 13개 원칙,  
> Notifiable Data Breaches (NDB) Scheme, Children's Privacy (만 18세 미만 학생 데이터)

---

## [APP-1] 개인정보 수집 동의 & 고지 (APP 3, 5)

```bash
# 동의 관련 필드 확인
grep -n "consent\|Consent\|privacy_policy\|terms_accepted\|gdpr\|privacy_notice" \
  db/schema.ts | head -10

# 프론트엔드 동의 체크박스 확인
grep -rn "consent\|privacy.*policy\|terms.*accept\|PrivacyPolicy" \
  client/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | head -10
```

> **판단 기준:**
> - ✅ 적합: 학생/학부모 등록 시 개인정보 수집 동의 체크박스 + DB 기록
> - ⚠️ 부분: UI에는 있으나 DB에 기록 안 됨
> - ❌ 미비: 동의 절차 없음 (APP 5 위반)

---

## [APP-3] 민감 정보 처리 (Sensitive Information — APP 3.3)

```bash
# 민감 정보 필드 확인 (여권, 비자, 의료, 종교, 생체인식)
grep -n "passport\|visa_number\|medical\|health\|religion\|biometric\
\|racial\|ethnic\|criminal\|tax_file\|tfn\|medicare" \
  db/schema.ts | head -20
```

> **호주법 특이사항:**
> - 여권번호, 비자번호 → '정부 관련 식별자' (APP 9)
> - 미성년자(18세 미만) 학생 건강 정보 → 추가 동의 필요
> - Tax File Number (TFN) → Tax File Number Guidelines 별도 적용

---

## [APP-6] 제3자 데이터 공유 (Cross-border Disclosure — APP 8)

```bash
# 외부 서비스 연동 확인 (학교, 이민청, 보험사 등)
grep -rn "axios\|fetch.*http\|external.*api\|third.party\|integration" \
  server/src/ --include="*.ts" | grep -v node_modules | head -15

# 이메일 발송 수신자 로깅 확인
grep -rn "sendEmail\|email.*send\|resend\|sendgrid\|smtp" \
  server/src/ --include="*.ts" | head -10
```

> **판단 기준:**
> - 학생 정보를 해외 학교로 전송 시 APP 8 적용 → 수신국의 개인정보보호 수준 확인 의무
> - API 호출 전 동의 기록 필요

---

## [APP-9] 정부 식별자 처리 (Government Related Identifiers)

```bash
# 여권번호, 비자번호, TFN, ABN, Medicare 번호 처리 방식
grep -n "passport_number\|visa_number\|tax_file\|tfn\|medicare_number\
\|passport_no\|passportNo" db/schema.ts | head -10

# 이런 필드들이 로그에 출력되는지 확인
grep -rn "passport\|visa_number\|tax_file" \
  server/src/ --include="*.ts" | grep "console\.\|log\." | head -5
```

> **경고:** 여권번호/비자번호를 로그 파일에 출력하면 즉시 APP 11 위반

---

## [APP-11] 개인정보 보안 조치 (Security of Personal Information)

```bash
# 1. 민감 컬럼 암호화 여부
grep -n "encrypt\|Encrypt\|crypto\|hash\|bcrypt\|pgcrypto\|AES" \
  db/schema.ts server/src/ --include="*.ts" -r | grep -v password | head -10

# 2. 패스워드 해싱 확인
grep -rn "bcrypt\|argon2\|scrypt\|hashPassword\|hash.*password" \
  server/src/ --include="*.ts" | head -5

# 3. HTTPS 강제 여부
grep -rn "https\|ssl\|tls\|HTTPS\|force.*https\|redirect.*https" \
  server/src/ --include="*.ts" | head -5

# 4. 데이터 보존 기간 정책 (Data Retention)
grep -n "expires\|expiry\|retention\|delete_after\|purge_after\|ttl" \
  db/schema.ts | head -10
```

> **호주 요구사항:**
> - 개인정보는 수집 목적 달성 후 파기 또는 비식별화 (APP 11.2)
> - 유학원의 경우 계약 종료 후 7년 보관 권장 (호주 세금법 ATO 기준)

---

## [APP-12, 13] 정보 접근 및 수정권 (Access & Correction)

```bash
# 학생/고객이 자신의 데이터를 조회/수정할 수 있는 API 확인
grep -rn "my.profile\|self.*data\|own.*data\|data.*export\|right.to.access\
\|data.*portability\|deleteAccount\|delete.account" \
  server/src/routes/ client/src/ --include="*.ts" --include="*.tsx" | head -10
```

> **필수 기능:**
> - 학생이 자신의 개인정보 열람 요청 시 30일 이내 응답 (APP 12)
> - 부정확한 정보 수정 요청 처리 절차 (APP 13)

---

## [NDB] Notifiable Data Breaches Scheme (데이터 침해 알림 의무)

```bash
# 침해 대응 절차 관련 코드 확인
grep -rn "breach\|incident\|notif.*breach\|data.breach\|security.incident" \
  server/src/ --include="*.ts" | head -5

# 오류 모니터링 확인
grep -rn "sentry\|rollbar\|bugsnag\|errorTracking" \
  server/src/ package.json | grep -v node_modules | head -5
```

> **NDB 요건:**
> - 30일 이내 OAIC(호주 개인정보보호위원회)에 신고 의무
> - 영향받은 개인에게 직접 통보 의무

---

## [CHILD] 미성년자 데이터 처리 (Children's Privacy)

```bash
# 미성년자 관련 필드 확인
grep -n "date_of_birth\|dob\|age\|guardian\|parent\|minor\|under_18\
\|parental_consent" db/schema.ts | head -15

# 학부모/보호자 동의 처리 확인
grep -rn "guardian\|parental\|parent_consent\|guardian_consent" \
  server/src/ client/src/ --include="*.ts" --include="*.tsx" | head -10
```

> **적용 기준:**
> - 만 15세 미만: 학부모/보호자 동의 필수 (호주 현행 가이드라인)
> - 만 18세 미만 전체: 민감 정보 수집 시 별도 동의 절차
> - Children's Online Privacy Protection 준수

---

## [RETENTION] 데이터 보존 및 파기 정책 (APP 11.2)

```bash
# 자동 만료/파기 스케줄러 확인
grep -rn "cron\|schedule\|setInterval\|cleanup\|purge\|archive\|retention" \
  server/src/ --include="*.ts" | head -10

# 비활성 계정 처리 방침
grep -n "inactive\|Inactive\|status.*inactive\|last_login\|last_active" \
  db/schema.ts | head -10
```

---

## PHASE 6 보고 형식

```
=== PHASE 6: 호주 개인정보보호법 (Privacy Act 1988) 컴플라이언스 감사 결과 ===

┌─────────────────────────────────────────────────────────────────┐
│  판정 기준: ✅ 적합 | ⚠️ 부분 적합 (보완 필요) | ❌ 위반/미비  │
└─────────────────────────────────────────────────────────────────┘

[APP-1]  개인정보 수집 동의 & 고지 (APP 3, 5):  [상태]
  근거: [코드 근거 또는 "미발견"]
  위험: [법적 위험 설명]

[APP-3]  민감 정보 처리:  [상태]
  발견된 민감 필드: [목록]
  암호화 여부: [상태]

[APP-6]  제3자 데이터 공유 고지:  [상태]
  외부 연동 서비스: [목록]

[APP-8]  국외 이전 (학교 데이터 전송):  [상태]
  대상 국가: [추정 국가 목록]

[APP-9]  정부 식별자 처리:  [상태]
  발견된 식별자 필드: [목록]
  로그 노출 여부: [상태]

[APP-11] 개인정보 보안:  [상태]
  패스워드 해싱: [상태] — [사용 알고리즘]
  민감 컬럼 암호화: [상태]
  데이터 보존 정책: [상태]

[APP-12] 정보 접근권:  [상태]
[APP-13] 정보 수정권:  [상태]

[NDB]    침해 알림 절차:  [상태]
[CHILD]  미성년자 보호:  [상태]
  학부모 동의 절차: [상태]

[RETENTION] 데이터 파기 정책: [상태]

호주 개인정보보호법 전체 준수율: [X/11 항목 적합]
```

---

# 최종 종합 보고서 출력 (PHASE 1-6 완료 후)

```
╔══════════════════════════════════════════════════════════════════╗
║       🐝 EDUBEE CRM — SaaS 아키텍처 & 컴플라이언스 감사 결과       ║
║                   감사 일시: [YYYY-MM-DD HH:MM]                   ║
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 종합 완성도 점수
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

영역                      | 완료 | 부분 | 미비 | 점수
--------------------------|------|------|------|------
멀티테넌시 아키텍처        |  /6  |  /6  |  /6  |  /10
데이터베이스 설계          |  /8  |  /8  |  /8  |  /10
인증 & 보안               |  /9  |  /9  |  /9  |  /10
파일/문서 관리             |  /7  |  /7  |  /7  |  /10
API 설계 & 성능            |  /8  |  /8  |  /8  |  /10
호주 개인정보보호법        | /11  | /11  | /11  |  /10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
전체 종합 점수             |      |      |      |  /60

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. 🔴 즉시 조치 필요 항목 (Critical — SaaS 전환 차단 위험)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[C-1] [항목명] — [위험 설명] — [추천 조치]
[C-2] ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. 🟡 3개월 내 보완 필요 항목 (High)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[H-1] [항목명] — [설명]
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. 🟢 6개월 내 완성 권장 항목 (Medium / Low)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[M-1] [항목명] — [설명]
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. ⚖️ 호주 개인정보보호법 위반 위험 항목 (법적 제재 가능)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[법적위험-1] [APP 조항] — [현재 상태] — [위반 시 제재] — [필요 조치]
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. 다음 단계 권장 작업 순서 (우선순위 TOP 5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Priority 1: [작업명]
  - 작업 범위: [파일 목록]
  - 예상 소요 시간: [X일]
  - 이유: [설명]

Priority 2: ...
```

---

## 📌 감사 실행 시 주의사항

1. **각 PHASE 간 "계속 진행?" 확인 후 다음 단계 실행** — 컨텍스트 윈도우 초과 방지
2. **파일이 예상 위치에 없으면 `find` 명령으로 실제 위치 먼저 탐색**
3. **bash 명령 실패 시 해당 항목은 "❌ 확인 불가 (파일 없음)"으로 기록하고 계속 진행**
4. **실제 코드를 반드시 인용** — 추측 기반 결과 금지
5. **이 감사 프롬프트는 Read-Only** — 어떤 파일도 수정/생성/삭제하지 말 것

---

## 📞 감사 완료 후 참고 자료

| 기관/문서 | URL | 용도 |
|-----------|-----|------|
| OAIC (Office of the Australian Information Commissioner) | oaic.gov.au | 호주 개인정보보호 공식 가이드 |
| Australian Privacy Principles | oaic.gov.au/privacy/australian-privacy-principles | APP 13개 원칙 전문 |
| Notifiable Data Breaches | oaic.gov.au/privacy/notifiable-data-breaches | NDB 신고 절차 |
| ACSC (Australian Cyber Security Centre) | cyber.gov.au | 보안 권고사항 |
| ASD Essential Eight | cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight | 필수 보안 8가지 |
| Children's Privacy | oaic.gov.au/privacy/privacy-guidance-for-organisations/children | 미성년자 데이터 가이드 |

---

*Edubee CRM SaaS Architecture & Australian Privacy Act 1988 Compliance Audit Prompt v1.0*  
*Prepared for Replit AI Agent execution — Read-Only analysis*
