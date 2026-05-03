import { Router } from "express";
import { google } from "googleapis";
import { db, staticDb } from "@workspace/db";
import { accounts, contacts, organisations } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "https://api.edubee.co/api/google-drive/callback";

const DEFAULT_SUBFOLDERS = ["Visa", "Application", "Contracts", "Receipts", "Other"];
const TOKEN_EXPIRY_WARN_MS = 7 * 24 * 60 * 60 * 1000; // warn within 7 days
const AUDIT_CAP = 50;

function makeOAuth2Client(clientId: string, clientSecret: string) {
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

// organisations is a platform-level table — always read/write via staticDb (public schema).
// Going through tenant-routed `db` would require every tenant schema to mirror the full
// organisations column list, which causes drift errors when columns are added.
async function loadOrgGoogle(orgId: string) {
  const [org] = await staticDb.select().from(organisations).where(eq(organisations.id, orgId));
  const g = ((org?.integrations as any) ?? {}).google ?? {};
  return { org, g };
}

async function saveOrgGoogle(orgId: string, mutate: (g: any) => any) {
  const [org] = await staticDb.select().from(organisations).where(eq(organisations.id, orgId));
  if (!org) return null;
  const integrations = ((org.integrations as any) ?? {}) as Record<string, any>;
  integrations.google = mutate(integrations.google ?? {});
  await staticDb.update(organisations).set({ integrations }).where(eq(organisations.id, orgId));
  return integrations.google;
}

type AuditEntry = {
  action: string;
  at: string;
  userId?: string | null;
  accountId?: string | null;
  message?: string | null;
};

async function appendAudit(orgId: string, entry: AuditEntry) {
  try {
    await saveOrgGoogle(orgId, (g) => {
      const history: AuditEntry[] = Array.isArray(g.auditLog) ? g.auditLog : [];
      history.unshift(entry);
      return { ...g, auditLog: history.slice(0, AUDIT_CAP) };
    });
  } catch (err) {
    console.error("[google-drive appendAudit]", err);
  }
}

function getOrgIdFromReq(req: any): string | null {
  return req.tenant?.id ?? req.user?.organisationId ?? null;
}

// ─── PUT /api/google-drive/credentials — save tenant's own OAuth credentials ──

router.put("/google-drive/credentials", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body as { clientId?: string; clientSecret?: string };
    const orgId = getOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const newClientId = clientId?.trim() || null;
    const credentialsChanged = await saveOrgGoogle(orgId, (g) => ({
      ...g,
      clientId:     newClientId,
      clientSecret: clientSecret?.trim() || null,
      ...(newClientId !== g.clientId ? {
        connected: false, accessToken: null, refreshToken: null, expiryDate: null,
      } : {}),
    }));

    await appendAudit(orgId, {
      action: "credentials.saved",
      at: new Date().toISOString(),
      userId: (req as any).user?.id ?? null,
    });

    res.json({ success: true, settings: redactSettings(credentialsChanged) });
  } catch (err) {
    console.error("[PUT /google-drive/credentials]", err);
    res.status(500).json({ error: "Failed to save credentials" });
  }
});

// ─── GET /api/google-drive/auth-url ──────────────────────────────────────────

