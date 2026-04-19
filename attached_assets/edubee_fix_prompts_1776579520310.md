# 🐝 Edubee CRM — 감사 결과 보완 Replit 실행 프롬프트 패키지

**감사 기준일:** 2026-04-19 | **대상 코드베이스:** 1,311개 파일 (TS/TSX) | **실제 발견 기반**

---

> **실행 원칙:**
> - 각 프롬프트를 **하나씩** Replit AI에 붙여넣어 실행한다
> - 이전 프롬프트 완료 확인 후 다음으로 진행한다
> - 각 프롬프트는 독립적으로 실행 가능하다
> - 모든 프롬프트는 **"바로 해줘"** 방식으로 작성되어 있다

---

# 🔴 SPRINT 1 — 오늘 즉시 (보안 긴급 4개)

## PROMPT-S1-01: JWT Secret 하드코딩 제거

```
## 작업 목적
auth.ts:16-17에 JWT_SECRET, JWT_REFRESH_SECRET fallback 문자열이 하드코딩되어 있어
환경변수 미설정 시 토큰 위조가 가능한 Critical 보안 취약점을 수정한다.

## 분석 지시
1. 먼저 아래 파일을 읽어라:
   - auth.ts (미들웨어 파일)
   - artifacts/api-server/src/routes/auth.ts (또는 인증 라우트 파일)
2. JWT_SECRET, JWT_REFRESH_SECRET 사용 위치를 모두 확인하라
3. 수정 계획을 보고하라

## 수정 지시 (바로 해줘)
1. auth.ts의 fallback 문자열을 제거하고 아래로 교체:

   현재 코드:
   const JWT_SECRET = process.env.JWT_SECRET || "edubee-camp-secret-key-change-in-production";
   const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "edubee-camp-refresh-secret-key...";

   수정 후:
   const JWT_SECRET = process.env.JWT_SECRET;
   const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
   
   if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
     console.error("[FATAL] JWT_SECRET or JWT_REFRESH_SECRET is not set in environment variables.");
     process.exit(1);
   }

2. Replit Secrets 탭에 아래 두 값을 등록하라고 나에게 안내하라:
   - JWT_SECRET = [32자 이상 랜덤 문자열 생성해서 알려줄 것]
   - JWT_REFRESH_SECRET = [32자 이상 랜덤 문자열 생성해서 알려줄 것]
   각각 Node.js crypto.randomBytes(32).toString('hex') 결과값 예시를 출력하라.

## 검증
1. npx tsc --noEmit → TypeScript 오류 0개
2. 서버 기동 시 Secrets 미설정 상태에서 process.exit(1) 메시지 확인
3. Secrets 등록 후 서버 정상 기동 확인
```

---

## PROMPT-S1-02: CORS 도메인 제한

```
## 작업 목적
app.ts:14의 cors() 전면 개방 설정을 실제 운영 도메인으로 제한한다.

## 분석 지시
1. artifacts/api-server/src/app.ts (또는 서버 진입점 파일)를 읽어라
2. cors() 사용 위치와 현재 설정을 확인하라
3. .env 또는 Secrets에 ALLOWED_ORIGINS 키 존재 여부를 확인하라

## 수정 지시 (바로 해줘)
app.ts의 cors 설정을 아래로 교체:

   현재:
   app.use(cors());

   수정 후:
   const allowedOrigins = process.env.ALLOWED_ORIGINS
     ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
     : ['http://localhost:5173', 'http://localhost:3000'];

   app.use(cors({
     origin: (origin, callback) => {
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error(`CORS blocked: ${origin}`));
       }
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization'],
   }));

Replit Secrets에 아래를 등록하도록 안내하라:
ALLOWED_ORIGINS = https://yourapp.replit.app,https://yourdomain.edubee.co
(실제 Replit 앱 URL을 확인해서 알려줄 것)

## 검증
1. npx tsc --noEmit
2. 서버 기동 후 허용 도메인에서 API 호출 → 200 응답
3. 차단 도메인에서 API 호출 → CORS 에러 응답
```

---

## PROMPT-S1-03: Helmet 보안 헤더 추가

