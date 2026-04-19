# 🐝 Edubee CRM — 전체 재검증 자동화 테스트 프롬프트
# 보완 작업 완료 후 실행 | Read-Only + 실행 테스트 | v2.0

---

> **실행 원칙:**
> - 이 프롬프트는 코드를 수정하지 않는다 — 오직 테스트/검증만 수행한다
> - 각 BLOCK을 순서대로 실행하고 결과를 보고한다
> - 각 항목을 PASS / FAIL / WARN / SKIP 으로 판정한다
> - FAIL 항목은 파일명:라인번호와 함께 구체적 근거를 제시한다

---

# ============================================================
# BLOCK A — 하드코딩 & 환경변수 완전 탐지
# ============================================================

## 실행할 명령어 (순서대로)

```bash
echo "=== [A-1] JWT Secret 하드코딩 제거 확인 ==="
grep -rn "edubee-camp-secret\|change-in-production\|refresh-secret-key" \
  . --include="*.ts" --include="*.js" | grep -v node_modules | grep -v ".test."
echo "→ 결과 없으면 PASS, 있으면 FAIL"

echo ""
echo "=== [A-2] API 키 하드코딩 탐지 (Stripe/Resend/Google) ==="
grep -rn "sk_live_\|sk_test_\|rk_live_\|re_[a-zA-Z0-9]\{20,\}\|AIzaSy" \
  . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".env"
echo "→ 결과 없으면 PASS"

echo ""
echo "=== [A-3] DB URL 하드코딩 탐지 ==="
grep -rn "postgresql://\|postgres://" \
  . --include="*.ts" | grep -v node_modules | grep -v "process.env"
echo "→ 결과 없으면 PASS"

echo ""
echo "=== [A-4] 필수 Secrets 등록 확인 ==="
node -e "
const keys = ['JWT_SECRET','JWT_REFRESH_SECRET','FIELD_ENCRYPTION_KEY','DATABASE_URL','ALLOWED_ORIGINS'];
let pass = 0, fail = 0;
keys.forEach(k => {
  const val = process.env[k];
  if (val && val.length > 10) { console.log('  PASS:', k, '(길이:', val.length, ')'); pass++; }
  else { console.log('  FAIL:', k, val ? '(너무 짧음)' : '(미등록)'); fail++; }
});
console.log('결과:', pass + '/' + keys.length + ' 통과');
"

echo ""
echo "=== [A-5] 포트 하드코딩 확인 (R-2) ==="
grep -rn "\.listen(3000\|\.listen(5173\|PORT.*=.*3000" \
  . --include="*.ts" | grep -v "process.env.PORT\|node_modules" | head -5
echo "→ 결과 없으면 PASS"

echo ""
echo "=== [A-6] 절대경로 하드코딩 확인 (R-11) ==="
grep -rn "/home/runner\|/tmp/edubee\|C:\\\\Users" \
  . --include="*.ts" | grep -v node_modules | head -5
echo "→ 결과 없으면 PASS"
```

## BLOCK A 보고 형식
```
=== BLOCK A 결과 ===
[A-1] JWT 하드코딩:  PASS/FAIL — 근거
[A-2] API 키 하드코딩:  PASS/FAIL — 근거
[A-3] DB URL 하드코딩:  PASS/FAIL — 근거
[A-4] Secrets 등록:  X/5 통과 — 미등록 키 목록
[A-5] 포트 하드코딩:  PASS/FAIL
[A-6] 절대경로:  PASS/FAIL
```

---

# ============================================================
# BLOCK B — 보안 미들웨어 적용 확인
# ============================================================

