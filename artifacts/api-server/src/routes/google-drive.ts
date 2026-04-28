import { Router } from "express";
import { google } from "googleapis";
import { db } from "@workspace/db";
import { accounts, contacts, organisations } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "https://api.edubee.co/api/google-drive/callback";

function makeOAuth2Client(clientId: string, clientSecret: string) {
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

async function loadOrgGoogle(orgId: string) {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId));
  const g = ((org?.integrations as any) ?? {}).google ?? {};
  return { org, g };
}

// ─── PUT /api/google-drive/credentials — save tenant's own OAuth credentials ──

router.put("/google-drive/credentials", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body as { clientId?: string; clientSecret?: string };
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId));
    const integrations = ((org.integrations as any) ?? {}) as Record<string, any>;
    integrations.google = {
      ...integrations.google,
      clientId:     clientId?.trim()     || null,
      clientSecret: clientSecret?.trim() || null,
      // clear OAuth tokens when credentials change
      ...(clientId?.trim() !== integrations.google?.clientId ? {
        connected: false, accessToken: null, refreshToken: null, expiryDate: null,
      } : {}),
    };
    await db.update(organisations).set({ integrations }).where(eq(organisations.id, orgId));
    res.json({ success: true });
  } catch (err) {
    console.error("[PUT /google-drive/credentials]", err);
    res.status(500).json({ error: "Failed to save credentials" });
  }
});

// ─── GET /api/google-drive/auth-url ──────────────────────────────────────────

router.get("/google-drive/auth-url", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId ?? "";
    const { g } = await loadOrgGoogle(orgId);

    const clientId     = g.clientId;
    const clientSecret = g.clientSecret;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        error: "Google credentials not configured. Please enter your Google Client ID and Client Secret first.",
      });
    }

    const oauth2Client = makeOAuth2Client(clientId, clientSecret);
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
// Google redirects here after OAuth consent — no Bearer token available

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

    const clientId     = g.clientId;
    const clientSecret = g.clientSecret;
    if (!clientId || !clientSecret) {
      return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=credentials_not_configured`);
    }

    const oauth2Client = makeOAuth2Client(clientId, clientSecret);
    const { tokens } = await oauth2Client.getToken(code);

    const integrations = ((org.integrations as any) ?? {}) as Record<string, any>;
    integrations.google = {
      ...integrations.google,
      connected:    true,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token ?? integrations.google?.refreshToken,
      expiryDate:   tokens.expiry_date,
    };
    await db.update(organisations).set({ integrations }).where(eq(organisations.id, orgId));

    return res.redirect(`${appUrl}/admin/settings/integrations?google=connected`);
  } catch (err: any) {
    console.error("[GET /google-drive/callback]", err);
    return res.redirect(`${appUrl}/admin/settings/integrations?google=error&msg=${encodeURIComponent(err.message ?? "unknown")}`);
  }
});

// ─── GET /api/google-drive/status ────────────────────────────────────────────

router.get("/google-drive/status", authenticate, async (req, res) => {
  try {
    let integrations = ((req.tenant?.integrations as any) ?? {}) as Record<string, any>;
    if (!req.tenant?.id && (req as any).user?.organisationId) {
      const { g: orgG } = await loadOrgGoogle((req as any).user.organisationId);
      integrations = { google: orgG };
    }
    const g = integrations.google ?? {};
    res.json({
      credentialsConfigured: !!g.clientId && !!g.clientSecret,
      clientId:     g.clientId ? `${(g.clientId as string).slice(0, 12)}...` : null,
      connected:    !!g.connected && !!g.accessToken,
      rootFolderId: g.rootFolderId ?? null,
    });
  } catch (err) {
    console.error("[GET /google-drive/status]", err);
    res.status(500).json({ error: "Failed to get status" });
  }
});

// ─── POST /api/google-drive/disconnect ───────────────────────────────────────

router.post("/google-drive/disconnect", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId));
    const integrations = ((org.integrations as any) ?? {}) as Record<string, any>;
    // keep clientId/clientSecret, only clear OAuth tokens
    integrations.google = {
      clientId:     integrations.google?.clientId ?? null,
      clientSecret: integrations.google?.clientSecret ?? null,
      connected:    false,
      accessToken:  null,
      refreshToken: null,
      expiryDate:   null,
      rootFolderId: integrations.google?.rootFolderId ?? null,
    };
    await db.update(organisations).set({ integrations }).where(eq(organisations.id, orgId));

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
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId));
    const integrations = ((org.integrations as any) ?? {}) as Record<string, any>;
    integrations.google = { ...integrations.google, rootFolderId: rootFolderId || null };
    await db.update(organisations).set({ integrations }).where(eq(organisations.id, orgId));

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
      const [freshOrg] = await db.select().from(organisations).where(eq(organisations.id, orgId));
      const ints = ((freshOrg.integrations as any) ?? {}) as Record<string, any>;
      ints.google = { ...ints.google, ...newTokens };
      await db.update(organisations).set({ integrations: ints }).where(eq(organisations.id, orgId));
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

// ─── POST /api/google-drive/accounts/:id/folder — auto-create ────────────────

router.post("/google-drive/accounts/:id/folder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const accountId = req.params.id as string;
    const orgId = req.tenant?.id;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) return res.status(404).json({ error: "Account not found" });

    let contact: any = null;
    if (account.primaryContactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, account.primaryContactId));
      contact = c ?? null;
    }

    const folderName = buildFolderName(account, contact);

    const { g } = await loadOrgGoogle(orgId);
    const rootFolderId = g.rootFolderId as string | undefined;

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

    await db.update(accounts)
      .set({ googleDriveFolderId: folderId, googleDriveFolderUrl: folderUrl })
      .where(eq(accounts.id, accountId));

    res.json({ folderId, folderUrl, folderName });
  } catch (err: any) {
    console.error("[POST /google-drive/accounts/:id/folder]", err);
    res.status(500).json({ error: err.message ?? "Failed to create folder" });
  }
});

// ─── PUT /api/google-drive/accounts/:id/folder — manual link ─────────────────

router.put("/google-drive/accounts/:id/folder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { folderId, folderUrl } = req.body as { folderId?: string; folderUrl?: string };
    await db.update(accounts)
      .set({ googleDriveFolderId: folderId ?? null, googleDriveFolderUrl: folderUrl ?? null })
      .where(eq(accounts.id, req.params.id as string));
    res.json({ success: true });
  } catch (err) {
    console.error("[PUT /google-drive/accounts/:id/folder]", err);
    res.status(500).json({ error: "Failed to update folder" });
  }
});

// ─── DELETE /api/google-drive/accounts/:id/folder — unlink ───────────────────

router.delete("/google-drive/accounts/:id/folder", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.update(accounts)
      .set({ googleDriveFolderId: null, googleDriveFolderUrl: null })
      .where(eq(accounts.id, req.params.id as string));
    res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /google-drive/accounts/:id/folder]", err);
    res.status(500).json({ error: "Failed to unlink folder" });
  }
});

export default router;
