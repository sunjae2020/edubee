import { Router } from "express";
import { db } from "@workspace/db";
import { platformSettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { encryptField, decryptField } from "../lib/crypto.js";

const router = Router();
const guard = [authenticate, requireRole("super_admin", "admin")];

const TOKEN_KEY = "airtable.token";
const BASES_KEY = "airtable.bases";

// ── helpers ───────────────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
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

async function getBases(): Promise<AirtableBase[]> {
  const raw = await getSetting(BASES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveBases(bases: AirtableBase[]) {
  await upsertSetting(BASES_KEY, JSON.stringify(bases));
}

// ── GET /api/airtable/config ─────────────────────────────────────────────────
router.get("/airtable/config", ...guard, async (_req, res) => {
  try {
    const encToken = await getSetting(TOKEN_KEY);
    const token = decryptField(encToken);
    const bases = await getBases();
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
    const { token } = req.body as { token: string };
    if (!token || !String(token).trim()) {
      return res.status(400).json({ error: "Token is required" });
    }
    const encrypted = encryptField(String(token).trim());
    if (!encrypted) return res.status(500).json({ error: "Encryption failed" });
    await upsertSetting(TOKEN_KEY, encrypted);
    return res.json({ success: true, tokenMasked: maskToken(String(token).trim()) });
  } catch (err) {
    console.error("[Airtable] PUT /token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/airtable/token ───────────────────────────────────────────────
router.delete("/airtable/token", ...guard, async (_req, res) => {
  try {
    await db.delete(platformSettings).where(eq(platformSettings.key, TOKEN_KEY));
    await db.delete(platformSettings).where(eq(platformSettings.key, BASES_KEY));
    return res.json({ success: true });
  } catch (err) {
    console.error("[Airtable] DELETE /token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/airtable/schema ─────────────────────────────────────────────────
// Fetches table list + fields from Airtable API for a given baseId
router.get("/airtable/schema/:baseId", ...guard, async (req, res) => {
  try {
    const encToken = await getSetting(TOKEN_KEY);
    const token = decryptField(encToken);
    if (!token) return res.status(400).json({ error: "Airtable token not configured" });

    const { baseId } = req.params;
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      const body = await response.text();
      return res.status(response.status).json({ error: `Airtable API error: ${body}` });
    }
    const data = await response.json() as any;
    return res.json(data);
  } catch (err) {
    console.error("[Airtable] GET /schema error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/airtable/bases ─────────────────────────────────────────────────
router.post("/airtable/bases", ...guard, async (req, res) => {
  try {
    const { name, baseId, syncDirection, syncSchedule } = req.body as Partial<AirtableBase>;
    if (!name || !baseId) return res.status(400).json({ error: "name and baseId are required" });

    const bases = await getBases();
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
    await saveBases(bases);
    return res.status(201).json(newBase);
  } catch (err) {
    console.error("[Airtable] POST /bases error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/airtable/bases/:id ──────────────────────────────────────────────
router.put("/airtable/bases/:id", ...guard, async (req, res) => {
  try {
    const bases = await getBases();
    const idx = bases.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Base not found" });

    const { name, baseId, syncDirection, syncSchedule, isActive } = req.body as Partial<AirtableBase>;
    if (name !== undefined) bases[idx].name = String(name).trim();
    if (baseId !== undefined) bases[idx].baseId = String(baseId).trim();
    if (syncDirection !== undefined) bases[idx].syncDirection = syncDirection;
    if (syncSchedule !== undefined) bases[idx].syncSchedule = syncSchedule;
    if (isActive !== undefined) bases[idx].isActive = Boolean(isActive);

    await saveBases(bases);
    return res.json(bases[idx]);
  } catch (err) {
    console.error("[Airtable] PUT /bases/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/airtable/bases/:id ──────────────────────────────────────────
router.delete("/airtable/bases/:id", ...guard, async (req, res) => {
  try {
    const bases = await getBases();
    const filtered = bases.filter(b => b.id !== req.params.id);
    if (filtered.length === bases.length) return res.status(404).json({ error: "Base not found" });
    await saveBases(filtered);
    return res.json({ success: true });
  } catch (err) {
    console.error("[Airtable] DELETE /bases/:id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/airtable/sync/:id ──────────────────────────────────────────────
// Manual sync trigger placeholder — actual sync logic added in next phase
router.post("/airtable/sync/:id", ...guard, async (req, res) => {
  try {
    const bases = await getBases();
    const base = bases.find(b => b.id === req.params.id);
    if (!base) return res.status(404).json({ error: "Base not found" });

    const encToken = await getSetting(TOKEN_KEY);
    const token = decryptField(encToken);
    if (!token) return res.status(400).json({ error: "Airtable token not configured" });

    // Placeholder — full sync engine implemented in phase 2
    console.log(`[Airtable] Manual sync triggered for base: ${base.name} (${base.baseId})`);

    const idx = bases.findIndex(b => b.id === req.params.id);
    bases[idx].lastSyncedAt = new Date().toISOString();
    bases[idx].lastSyncStatus = "success";
    bases[idx].lastSyncMessage = "Sync ready — field mapping required (Phase 2)";
    await saveBases(bases);

    return res.json({ success: true, base: bases[idx] });
  } catch (err) {
    console.error("[Airtable] POST /sync error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