router.get("/google-drive/auth-url", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = getOrgIdFromReq(req) ?? "";
    const { g } = await loadOrgGoogle(orgId);

    if (!g.clientId || !g.clientSecret) {
      return res.status(400).json({
        error: "Google credentials not configured. Please enter your Google Client ID and Client Secret first.",
      });
    }

    const oauth2Client = makeOAuth2Client(g.clientId, g.clientSecret);
    const state = Buffer.from(orgId).toString("base64url");
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ],
      prompt: "consent",
      state,
    });
    res.json({ url });
  } catch (err) {
    console.error("[GET /google-drive/auth-url]", err);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// ─── GET /api/google-drive/callback ──────────────────────────────────────────

router.get("/google-drive/callback", async (req, res) => {
  const appUrl = process.env.APP_URL ?? "https://app.edubee.co";
  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=missing_code`);
    }

    const orgId = Buffer.from(state, "base64url").toString("utf-8");
    if (!orgId) {
      return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=invalid_state`);
    }

    const { org, g } = await loadOrgGoogle(orgId);
    if (!org) {
      return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=org_not_found`);
    }
    if (!g.clientId || !g.clientSecret) {
      return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=credentials_not_configured`);
    }

    const oauth2Client = makeOAuth2Client(g.clientId, g.clientSecret);
    const { tokens } = await oauth2Client.getToken(code);

    await saveOrgGoogle(orgId, (gg) => ({
      ...gg,
      connected:    true,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? gg.refreshToken,
      expiryDate:   tokens.expiry_date,
    }));

    await appendAudit(orgId, {
      action: "oauth.connected",
      at: new Date().toISOString(),
    });

    return res.redirect(`${appUrl}/admin/settings/integrations?google=connected`);
  } catch (err: any) {
    console.error("[GET /google-drive/callback]", err);
    return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=${encodeURIComponent(err.message ?? "unknown")}`);
  }
});

// ─── GET /api/google-drive/status ────────────────────────────────────────────

function redactSettings(g: any) {
  const expiryDate = typeof g?.expiryDate === "number" ? g.expiryDate : null;
  const expiringSoon = expiryDate ? (expiryDate - Date.now()) < TOKEN_EXPIRY_WARN_MS : false;
  const expired = expiryDate ? expiryDate < Date.now() : false;

  return {
    credentialsConfigured: !!g?.clientId && !!g?.clientSecret,
    clientId:     g?.clientId ? `${(g.clientId as string).slice(0, 12)}...` : null,
    connected:    !!g?.connected && !!g?.accessToken,
    rootFolderId: g?.rootFolderId ?? null,
    autoCreateOnAccount: !!g?.autoCreateOnAccount,
    subfolderTemplate:   Array.isArray(g?.subfolderTemplate) ? g.subfolderTemplate : DEFAULT_SUBFOLDERS,
    tokenExpiryDate:     expiryDate,
    tokenExpiringSoon:   expiringSoon,
    tokenExpired:        expired,
    auditLog:            Array.isArray(g?.auditLog) ? g.auditLog.slice(0, 10) : [],
  };
}

router.get("/google-drive/status", authenticate, async (req, res) => {
  try {
    const orgId = getOrgIdFromReq(req);
    if (!orgId) return res.json(redactSettings({}));
    const { g } = await loadOrgGoogle(orgId);
    res.json(redactSettings(g));
  } catch (err: any) {
    console.error("[GET /google-drive/status]", err?.message ?? err);
    // Don't leak SQL or internal details
    res.status(500).json({ error: "Failed to get status" });
  }
});

// ─── PUT /api/google-drive/settings — autoCreate + subfolderTemplate ─────────

router.put("/google-drive/settings", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = getOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const { autoCreateOnAccount, subfolderTemplate } = req.body as {
      autoCreateOnAccount?: boolean;
      subfolderTemplate?: string[];
    };

    let cleanedSubfolders: string[] | undefined;
    if (Array.isArray(subfolderTemplate)) {
      cleanedSubfolders = subfolderTemplate
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0 && s.length <= 80)
        .slice(0, 20);
    }

    const updated = await saveOrgGoogle(orgId, (g) => ({
      ...g,
      ...(typeof autoCreateOnAccount === "boolean" ? { autoCreateOnAccount } : {}),
      ...(cleanedSubfolders ? { subfolderTemplate: cleanedSubfolders } : {}),
    }));

    await appendAudit(orgId, {
      action: "settings.updated",
      at: new Date().toISOString(),
      userId: (req as any).user?.id ?? null,
      message: `autoCreate=${autoCreateOnAccount ?? "unchanged"}, subfolders=${cleanedSubfolders?.length ?? "unchanged"}`,
    });

    res.json({ success: true, settings: redactSettings(updated) });
  } catch (err) {
    console.error("[PUT /google-drive/settings]", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ─── POST /api/google-drive/disconnect ───────────────────────────────────────

router.post("/google-drive/disconnect", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = getOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    await saveOrgGoogle(orgId, (g) => ({
      ...g,
      connected:    false,
      accessToken:  null,
      refreshToken: null,
      expiryDate:   null,
    }));

    await appendAudit(orgId, {
      action: "oauth.disconnected",
      at: new Date().toISOString(),
      userId: (req as any).user?.id ?? null,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[POST /google-drive/disconnect]", err);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// ─── PUT /api/google-drive/root-folder ───────────────────────────────────────

router.put("/google-drive/root-folder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { rootFolderId } = req.body as { rootFolderId: string };
    const orgId = getOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    await saveOrgGoogle(orgId, (g) => ({ ...g, rootFolderId: rootFolderId || null }));

    await appendAudit(orgId, {
      action: "rootFolder.updated",
      at: new Date().toISOString(),
      userId: (req as any).user?.id ?? null,
      message: rootFolderId ? `rootFolderId=${rootFolderId.slice(0, 24)}` : "cleared",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[PUT /google-drive/root-folder]", err);
    res.status(500).json({ error: "Failed to update root folder" });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getDriveClient(orgId: string) {
  const { g } = await loadOrgGoogle(orgId);
  if (!g?.accessToken) throw new Error("Google Drive is not connected. Please connect in Settings → Integrations.");
  if (!g?.clientId || !g?.clientSecret) throw new Error("Google credentials not configured.");

  const oauth2Client = makeOAuth2Client(g.clientId, g.clientSecret);
  oauth2Client.setCredentials({
    access_token:  g.accessToken,
    refresh_token: g.refreshToken,
    expiry_date:   g.expiryDate,
  });

  oauth2Client.on("tokens", async (newTokens) => {
    try {
      await saveOrgGoogle(orgId, (gg) => ({ ...gg, ...newTokens }));
    } catch { /* non-fatal */ }
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

function buildFolderName(account: any, contact: any): string {
  const dob = contact?.dob ?? contact?.dateOfBirth;
  const year = dob ? new Date(dob).getFullYear().toString() : "XXXX";

  const raw = account.name ?? "";
  const parts = raw.trim().split(/\s+/);
  const lastRaw  = account.lastName  ?? (parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "");
  const firstRaw = account.firstName ?? (parts.length > 1 ? parts[0] : "");

  const lastName  = lastRaw.toUpperCase();
  const firstName = firstRaw.charAt(0).toUpperCase() + firstRaw.slice(1).toLowerCase();
  const nationality = contact?.nationality ?? account.country ?? "Unknown";

  return `${year}-${lastName}_${firstName}-${nationality}`;
}

/**
 * Create a Google Drive folder for an account, including subfolders from
 * the tenant's template. Persists folderId/folderUrl on the account row.
 * Exported so other routes (e.g. account creation) can call it directly.
 */
export async function createAccountFolderForOrg(
  orgId: string,
  accountId: string,
  invokedBy?: string | null,
): Promise<{ folderId: string; folderUrl: string; folderName: string; subfolders: string[] }> {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) throw new Error("Account not found");
  if (account.organisationId && account.organisationId !== orgId) {
    throw new Error("Account does not belong to this organisation");
  }

  let contact: any = null;
  if (account.primaryContactId) {
    const [c] = await db.select().from(contacts).where(eq(contacts.id, account.primaryContactId));
    contact = c ?? null;
  }

  const folderName = buildFolderName(account, contact);
  const { g } = await loadOrgGoogle(orgId);
  const rootFolderId = g.rootFolderId as string | undefined;
  const subfolderTemplate: string[] = Array.isArray(g.subfolderTemplate) ? g.subfolderTemplate : DEFAULT_SUBFOLDERS;

  const drive = await getDriveClient(orgId);

  const created = await drive.files.create({
    requestBody: {
      name:     folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents:  rootFolderId ? [rootFolderId] : [],
    },
    fields: "id,name,webViewLink",
  });

  const folderId  = created.data.id!;
  const folderUrl = created.data.webViewLink!;

  // Create subfolders (best-effort; failures don't block the parent folder)
  const createdSubs: string[] = [];
  for (const sub of subfolderTemplate) {
    try {
      await drive.files.create({
        requestBody: {
          name: sub,
          mimeType: "application/vnd.google-apps.folder",
          parents: [folderId],
        },
        fields: "id",
      });
      createdSubs.push(sub);
    } catch (err) {
      console.error(`[createAccountFolderForOrg] subfolder "${sub}" failed:`, err);
    }
  }

  await db.update(accounts)
    .set({ googleDriveFolderId: folderId, googleDriveFolderUrl: folderUrl })
    .where(eq(accounts.id, accountId));

  await appendAudit(orgId, {
    action: "folder.created",
    at: new Date().toISOString(),
    userId: invokedBy ?? null,
    accountId,
    message: `folder=${folderName}, subfolders=${createdSubs.length}`,
  });

  return { folderId, folderUrl, folderName, subfolders: createdSubs };
}

// ─── POST /api/google-drive/accounts/:id/folder — auto-create ────────────────

router.post("/google-drive/accounts/:id/folder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const accountId = req.params.id as string;
    const orgId = getOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const result = await createAccountFolderForOrg(orgId, accountId, (req as any).user?.id ?? null);
    res.json(result);
  } catch (err: any) {
    console.error("[POST /google-drive/accounts/:id/folder]", err?.message ?? err);
    // Surface only safe, user-actionable messages — never raw SQL/DB errors
    const msg = err?.message ?? "";
    const safe = /not connected|not configured|Account not found|does not belong/i.test(msg) ? msg : "Failed to create folder";
    res.status(500).json({ error: safe });
  }
});

// ─── GET /api/google-drive/accounts/:id/files — list files in folder ─────────

router.get("/google-drive/accounts/:id/files", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const accountId = req.params.id as string;
    const orgId = getOrgIdFromReq(req);
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.organisationId && account.organisationId !== orgId) {
      return res.status(403).json({ error: "Forbidden — account belongs to a different organisation" });
    }
    if (!account.googleDriveFolderId) return res.json({ files: [], folderId: null });

    const drive = await getDriveClient(orgId);
    const list = await drive.files.list({
      q: `'${account.googleDriveFolderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,webViewLink,iconLink,modifiedTime,size)",
      orderBy: "folder,modifiedTime desc",
      pageSize: 100,
    });

    res.json({
      folderId: account.googleDriveFolderId,
      folderUrl: account.googleDriveFolderUrl,
      files: list.data.files ?? [],
    });
  } catch (err: any) {
    console.error("[GET /google-drive/accounts/:id/files]", err?.message ?? err);
    const msg = err?.message ?? "";
    const safe = /not connected|not configured|Account not found|does not belong/i.test(msg) ? msg : "Failed to list files";
    res.status(500).json({ error: safe });
  }
});

