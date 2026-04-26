import { Router, Request } from "express";
import { db, staticDb } from "@workspace/db";
import { platformSettings, airtableSyncMap } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { encryptField, decryptField } from "../lib/crypto.js";
import { syncAirtableBase } from "../services/airtableService.js";

const router = Router();
const guard = [authenticate, requireRole("super_admin", "admin")];

// ── org-scoped key helpers ────────────────────────────────────────────────────

function getOrgId(req: Request): string | null {
  return (req as any).user?.organisationId ?? (req as any).tenant?.id ?? null;
}

function tokenKey(orgId: string) { return `airtable.token.${orgId}`; }
function basesKey(orgId: string) { return `airtable.bases.${orgId}`; }

async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(platformSettings)
    .where(eq(platformSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function upsertSetting(key: string, value: string) {
  await db.insert(platformSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } });
}

function maskToken(token: string): string {
  if (token.length <= 8) return "••••••••";
  return token.slice(0, 4) + "••••••••" + token.slice(-4);
}

export interface AirtableBase {
  id: string;
  name: string;
  baseId: string;
  syncDirection: "inbound" | "outbound" | "both";
  syncSchedule: "manual" | "every6h";
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  lastSyncMessage: string | null;
}

async function getBases(orgId: string): Promise<AirtableBase[]> {
  const raw = await getSetting(basesKey(orgId));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveBases(orgId: string, bases: AirtableBase[]) {
  await upsertSetting(basesKey(orgId), JSON.stringify(bases));
}

// ── GET /api/airtable/config ─────────────────────────────────────────────────
router.get("/airtable/config", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const encToken = await getSetting(tokenKey(orgId));
    const token = decryptField(encToken);
    const bases = await getBases(orgId);
    return res.json({
      hasToken: !!token,
      tokenMasked: token ? maskToken(token) : null,
      bases,
    });
  } catch (err) {
    console.error("[Airtable] GET /config error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/airtable/token ──────────────────────────────────────────────────
router.put("/airtable/token", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const { token } = req.body as { token: string };
    if (!token || !String(token).trim()) {
      return res.status(400).json({ error: "Token is required" });
    }
    const encrypted = encryptField(String(token).trim());
    if (!encrypted) return res.status(500).json({ error: "Encryption failed" });
    await upsertSetting(tokenKey(orgId), encrypted);
    return res.json({ success: true, tokenMasked: maskToken(String(token).trim()) });
  } catch (err) {
    console.error("[Airtable] PUT /token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/airtable/token ───────────────────────────────────────────────
router.delete("/airtable/token", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    await db.delete(platformSettings).where(eq(platformSettings.key, tokenKey(orgId)));
    await db.delete(platformSettings).where(eq(platformSettings.key, basesKey(orgId)));
    return res.json({ success: true });
  } catch (err) {
    console.error("[Airtable] DELETE /token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/airtable/schema/:baseId ─────────────────────────────────────────
router.get("/airtable/schema/:baseId", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const encToken = await getSetting(tokenKey(orgId));
    const token = decryptField(encToken);
    if (!token) return res.status(400).json({ error: "Airtable token not configured" });

    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${req.params.baseId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      const body = await response.text();
      return res.status(response.status).json({ error: `Airtable API error: ${body}` });
    }
    return res.json(await response.json());
  } catch (err) {
    console.error("[Airtable] GET /schema error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/airtable/bases ─────────────────────────────────────────────────
router.post("/airtable/bases", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const { name, baseId, syncDirection, syncSchedule } = req.body as Partial<AirtableBase>;
    if (!name || !baseId) return res.status(400).json({ error: "name and baseId are required" });

    const bases = await getBases(orgId);
    const newBase: AirtableBase = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      baseId: String(baseId).trim(),
      syncDirection: syncDirection ?? "both",
      syncSchedule: syncSchedule ?? "every6h",
      isActive: true,
      lastSyncedAt: null,
      lastSyncStatus: null,
      lastSyncMessage: null,
    };
    bases.push(newBase);
    await saveBases(orgId, bases);
    return res.status(201).json(newBase);
  } catch (err) {
    console.error("[Airtable] POST /bases error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/airtable/bases/:id ──────────────────────────────────────────────
router.put("/airtable/bases/:id", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const bases = await getBases(orgId);
    const idx = bases.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Base not found" });

    const { name, baseId, syncDirection, syncSchedule, isActive } = req.body as Partial<AirtableBase>;
    if (name !== undefined) bases[idx].name = String(name).trim();
    if (baseId !== undefined) bases[idx].baseId = String(baseId).trim();
    if (syncDirection !== undefined) bases[idx].syncDirection = syncDirection;
    if (syncSchedule !== undefined) bases[idx].syncSchedule = syncSchedule;
    if (isActive !== undefined) bases[idx].isActive = Boolean(isActive);

    await saveBases(orgId, bases);
    return res.json(bases[idx]);
  } catch (err) {
    console.error("[Airtable] PUT /bases/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/airtable/bases/:id ──────────────────────────────────────────
router.delete("/airtable/bases/:id", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const bases = await getBases(orgId);
    const filtered = bases.filter(b => b.id !== req.params.id);
    if (filtered.length === bases.length) return res.status(404).json({ error: "Base not found" });
    await saveBases(orgId, filtered);
    return res.json({ success: true });
  } catch (err) {
    console.error("[Airtable] DELETE /bases/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/airtable/sync/:id ──────────────────────────────────────────────
router.post("/airtable/sync/:id", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const bases = await getBases(orgId);
    const base = bases.find(b => b.id === req.params.id);
    if (!base) return res.status(404).json({ error: "Base not found" });

    const encToken = await getSetting(tokenKey(orgId));
    const token = decryptField(encToken);
    if (!token) return res.status(400).json({ error: "Airtable token not configured" });

    console.log(`[Airtable] Manual sync: ${base.name} (${base.baseId}) org=${orgId}`);
    const result = await syncAirtableBase(base, orgId);

    const idx = bases.findIndex(b => b.id === req.params.id);
    if (idx !== -1) {
      bases[idx].lastSyncedAt    = new Date().toISOString();
      bases[idx].lastSyncStatus  = result.success ? "success" : "error";
      bases[idx].lastSyncMessage = result.success
        ? `Synced: ${JSON.stringify(result.details)}`
        : result.error ?? "Unknown error";
      await saveBases(orgId, bases);
    }

    return res.json({ success: result.success, result, base: bases[idx] });
  } catch (err: any) {
    console.error("[Airtable] POST /sync error:", err);
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ── GET /api/airtable/stats/:baseId ─────────────────────────────────────────
// Returns record counts per Airtable table from sync map
router.get("/airtable/stats/:baseId", ...guard, async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation not resolved" });

    const rows = await staticDb
      .select({
        table: airtableSyncMap.airtableTable,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(airtableSyncMap)
      .where(
        sql`${airtableSyncMap.airtableBaseId} = ${req.params.baseId}
            AND ${airtableSyncMap.organisationId} = ${orgId}::uuid`
      )
      .groupBy(airtableSyncMap.airtableTable);

    const stats: Record<string, number> = {};
    for (const r of rows) stats[r.table] = r.count;
    return res.json(stats);
  } catch (err) {
    console.error("[Airtable] GET /stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