```bash
echo "=== [B-1] Helmet 적용 확인 ==="
grep -rn "app.use(helmet\|import helmet" . --include="*.ts" | grep -v node_modules
echo "→ helmet() 미들웨어 등록 확인"

echo ""
echo "=== [B-2] CORS 도메인 제한 확인 ==="
grep -n "app.use(cors" . -r --include="*.ts" | grep -v node_modules
grep -n "ALLOWED_ORIGINS\|allowedOrigins\|origin:.*\[" . -r --include="*.ts" | grep -v node_modules | head -5
echo "→ cors({origin:}) 방식인지 cors() 전면 개방인지 확인"

echo ""
echo "=== [B-3] Rate Limiting 적용 확인 ==="
grep -rn "rateLimit\|express-rate-limit\|max:.*10\|windowMs" \
  . --include="*.ts" | grep -v node_modules | head -8
echo "→ /auth/login 에 loginLimiter 적용 여부 확인"

echo ""
echo "=== [B-4] RBAC 미들웨어 적용 수 확인 ==="
echo "requireRole 적용 라우트 수:"
grep -rn "requireRole\|superAdminOnly\|adminOnly\|roleGuard" \
  . --include="*.ts" | grep -v node_modules | wc -l

echo ""
echo "=== [B-5] SQL Injection — 위험 패턴 탐지 ==="
grep -rn "sql\`.*\${req\.\|sql\`.*\${params\." \
  . --include="*.ts" | grep -v node_modules | head -5
echo "→ 결과 없으면 PASS (Drizzle ORM 파라미터 바인딩 사용)"

echo ""
echo "=== [B-6] 보안 헤더 실제 응답 확인 ==="
curl -s -I http://localhost:3000/api/health 2>/dev/null \
  | grep -iE "x-frame|strict-transport|x-content-type|x-xss" \
  | head -5
echo "→ 3개 이상 헤더 존재 시 PASS"

echo ""
echo "=== [B-7] Rate Limit 동작 테스트 (로그인 11회) ==="
echo "자동 테스트 시작 (결과: 429 응답 여부 확인)..."
for i in $(seq 1 12); do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"wrong"}' 2>/dev/null)
  echo "  시도 $i: HTTP $code"
done
echo "→ 11번째 이후 429 응답 시 PASS"
```

## BLOCK B 보고 형식
```
=== BLOCK B 결과 ===
[B-1] Helmet:  PASS/FAIL
[B-2] CORS 제한:  PASS/FAIL — (cors() 전면개방이면 FAIL)
[B-3] Rate Limiting:  PASS/FAIL — 적용 라우트 목록
[B-4] RBAC 적용 라우트:  [숫자]개
[B-5] SQL Injection:  PASS/FAIL
[B-6] 보안 헤더:  [발견된 헤더 목록]
[B-7] Rate Limit 동작:  PASS/FAIL — 429 응답 확인 여부
```

---

# ============================================================
# BLOCK C — 자동화 로직 & 비즈니스 워크플로우 오류
# ============================================================

