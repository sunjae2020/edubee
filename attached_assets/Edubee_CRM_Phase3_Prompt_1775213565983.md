# 🐝 Edubee CRM — Phase 3: SaaS 기능 완성
# Replit AI Agent 전용
# 작성일: 2026-04-03 | 버전: v1.0
# 전제: Phase 1 + BugFix(Fix 1~17) + Phase 2 완료 상태
# 이메일: Resend.com API 이미 연결됨

---

## 📌 Phase 3 개요

Phase 2가 **런타임 데이터 격리**를 완성했다면,
Phase 3는 **SaaS 서비스로서의 완성도**를 높인다.

| Task | 내용 | 핵심 효과 |
|------|------|-----------|
| **Task 1** | 직원 초대 이메일 (Resend) | 관리자가 이메일로 직원 초대 → 수신자가 링크 클릭 → 계정 생성 |
| **Task 2** | MEDIUM 테이블 `organisation_id` FK | 데이터 격리 범위 확장 (tasks, credits, files 등) |
| **Task 3** | Feature Flags 실제 적용 | 플랜별 기능 ON/OFF — Starter는 캠프 모듈 숨김 등 |
| **Task 4** | Stripe 결제 연동 | 플랜 구독 결제 자동화 |

**핵심 원칙: 기존 작동 코드를 절대 깨지 않는다**

---

## 🛡️ 모든 작업 전 필수 분석 단계

1. 관련 파일 전체를 읽는다
2. 실제로 무엇이 문제인지 확인한다
3. 수정할 파일 목록과 변경 내용을 나에게 먼저 보고한다
4. **"진행해"** 라고 하기 전까지 수정하지 않는다
   (단, **"바로 해줘"** 요청 시 즉시 진행)

---

## 🛡️ 수정 시 안전 규칙

- Task 하나씩 완료 후 `npx tsc --noEmit` 확인
- DB 컬럼 추가 시 `ADD COLUMN IF NOT EXISTS` + NULL 허용
- 이메일 발송 실패는 메인 워크플로우 차단 금지 (`try/catch` 필수)
- 환경변수는 Replit Secrets 탭에서 관리 (코드에 하드코딩 금지)

---

## ✅ Task 1: 직원 초대 이메일 (Resend.com)

### 1-1. 사전 확인

```
아래 파일들을 읽는다:
  .env (또는 Replit Secrets) → RESEND_API_KEY 변수명 확인
  /server/src/routes/settings.ts → POST /invitations 현재 구현 확인
  /server/src/db/schema.ts → tenant_invitations 테이블 컬럼 확인

확인 항목:
  □ RESEND_API_KEY 환경변수 존재
  □ tenant_invitations 테이블: token, expires_at, status 컬럼 있음
  □ resend 패키지 설치 여부 (package.json 확인)
```

**resend 패키지가 없으면:**
```bash
npm install resend
```

---

### 1-2. 이메일 서비스 파일 생성

**파일 경로:** `/server/src/services/emailService.ts` (신규)

```typescript
import { Resend } from 'resend';

// Resend 클라이언트 초기화
const resend = new Resend(process.env.RESEND_API_KEY);

// 이메일 발송 활성화 여부 (테스트 시 false로 차단 가능)
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';

// 발신 이메일 주소 (Resend 검증된 도메인 또는 기본 도메인)
const FROM_EMAIL =
  process.env.FROM_EMAIL ?? 'noreply@edubee.com';

// ─────────────────────────────────────────────────────────────
// 직원 초대 이메일
// ─────────────────────────────────────────────────────────────
export interface SendInvitationEmailParams {
  toEmail:        string;
  inviterName:    string;
  companyName:    string;
  role:           string;
  inviteToken:    string;
  subdomain:      string | null;
  expiresAt:      Date;
}

export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!EMAIL_ENABLED) {
    console.log('[EMAIL DISABLED] 초대 이메일 스킵:', params.toEmail);
    return { success: true, messageId: 'disabled' };
  }

  const {
    toEmail, inviterName, companyName,
    role, inviteToken, subdomain, expiresAt,
  } = params;

  // 초대 링크 생성
  const baseUrl = subdomain
    ? `https://${subdomain}.edubee.com`
    : process.env.APP_URL ?? 'https://app.edubee.com';

  const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;

  // 역할 한국어 변환
  const roleLabel: Record<string, string> = {
    admin:   '관리자',
    manager: '매니저',
    staff:   '직원',
  };

  // 만료일 포맷
  const expiryDate = expiresAt.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  try {
    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `[${companyName}] CRM 초대장이 도착했습니다`,
      html: buildInvitationEmailHtml({
        companyName, inviterName, role: roleLabel[role] ?? role,
        inviteUrl, expiryDate,
      }),
    });

    if (error) {
      console.error('[RESEND ERROR] 초대 이메일:', error);
      return { success: false, error: error.message };
    }

    console.log('[EMAIL SENT] 초대 이메일:', toEmail, data?.id);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[EMAIL EXCEPTION]', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// 비밀번호 설정 / 계정 활성화 이메일