```
## 작업 목적
HTTP 보안 헤더(XSS, Clickjacking, HSTS 등)가 완전히 없는 상태를 Helmet으로 즉시 보완한다.

## 수정 지시 (바로 해줘)
1. helmet 패키지 설치:
   npm install helmet
   npm install --save-dev @types/helmet

2. app.ts 상단에 추가 (cors() 설정 이전):

   import helmet from 'helmet';

   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         scriptSrc: ["'self'"],
         imgSrc: ["'self'", "data:", "https://storage.googleapis.com"],
         connectSrc: ["'self'"],
       },
     },
     crossOriginEmbedderPolicy: false, // PDF/파일 다운로드 허용
   }));

## 검증
1. npm install 완료 확인
2. npx tsc --noEmit
3. 서버 기동 후 GET /health 응답 헤더에서 아래 확인:
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security: max-age=15552000...
```

---

## PROMPT-S1-04: Rate Limiting 로그인 엔드포인트 적용

```
## 작업 목적
/auth/login, /auth/refresh 엔드포인트의 무제한 시도 가능 취약점을 Rate Limiting으로 차단한다.

## 수정 지시 (바로 해줘)
1. 패키지 설치:
   npm install express-rate-limit
   npm install --save-dev @types/express-rate-limit

2. 인증 라우트 파일(auth.ts 또는 routes/auth.ts)에 추가:

   import rateLimit from 'express-rate-limit';

   // 로그인 Rate Limit: 15분 내 10회 초과 시 차단
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 10,
     message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
     standardHeaders: true,
     legacyHeaders: false,
     keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
   });

   // Refresh Token Rate Limit: 15분 내 30회 초과 시 차단
   const refreshLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 30,
     message: { error: 'Too many refresh attempts.' },
   });

   // 라우트에 적용
   router.post('/login', loginLimiter, loginHandler);
   router.post('/refresh', refreshLimiter, refreshHandler);

3. 또한 app.ts에 전체 API 일반 Rate Limit 추가:
   
   const generalLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 500,
     message: { error: 'Rate limit exceeded.' },
   });
   app.use('/api/', generalLimiter);

## 검증
1. npx tsc --noEmit
2. 서버 기동 확인
3. /auth/login을 11회 연속 호출 → 11번째에 429 응답 확인
```

---

# 🟠 SPRINT 2 — 2주 이내 (Privacy Act 준수 5개)

## PROMPT-S2-01: 여권·비자번호 암호화 (APP 11)

```
## 작업 목적
services.ts:162, applications.ts:138, crm.ts:40에 여권번호·비자번호가 평문 저장되어
호주 Privacy Act 1988 APP 11 위반 상태다. AES-256 암호화를 적용한다.

## 분석 지시 (먼저 수행)
1. 아래 파일을 읽어라:
   - lib/db/src/schema/services.ts (라인 155~170 근처)
   - lib/db/src/schema/applications.ts (라인 135~145 근처)
   - lib/db/src/schema/crm.ts (라인 35~50 근처)
2. 여권번호, 비자번호를 저장·조회하는 라우트 파일을 찾아라
3. 현재 저장/조회 방식을 확인하고 영향 범위를 보고하라

## 진행해 (내가 확인 후 실행)
1. 암호화 유틸 파일 생성: lib/crypto/sensitive.ts

   import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

   const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY;
   if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
     throw new Error('[FATAL] FIELD_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
   }
   
   const KEY = Buffer.from(ENCRYPTION_KEY, 'hex');
   const ALGORITHM = 'aes-256-gcm';

   export function encryptField(plaintext: string): string {
     if (!plaintext) return plaintext;
     const iv = randomBytes(16);
     const cipher = createCipheriv(ALGORITHM, KEY, iv);
     const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
     const authTag = cipher.getAuthTag();
     return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
   }

   export function decryptField(ciphertext: string): string {
     if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
     const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
     const iv = Buffer.from(ivHex, 'hex');
     const authTag = Buffer.from(authTagHex, 'hex');
     const encrypted = Buffer.from(encryptedHex, 'hex');
     const decipher = createDecipheriv(ALGORITHM, KEY, iv);
     decipher.setAuthTag(authTag);
     return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
   }

   export function maskPassport(passport: string): string {
     if (!passport || passport.length < 4) return '****';
     return passport.slice(0, 2) + '****' + passport.slice(-2);
   }

2. 여권번호·비자번호 저장 시 encryptField() 호출
3. 조회 시 decryptField() 호출
4. 목록 페이지에서는 maskPassport() 적용

Replit Secrets에 추가:
FIELD_ENCRYPTION_KEY = [64자 hex 문자열 — Node.js crypto.randomBytes(32).toString('hex') 값]

## 마이그레이션 주의사항
- 기존 평문 데이터가 있다면 마이그레이션 스크립트로 일괄 암호화 필요
- 마이그레이션 전 DB 백업 필수
```