```bash
echo "=== [C-1] 이메일 실패 try/catch 처리 확인 (R-8) ==="
# 이메일 발송 코드 주변에 catch 처리 있는지 확인
grep -B2 -A8 "resend\.\|sendEmail\|nodemailer" \
  . -r --include="*.ts" | grep -A5 "await" | grep "catch\|try\|.catch(" | head -10
echo "→ catch 처리 없는 이메일 발송은 FAIL"

echo ""
echo "=== [C-2] 서비스 모듈 자동 활성화 로직 확인 ==="
grep -rn "service_module_type\|autoActivate\|createMgtRecord\|_mgt.*insert" \
  . --include="*.ts" | grep -v node_modules | head -8

echo ""
echo "=== [C-3] 이중 분개(Journal Entry) 자동 생성 확인 ==="
grep -rn "journal_entries\|createJournalEntry\|double.*entry\|debit.*credit" \
  . --include="*.ts" | grep -v node_modules | head -5

echo ""
echo "=== [C-4] Stripe Webhook 이벤트 처리 완전성 확인 ==="
grep -rn "payment_intent\|charge.succeeded\|invoice.paid\|subscription" \
  . --include="*.ts" | grep -v node_modules | head -8

echo ""
echo "=== [C-5] KPI 스케줄러 등록 확인 ==="
grep -rn "cron.schedule\|scheduleJob\|new CronJob" \
  . --include="*.ts" | grep -v node_modules

echo ""
echo "=== [C-6] 마케팅 동의 확인 후 이메일 발송 로직 ==="
grep -rn "marketing_consent" . --include="*.ts" \
  | grep -v "schema\|migration\|node_modules" | head -5
echo "→ 발송 전 marketing_consent 체크 로직 있으면 PASS"

echo ""
echo "=== [C-7] Seed 데이터 upsert(멱등성) 확인 (R-9) ==="
grep -rn "onConflictDoNothing\|onConflictDoUpdate\|upsert\|DO NOTHING" \
  . --include="*.ts" --include="*.sql" | grep -v node_modules | head -5

echo ""
echo "=== [C-8] GST 1/11 계산 로직 확인 ==="
grep -rn "/ 11\|gst.*11\|11.*gst\|GST.*amount\|tax.*11" \
  . --include="*.ts" | grep -v node_modules | head -5

echo ""
echo "=== [C-9] AR → AP 순서 검증 로직 확인 ==="
grep -rn "ar_due_date.*ap_due_date\|ap.*ar.*order\|payment.*schedule.*validation" \
  . --include="*.ts" | grep -v node_modules | head -3
```

## BLOCK C 보고 형식
```
=== BLOCK C 결과 ===
[C-1] 이메일 try/catch:  PASS/FAIL — catch 누락 파일 목록
[C-2] 서비스 모듈 자동 활성화:  PASS/FAIL/PARTIAL
[C-3] 이중 분개 자동 생성:  PASS/FAIL
[C-4] Stripe Webhook 이벤트:  처리 중인 이벤트 목록
[C-5] KPI 스케줄러:  PASS/FAIL — 등록된 cron 목록
[C-6] 마케팅 동의 체크:  PASS/FAIL
[C-7] Seed 멱등성:  PASS/FAIL
[C-8] GST 계산:  PASS/FAIL
[C-9] AR→AP 순서 검증:  PASS/FAIL
```

---

# ============================================================
# BLOCK D — 파일 스토리지 & 문서 관리
# ============================================================

```bash
echo "=== [D-1] Signed URL TTL 설정 확인 ==="
grep -n "900\|300\|signObject\|createSignedUrl\|TTL" \
  . -r --include="*.ts" | grep -v node_modules | grep -i "url\|sign\|ttl\|expire" | head -5
echo "→ 다운로드 900초, 업로드 300초 설정 확인"

echo ""
echo "=== [D-2] 파일 타입 화이트리스트 — 전체 업로드 라우트 적용 ==="
grep -rn "fileFilter\|allowedTypes\|mimetype.*includes\|whitelist" \
  . --include="*.ts" | grep -v node_modules | head -8
echo "→ documents.ts 포함 여부 확인"

echo ""
echo "=== [D-3] 파일 크기 제한 전체 라우트 확인 ==="
grep -rn "fileSize\|limits.*size\|maxSize\|MAX_FILE" \
  . --include="*.ts" | grep -v node_modules | head -10

echo ""
echo "=== [D-4] 파일명 sanitize — Path Traversal 방지 ==="
grep -rn "path.basename\|sanitize.*file\|filename.*replace\|\.\.\/" \
  . --include="*.ts" | grep -v node_modules | head -5

echo ""
echo "=== [D-5] PDF 생성 방식 확인 (R-4: Puppeteer 미사용) ==="
grep -rn "puppeteer" . --include="*.ts" --include="package.json" | grep -v node_modules
echo "→ puppeteer 없으면 PASS"
grep -rn "child_process\|ReactPDF\|@react-pdf" \
  . --include="*.ts" | grep -v node_modules | head -3

echo ""
echo "=== [D-6] 문서 접근 RBAC 확인 ==="
grep -n "verifyDocumentAccess\|documents.*requireRole\|document.*auth" \
  . -r --include="*.ts" | grep -v node_modules | head -5
echo "→ /documents/:id/view 와 /documents/:id/download 라우트 보호 여부"

echo ""
echo "=== [D-7] GCS 버킷 리전 확인 (데이터 주권) ==="
grep -rn "GCS_BUCKET\|BUCKET_NAME\|bucketName\|australia\|asia-southeast\|STORAGE_BUCKET" \
  . --include="*.ts" | grep -v node_modules | head -3
echo "→ australia-southeast1 리전이면 PASS (개인정보 역외이전 리스크 감소)"
```