// ─────────────────────────────────────────────────────────────
export interface SendWelcomeEmailParams {
  toEmail:     string;
  userName:    string;
  companyName: string;
  loginUrl:    string;
}

export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!EMAIL_ENABLED) return { success: true };

  const { toEmail, userName, companyName, loginUrl } = params;

  try {
    const { error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `[${companyName}] CRM 계정이 활성화됐습니다`,
      html: buildWelcomeEmailHtml({ userName, companyName, loginUrl }),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// 테넌트 신규 생성 알림 이메일 (Super Admin용)
// ─────────────────────────────────────────────────────────────
export async function sendTenantCreatedEmail(params: {
  toEmail:    string;
  orgName:    string;
  subdomain:  string;
  planType:   string;
}): Promise<void> {
  if (!EMAIL_ENABLED) return;

  const { toEmail, orgName, subdomain, planType } = params;
  const loginUrl = `https://${subdomain}.edubee.com/login`;

  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `🐝 Edubee CRM — ${orgName} 계정이 생성됐습니다`,
      html: buildTenantCreatedEmailHtml({
        orgName, subdomain, planType, loginUrl,
      }),
    });
  } catch (err) {
    // 알림 이메일 실패 — 워크플로우 차단하지 않음
    console.error('[EMAIL] 테넌트 생성 알림 실패:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// HTML 템플릿 빌더
// 브랜드: Edubee Orange #F5821F / 배경 #FAFAF9 / 텍스트 #1C1917
// ══════════════════════════════════════════════════════════════

function buildInvitationEmailHtml(p: {
  companyName: string; inviterName: string; role: string;
  inviteUrl: string; expiryDate: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM 초대장</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:'Apple SD Gothic Neo',Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;overflow:hidden;">

          <!-- 헤더 -->
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">
                🐝 Edubee CRM
              </div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">
                ${p.companyName}
              </div>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1C1917;">
                CRM 초대장이 도착했습니다
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.7;">
                <strong style="color:#1C1917;">${p.inviterName}</strong>님이
                <strong style="color:#1C1917;">${p.companyName}</strong> CRM에
                <strong style="color:#F5821F;">${p.role}</strong>으로 초대했습니다.
              </p>

              <!-- CTA 버튼 -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.inviteUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      초대 수락하기 →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 안내 -->
              <div style="background:#FEF0E3;border-radius:8px;padding:16px 20px;
                          border-left:4px solid #F5821F;">
                <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6;">
                  ⏰ 이 초대 링크는 <strong>${p.expiryDate}</strong>까지 유효합니다.<br>
                  링크가 만료된 경우 초대한 관리자에게 재발송을 요청해 주세요.
                </p>
              </div>

              <!-- 링크 직접 복사 -->
              <p style="margin:24px 0 0;font-size:12px;color:#A8A29E;">
                버튼이 작동하지 않으면 아래 링크를 브라우저에 복사하세요:<br>
                <span style="color:#F5821F;word-break:break-all;">${p.inviteUrl}</span>
              </p>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background:#F4F3F1;padding:20px 48px;
                       border-top:1px solid #E8E6E2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">
                © 2026 Edubee CRM · 이 이메일은 자동 발송됩니다
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeEmailHtml(p: {
  userName: string; companyName: string; loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>계정 활성화</title></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;">
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;">🐝 Edubee CRM</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#1C1917;">
                ${p.userName}님, 환영합니다!
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.7;">
                <strong>${p.companyName}</strong> CRM 계정이 활성화됐습니다.
                아래 버튼을 눌러 로그인하세요.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.loginUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      CRM 로그인 →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#F4F3F1;padding:20px 48px;border-top:1px solid #E8E6E2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">© 2026 Edubee CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTenantCreatedEmailHtml(p: {
  orgName: string; subdomain: string;
  planType: string; loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>계정 생성 완료</title></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;">
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;">🐝 Edubee CRM</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">
                계정 생성 완료
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 20px;font-size:22px;color:#1C1917;">
                ${p.orgName} CRM이 준비됐습니다 🎉
              </h2>

              <!-- 계정 정보 -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#FAFAF9;border-radius:8px;border:1px solid #E8E6E2;
                            margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#57534E;padding-bottom:12px;">
                          <strong>회사명</strong>
                        </td>
                        <td style="font-size:13px;color:#1C1917;padding-bottom:12px;
                                   text-align:right;font-weight:600;">
                          ${p.orgName}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#57534E;padding-bottom:12px;">
                          <strong>CRM 주소</strong>
                        </td>
                        <td style="font-size:13px;color:#F5821F;padding-bottom:12px;
                                   text-align:right;">
                          ${p.subdomain}.edubee.com
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#57534E;">
                          <strong>플랜</strong>
                        </td>
                        <td style="font-size:13px;color:#1C1917;text-align:right;
                                   text-transform:capitalize;font-weight:600;">
                          ${p.planType}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.loginUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      CRM 시작하기 →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#F4F3F1;padding:20px 48px;border-top:1px solid #E8E6E2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">© 2026 Edubee CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

---

### 1-3. 초대 API에 이메일 발송 연결

`/server/src/routes/settings.ts` 에서
`POST /api/settings/invitations` 핸들러를 읽고 이메일 발송 로직을 추가한다.

```typescript
import {
  sendInvitationEmail,
} from '../services/emailService';

router.post('/invitations', authenticate, async (req, res) => {
  try {
    const { email, role } = req.body;
    const organisationId = req.tenantId;

    // 1. 기존 초대 레코드 생성 로직 (변경 없음)
    const token = crypto.randomUUID();  // 또는 기존 토큰 생성 방식
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일

    await db.insert(tenantInvitations).values({
      organisationId,
      email,
      role,
      token,
      expiresAt,
      invitedBy: req.user?.id,
      status: 'Pending',
    });

    // 2. 이메일 발송 (실패해도 초대 레코드는 유지)
    const org = req.tenant as Record<string, unknown>;

    const emailResult = await sendInvitationEmail({
      toEmail:      email,
      inviterName:  req.user?.firstName ?? '관리자',
      companyName:  (org?.name as string) ?? 'Edubee CRM',
      role,
      inviteToken:  token,
      subdomain:    (org?.subdomain as string) ?? null,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: '초대 이메일을 발송했습니다.',
      emailSent: emailResult.success,
      // 이메일 실패 시에도 초대는 완료
      emailError: emailResult.success ? undefined : emailResult.error,
    });
  } catch (err) {
    console.error('[POST /invitations]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});
```

---

### 1-4. 테넌트 생성 시 이메일 연결

`/server/src/routes/superadmin.ts` 에서
`POST /api/superadmin/tenants` 핸들러에 이메일 추가:

```typescript
import {
  sendTenantCreatedEmail,
} from '../services/emailService';

// onboardTenant 완료 후 추가
await sendTenantCreatedEmail({
  toEmail:   newOrg.ownerEmail ?? '',
  orgName:   newOrg.name,
  subdomain: newOrg.subdomain ?? '',
  planType:  newOrg.planType  ?? 'starter',
});
// 이메일 발송은 try/catch 내부 — 실패해도 201 응답 유지
```

---

### 1-5. 초대 수락 API 추가

`/server/src/routes/auth.ts` (또는 공개 라우트 파일)에 추가:

```typescript
// POST /api/auth/accept-invite — 초대 토큰으로 계정 생성
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    // 1. 토큰 조회
    const [invite] = await db
      .select()
      .from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.token, token),
          eq(tenantInvitations.status, 'Pending')
        )
      )
      .limit(1);

    if (!invite) {
      return res.status(400).json({ message: '유효하지 않은 초대 링크입니다.' });
    }

    // 2. 만료 확인
    if (new Date() > invite.expiresAt) {
      await db.update(tenantInvitations)
        .set({ status: 'Expired' })
        .where(eq(tenantInvitations.id, invite.id));
      return res.status(400).json({ message: '초대 링크가 만료됐습니다.' });
    }

    // 3. users 테이블에 계정 생성
    // ⚠️ 실제 password 해시 방식은 기존 auth 코드 확인 후 동일하게 사용
    const hashedPassword = await hashPassword(password); // 기존 함수 재사용

    const [newUser] = await db.insert(users).values({
      firstName,
      lastName,
      email:          invite.email,
      password:       hashedPassword,
      role:           invite.role,
      organisationId: invite.organisationId,
      status:         'Active',
    }).returning();

    // 4. 초대 상태 업데이트
    await db.update(tenantInvitations)
      .set({ status: 'Accepted', acceptedAt: new Date() })
      .where(eq(tenantInvitations.id, invite.id));

    // 5. 웰컴 이메일 발송
    const [org] = await db.select()
      .from(organisations)
      .where(eq(organisations.id, invite.organisationId))
      .limit(1);

    await sendWelcomeEmail({
      toEmail:     invite.email,
      userName:    `${firstName} ${lastName}`,
      companyName: org?.name ?? 'Edubee CRM',
      loginUrl:    `https://${org?.subdomain ?? 'app'}.edubee.com/login`,
    });

    return res.json({
      success: true,
      message: '계정이 생성됐습니다. 로그인해 주세요.',
    });
  } catch (err) {
    console.error('[POST /accept-invite]', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});
```

---

### 1-6. Task 1 검증

```bash
npx tsc --noEmit

# 이메일 발송 테스트 (Resend 대시보드에서 수신 확인)
POST /api/settings/invitations
Header: X-Organisation-Id: [UUID]
body: { "email": "test@example.com", "role": "staff" }
기대: 201 { emailSent: true }
```

---

## ✅ Task 2: MEDIUM 우선순위 테이블 organisation_id FK

### 대상 테이블 (7개)

```
lead_activities, tasks, quote_products, contract_products,
invoice_products, credits, debits, receipts
```

---

### 2-1. 사전 확인

```sql
-- 이미 추가된 테이블 확인 (Phase 2에서 일부 추가됐을 수 있음)
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_schema = 'public'
ORDER BY table_name;
```

위 결과에 없는 테이블만 아래 작업을 진행한다.

---

### 2-2. 스키마 및 마이그레이션

스키마 파일에 각 테이블 `organisation_id` 추가 후 마이그레이션:

```sql
ALTER TABLE lead_activities     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE tasks                ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE quote_products       ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE contract_products    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE invoice_products     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE credits              ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE debits               ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE receipts             ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
```

---

### 2-3. 기존 데이터 업데이트 전략

MEDIUM 테이블은 **부모 테이블 JOIN으로 organisation_id 역추적**한다:

```sql
-- lead_activities → leads.organisation_id 에서 역추적
UPDATE lead_activities la
SET organisation_id = l.organisation_id
FROM leads l
WHERE la.lead_id = l.id
  AND la.organisation_id IS NULL
  AND l.organisation_id IS NOT NULL;

-- tasks → 다양한 부모 가능 (lead_id, contract_id 등 확인 필요)
-- 실제 tasks 테이블 컬럼 확인 후 적절한 JOIN 사용

-- quote_products → quotes.organisation_id
UPDATE quote_products qp
SET organisation_id = q.organisation_id
FROM quotes q
WHERE qp.quote_id = q.id
  AND qp.organisation_id IS NULL;

-- contract_products → contracts.organisation_id
UPDATE contract_products cp
SET organisation_id = c.organisation_id
FROM contracts c
WHERE cp.contract_id = c.id
  AND cp.organisation_id IS NULL;

-- invoice_products → invoices.organisation_id
UPDATE invoice_products ip
SET organisation_id = i.organisation_id
FROM invoices i
WHERE ip.invoice_id = i.id
  AND ip.organisation_id IS NULL;

-- credits/debits/receipts → transactions.organisation_id
UPDATE credits cr
SET organisation_id = t.organisation_id
FROM transactions t
WHERE cr.transaction_id = t.id
  AND cr.organisation_id IS NULL;

UPDATE debits d
SET organisation_id = t.organisation_id
FROM transactions t
WHERE d.transaction_id = t.id
  AND d.organisation_id IS NULL;

UPDATE receipts r
SET organisation_id = t.organisation_id
FROM transactions t
WHERE r.transaction_id = t.id
  AND r.organisation_id IS NULL;
```

> ⚠️ 각 테이블의 실제 FK 컬럼명은 스키마 파일에서 확인 후 적용한다.

---

### 2-4. Task 2 검증

```sql
-- 7개 테이블 모두 organisation_id 컬럼 확인
SELECT table_name, COUNT(*) as with_org_id
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_name IN (
    'lead_activities','tasks','quote_products','contract_products',
    'invoice_products','credits','debits','receipts'
  )
GROUP BY table_name;
-- → 7개 테이블 모두 있어야 함
```

---

## ✅ Task 3: Feature Flags 실제 적용

### 개념

```
organisations.features = {
  "camp_module":  false,   ← Starter: 캠프 메뉴 숨김
  "accounting":   true,    ← Professional: 회계 모듈 사용 가능
  "ai_assistant": false    ← Enterprise만 AI 기능
}

플랜별 기본 Features:
  starter      → camp_module: false / accounting: false / ai: false
  professional → camp_module: true  / accounting: true  / ai: false
  enterprise   → camp_module: true  / accounting: true  / ai: true
```

---

### 3-1. 백엔드: Feature 검증 미들웨어

**파일 경로:** `/server/src/middleware/featureGuard.ts` (신규)

```typescript
import { Request, Response, NextFunction } from 'express';

type FeatureKey = 'camp_module' | 'accounting' | 'ai_assistant';

/**
 * 특정 Feature가 활성화된 테넌트만 통과
 * 사용법: router.get('/camp', featureGuard('camp_module'), handler)
 */
export function featureGuard(feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const features = (req.tenant as Record<string, unknown>)
      ?.features as Record<string, boolean> | undefined;

    if (!features || !features[feature]) {
      return res.status(403).json({
        message: '현재 플랜에서 사용할 수 없는 기능입니다.',
        feature,
        upgradeRequired: true,
      });
    }
    next();
  };
}

/**
 * 플랜 타입별 기본 Feature 설정
 * 신규 테넌트 생성 시 planType에 맞는 features 자동 설정
 */
export const DEFAULT_FEATURES: Record<string, Record<string, boolean>> = {
  solo:         { camp_module: false, accounting: false, ai_assistant: false },
  starter:      { camp_module: false, accounting: false, ai_assistant: false },
  growth:       { camp_module: true,  accounting: true,  ai_assistant: false },
  professional: { camp_module: true,  accounting: true,  ai_assistant: false },
  enterprise:   { camp_module: true,  accounting: true,  ai_assistant: true  },
};

export function getDefaultFeatures(planType: string): Record<string, boolean> {
  return DEFAULT_FEATURES[planType] ?? DEFAULT_FEATURES['starter'];
}
```

---

### 3-2. 온보딩 시드에 Feature 자동 설정

`/server/src/routes/superadmin.ts` 에서 테넌트 생성 시 features 자동 설정:

```typescript
import { getDefaultFeatures } from '../middleware/featureGuard';

// organisations INSERT 시 features 자동 설정
const [newOrg] = await db.insert(organisations).values({
  name,
  subdomain,
  ownerEmail,
  planType:    planType ?? 'starter',
  planStatus:  'trial',
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  features:    getDefaultFeatures(planType ?? 'starter'), // ← 추가
  status:      'Active',
}).returning();
```

---

### 3-3. 프론트엔드: Feature Flag 훅

**파일 경로:** `/client/src/hooks/useFeature.ts` (신규)

```typescript
import { useTenantTheme } from './useTenantTheme';

type FeatureKey = 'camp_module' | 'accounting' | 'ai_assistant';

/**
 * 현재 테넌트의 Feature 활성화 여부 확인
 * 사용법: const { enabled, upgrade } = useFeature('camp_module')
 */
export function useFeature(feature: FeatureKey) {
  const { theme } = useTenantTheme();
  const features = theme.features as Record<string, boolean> ?? {};

  return {
    enabled:  features[feature] === true,
    disabled: features[feature] !== true,
    // 업그레이드가 필요한 경우 안내 메시지
    upgrade:  features[feature] !== true
      ? `이 기능은 상위 플랜에서 사용 가능합니다.`
      : null,
  };
}
```

---

### 3-4. 사이드바 Feature Flag 적용

CRM 사이드바 컴포넌트를 읽고 아래 패턴으로 Feature Flag 적용:

```tsx
import { useFeature } from '../../hooks/useFeature';

function CrmSidebar() {
  const campFeature    = useFeature('camp_module');
  const accountingFeat = useFeature('accounting');

  return (
    <nav>
      {/* 기존 메뉴 유지 */}
      <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
      <NavItem to="/contacts"  icon={<Users />}           label="Contacts" />
      {/* ... */}

      {/* 캠프 모듈 — Feature Flag 적용 */}
      {campFeature.enabled ? (
        <NavItem to="/camp" icon={<Tent />} label="Camp" />
      ) : (
        // Starter 플랜: 잠금 아이콘 + 업그레이드 툴팁 표시
        <NavItemLocked
          icon={<Tent />}
          label="Camp"
          tooltip="Professional 플랜에서 사용 가능"
        />
      )}

      {/* 회계 모듈 — Feature Flag 적용 */}
      {accountingFeat.enabled && (
        <NavItem to="/accounting" icon={<BookOpen />} label="Accounting" />
      )}
    </nav>
  );
}
```

---

### 3-5. Task 3 검증

```
확인 1: Starter 플랜 테넌트
  → 사이드바에서 Camp 메뉴 잠금 표시 ✅
  → GET /api/camp (featureGuard 적용 시) → 403 ✅

확인 2: Professional 플랜 테넌트
  → 사이드바에서 Camp 메뉴 정상 표시 ✅
  → GET /api/camp → 200 ✅

확인 3: 신규 테넌트 생성 시
  → features 컬럼에 planType 맞는 기본값 자동 설정 ✅
```

---

## ✅ Task 4: Stripe 결제 연동

### 4-1. 사전 확인

```
아래를 확인한다:
  □ STRIPE_SECRET_KEY 환경변수 존재 여부 (.env / Replit Secrets)
  □ STRIPE_WEBHOOK_SECRET 환경변수 존재 여부
  □ stripe 패키지 설치 여부 (package.json)
```

**stripe 패키지가 없으면:**
```bash
npm install stripe
npm install --save-dev @types/stripe
```

---

### 4-2. Stripe 결제 서비스 파일 생성

**파일 경로:** `/server/src/services/stripeService.ts` (신규)

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// ─────────────────────────────────────────────────────────────
// 플랜별 Stripe Price ID 매핑
// Stripe 대시보드에서 생성한 Price ID로 교체 필요
// ─────────────────────────────────────────────────────────────
const PLAN_PRICE_IDS: Record<string, { monthly: string; annually: string }> = {
  starter: {
    monthly:  process.env.STRIPE_STARTER_MONTHLY  ?? '',
    annually: process.env.STRIPE_STARTER_ANNUALLY ?? '',
  },
  professional: {
    monthly:  process.env.STRIPE_PRO_MONTHLY  ?? '',
    annually: process.env.STRIPE_PRO_ANNUALLY ?? '',
  },
  enterprise: {
    monthly:  process.env.STRIPE_ENT_MONTHLY  ?? '',
    annually: process.env.STRIPE_ENT_ANNUALLY ?? '',
  },
};

// ─────────────────────────────────────────────────────────────
// Checkout Session 생성 (플랜 업그레이드/신규 구독)
// ─────────────────────────────────────────────────────────────
export async function createCheckoutSession(params: {
  organisationId:  string;
  planType:        string;
  billingCycle:    'monthly' | 'annually';
  successUrl:      string;
  cancelUrl:       string;
  customerEmail?:  string;
}): Promise<{ url: string | null; sessionId: string }> {
  const {
    organisationId, planType, billingCycle,
    successUrl, cancelUrl, customerEmail,
  } = params;

  const priceId = PLAN_PRICE_IDS[planType]?.[billingCycle];

  if (!priceId) {
    throw new Error(`Price ID not found for plan: ${planType} / ${billingCycle}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    customer_email: customerEmail,
    metadata: {
      organisationId,    // Webhook에서 사용
      planType,
      billingCycle,
    },
    subscription_data: {
      metadata: { organisationId, planType },
    },
  });

  return { url: session.url, sessionId: session.id };
}

