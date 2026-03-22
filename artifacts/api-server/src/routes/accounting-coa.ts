import { Router } from "express";
import { db } from "@workspace/db";
import { chartOfAccounts } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

// ─── GET /api/accounting/coa ─────────────────────────────────────────────────
router.get("/api/accounting/coa", authenticate, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(chartOfAccounts)
      .orderBy(asc(chartOfAccounts.code));

    // Group by accountType
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
router.get("/api/accounting/coa/:code", authenticate, async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.code, req.params.code));

    if (!row) return res.status(404).json({ error: "Account not found" });
    return res.json(row);
  } catch (err) {
    console.error("[GET /api/accounting/coa/:code]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/accounting/coa ────────────────────────────────────────────────
router.post(
  "/api/accounting/coa",
  authenticate,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const { code, name, accountType, description, parentCode } = req.body;
      if (!code || !name || !accountType) {
        return res.status(400).json({ error: "code, name and accountType are required" });
      }

      const [created] = await db
        .insert(chartOfAccounts)
        .values({ code, name, accountType, description, parentCode })
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
  "/api/accounting/coa/:code",
  authenticate,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const [existing] = await db
        .select()
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.code, req.params.code));

      if (!existing) return res.status(404).json({ error: "Account not found" });

      const { name, accountType, description, parentCode, isActive } = req.body;

      const [updated] = await db
        .update(chartOfAccounts)
        .set({ name, accountType, description, parentCode, isActive, modifiedOn: new Date() })
        .where(eq(chartOfAccounts.code, req.params.code))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PUT /api/accounting/coa/:code]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