---

## PROMPT-S2-02: 미성년자 보호자 동의 절차 구현 (CHILD Privacy)

```
## 작업 목적
캠프/학생 등록 시 만 18세 미만 학생의 의료정보·개인정보 수집에 대한
보호자 동의 절차가 없는 상태를 구현한다.
(호주 Privacy Act — 미성년자 민감 정보 수집 보호자 동의 필수)

## 분석 지시 (먼저 수행)
1. lib/db/src/schema/camp.ts (라인 110~120 근처 medical_conditions 확인)
2. lib/db/src/schema/applications.ts (date_of_birth, guardian 관련 필드 확인)
3. 캠프 신청 라우트 파일을 찾아서 현재 등록 플로우를 확인하라

## 진행해
1. DB 스키마 확인 후 applications 또는 contacts 테이블에 아래 필드 추가 (없는 경우만):
   - guardian_consent_given: boolean (default false)
   - guardian_consent_at: timestamp (nullable)
   - guardian_email: varchar(255) (nullable)
   - is_minor: boolean (computed from date_of_birth)

2. 학생 등록/신청 라우트에 미성년자 판별 미들웨어 추가:

   function checkMinorConsent(req, res, next) {
     const { date_of_birth, guardian_consent_given, guardian_email } = req.body;
     if (!date_of_birth) return next();
     
     const age = Math.floor((Date.now() - new Date(date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
     
     if (age < 18) {
       if (!guardian_consent_given) {
         return res.status(400).json({
           error: 'Parental/guardian consent is required for applicants under 18 years of age.',
           requiresGuardianConsent: true,
           applicantAge: age
         });
       }
       if (!guardian_email) {
         return res.status(400).json({
           error: 'Guardian email is required for minor applicants.',
         });
       }
     }
     next();
   }

3. 해당 미들웨어를 camp 신청, contact 생성 라우트에 적용
4. 미성년자 등록 시 보호자 이메일로 동의 확인 이메일 발송 기능 추가 (Resend 사용)

## 검증
1. npx tsc --noEmit
2. 2008년생 미성년자로 신청 → 400 에러 + requiresGuardianConsent:true 반환 확인
3. guardian_consent_given:true + guardian_email 포함 → 정상 등록 확인
```

---

## PROMPT-S2-03: 개인정보처리방침 API 엔드포인트 추가 (APP 5, 8)

```
## 작업 목적
현재 개인정보처리방침(Privacy Notice)이 없고, Stripe·Resend·Google AI 등
해외 서버로 개인정보가 이전됨에도 고지가 없다 (APP 5, APP 8 위반).
개인정보처리방침 관련 API와 동의 기록 시스템을 구현한다.

## 수정 지시 (바로 해줘)
1. 새 라우트 파일 생성: artifacts/api-server/src/routes/privacy.ts

   router.get('/privacy-policy', (req, res) => {
     res.json({
       version: '1.0',
       effective_date: '2026-04-19',
       operator: 'Edubee.Co — Suite 804, 343 Little Collins Street, Melbourne VIC 3000',
       contact: 'privacy@edubee.co',
       data_collected: [
         'Personal identification (name, email, phone, date of birth)',
         'Government identifiers (passport number, visa number)',
         'Health and medical information (where provided)',
         'Financial information (payment records)',
       ],
       third_party_disclosure: [
         { name: 'Stripe Inc.', country: 'United States', purpose: 'Payment processing', adequacy: 'Standard Contractual Clauses' },
         { name: 'Resend Inc.', country: 'United States', purpose: 'Email communications', adequacy: 'Standard Contractual Clauses' },
         { name: 'Google LLC', country: 'United States', purpose: 'File storage (GCS) and AI features (Gemini)', adequacy: 'Standard Contractual Clauses' },
       ],
       retention_period: '7 years from contract end date (ATO requirement)',
       your_rights: ['Access (APP 12)', 'Correction (APP 13)', 'Complaint to OAIC'],
       oaic_contact: 'https://www.oaic.gov.au',
     });
   });

   // 동의 철회 요청 엔드포인트
   router.post('/privacy/withdraw-consent', authenticate, async (req, res) => {
     const { consent_type } = req.body; // 'marketing', 'data_processing'
     // 동의 철회 처리 로직
     res.json({ message: 'Consent withdrawal request received. We will process within 30 days.' });
   });

2. index.ts 라우트 등록에 추가:
   app.use('/api', privacyRouter);

3. 가입/신청 폼에 개인정보처리방침 동의 체크박스 확인 미들웨어 추가:
   - privacy_policy_accepted: boolean
   - privacy_policy_version: string ('1.0')
   - privacy_policy_accepted_at: timestamp

## 검증
1. GET /api/privacy-policy → 200 + 완전한 JSON 응답 확인
2. 신청 폼에 privacy_policy_accepted:false → 400 에러 확인
```

