import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { organisations } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// HMAC-signed OAuth state — prevents an attacker crafting a state to redirect
// their own QuickBooks tokens into a victim org's record.
function signState(orgId: string): string {
  const secret = process.env.JWT_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(orgId).digest("base64url").slice(0, 32);
  return `${Buffer.from(orgId).toString("base64url")}.${sig}`;
}

function verifyState(state: string): string | null {
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  let orgId: string;
  try { orgId = Buffer.from(b64, "base64url").toString("utf-8"); } catch { return null; }
  const secret = process.env.JWT_SECRET ?? "";
  const expected = crypto.createHmac("sha256", secret).update(orgId).digest("base64url").slice(0, 32);
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return orgId;
}

const REDIRECT_URI =
  process.env.QUICKBOOKS_REDIRECT_URI ?? "https://api.edubee.co/api/quickbooks/callback";

const OAUTH_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const OAUTH_TOKEN_URL     = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const OAUTH_REVOKE_URL    = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

// Sandbox vs production base — controlled per-tenant via integrations.quickbooks.environment
const API_BASE_SANDBOX    = "https://sandbox-quickbooks.api.intuit.com";
const API_BASE_PRODUCTION = "https://quickbooks.api.intuit.com";

const SCOPES = "com.intuit.quickbooks.accounting";

type QboState = {
  clientId?:     string | null;
  clientSecret?: string | null;
  environment?:  "sandbox" | "production";
  connected?:    boolean;
  realmId?:      string | null;
  accessToken?:  string | null;
  refreshToken?: string | null;
  expiresAt?:    number | null;       // ms epoch
  refreshExpiresAt?: number | null;   // ms epoch
};

async function loadOrgQbo(orgId: string): Promise<{ org: any; q: QboState }> {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId));
  const q = (((org?.integrations as any) ?? {}).quickbooks ?? {}) as QboState;
  return { org, q };
}

async function saveOrgQbo(orgId: string, patch: Partial<QboState>) {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId));
  const integrations = ((org.integrations as any) ?? {}) as Record<string, any>;
  integrations.quickbooks = { ...(integrations.quickbooks ?? {}), ...patch };
  await db.update(organisations).set({ integrations }).where(eq(organisations.id, orgId));
}

