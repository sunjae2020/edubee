import { Router } from "express";
import { db } from "@workspace/db";
import { productCostLines, contractProducts, contracts, accounts, users } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];
const ADMIN_ROLES = ["super_admin", "admin"];

// ─── Helper: recalculate apAmount for a contractProduct ──────────────────────
async function syncApAmount(contractProductId: string) {
  const [res] = await db.execute(sql`
    SELECT COALESCE(SUM(calculated_amount), 0) AS total
    FROM product_cost_lines
    WHERE contract_product_id = ${contractProductId}::uuid
  `);
  const total = parseFloat((res as any).total ?? "0");
  await db
    .update(contractProducts)
    .set({ apAmount: String(total.toFixed(2)) })
    .where(eq(contractProducts.id, contractProductId));

  // Also sync the contract-level totalApAmount
  const [cp] = await db
    .select({ contractId: contractProducts.contractId })
    .from(contractProducts)
    .where(eq(contractProducts.id, contractProductId));
  if (cp?.contractId) {
    await db.execute(sql`
      UPDATE contracts
      SET total_ap_amount = (
        SELECT COALESCE(SUM(ap_amount::numeric), 0)
        FROM contract_products
        WHERE contract_id = ${cp.contractId}::uuid
      )
      WHERE id = ${cp.contractId}::uuid
    `);
  }
}

// ─── GET /api/cost-lines/lookup/partners ─────────────────────────────────────
router.get("/cost-lines/lookup/partners", authenticate, async (req, res) => {
  try {
    const q = (req.query.q as string | undefined) ?? "";
    const rows = await db.execute(sql`
      SELECT id, name, account_type
      FROM accounts
      WHERE (name ILIKE ${"%" + q + "%"})
        AND account_type IN ('agent','school','partner','supplier','company','individual')
      ORDER BY name
      LIMIT 30
    `);
    res.json(Array.isArray(rows) ? rows : (rows as any).rows ?? []);
  } catch (err) {
    console.error("[GET /cost-lines/lookup/partners]", err);
    res.status(500).json({ error: "Lookup failed" });
  }
});

// ─── GET /api/cost-lines/lookup/staff ────────────────────────────────────────
router.get("/cost-lines/lookup/staff", authenticate, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, first_name, last_name, email
      FROM users
      WHERE status = 'active'
      ORDER BY first_name, last_name
      LIMIT 50
    `);
    res.json(Array.isArray(rows) ? rows : (rows as any).rows ?? []);
  } catch (err) {
    console.error("[GET /cost-lines/lookup/staff]", err);
    res.status(500).json({ error: "Lookup failed" });
  }
});

// ─── POST /api/cost-lines ────────────────────────────────────────────────────
router.post("/cost-lines", authenticate, requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const {
      contractProductId, costType, partnerId, staffId,
      calcType, rate, baseAmount, calculatedAmount,
      coaCode, description,
    } = req.body;

    if (!contractProductId || !costType || !calcType) {
      return res.status(400).json({ error: "contractProductId, costType, calcType are required" });
    }

    const [row] = await db
      .insert(productCostLines)
      .values({
        contractProductId,
        costType,
        partnerId:        partnerId   || null,
        staffId:          staffId     || null,
        calcType,
        rate:             rate        != null ? String(rate)             : null,
        baseAmount:       baseAmount  != null ? String(baseAmount)       : null,
        calculatedAmount: calculatedAmount != null ? String(calculatedAmount) : "0",
        coaCode:          coaCode     || null,
        description:      description || null,
        status:           "pending",
      })
      .returning();

    await syncApAmount(contractProductId);

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /cost-lines]", err);
    return res.status(500).json({ error: "Failed to create cost line" });
  }
});

// ─── PUT /api/cost-lines/:id ─────────────────────────────────────────────────
router.put("/cost-lines/:id", authenticate, requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const {
      costType, partnerId, staffId,
      calcType, rate, baseAmount, calculatedAmount,
      coaCode, description, status,
    } = req.body;

    const existing = await db
      .select({ id: productCostLines.id, contractProductId: productCostLines.contractProductId, status: productCostLines.status })
      .from(productCostLines)
      .where(eq(productCostLines.id, req.params.id));

    if (!existing.length) return res.status(404).json({ error: "Cost line not found" });
    if (existing[0].status === "paid") {
      return res.status(400).json({ error: "Cannot edit a paid cost line" });
    }

    const [row] = await db
      .update(productCostLines)
      .set({
        costType:         costType         ?? undefined,
        partnerId:        partnerId        ?? null,
        staffId:          staffId          ?? null,
        calcType:         calcType         ?? undefined,
        rate:             rate      != null ? String(rate)             : undefined,
        baseAmount:       baseAmount != null ? String(baseAmount)      : undefined,
        calculatedAmount: calculatedAmount != null ? String(calculatedAmount) : undefined,
        coaCode:          coaCode          ?? undefined,
        description:      description      ?? undefined,
        status:           status           ?? undefined,
        modifiedOn:       new Date(),
      })
      .where(eq(productCostLines.id, req.params.id))
      .returning();

    await syncApAmount(existing[0].contractProductId);

    return res.json(row);
  } catch (err) {
    console.error("[PUT /cost-lines/:id]", err);
    return res.status(500).json({ error: "Failed to update cost line" });
  }
});

// ─── DELETE /api/cost-lines/:id ──────────────────────────────────────────────
router.delete("/cost-lines/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const existing = await db
      .select({ id: productCostLines.id, contractProductId: productCostLines.contractProductId, status: productCostLines.status })
      .from(productCostLines)
      .where(eq(productCostLines.id, req.params.id));

    if (!existing.length) return res.status(404).json({ error: "Cost line not found" });
    if (existing[0].status === "paid") {
      return res.status(409).json({ error: "Cannot delete a paid cost line. Void the related payment first." });
    }

    await db.delete(productCostLines).where(eq(productCostLines.id, req.params.id));
    await syncApAmount(existing[0].contractProductId);

    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /cost-lines/:id]", err);
    return res.status(500).json({ error: "Failed to delete cost line" });
  }
});

export default router;