---

## PROMPT-S2-04: NDB 침해 알림 기반 구조 구현

```
## 작업 목적
호주 Notifiable Data Breaches (NDB) Scheme에 따라 30일 이내 OAIC 통보 의무가 있으나
현재 침해 감지·알림 체계가 전무하다. 기반 구조를 구현한다.

## 수정 지시 (바로 해줘)
1. DB 스키마에 security_incidents 테이블 추가:
   (lib/db/src/schema/security.ts 신규 생성)

   export const securityIncidents = pgTable('security_incidents', {
     id: uuid('id').primaryKey().defaultRandom(),
     incident_type: varchar('incident_type', { length: 50 }).notNull(),
     // 유형: 'unauthorized_access', 'data_breach', 'account_compromise', 'suspicious_activity'
     severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical
     description: text('description').notNull(),
     affected_records_count: integer('affected_records_count'),
     affected_data_types: text('affected_data_types').array(),
     // 예: ['passport_number', 'medical_information', 'financial_data']
     detected_at: timestamp('detected_at').notNull().defaultNow(),
     reported_to_oaic: boolean('reported_to_oaic').notNull().default(false),
     reported_to_oaic_at: timestamp('reported_to_oaic_at'),
     oaic_report_number: varchar('oaic_report_number', { length: 100 }),
     notification_sent_to_affected: boolean('notification_sent_to_affected').notNull().default(false),
     resolved_at: timestamp('resolved_at'),
     notes: text('notes'),
     created_by: uuid('created_by').notNull(),
     created_at: timestamp('created_at').notNull().defaultNow(),
   });

2. 침해 알림 유틸 함수 생성: lib/utils/incidentNotifier.ts

   export async function reportSecurityIncident(incident: {
     type: string;
     severity: 'low' | 'medium' | 'high' | 'critical';
     description: string;
     affectedDataTypes: string[];
     estimatedAffectedCount: number;
   }) {
     // 1. DB에 기록
     // 2. severity가 'high' 또는 'critical'이면 관리자에게 즉시 이메일 발송
     // 3. 로그 기록
     console.error('[SECURITY INCIDENT]', JSON.stringify(incident));
     
     // Resend를 통해 admin에게 알림
     // NDB 30일 타이머 시작 메모
   }

3. Replit Secrets에 추가:
   SECURITY_ALERT_EMAIL = admin@edubee.co (침해 알림 수신 이메일)

4. 글로벌 에러 핸들러에 보안 관련 에러 분류 추가

## 검증
1. npx tsc --noEmit
2. npx drizzle-kit push
3. security_incidents 테이블 생성 확인
```

---

## PROMPT-S2-05: APP 12/13 자기 데이터 열람·수정 API