// ─── PUT /api/google-drive/accounts/:id/folder — manual link ─────────────────

router.put("/google-drive/accounts/:id/folder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { folderId, folderUrl } = req.body as { folderId?: string; folderUrl?: string };
    const orgId = getOrgIdFromReq(req);
    const accountId = req.params.id as string;

    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.organisationId && orgId && account.organisationId !== orgId) {
      return res.status(403).json({ error: "Forbidden — account belongs to a different organisation" });
    }

    await db.update(accounts)
      .set({ googleDriveFolderId: folderId ?? null, googleDriveFolderUrl: folderUrl ?? null })
      .where(eq(accounts.id, accountId));

    if (orgId) {
      await appendAudit(orgId, {
        action: "folder.linked",
        at: new Date().toISOString(),
        userId: (req as any).user?.id ?? null,
        accountId: req.params.id as string,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[PUT /google-drive/accounts/:id/folder]", err);
    res.status(500).json({ error: "Failed to update folder" });
  }
});

// ─── DELETE /api/google-drive/accounts/:id/folder — unlink ───────────────────

router.delete("/google-drive/accounts/:id/folder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = getOrgIdFromReq(req);
    const accountId = req.params.id as string;

    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.organisationId && orgId && account.organisationId !== orgId) {
      return res.status(403).json({ error: "Forbidden — account belongs to a different organisation" });
    }

    await db.update(accounts)
      .set({ googleDriveFolderId: null, googleDriveFolderUrl: null })
      .where(eq(accounts.id, accountId));

    if (orgId) {
      await appendAudit(orgId, {
        action: "folder.unlinked",
        at: new Date().toISOString(),
        userId: (req as any).user?.id ?? null,
        accountId: req.params.id as string,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /google-drive/accounts/:id/folder]", err);
    res.status(500).json({ error: "Failed to unlink folder" });
  }
});

export default router;