## BLOCK D 보고 형식
```
=== BLOCK D 결과 ===
[D-1] Signed URL TTL:  PASS/FAIL — 설정값
[D-2] 파일 타입 화이트리스트:  PASS/PARTIAL/FAIL — 미적용 라우트 목록
[D-3] 파일 크기 제한:  라우트별 제한값 목록
[D-4] Path Traversal 방지:  PASS/FAIL
[D-5] PDF (Puppeteer 미사용):  PASS/FAIL
[D-6] 문서 접근 RBAC:  PASS/FAIL
[D-7] GCS 리전:  [리전명 또는 "미확인"]
```

---

# ============================================================
# BLOCK E — 🇦🇺 호주 Privacy Act 1988 컴플라이언스 테스트
# ============================================================

```bash
echo "=== [E-1] 여권번호 암호화 적용 확인 (APP 11) ==="
grep -rn "encryptField\|AES\|createCipheriv\|passport.*encrypt" \
  . --include="*.ts" | grep -v node_modules | head -5
echo "→ encryptField 호출 없으면 FAIL"

# DB에서 직접 확인 (여권번호가 평문인지 암호화인지)
psql $DATABASE_URL -c "
  SELECT 'passport 샘플:' as col, substring(passport_number, 1, 20) as sample
  FROM contacts WHERE passport_number IS NOT NULL LIMIT 1;
" 2>/dev/null || echo "DB 직접 접속하여 contacts 테이블 passport_number 컬럼 확인 필요"
echo "→ hex:iv:authTag:encrypted 형식이면 PASS, 평문이면 FAIL"

echo ""
echo "=== [E-2] pino redact — 민감 정보 로그 마스킹 확인 (APP 11) ==="
grep -rn "redact\|REDACTED\|pino.*passport\|pino.*medical" \
  . --include="*.ts" | grep -v node_modules | head -5
echo "→ redact 설정에 passport_number, medical_conditions 포함 여부"

echo ""
echo "=== [E-3] 개인정보처리방침 API 응답 확인 (APP 5, 8) ==="
curl -s http://localhost:3000/api/privacy-policy 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('third_party_disclosure:', len(d.get('third_party_disclosure',[])), '건'); print('operators:', d.get('operator','없음')[:50])" \
  2>/dev/null || echo "→ 서버 기동 후 GET /api/privacy-policy 확인 필요"

echo ""
echo "=== [E-4] 국외 이전 서비스 고지 확인 (APP 8) ==="
curl -s http://localhost:3000/api/privacy-policy 2>/dev/null \
  | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  services = [x['name'] for x in d.get('third_party_disclosure',[])]
  for required in ['Stripe','Resend','Google']:
    found = any(required in s for s in services)
    print(f'  {required}: {\"PASS\" if found else \"FAIL — 미고지\"}')
except: print('응답 파싱 실패 — 서버 기동 후 재실행')
" 2>/dev/null

echo ""
echo "=== [E-5] 미성년자 보호자 동의 로직 확인 (CHILD) ==="
grep -rn "guardian_consent\|is_minor\|checkMinor\|under_18\|age.*18" \
  . --include="*.ts" | grep -v node_modules | head -5
echo "→ guardian_consent_given 요구 로직 있으면 PASS"

echo ""
echo "=== [E-6] NDB 침해 사고 테이블 존재 확인 ==="
psql $DATABASE_URL -c "\dt security_incidents" 2>/dev/null \
  || grep -rn "security_incidents\|securityIncidents" . --include="*.ts" \
     | grep -v node_modules | head -3
echo "→ 테이블 존재하면 PASS"

echo ""
echo "=== [E-7] 자기 데이터 열람 API 확인 (APP 12) ==="
curl -s http://localhost:3000/api/portal/my-data 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('응답 키:', list(d.keys()))" \
  2>/dev/null || echo "→ 인증 토큰 없으면 401 응답 예상 — 정상"

echo ""
echo "=== [E-8] 데이터 수정 요청 API 확인 (APP 13) ==="
grep -rn "correction.request\|correctionRequest\|APP.*13" \
  . --include="*.ts" | grep -v node_modules | head -3

echo ""
echo "=== [E-9] 데이터 보존 정책 확인 (APP 11.2 / ATO 7년) ==="
grep -rn "retention\|7.*year\|2555 days\|RETENTION_PERIOD" \
  . --include="*.ts" | grep -v node_modules | head -3

echo ""
echo "=== [E-10] 동의 철회 메커니즘 확인 ==="
grep -rn "withdraw.*consent\|opt.out\|unsubscribe\|consent.*revoke" \
  . --include="*.ts" | grep -v node_modules | head -3
```