```
## 작업 목적
학생·고객이 자신의 개인정보를 열람하고 수정 요청할 수 있는 API가 없어
APP 12(접근권), APP 13(수정권) 위반 상태. 포털 사용자용 자기 데이터 API를 구현한다.

## 수정 지시 (바로 해줘)
1. 새 라우트 파일 생성: artifacts/api-server/src/routes/portal/my-data.ts

   import { Router } from 'express';
   import { authenticate } from '../middleware/authenticate';
   
   const router = Router();
   router.use(authenticate);

   // APP 12 — 자기 개인정보 열람
   router.get('/my-data', async (req, res) => {
     const userId = req.user.id;
     // contacts, applications, contracts 등에서 본인 데이터 조회
     // 민감 정보(여권번호)는 마스킹 처리 후 반환
     res.json({
       personal_info: { /* name, email, phone, dob */ },
       applications: [ /* 본인 신청 내역 */ ],
       consents: { /* 동의 내역 및 날짜 */ },
       data_request_rights: {
         access: 'You may request a full copy of your personal data.',
         correction: 'You may request correction of inaccurate data.',
         complaint: 'You may lodge a complaint with OAIC at oaic.gov.au',
       }
     });
   });

   // APP 13 — 데이터 수정 요청
   router.post('/my-data/correction-request', async (req, res) => {
     const { field_name, current_value, requested_value, reason } = req.body;
     // correction_requests 테이블에 기록 (별도 테이블 필요)
     // 관리자에게 알림 이메일 발송
     res.json({
       message: 'Your correction request has been received and will be reviewed within 30 days.',
       request_id: `COR-${Date.now()}`,
       submitted_at: new Date().toISOString(),
     });
   });

   // 전체 데이터 다운로드 (Data Portability)
   router.get('/my-data/export', async (req, res) => {
     // 본인 데이터 전체를 JSON으로 반환
     res.setHeader('Content-Disposition', 'attachment; filename="my-data-export.json"');
     res.json({ /* 전체 데이터 */ });
   });

2. routes/index.ts에 등록:
   app.use('/api/portal', myDataRouter);

## 검증
1. GET /api/portal/my-data (인증 후) → 200 + 본인 데이터 반환
2. 미인증 상태 → 401 반환
3. POST /api/portal/my-data/correction-request → 수정 요청 접수 확인
```

---

# 🟡 SPRINT 3 — 1달 이내 (아키텍처 개선 5개)

## PROMPT-S3-01: 문서 접근 RBAC 강화

```
## 작업 목적
/documents/:id/view 와 /documents/:id/download 라우트에 역할 검증이 없어
인증된 모든 사용자가 타 테넌트 문서에 접근 가능한 취약점을 수정한다.

## 분석 지시 (먼저 수행)
1. 문서 라우트 파일(documents.ts)을 읽어라
2. /documents/:id/view, /documents/:id/download 라우트 현재 코드를 확인하라
3. 수정 계획을 보고하라

## 진행해
1. 문서 접근 검증 미들웨어 생성:
   
   async function verifyDocumentAccess(req, res, next) {
     const { id } = req.params;
     const requestingUser = req.user;
     
     const document = await db.query.documents.findFirst({
       where: eq(documents.id, id)
     });
     
     if (!document) return res.status(404).json({ error: 'Document not found' });
     
     // 테넌트 격리: 같은 조직/테넌트의 문서만 접근 가능
     if (document.organisation_id && document.organisation_id !== requestingUser.organisation_id) {
       return res.status(403).json({ error: 'Access denied' });
     }
     
     // 역할별 접근: portal_student는 본인 계약 관련 문서만
     if (requestingUser.role === 'portal_student' && document.contact_id !== requestingUser.contact_id) {
       return res.status(403).json({ error: 'You can only access your own documents' });
     }
     
     req.document = document;
     next();
   }

2. /documents/:id/view, /documents/:id/download 라우트에 verifyDocumentAccess 미들웨어 추가
3. 문서 접근 로그(view/download 액션) 기록 확인 — 이미 구현되어 있으면 유지

## 검증
1. portal_student 계정으로 타인의 문서 ID로 접근 → 403 반환 확인
2. 본인 문서 접근 → 200 정상 반환 확인
3. npx tsc --noEmit
```

---

## PROMPT-S3-02: 글로벌 에러 핸들러 표준화

