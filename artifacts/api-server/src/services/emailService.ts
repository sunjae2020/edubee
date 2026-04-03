import { Resend } from 'resend';

const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';
const FROM_EMAIL    = process.env.FROM_EMAIL ?? 'noreply@edubee.com';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[EMAIL] RESEND_API_KEY not set — emails will be skipped.');
    return null;
  }
  return new Resend(key);
}

// ─────────────────────────────────────────────────────────────
// Staff Invitation Email
// ─────────────────────────────────────────────────────────────
export interface SendInvitationEmailParams {
  toEmail:     string;
  inviterName: string;
  companyName: string;
  role:        string;
  inviteToken: string;
  subdomain:   string | null;
  expiresAt:   Date;
}

export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!EMAIL_ENABLED) {
    console.log('[EMAIL DISABLED] Skipping invitation email:', params.toEmail);
    return { success: true, messageId: 'disabled' };
  }

  const resend = getResend();
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' };

  const { toEmail, inviterName, companyName, role, inviteToken, subdomain, expiresAt } = params;

  const baseUrl   = subdomain
    ? `https://${subdomain}.edubee.com`
    : process.env.APP_URL ?? 'https://app.edubee.com';
  const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;

  const expiryDate = expiresAt.toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  try {
    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `[${companyName}] You've been invited to Edubee CRM`,
      html:    buildInvitationHtml({ companyName, inviterName, role, inviteUrl, expiryDate }),
    });

    if (error) {
      console.error('[RESEND ERROR] Invitation email:', error);
      return { success: false, error: error.message };
    }

    console.log('[EMAIL SENT] Invitation:', toEmail, data?.id);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[EMAIL EXCEPTION]', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// Welcome / Account Activated Email
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

  const resend = getResend();
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' };

  const { toEmail, userName, companyName, loginUrl } = params;

  try {
    const { error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `[${companyName}] Your CRM account is ready`,
      html:    buildWelcomeHtml({ userName, companyName, loginUrl }),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// New Tenant Created Email (to owner)
// ─────────────────────────────────────────────────────────────
export async function sendTenantCreatedEmail(params: {
  toEmail:   string;
  orgName:   string;
  subdomain: string;
  planType:  string;
}): Promise<void> {
  if (!EMAIL_ENABLED) return;

  const resend = getResend();
  if (!resend) return;

  const { toEmail, orgName, subdomain, planType } = params;
  const loginUrl = `https://${subdomain}.edubee.com/login`;

  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `🐝 Your Edubee CRM is ready — ${orgName}`,
      html:    buildTenantCreatedHtml({ orgName, subdomain, planType, loginUrl }),
    });
  } catch (err) {
    console.error('[EMAIL] Tenant creation notification failed:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// HTML Templates
// Brand: Edubee Orange #F5821F / Background #FAFAF9 / Text #1C1917
// ══════════════════════════════════════════════════════════════

function buildInvitationHtml(p: {
  companyName: string; inviterName: string; role: string;
  inviteUrl: string; expiryDate: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>CRM Invitation</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;overflow:hidden;">
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;">🐝 Edubee CRM</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">${p.companyName}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1C1917;">
                You've been invited to Edubee CRM
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.7;">
                <strong style="color:#1C1917;">${p.inviterName}</strong> has invited you
                to join <strong style="color:#1C1917;">${p.companyName}</strong> as a
                <strong style="color:#F5821F;">${p.role}</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.inviteUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background:#FEF0E3;border-radius:8px;padding:16px 20px;border-left:4px solid #F5821F;">
                <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6;">
                  ⏰ This invitation link expires on <strong>${p.expiryDate}</strong>.<br>
                  If the link has expired, please ask the admin to resend it.
                </p>
              </div>
              <p style="margin:24px 0 0;font-size:12px;color:#A8A29E;">
                If the button doesn't work, copy this link into your browser:<br>
                <span style="color:#F5821F;word-break:break-all;">${p.inviteUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F4F3F1;padding:20px 48px;border-top:1px solid #E8E6E2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">© 2026 Edubee CRM · This is an automated message</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeHtml(p: {
  userName: string; companyName: string; loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Account Ready</title></head>
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
              <h2 style="margin:0 0 16px;font-size:22px;color:#1C1917;">Welcome, ${p.userName}!</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.7;">
                Your <strong>${p.companyName}</strong> CRM account is now active. Click below to sign in.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.loginUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      Sign In to CRM →
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

function buildTenantCreatedHtml(p: {
  orgName: string; subdomain: string; planType: string; loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your CRM is Ready</title></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;">
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;">🐝 Edubee CRM</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">Account Created</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 20px;font-size:22px;color:#1C1917;">${p.orgName} CRM is ready 🎉</h2>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#FAFAF9;border-radius:8px;border:1px solid #E8E6E2;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#57534E;padding-bottom:12px;">Company</td>
                        <td style="font-size:13px;font-weight:600;color:#1C1917;text-align:right;padding-bottom:12px;">${p.orgName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#57534E;padding-bottom:12px;">CRM URL</td>
                        <td style="font-size:13px;color:#F5821F;text-align:right;padding-bottom:12px;">${p.subdomain}.edubee.com</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#57534E;">Plan</td>
                        <td style="font-size:13px;font-weight:600;color:#1C1917;text-align:right;text-transform:capitalize;">${p.planType}</td>
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
                      Get Started →
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