## BLOCK E 보고 형식
```
=== BLOCK E: Privacy Act 1988 컴플라이언스 결과 ===

┌────────────────────────────────────────────────────────┐
│  법적 제재 가능 항목 우선 확인                          │
└────────────────────────────────────────────────────────┘

[E-1]  APP-11 여권번호 암호화:  PASS/FAIL — DB 실제 저장값 확인
[E-2]  APP-11 로그 마스킹:     PASS/FAIL — redact 설정 여부
[E-3]  APP-5  개인정보처리방침: PASS/FAIL — API 존재 여부
[E-4]  APP-8  국외 이전 고지:  PASS/FAIL — Stripe/Resend/Google 포함
[E-5]  CHILD  미성년자 동의:   PASS/FAIL — guardian_consent 로직
[E-6]  NDB    침해 테이블:     PASS/FAIL — security_incidents 존재
[E-7]  APP-12 자기 열람 API:   PASS/FAIL
[E-8]  APP-13 수정 요청 API:   PASS/FAIL
[E-9]  APP-11 데이터 보존 정책: PASS/FAIL/PARTIAL
[E-10] 동의 철회 메커니즘:     PASS/FAIL

호주 Privacy Act 준수율: [X/10 항목]
```

---

# ============================================================
# BLOCK F — 기술적 오류 & TypeScript
# ============================================================