```
## 작업 목적
80+ 라우트에서 에러 응답 형식이 제각각인 상태를 글로벌 에러 핸들러로 표준화한다.

## 수정 지시 (바로 해줘)
1. 에러 클래스 파일 생성: lib/errors/AppError.ts

   export class AppError extends Error {
     constructor(
       public statusCode: number,
       public code: string,
       message: string,
       public details?: unknown
     ) {
       super(message);
       this.name = 'AppError';
     }
   }
   
   export class NotFoundError extends AppError {
     constructor(resource: string) {
       super(404, 'NOT_FOUND', `${resource} not found`);
     }
   }
   
   export class UnauthorizedError extends AppError {
     constructor(message = 'Unauthorized') {
       super(401, 'UNAUTHORIZED', message);
     }
   }
   
   export class ForbiddenError extends AppError {
     constructor(message = 'Forbidden') {
       super(403, 'FORBIDDEN', message);
     }
   }
   
   export class ValidationError extends AppError {
     constructor(details: unknown) {
       super(400, 'VALIDATION_ERROR', 'Validation failed', details);
     }
   }

2. 글로벌 에러 핸들러 미들웨어 생성: artifacts/api-server/src/middleware/errorHandler.ts

   import { Request, Response, NextFunction } from 'express';
   import { AppError } from '../../../lib/errors/AppError';
   import { ZodError } from 'zod';
   
   export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
     if (err instanceof AppError) {
       return res.status(err.statusCode).json({
         success: false,
         code: err.code,
         message: err.message,
         details: err.details,
         timestamp: new Date().toISOString(),
       });
     }
     
     if (err instanceof ZodError) {
       return res.status(400).json({
         success: false,
         code: 'VALIDATION_ERROR',
         message: 'Input validation failed',
         details: err.errors,
       });
     }
     
     console.error('[Unhandled Error]', err);
     return res.status(500).json({
       success: false,
       code: 'INTERNAL_ERROR',
       message: 'An unexpected error occurred',
       timestamp: new Date().toISOString(),
     });
   }

3. app.ts 마지막 미들웨어로 등록:
   app.use(errorHandler);

## 검증
1. npx tsc --noEmit
2. 존재하지 않는 라우트 호출 → 표준화된 JSON 에러 응답 확인
```

---

## PROMPT-S3-03: DB 인덱스 추가

```
## 작업 목적
현재 PK 인덱스만 존재하고 외래키/검색 컬럼 인덱스가 없어 대용량 조회 시 성능 저하가 예상된다.

## 분석 지시 (먼저 수행)
1. lib/db/src/schema/ 디렉토리의 주요 스키마 파일 5개(crm.ts, contracts.ts, applications.ts, finance.ts, users.ts)를 읽어라
2. 자주 조회될 컬럼을 식별하라 (WHERE 조건, ORDER BY, JOIN에 쓰이는 컬럼)

## 진행해 (확인 후)
각 스키마 파일에 아래 패턴으로 인덱스를 추가하라 (Drizzle ORM index 방식):

   import { pgTable, index } from 'drizzle-orm/pg-core';
   
   export const contacts = pgTable('contacts', {
     /* 기존 컬럼 */
   }, (table) => ({
     emailIdx: index('contacts_email_idx').on(table.email),
     statusIdx: index('contacts_status_idx').on(table.status),
     orgIdx: index('contacts_org_idx').on(table.organisation_id),
     createdAtIdx: index('contacts_created_at_idx').on(table.created_at),
   }));

최소한 아래 테이블·컬럼에 인덱스 추가:
- contacts: email, status, organisation_id
- leads: status, owner_id, organisation_id
- contracts: status, account_id, created_at
- applications: status, created_at
- users: email, role
- transactions / payment_lines: created_at, status

마이그레이션 실행: npx drizzle-kit push

## 검증
1. npx tsc --noEmit
2. npx drizzle-kit push 성공 확인
3. 대용량 테이블에서 \d+ contacts 로 인덱스 생성 확인 (psql)
```

---

## PROMPT-S3-04: 구조화 로깅 pino 도입