function basicAuthHeader(clientId: string, clientSecret: string) {
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

function apiBaseFor(env?: string) {
  return env === "production" ? API_BASE_PRODUCTION : API_BASE_SANDBOX;
}

// ─── PUT /api/quickbooks/credentials — save tenant's own OAuth credentials ────

router.put("/quickbooks/credentials", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { clientId, clientSecret, environment } = req.body as {
      clientId?: string; clientSecret?: string; environment?: "sandbox" | "production";
    };
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const { q: prev } = await loadOrgQbo(orgId);
    const credsChanged = clientId?.trim() !== prev.clientId;

    await saveOrgQbo(orgId, {
      clientId:     clientId?.trim()     || null,
      clientSecret: clientSecret?.trim() || null,
      environment:  environment === "production" ? "production" : "sandbox",
      ...(credsChanged ? {
        connected: false, realmId: null, accessToken: null, refreshToken: null,
        expiresAt: null, refreshExpiresAt: null,
      } : {}),
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[PUT /quickbooks/credentials]", err);
    res.status(500).json({ error: "Failed to save credentials" });
  }
});

// ─── GET /api/quickbooks/auth-url ────────────────────────────────────────────

router.get("/quickbooks/auth-url", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });
    const { q } = await loadOrgQbo(orgId);

    if (!q.clientId || !q.clientSecret) {
      return res.status(400).json({
        error: "QuickBooks credentials not configured. Please enter your Client ID and Client Secret first.",
      });
    }

    const state = signState(orgId);
    const params = new URLSearchParams({
      client_id:     q.clientId,
      response_type: "code",
      scope:         SCOPES,
      redirect_uri:  REDIRECT_URI,
      state,
    });
    res.json({ url: `${OAUTH_AUTHORIZE_URL}?${params.toString()}` });
  } catch (err) {
    console.error("[GET /quickbooks/auth-url]", err);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

// ─── GET /api/quickbooks/callback ────────────────────────────────────────────
// Intuit redirects here after consent — no Bearer available

router.get("/quickbooks/callback", async (req, res) => {
  const appUrl = process.env.APP_URL ?? "https://app.edubee.co";
  const back = (status: string, msg?: string) =>
    res.redirect(`${appUrl}/admin/settings/integrations?quickbooks=${status}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`);

  try {
    const { code, state, realmId, error } = req.query as Record<string, string>;
    if (error)             return back("error", error);
    if (!code || !state)   return back("error", "missing_code");
    if (!realmId)          return back("error", "missing_realm");

    const orgId = verifyState(state);
    if (!orgId) return back("error", "invalid_state");

    const { org, q } = await loadOrgQbo(orgId);
    if (!org)                          return back("error", "org_not_found");
    if (!q.clientId || !q.clientSecret) return back("error", "credentials_not_configured");

    const tokenRes = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(q.clientId, q.clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type:   "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("[QBO token exchange failed]", tokenRes.status, text);
      return back("error", `token_exchange_${tokenRes.status}`);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
    };

    const now = Date.now();
    await saveOrgQbo(orgId, {
      connected:        true,
      realmId,
      accessToken:      tokens.access_token,
      refreshToken:     tokens.refresh_token,
      expiresAt:        now + tokens.expires_in * 1000,
      refreshExpiresAt: now + tokens.x_refresh_token_expires_in * 1000,
    });

    return back("connected");
  } catch (err: any) {
    console.error("[GET /quickbooks/callback]", err);
    return back("error", err?.message ?? "unknown");
  }
});

// ─── GET /api/quickbooks/status ──────────────────────────────────────────────

router.get("/quickbooks/status", authenticate, async (req, res) => {
  try {
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.json({ credentialsConfigured: false, connected: false, environment: "sandbox", realmId: null, clientId: null });

    const { q } = await loadOrgQbo(orgId);
    res.json({
      credentialsConfigured: !!q.clientId && !!q.clientSecret,
      clientId:    q.clientId ? `${q.clientId.slice(0, 12)}...` : null,
      environment: q.environment ?? "sandbox",
      connected:   !!q.connected && !!q.accessToken && !!q.realmId,
      realmId:     q.realmId ?? null,
    });
  } catch (err) {
    console.error("[GET /quickbooks/status]", err);
    res.status(500).json({ error: "Failed to get status" });
  }
});

// ─── POST /api/quickbooks/disconnect ─────────────────────────────────────────

router.post("/quickbooks/disconnect", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const { q } = await loadOrgQbo(orgId);

    // best-effort revoke at Intuit
    if (q.clientId && q.clientSecret && q.refreshToken) {
      try {
        await fetch(OAUTH_REVOKE_URL, {
          method: "POST",
          headers: {
            Authorization: basicAuthHeader(q.clientId, q.clientSecret),
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ token: q.refreshToken }),
        });
      } catch { /* non-fatal */ }
    }

    await saveOrgQbo(orgId, {
      connected: false, realmId: null, accessToken: null, refreshToken: null,
      expiresAt: null, refreshExpiresAt: null,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[POST /quickbooks/disconnect]", err);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// ─── Token refresh helper ────────────────────────────────────────────────────

async function ensureFreshAccessToken(orgId: string): Promise<{ accessToken: string; realmId: string; environment: string }> {
  const { q } = await loadOrgQbo(orgId);
  if (!q.connected || !q.accessToken || !q.realmId) {
    throw new Error("QuickBooks is not connected. Please connect in Settings → Integrations.");
  }
  if (!q.clientId || !q.clientSecret) throw new Error("QuickBooks credentials not configured.");

  const now = Date.now();
  const skewMs = 60_000;
  if (q.expiresAt && q.expiresAt - skewMs > now) {
    return { accessToken: q.accessToken, realmId: q.realmId, environment: q.environment ?? "sandbox" };
  }

  if (!q.refreshToken) throw new Error("No refresh token; please reconnect QuickBooks.");

  const refreshRes = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(q.clientId, q.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: q.refreshToken,
    }).toString(),
  });

  if (!refreshRes.ok) {
    const text = await refreshRes.text();
    throw new Error(`QBO token refresh failed (${refreshRes.status}): ${text}`);
  }

  const tokens = await refreshRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
  };

  await saveOrgQbo(orgId, {
    accessToken:      tokens.access_token,
    refreshToken:     tokens.refresh_token,
    expiresAt:        Date.now() + tokens.expires_in * 1000,
    refreshExpiresAt: Date.now() + tokens.x_refresh_token_expires_in * 1000,
  });

  return { accessToken: tokens.access_token, realmId: q.realmId, environment: q.environment ?? "sandbox" };
}

