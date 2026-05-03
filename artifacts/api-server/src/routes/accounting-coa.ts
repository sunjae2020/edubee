import { Router } from "express";
import { db } from "@workspace/db";
import { chartOfAccounts } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// ─── GET /api/accounting/coa ─────────────────────────────────────────────────
router.get("/accounting/coa", authenticate, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.organisationId, tenantId))
      .orderBy(asc(chartOfAccounts.code));

    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      const key = row.accountType;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    return res.json({ data: rows, grouped });
  } catch (err) {
    console.error("[GET /api/accounting/coa]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/accounting/coa/:code ───────────────────────────────────────────
router.get("/accounting/coa/:code", authenticate, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const [row] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.organisationId, tenantId),
        eq(chartOfAccounts.code, req.params.code as string),
      ));

    if (!row) return res.status(404).json({ error: "Account not found" });
    return res.json(row);
  } catch (err) {
    console.error("[GET /api/accounting/coa/:code]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/accounting/coa ────────────────────────────────────────────────
// Per-tenant: each org maintains its own chart of accounts.
router.post(
  "/accounting/coa",
  authenticate,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
      const { code, name, accountType, description, parentCode } = req.body;
      if (!code || !name || !accountType) {
        return res.status(400).json({ error: "code, name and accountType are required" });
      }

      const [created] = await db
        .insert(chartOfAccounts)
        .values({ organisationId: tenantId, code, name, accountType, description, parentCode })
        .returning();

      return res.status(201).json(created);
    } catch (err) {
      console.error("[POST /api/accounting/coa]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PUT /api/accounting/coa/:code ───────────────────────────────────────────
router.put(
  "/accounting/coa/:code",
  authenticate,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
      const where = and(
        eq(chartOfAccounts.organisationId, tenantId),
        eq(chartOfAccounts.code, req.params.code as string),
      );
      const [existing] = await db.select().from(chartOfAccounts).where(where);
      if (!existing) return res.status(404).json({ error: "Account not found" });

      const { name, accountType, description, parentCode, isActive } = req.body;

      const [updated] = await db
        .update(chartOfAccounts)
        .set({ name, accountType, description, parentCode, isActive, modifiedOn: new Date() })
        .where(where)
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PUT /api/accounting/coa/:code]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