// ─────────────────────────────────────────────────────────────
// Customer Portal 세션 생성 (결제 관리 / 구독 취소)
// ─────────────────────────────────────────────────────────────
export async function createPortalSession(params: {
  customerId:  string;
  returnUrl:   string;
}): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer:   params.customerId,
    return_url: params.returnUrl,
  });
  return session.url;
}

// ─────────────────────────────────────────────────────────────
// Webhook 이벤트 검증 및 파싱
// ─────────────────────────────────────────────────────────────
export function constructWebhookEvent(
  payload:   Buffer | string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

export { stripe };
```

---

### 4-3. Stripe API 라우트 추가

`/server/src/routes/settings.ts` 에 결제 관련 엔드포인트 추가:

```typescript
import {
  createCheckoutSession,
  createPortalSession,
} from '../services/stripeService';

// ─────────────────────────────────────────────────────────────
// POST /settings/billing/checkout — Checkout Session 생성
// ─────────────────────────────────────────────────────────────
router.post('/billing/checkout', authenticate, async (req, res) => {
  try {
    const { planType, billingCycle } = req.body;
    const org = req.tenant as Record<string, unknown>;

    const baseUrl = org?.subdomain
      ? `https://${org.subdomain}.edubee.com`
      : process.env.APP_URL ?? '';

    const { url, sessionId } = await createCheckoutSession({
      organisationId: req.tenantId!,
      planType,
      billingCycle:   billingCycle ?? 'monthly',
      successUrl:     `${baseUrl}/settings/plan?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:      `${baseUrl}/settings/plan?cancelled=true`,
      customerEmail:  (org?.ownerEmail as string) ?? undefined,
    });

    return res.json({ url, sessionId });
  } catch (err) {
    console.error('[POST /billing/checkout]', err);
    return res.status(500).json({ message: '결제 세션 생성 실패' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /settings/billing/portal — Customer Portal 세션
// ─────────────────────────────────────────────────────────────
router.post('/billing/portal', authenticate, async (req, res) => {
  try {
    const org = req.tenant as Record<string, unknown>;

    // organisations.stripe_customer_id 필요
    const customerId = org?.stripeCustomerId as string | undefined;

    if (!customerId) {
      return res.status(400).json({
        message: '결제 정보가 없습니다. 먼저 플랜을 구독해 주세요.',
      });
    }

    const baseUrl = org?.subdomain
      ? `https://${org.subdomain}.edubee.com`
      : process.env.APP_URL ?? '';

    const portalUrl = await createPortalSession({
      customerId,
      returnUrl: `${baseUrl}/settings/plan`,
    });

    return res.json({ url: portalUrl });
  } catch (err) {
    console.error('[POST /billing/portal]', err);
    return res.status(500).json({ message: '결제 관리 페이지 생성 실패' });
  }
});
```

---

### 4-4. Stripe Webhook 라우트

`/server/src/routes/webhook.ts` (신규):

```typescript
import express from 'express';
import { constructWebhookEvent } from '../services/stripeService';
import { getDefaultFeatures } from '../middleware/featureGuard';
import { db } from '../db';
import { organisations } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// ⚠️ Webhook은 raw body 필요 — express.json() 이전에 등록
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    let event;
    try {
      event = constructWebhookEvent(req.body, signature);
    } catch (err) {
      console.error('[WEBHOOK] 서명 검증 실패:', err);
      return res.status(400).json({ message: 'Webhook signature failed' });
    }

    try {
      switch (event.type) {

        // 결제 성공 → 플랜 활성화
        case 'checkout.session.completed': {
          const session = event.data.object as Record<string, unknown>;
          const metadata = session.metadata as Record<string, string>;
          const { organisationId, planType } = metadata;

          if (organisationId && planType) {
            await db.update(organisations).set({
              planType,
              planStatus:     'active',
              subscriptionId: session.subscription as string,
              features:       getDefaultFeatures(planType),
              modifiedOn:     new Date(),
            }).where(eq(organisations.id, organisationId));

            console.log('[WEBHOOK] 플랜 활성화:', organisationId, planType);
          }
          break;
        }

        // 구독 갱신 성공
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Record<string, unknown>;
          const sub = invoice.subscription as string;

          await db.update(organisations).set({
            planStatus: 'active',
            modifiedOn: new Date(),
          }).where(eq(organisations.subscriptionId, sub));
          break;
        }

        // 결제 실패 → 플랜 일시 정지
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Record<string, unknown>;
          const sub = invoice.subscription as string;

          await db.update(organisations).set({
            planStatus: 'suspended',
            modifiedOn: new Date(),
          }).where(eq(organisations.subscriptionId, sub));

          console.log('[WEBHOOK] 결제 실패, 플랜 정지:', sub);
          break;
        }

        // 구독 취소
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Record<string, unknown>;

          await db.update(organisations).set({
            planStatus: 'cancelled',
            modifiedOn: new Date(),
          }).where(eq(organisations.subscriptionId, subscription.id as string));
          break;
        }

        default:
          console.log('[WEBHOOK] 처리하지 않는 이벤트:', event.type);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('[WEBHOOK] 처리 오류:', err);
      return res.status(500).json({ message: 'Webhook processing failed' });
    }
  }
);