```
## 작업 목적
현재 console.log만 사용 중인 로깅을 pino로 전환하여
운영 환경 디버깅, 보안 감사, NDB 대응을 위한 구조화 로그를 확보한다.

## 수정 지시 (바로 해줘)
1. 패키지 설치:
   npm install pino pino-pretty
   npm install --save-dev @types/pino

2. 로거 싱글턴 생성: lib/logger/index.ts

   import pino from 'pino';
   
   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: process.env.NODE_ENV !== 'production'
       ? { target: 'pino-pretty', options: { colorize: true } }
       : undefined,
     base: { service: 'edubee-crm' },
     redact: {
       paths: ['*.passport_number', '*.visa_number', '*.medical_conditions', '*.password', '*.token'],
       censor: '[REDACTED]'
     }
   });

   ⚠️ redact 설정이 핵심: 로그에 여권번호, 비밀번호가 자동 마스킹됨 (APP 11 준수)

3. app.ts에 HTTP 요청 로깅 추가:
   import { logger } from '../../lib/logger';
   
   app.use((req, res, next) => {
     logger.info({ method: req.method, url: req.url, ip: req.ip }, 'Request received');
     next();
   });

4. 기존 console.error 를 logger.error로 일괄 교체 (검색: grep -r "console\.error" artifacts/api-server/src/routes/)

## 검증
1. npx tsc --noEmit
2. 서버 기동 후 요청 시 구조화된 JSON 로그 출력 확인
3. 에러 발생 시 로그에 여권번호 '[REDACTED]'로 마스킹 확인
```

---

# 🟢 SPRINT 4 — 3달 이내 (장기 개선 3개)

## PROMPT-S4-01: Sentry 에러 모니터링 연동

```
## 작업 목적
운영 에러 감지 체계를 Sentry로 구축하고 NDB 감지 기반을 마련한다.

## 수정 지시 (바로 해줘)
1. Sentry 계정 생성 및 Node.js 프로젝트 생성 (sentry.io — 무료 플랜)
2. 패키지 설치: npm install @sentry/node @sentry/profiling-node
3. app.ts 최상단에 추가:

   import * as Sentry from '@sentry/node';
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV || 'development',
     integrations: [Sentry.httpIntegration()],
     tracesSampleRate: 0.1,
     beforeSend(event) {
       // 민감 정보 필터링
       if (event.request?.data) {
         const data = event.request.data as Record<string, unknown>;
         ['passport_number', 'visa_number', 'password', 'medical_conditions'].forEach(key => {
           if (data[key]) data[key] = '[REDACTED]';
         });
       }
       return event;
     },
   });

4. errorHandler 미들웨어에 Sentry 연동:
   Sentry.captureException(err) 추가

Replit Secrets에 추가:
SENTRY_DSN = [Sentry 대시보드에서 복사한 DSN URL]

## 검증
1. 서버에서 의도적으로 에러 발생
2. Sentry 대시보드에서 에러 수신 확인
```

---

## PROMPT-S4-02: CUD 감사 로그 테이블 구현

```
## 작업 목적
현재 auth_logs(로그인 이력)만 존재하고 데이터 변경(Create/Update/Delete) 이력이 없어
법적 분쟁 시 근거 부재. 핵심 테이블의 변경 이력을 기록하는 감사 로그를 구현한다.

## 수정 지시 (바로 해줘)
1. lib/db/src/schema/security.ts에 audit_logs 테이블 추가:

   export const auditLogs = pgTable('audit_logs', {
     id: uuid('id').primaryKey().defaultRandom(),
     table_name: varchar('table_name', { length: 100 }).notNull(),
     record_id: uuid('record_id').notNull(),
     action: varchar('action', { length: 10 }).notNull(), // CREATE, UPDATE, DELETE
     changed_by: uuid('changed_by').notNull(),
     changed_by_email: varchar('changed_by_email', { length: 255 }),
     changed_by_role: varchar('changed_by_role', { length: 50 }),
     old_values: jsonb('old_values'),
     new_values: jsonb('new_values'),
     changed_fields: text('changed_fields').array(),
     ip_address: varchar('ip_address', { length: 50 }),
     user_agent: varchar('user_agent', { length: 500 }),
     created_at: timestamp('created_at').notNull().defaultNow(),
   });
   
   // 인덱스
   auditLogsTableIndex: index('audit_logs_table_record_idx').on(auditLogs.table_name, auditLogs.record_id),
   auditLogsUserIdx: index('audit_logs_user_idx').on(auditLogs.changed_by),
   auditLogsDateIdx: index('audit_logs_date_idx').on(auditLogs.created_at),

2. 감사 로그 기록 유틸 함수 생성: lib/utils/auditLogger.ts

   export async function logAudit(params: {
     tableName: string;
     recordId: string;
     action: 'CREATE' | 'UPDATE' | 'DELETE';
     changedBy: string;
     changedByEmail?: string;
     changedByRole?: string;
     oldValues?: Record<string, unknown>;
     newValues?: Record<string, unknown>;
     ipAddress?: string;
   }) {
     // 민감 정보 필터링 후 기록
     const sensitiveFields = ['passport_number', 'visa_number', 'medical_conditions', 'password'];
     const sanitize = (obj?: Record<string, unknown>) => {
       if (!obj) return obj;
       return Object.fromEntries(
         Object.entries(obj).map(([k, v]) => [k, sensitiveFields.includes(k) ? '[REDACTED]' : v])
       );
     };
     await db.insert(auditLogs).values({
       ...params,
       old_values: sanitize(params.oldValues),
       new_values: sanitize(params.newValues),
     });
   }

3. contracts, invoices, payment_headers 라우트의 POST/PUT/DELETE에 logAudit() 호출 추가

## 검증
1. npx drizzle-kit push → audit_logs 테이블 생성 확인
2. 계약 생성 후 SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 3; → 기록 확인
```