async function qboFetch(orgId: string, path: string, init: RequestInit = {}) {
  const { accessToken, realmId, environment } = await ensureFreshAccessToken(orgId);
  const url = `${apiBaseFor(environment)}/v3/company/${realmId}${path}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers ?? {}),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  if (!res.ok) {
    const msg = json?.Fault?.Error?.[0]?.Message ?? text ?? `QBO ${res.status}`;
    throw new Error(`QBO API ${res.status}: ${msg}`);
  }
  return json;
}

// ─── GET /api/quickbooks/company-info — sanity check after connect ───────────

router.get("/quickbooks/company-info", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const { realmId } = await ensureFreshAccessToken(orgId);
    const data = await qboFetch(orgId, `/companyinfo/${realmId}?minorversion=70`);
    res.json({ companyInfo: data?.CompanyInfo ?? null });
  } catch (err: any) {
    console.error("[GET /quickbooks/company-info]", err);
    res.status(500).json({ error: err?.message ?? "Failed to fetch company info" });
  }
});

// ─── POST /api/quickbooks/test-invoice — minimal invoice push (PoC) ──────────
// Body: { customerName: string, amount: number, description?: string }
// Picks the first Income account + a generic Service item; creates Customer if missing.

router.post("/quickbooks/test-invoice", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = req.tenant?.id ?? (req as any).user?.organisationId;
    if (!orgId) return res.status(400).json({ error: "No organisation" });

    const { customerName, amount, description } = req.body as {
      customerName?: string; amount?: number; description?: string;
    };
    if (!customerName || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "customerName and positive amount required" });
    }

    // 1) find or create Customer
    const customerQuery = `select * from Customer where DisplayName = '${customerName.replace(/'/g, "\\'")}'`;
    const customerRes = await qboFetch(orgId, `/query?query=${encodeURIComponent(customerQuery)}&minorversion=70`);
    let customerId: string | undefined = customerRes?.QueryResponse?.Customer?.[0]?.Id;

    if (!customerId) {
      const created = await qboFetch(orgId, `/customer?minorversion=70`, {
        method: "POST",
        body: JSON.stringify({ DisplayName: customerName }),
      });
      customerId = created?.Customer?.Id;
      if (!customerId) throw new Error("Failed to create QBO customer");
    }

    // 2) find a default Item (Services) — use first available
    const itemRes = await qboFetch(orgId, `/query?query=${encodeURIComponent("select * from Item where Type = 'Service' maxresults 1")}&minorversion=70`);
    const itemId: string | undefined = itemRes?.QueryResponse?.Item?.[0]?.Id;
    if (!itemId) {
      return res.status(400).json({ error: "No Service item found in QuickBooks. Please create one in QBO first (sandbox usually has 'Services')." });
    }

    // 3) create Invoice
    const invoice = await qboFetch(orgId, `/invoice?minorversion=70`, {
      method: "POST",
      body: JSON.stringify({
        CustomerRef: { value: customerId },
        Line: [{
          DetailType: "SalesItemLineDetail",
          Amount: amount,
          Description: description ?? "Edubee CRM test invoice",
          SalesItemLineDetail: { ItemRef: { value: itemId } },
        }],
      }),
    });

    res.json({
      invoiceId:  invoice?.Invoice?.Id,
      docNumber:  invoice?.Invoice?.DocNumber,
      totalAmt:   invoice?.Invoice?.TotalAmt,
      customerId,
      itemId,
    });
  } catch (err: any) {
    console.error("[POST /quickbooks/test-invoice]", err);
    res.status(500).json({ error: err?.message ?? "Failed to create test invoice" });
  }
});

export default router;