export default router;
```

---

### 4-5. organisations 테이블 Stripe 컬럼 추가

```sql
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS stripe_customer_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_price_id     VARCHAR(255);
```

---

### 4-6. index.ts에 Webhook 라우트 등록

```typescript
import webhookRoutes from './routes/webhook';

// ⚠️ Webhook은 express.json() 보다 먼저 등록 (raw body 필요)
app.use('/api/webhook', webhookRoutes);

// 그 다음 일반 미들웨어
app.use(express.json());
// ...나머지 라우트
```

---

### 4-7. Task 4 검증

```bash
npx tsc --noEmit

# Stripe CLI로 로컬 Webhook 테스트
stripe listen --forward-to localhost:3000/api/webhook/stripe
stripe trigger checkout.session.completed
# → DB organisations.plan_status = 'active' 확인

# API 확인
POST /api/settings/billing/checkout
body: { "planType": "professional", "billingCycle": "monthly" }
기대: { url: "https://checkout.stripe.com/..." }
```

---

## 📋 Phase 3 완료 체크리스트

```
Task 1 — 직원 초대 이메일 (Resend)
  □ /server/src/services/emailService.ts 생성
  □ sendInvitationEmail() 함수 구현
  □ sendWelcomeEmail() 함수 구현
  □ sendTenantCreatedEmail() 함수 구현
  □ POST /settings/invitations 에 이메일 연결
  □ POST /superadmin/tenants 에 이메일 연결
  □ POST /auth/accept-invite 초대 수락 API 구현
  □ 초대 이메일 발송 테스트 (Resend 대시보드 확인)