---

## PROMPT-S4-03: Vitest 기본 테스트 구조 구축

```
## 작업 목적
테스트 파일이 전무한 상태에서 핵심 인증/계약 API 테스트를 추가해
배포 시 회귀 탐지 기반을 마련한다.

## 수정 지시 (바로 해줘)
1. 패키지 설치:
   npm install --save-dev vitest supertest @types/supertest

2. package.json scripts에 추가:
   "test": "vitest run",
   "test:watch": "vitest"

3. vitest.config.ts 생성:
   import { defineConfig } from 'vitest/config';
   export default defineConfig({ test: { environment: 'node', globals: true } });

4. 테스트 파일 생성: artifacts/api-server/src/__tests__/auth.test.ts

   import request from 'supertest';
   import { app } from '../app';
   
   describe('Auth API', () => {
     test('POST /auth/login - valid credentials returns tokens', async () => {
       const res = await request(app).post('/api/auth/login').send({
         email: 'admin@edubee.com', password: 'Admin1234!'
       });
       expect(res.status).toBe(200);
       expect(res.body).toHaveProperty('accessToken');
       expect(res.body).toHaveProperty('refreshToken');
     });
     
     test('POST /auth/login - invalid credentials returns 401', async () => {
       const res = await request(app).post('/api/auth/login').send({
         email: 'admin@edubee.com', password: 'wrongpassword'
       });
       expect(res.status).toBe(401);
     });
     
     test('POST /auth/login - rate limit after 11 attempts', async () => {
       for (let i = 0; i < 10; i++) {
         await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' });
       }
       const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' });
       expect(res.status).toBe(429);
     });
     
     test('GET /api/portal/my-data - unauthenticated returns 401', async () => {
       const res = await request(app).get('/api/portal/my-data');
       expect(res.status).toBe(401);
     });
   });

## 검증
npm test → 모든 테스트 통과 확인
```

---

## 📋 Replit Secrets 최종 체크리스트

위 프롬프트 실행 완료 후 아래 Secrets가 모두 등록되어 있어야 한다:

```
필수 (보안)
├── JWT_SECRET              = [64자 이상 랜덤 hex]
├── JWT_REFRESH_SECRET      = [64자 이상 랜덤 hex, JWT_SECRET과 다른 값]
├── FIELD_ENCRYPTION_KEY    = [64자 hex = 32 bytes AES 키]
├── ALLOWED_ORIGINS         = https://yourapp.replit.app,https://yourdomain.edubee.co
└── SECURITY_ALERT_EMAIL    = admin@edubee.co

선택 (기능 강화)
├── SENTRY_DSN              = https://...@sentry.io/...
├── LOG_LEVEL               = info
└── NODE_ENV                = production
```

각 값을 생성하려면 아래 Node.js 명령을 Replit Shell에서 실행:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
---

*Edubee CRM 보완 Replit 프롬프트 패키지 v1.0 — 2026-04-19 감사 결과 기반*
