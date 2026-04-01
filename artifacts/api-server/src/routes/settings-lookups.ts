import { Router } from "express";
import { db } from "@workspace/db";
import { systemSettings } from "@workspace/db/schema";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { eq, asc, and, ne, sql } from "drizzle-orm";

const router = Router();
router.use(authenticate, requireRole("super_admin", "admin"));

// ── Lookup groups metadata ──────────────────────────────────────────────────
export const LOOKUP_GROUPS: Record<string, { label: string; description: string }> = {
  account_type:     { label: "Account Type",       description: "Types for CRM Accounts (e.g. Student, Agent, Institute)" },
  contact_type:     { label: "Contact Type",        description: "Types for CRM Contacts" },
  influx_channel:   { label: "Influx Channel",      description: "How leads heard about us" },
  sns_type:         { label: "SNS / Messaging",     description: "Social & messaging platforms" },
  inquiry_type:     { label: "Inquiry Type",        description: "Lead inquiry categories" },
  nationality:      { label: "Nationality",         description: "Student nationality options" },
  language:         { label: "Language",            description: "Language options" },
  visa_type:        { label: "Visa Type",           description: "Visa type options" },
};

// ── GET /api/settings/lookups/groups ─────────────────────────────────────────
router.get("/settings/lookups/groups", async (_req, res) => {
  try {
    const rows = await db
      .select({ groupName: systemSettings.groupName })
      .from(systemSettings)
      .where(
        and(
          sql`${systemSettings.groupName} LIKE 'lookup.%'`,
          ne(systemSettings.status, "Deleted")
        )
      )
      .groupBy(systemSettings.groupName);

    const groups = Object.entries(LOOKUP_GROUPS).map(([key, meta]) => ({
      key,
      ...meta,
      exists: rows.some(r => r.groupName === `lookup.${key}`),
    }));

    res.json(groups);
  } catch (err) {
    console.error("[GET /api/settings/lookups/groups]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/settings/lookups?group=account_type ─────────────────────────────
router.get("/settings/lookups", async (req, res) => {
  try {
    const { group, all } = req.query as { group?: string; all?: string };
    const conditions = [sql`${systemSettings.groupName} LIKE 'lookup.%'`];

    if (group) conditions.push(eq(systemSettings.groupName, `lookup.${group}`));
    if (!all) conditions.push(ne(systemSettings.status, "Deleted"));

    const rows = await db
      .select()
      .from(systemSettings)
      .where(and(...conditions))
      .orderBy(asc(systemSettings.sortOrder), asc(systemSettings.createdOn));

    res.json(rows.map(r => ({
      id:        r.id,
      group:     r.groupName?.replace("lookup.", "") ?? "",
      label:     r.value ?? "",
      key:       r.key,
      status:    r.status,
      sortOrder: r.sortOrder,
    })));
  } catch (err) {
    console.error("[GET /api/settings/lookups]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/settings/lookups ────────────────────────────────────────────────
router.post("/settings/lookups", async (req, res) => {
  try {
    const { group, label } = req.body as { group: string; label: string };
    if (!group || !label?.trim()) return res.status(400).json({ error: "group and label are required" });

    const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const baseKey = `lookup.${group}.${slug}`;

    // Ensure unique key
    let key = baseKey;
    let suffix = 2;
    while (true) {
      const existing = await db.select({ id: systemSettings.id }).from(systemSettings).where(eq(systemSettings.key, key));
      if (existing.length === 0) break;
      key = `${baseKey}_${suffix++}`;
    }

    // Determine next sort order
    const maxRow = await db.execute(sql`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
      FROM system_settings WHERE group_name = ${"lookup." + group}
    `);
    const nextSort = (maxRow.rows[0] as any)?.next_sort ?? 0;

    const [row] = await db.insert(systemSettings).values({
      key,
      value:     label.trim(),
      groupName: `lookup.${group}`,
      status:    "Active",
      sortOrder: Number(nextSort),
    }).returning();

    res.status(201).json({ id: row.id, group, label: row.value, key: row.key, status: row.status, sortOrder: row.sortOrder });
  } catch (err) {
    console.error("[POST /api/settings/lookups]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/settings/lookups/:id ─────────────────────────────────────────────
router.put("/settings/lookups/:id", async (req, res) => {
  try {
    const { label, status } = req.body as { label?: string; status?: string };
    const updates: Record<string, any> = { modifiedOn: new Date() };
    if (label !== undefined) updates.value = label.trim();
    if (status !== undefined) updates.status = status;

    const [row] = await db.update(systemSettings).set(updates).where(eq(systemSettings.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });

    res.json({ id: row.id, group: row.groupName?.replace("lookup.", "") ?? "", label: row.value, status: row.status, sortOrder: row.sortOrder });
  } catch (err) {
    console.error("[PUT /api/settings/lookups/:id]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/settings/lookups/:id (soft delete) ───────────────────────────
router.delete("/settings/lookups/:id", async (req, res) => {
  try {
    const [row] = await db.update(systemSettings).set({ status: "Deleted", modifiedOn: new Date() }).where(eq(systemSettings.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/settings/lookups/:id]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/settings/lookups/reorder ───────────────────────────────────────
router.post("/settings/lookups/reorder", async (req, res) => {
  try {
    const { items } = req.body as { items: { id: string; sortOrder: number }[] };
    if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });

    await Promise.all(
      items.map(({ id, sortOrder }) =>
        db.update(systemSettings).set({ sortOrder, modifiedOn: new Date() }).where(eq(systemSettings.id, id))
      )
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/settings/lookups/reorder]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/settings/lookups/seed ──────────────────────────────────────────
router.post("/settings/lookups/seed", async (req, res) => {
  try {
    const SEED_DATA: Record<string, string[]> = {
      account_type:     ["Student", "Agent", "School", "Partner", "Client", "Organisation", "Staff", "Other"],
      account_category: ["VIP", "General", "New", "Alumni", "Corporate", "Government", "NGO", "Individual", "Group"],
      contact_type:     ["Student", "Organisation", "Agent", "School", "Staff", "Other"],
      influx_channel:   ["Website", "Referral", "Social Media", "Email", "Phone", "Agent", "Walk-in", "Other"],
      sns_type:         ["WeChat", "WhatsApp", "LINE", "KakaoTalk", "Instagram", "Facebook", "Telegram", "Other"],
      inquiry_type:     ["Summer Camp", "Study Abroad", "Internship", "Accommodation", "Guardian", "Other"],
      nationality:      ["Korean", "Chinese", "Japanese", "Thai", "Vietnamese", "Indonesian", "Filipino", "Singaporean", "Australian", "Other"],
      language:         ["Korean", "English", "Chinese", "Japanese", "Thai", "Vietnamese", "Spanish", "French", "Other"],
      visa_type:        ["Student Visa", "Working Holiday", "Tourist", "Business", "Dependent", "Other"],
    };

    let created = 0;
    for (const [group, labels] of Object.entries(SEED_DATA)) {
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const key = `lookup.${group}.${slug}`;
        await db.execute(sql`
          INSERT INTO system_settings (key, value, group_name, status, sort_order)
          VALUES (${key}, ${label}, ${"lookup." + group}, 'Active', ${i})
          ON CONFLICT (key) DO NOTHING
        `);
        created++;
      }
    }

    res.json({ ok: true, seeded: created });
  } catch (err) {
    console.error("[POST /api/settings/lookups/seed]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