Task 2 — MEDIUM 테이블 organisation_id
  □ 7개 테이블 컬럼 추가 마이그레이션
  □ 기존 데이터 부모 JOIN으로 역추적 업데이트
  □ NULL 없음 확인

Task 3 — Feature Flags 실제 적용
  □ /middleware/featureGuard.ts 생성
  □ DEFAULT_FEATURES 플랜별 정의
  □ getDefaultFeatures() 함수
  □ 신규 테넌트 생성 시 features 자동 설정
  □ /hooks/useFeature.ts 훅 생성
  □ CRM 사이드바 Feature Flag 적용
  □ Starter 플랜 Camp 메뉴 잠금 확인

Task 4 — Stripe 결제 연동
  □ stripe 패키지 설치
  □ STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET 환경변수 확인
  □ /services/stripeService.ts 생성
  □ POST /settings/billing/checkout 구현
  □ POST /settings/billing/portal 구현
  □ /routes/webhook.ts 생성 (Stripe 이벤트 처리)
  □ organisations 테이블 stripe_customer_id 컬럼 추가
  □ index.ts Webhook 라우트 등록 (json 미들웨어 이전)
  □ Stripe CLI로 Webhook 테스트
```

---

## ✅ 작업 완료 보고 형식

```
✅ Task N 완료

수정/생성 파일: [목록]
수정 내용: [설명]

검증 결과:
  TypeScript: 오류 0개
  서버 기동:  정상
  DB 쿼리:    [결과 요약]
  API 응답:   [결과 요약]

⚠️ 다음: Task N+1 진행 대기
```

---

## 🔮 Phase 4 예고 (이번 범위 외)

```
Phase 4
  - LOW 우선순위 테이블 organisation_id 추가
    (products, product_groups, users, teams 등)
  - Student Portal (portal.abc.edubee.com)
    학생이 직접 진행상황 조회 / 서류 제출 / 청구서 확인
  - AI Assistant 연동 (Claude API)
    Enterprise 플랜 전용 — 학생 상담 자동화
  - SSL 자동화 (Let's Encrypt / Caddy 연동)
  - 실시간 알림 (WebSocket 또는 Server-Sent Events)
  - 모바일 앱 (React Native)
```

---

*Edubee CRM — Phase 3 SaaS 기능 완성 프롬프트 v1.0 | 2026-04-03*
*이메일: Resend.com API (이미 연결됨) / 결제: Stripe*