```bash
echo "=== [F-1] TypeScript 컴파일 오류 0개 확인 ==="
npx tsc --noEmit 2>&1 | tail -20
echo "→ error TS 없으면 PASS"

echo ""
echo "=== [F-2] 서버 정상 기동 확인 ==="
# 서버 백그라운드 실행 후 health check
node -e "
const http = require('http');
const options = { hostname: 'localhost', port: 3000, path: '/api/health', method: 'GET' };
const req = http.request(options, (res) => {
  console.log('서버 응답 HTTP:', res.statusCode);
  res.statusCode === 200 ? console.log('PASS') : console.log('WARN: 비정상 상태 코드');
});
req.on('error', () => console.log('SKIP: 서버가 현재 미기동 상태'));
req.end();
" 2>/dev/null

echo ""
echo "=== [F-3] DB 마이그레이션 최신 상태 확인 ==="
npx drizzle-kit check 2>&1 | head -5
echo "→ pending migration 없으면 PASS"

echo ""
echo "=== [F-4] 신규 테이블 생성 확인 ==="
psql $DATABASE_URL -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('security_incidents','audit_logs','correction_requests')
ORDER BY table_name;
" 2>/dev/null || echo "→ DB 직접 접속하여 확인"

echo ""
echo "=== [F-5] 글로벌 에러 핸들러 표준 응답 확인 ==="
response=$(curl -s http://localhost:3000/api/nonexistent-endpoint-xyz 2>/dev/null)
echo "응답: $response" | python3 -c "
import sys, json
try:
  line = sys.stdin.read()
  start = line.find('{')
  d = json.loads(line[start:])
  has_success = 'success' in d
  has_code = 'code' in d
  has_message = 'message' in d
  print(f'  success 필드: {\"PASS\" if has_success else \"FAIL\"}')
  print(f'  code 필드: {\"PASS\" if has_code else \"FAIL\"}')
  print(f'  message 필드: {\"PASS\" if has_message else \"FAIL\"}')
except: print('  서버 미기동 또는 응답 없음')
" 2>/dev/null

echo ""
echo "=== [F-6] DB 인덱스 생성 확인 ==="
psql $DATABASE_URL -c "
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('contacts','leads','contracts','users')
  AND indexname NOT LIKE '%pkey'
ORDER BY tablename, indexname;
" 2>/dev/null || echo "→ DB 직접 접속하여 확인"

echo ""
echo "=== [F-7] UTC 타임존 설정 확인 (R-14) ==="
grep -n "process.env.TZ\|TZ.*UTC\|timezone.*UTC" \
  . -r --include="*.ts" | grep -v node_modules | head -3
node -e "console.log('현재 서버 TZ:', process.env.TZ || '미설정')"

echo ""
echo "=== [F-8] 보안 취약점 스캔 ==="
npm audit --audit-level=high 2>&1 | tail -5
```

## BLOCK F 보고 형식
```
=== BLOCK F 결과 ===
[F-1] TypeScript 오류:  [0개면 PASS / 에러 개수 및 내용]
[F-2] 서버 기동:  PASS/FAIL
[F-3] DB 마이그레이션:  PASS/FAIL
[F-4] 신규 테이블:  존재하는 테이블 목록
[F-5] 에러 응답 표준화:  PASS/PARTIAL/FAIL
[F-6] DB 인덱스:  [발견된 인덱스 목록]
[F-7] UTC 타임존:  PASS/FAIL — [TZ 값]
[F-8] npm audit:  [취약점 수 및 수준]
```

---

# ============================================================
# BLOCK G — Generic SaaS 품질 확인
# ============================================================

```bash
echo "=== [G-1] 멀티테넌트 격리 — tenantResolver 확인 ==="
grep -rn "tenantResolver\|runWithTenantSchema\|AsyncLocalStorage\|search_path" \
  . --include="*.ts" | grep -v node_modules | head -5

echo ""
echo "=== [G-2] 플랜별 기능 제한 런타임 강제 확인 ==="
grep -rn "checkPlanFeature\|planLimit\|plan.*feature.*check\|platformPlans" \
  . --include="*.ts" | grep -v node_modules | head -5
echo "→ 기능 호출 시 플랜 확인 로직 있으면 PASS"

echo ""
echo "=== [G-3] pino 구조화 로깅 적용 확인 ==="
grep -rn "from 'pino'\|require('pino')\|createLogger.*pino" \
  . --include="*.ts" | grep -v node_modules | head -3
echo "→ console.log 잔존 개수:"
grep -rn "console\.log(" . --include="*.ts" | grep -v node_modules | grep -v ".test.\|seed\|script" | wc -l

echo ""
echo "=== [G-4] Sentry 모니터링 연동 확인 ==="
grep -rn "Sentry.init\|@sentry/node\|captureException" \
  . --include="*.ts" | grep -v node_modules | head -3

echo ""
echo "=== [G-5] API 응답 시간 측정 ==="
echo "주요 엔드포인트 응답 시간:"
time curl -s -o /dev/null http://localhost:3000/api/health 2>&1

echo ""
echo "=== [G-6] DB 연결 pooler 설정 확인 (R-3) ==="
node -e "
const url = process.env.DATABASE_URL || '';
const port = url.match(/:(\d+)\//)?.[1];
console.log('DB URL 포트:', port || '미감지');
console.log('Pooler(6543):', port === '6543' ? 'PASS' : port ? 'WARN: ' + port : 'SKIP');
"

echo ""
echo "=== [G-7] 우아한 종료(Graceful Shutdown) 구현 확인 ==="
grep -rn "SIGTERM\|SIGINT\|graceful\|server.close\|beforeExit" \
  . --include="*.ts" | grep -v node_modules | head -3

echo ""
echo "=== [G-8] i18n 언어 파일 존재 확인 ==="
find . \( -name "en.json" -o -name "ko.json" -o -name "ja.json" -o -name "th.json" \) \
  | grep -v node_modules | head -8
echo "→ 4개 언어 파일 모두 있으면 PASS"

echo ""
echo "=== [G-9] Vitest 테스트 실행 ==="
npm test 2>&1 | tail -10

echo ""
echo "=== [G-10] 빌드 정상 완료 확인 ==="
npm run build 2>&1 | tail -5
```

