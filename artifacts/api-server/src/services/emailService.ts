import { Resend } from 'resend';
import { staticDb } from '@workspace/db';
import { platformSettings } from '@workspace/db/schema';
import { inArray } from 'drizzle-orm';

const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';

async function getEmailConfig(): Promise<{ resend: Resend; fromEmail: string; fromName: string } | null> {
  let apiKey  = process.env.RESEND_API_KEY ?? '';
  let fromEmail = process.env.FROM_EMAIL ?? '';
  let fromName  = process.env.FROM_NAME  ?? '';

  if (!apiKey || !fromEmail) {
    try {
      const rows = await staticDb
        .select()
        .from(platformSettings)
        .where(inArray(platformSettings.key, ['resend.apiKey', 'resend.from', 'resend.fromName']));
      const cfg: Record<string, string> = {};
      for (const r of rows) cfg[r.key] = r.value ?? '';
      if (!apiKey)    apiKey    = cfg['resend.apiKey'] ?? '';
      if (!fromEmail) fromEmail = cfg['resend.from']   ?? '';
      if (!fromName)  fromName  = cfg['resend.fromName'] ?? '';
    } catch (err) {
      console.warn('[EMAIL] Could not read platform_settings for Resend config:', String(err));
    }
  }

  if (!apiKey || !fromEmail) {
    console.warn('[EMAIL] Resend not configured (no API key or FROM address). Email skipped.');
    return null;
  }

  return {
    resend: new Resend(apiKey),
    fromEmail,
    fromName: fromName || 'Edubee CRM',
  };
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

  const cfg = await getEmailConfig();
  if (!cfg) return { success: false, error: 'Resend not configured' };

  const { toEmail, inviterName, companyName, role, inviteToken, subdomain, expiresAt } = params;

  const baseUrl   = subdomain
    ? `https://${subdomain}.edubee.co`
    : process.env.APP_URL ?? 'https://app.edubee.co';
  const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;
  const logoUrl   = `${baseUrl}/edubee-symbol.png`;

  const expiryDate = expiresAt.toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  try {
    const { data, error } = await cfg.resend.emails.send({
      from:    `${cfg.fromName} <${cfg.fromEmail}>`,
      to:      toEmail,
      subject: `[${companyName}] You've been invited to Edubee CRM`,
      html:    buildInvitationHtml({ companyName, inviterName, role, inviteUrl, expiryDate, logoUrl }),
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

  const cfg = await getEmailConfig();
  if (!cfg) return { success: false, error: 'Resend not configured' };

  const { toEmail, userName, companyName, loginUrl } = params;
  const logoUrl = loginUrl.replace(/\/login$/, '/edubee-symbol.png');

  try {
    const { error } = await cfg.resend.emails.send({
      from:    `${cfg.fromName} <${cfg.fromEmail}>`,
      to:      toEmail,
      subject: `[${companyName}] Your CRM account is ready`,
      html:    buildWelcomeHtml({ userName, companyName, loginUrl, logoUrl }),
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

  const cfg = await getEmailConfig();
  if (!cfg) return;

  const { toEmail, orgName, subdomain, planType } = params;
  const loginUrl = `https://${subdomain}.edubee.co/login`;
  const logoUrl  = `https://${subdomain}.edubee.co/edubee-symbol.png`;

  try {
    await cfg.resend.emails.send({
      from:    `${cfg.fromName} <${cfg.fromEmail}>`,
      to:      toEmail,
      subject: `Your Edubee CRM is ready — ${orgName}`,
      html:    buildTenantCreatedHtml({ orgName, subdomain, planType, loginUrl, logoUrl }),
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
  inviteUrl: string; expiryDate: string; logoUrl: string;
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
              <img src="${p.logoUrl}" alt="Edubee CRM" width="48" height="48"
                   style="display:inline-block;border-radius:10px;margin-bottom:10px;" />
              <div style="font-size:22px;font-weight:700;color:#FFFFFF;">Edubee CRM</div>
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
  userName: string; companyName: string; loginUrl: string; logoUrl: string;
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
              <img src="${p.logoUrl}" alt="Edubee CRM" width="48" height="48"
                   style="display:inline-block;border-radius:10px;margin-bottom:10px;" />
              <div style="font-size:22px;font-weight:700;color:#FFFFFF;">Edubee CRM</div>
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
  orgName: string; subdomain: string; planType: string; loginUrl: string; logoUrl: string;
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
              <img src="${p.logoUrl}" alt="Edubee CRM" width="48" height="48"
                   style="display:inline-block;border-radius:10px;margin-bottom:10px;" />
              <div style="font-size:22px;font-weight:700;color:#FFFFFF;">Edubee CRM</div>
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
                        <td style="font-size:13px;color:#F5821F;text-align:right;padding-bottom:12px;">${p.subdomain}.edubee.co</td>
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

function buildPasswordResetHtml(p: {
  fullName: string; resetUrl: string; orgName: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;overflow:hidden;">
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#FFFFFF;">Edubee CRM</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">${p.orgName}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#1C1917;">
                Reset your password
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.7;">
                Hi <strong style="color:#1C1917;">${p.fullName}</strong>,<br>
                We received a request to reset your password. Click the button below to create a new one.
                This link will expire in <strong>1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.resetUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background:#FEF0E3;border-radius:8px;padding:16px 20px;border-left:4px solid #F5821F;">
                <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6;">
                  If you didn't request a password reset, you can safely ignore this email.
                  Your password will remain unchanged.
                </p>
              </div>
              <p style="margin:24px 0 0;font-size:12px;color:#A8A29E;">
                If the button doesn't work, copy this link:<br>
                <span style="color:#F5821F;word-break:break-all;">${p.resetUrl}</span>
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

// ─────────────────────────────────────────────────────────────
// Password Reset Email
// ─────────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(params: {
  toEmail:   string;
  fullName:  string;
  resetUrl:  string;
  orgName:   string;
}): Promise<{ success: boolean; error?: string }> {
  if (!EMAIL_ENABLED) {
    console.log('[EMAIL DISABLED] Skipping password reset email:', params.toEmail);
    return { success: true };
  }

  const cfg = await getEmailConfig();
  if (!cfg) return { success: false, error: 'Resend not configured' };

  const { toEmail, fullName, resetUrl, orgName } = params;

  try {
    const { error } = await cfg.resend.emails.send({
      from:    `${cfg.fromName} <${cfg.fromEmail}>`,
      to:      toEmail,
      subject: `[${orgName}] Password reset request`,
      html:    buildPasswordResetHtml({ fullName, resetUrl, orgName }),
    });

    if (error) {
      console.error('[RESEND ERROR] Password reset email:', error);
      return { success: false, error: error.message };
    }

    console.log('[EMAIL SENT] Password reset:', toEmail);
    return { success: true };
  } catch (err) {
    console.error('[EMAIL EXCEPTION] Password reset:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// Camp Onboard Welcome Email (sent when a new camp org signs up)
// ─────────────────────────────────────────────────────────────
export async function sendCampOnboardWelcomeEmail(params: {
  toEmail:   string;
  adminName: string;
  orgName:   string;
  subdomain: string;
  loginUrl:  string;
  trialDays: number;
}): Promise<void> {
  if (!EMAIL_ENABLED) return;
  const cfg = await getEmailConfig();
  if (!cfg) return;

  const { toEmail, adminName, orgName, subdomain, loginUrl, trialDays } = params;
  const campUrl = `https://${subdomain}.edubee.co/camp/`;
  const logoUrl = `https://edubee.co/edubee-symbol.png`;

  try {
    await cfg.resend.emails.send({
      from:    `${cfg.fromName} <${cfg.fromEmail}>`,
      to:      toEmail,
      subject: `Welcome to Edubee CAMP — Your portal is ready!`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome</title></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E8E6E2;">
      <tr><td style="background:#F5821F;padding:32px 48px;">
        <img src="${logoUrl}" alt="Edubee" width="36" height="36" style="display:block;">
      </td></tr>
      <tr><td style="padding:40px 48px;">
        <h1 style="margin:0 0 8px;font-size:24px;color:#1C1917;">Welcome, ${adminName}!</h1>
        <p style="margin:0 0 24px;font-size:16px;color:#57534E;">Your <strong>${orgName}</strong> camp portal is live.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF0E3;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#A8A29E;text-transform:uppercase;">YOUR PORTAL</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#F5821F;">${campUrl}</p>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F1;border-radius:8px;margin-bottom:32px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 4px;font-size:14px;color:#57534E;"><strong>Login email:</strong> ${toEmail}</p>
            <p style="margin:0;font-size:13px;color:#A8A29E;">Free trial: ${trialDays} days full access</p>
          </td></tr>
        </table>
        <a href="${loginUrl}" style="display:inline-block;background:#F5821F;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Go to my portal →</a>
      </td></tr>
      <tr><td style="background:#F4F3F1;padding:20px 48px;text-align:center;border-top:1px solid #E8E6E2;">
        <p style="margin:0;font-size:12px;color:#A8A29E;">Powered by Edubee · edubee.co</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    });
    console.log('[EMAIL SENT] Camp onboard welcome:', toEmail);
  } catch (err) {
    console.error('[EMAIL] Camp onboard welcome failed:', err);
  }
}