## BLOCK G 보고 형식
```
=== BLOCK G 결과 ===
[G-1] 멀티테넌트 격리:  PASS/FAIL
[G-2] 플랜 기능 제한:   PASS/PARTIAL/FAIL
[G-3] pino 로깅:       PASS/FAIL — console.log 잔존 [N]개
[G-4] Sentry 모니터링:  PASS/FAIL
[G-5] API 응답 시간:   [ms]
[G-6] DB Pooler:       PASS/WARN — 포트 [N]
[G-7] Graceful Shutdown: PASS/FAIL
[G-8] i18n 파일:       PASS/PARTIAL — [발견된 언어 목록]
[G-9] Vitest 테스트:   PASS/FAIL — [통과/전체]
[G-10] 빌드:           PASS/FAIL
```

---

# ============================================================
# 최종 종합 보고서 출력
# ============================================================

## 모든 BLOCK 완료 후 아래 형식으로 최종 보고서를 출력하라:

```
╔══════════════════════════════════════════════════════════════════╗
║    🐝 EDUBEE CRM — 전체 재검증 완료 보고서                        ║
║    검증 일시: [YYYY-MM-DD HH:MM] | 검증자: Replit AI              ║
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 영역별 PASS/FAIL 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

영역                        | PASS | FAIL | WARN | 점수
----------------------------|------|------|------|------
A. 하드코딩 & 환경변수       |      |      |      | /6
B. 보안 미들웨어             |      |      |      | /7
C. 자동화 & 비즈니스 로직    |      |      |      | /9
D. 파일 스토리지             |      |      |      | /7
E. 호주 Privacy Act 1988    |      |      |      | /10
F. 기술적 오류 & TypeScript  |      |      |      | /8
G. Generic SaaS 품질         |      |      |      | /10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
전체                         |  /57 |      |      | /57

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. 🔴 FAIL 항목 목록 (즉시 재작업 필요)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[FAIL-1] [항목 코드] — [설명] — [파일:라인]
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. ⚠️  WARN 항목 목록 (개선 권장)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[WARN-1] ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. ⚖️  호주 Privacy Act 미준수 항목 (법적 위험)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[PP-FAIL-1] [APP 조항] — [현재 상태] — [위반 수준]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. 다음 우선 작업 (TOP 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1순위: [작업명] — [이유]
2순위: [작업명] — [이유]
3순위: [작업명] — [이유]
```

---

*Edubee CRM 전체 재검증 프롬프트 v2.0 — 2026-04-19*
*보완 완료 후 실행 | Read-Only 분석 + 자동화 테스트*
