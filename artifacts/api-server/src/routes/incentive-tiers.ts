import { Router } from "express";
import { db } from "@workspace/db";
import { incentiveTiers } from "@workspace/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "finance", "team_manager"];
const ADMIN_ROLES = ["super_admin", "admin"];

// GET — list tiers
router.get("/incentive-tiers", authenticate, requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const rows = await db.select().from(incentiveTiers)
      .where(eq(incentiveTiers.organisationId, tenantId))
      .orderBy(
        asc(incentiveTiers.appliesToRole),
        asc(incentiveTiers.periodType),
        asc(incentiveTiers.minRevenue),
        desc(incentiveTiers.effectiveFrom),
      );
    return res.json({ data: rows });
  } catch (err) {
    console.error("[GET /incentive-tiers]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST — create tier
router.post("/incentive-tiers", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const {
      tierName, appliesToRole, periodType = "monthly",
      minRevenue = 0, maxRevenue,
      incentiveType, incentiveRate, incentiveFixed,
      appliesTo = "excess",
      effectiveFrom, effectiveTo,
      description,
    } = req.body;

    if (!tierName || !incentiveType || !effectiveFrom) {
      return res.status(400).json({ error: "tierName, incentiveType, effectiveFrom are required" });
    }
    if (!["percentage", "fixed"].includes(incentiveType)) {
      return res.status(400).json({ error: "incentiveType must be 'percentage' or 'fixed'" });
    }
    if (!["excess", "total"].includes(appliesTo)) {
      return res.status(400).json({ error: "appliesTo must be 'excess' or 'total'" });
    }

    const [row] = await db.insert(incentiveTiers).values({
      organisationId: tenantId,
      tierName,
      appliesToRole:  appliesToRole ?? null,
      periodType,
      minRevenue:     String(Number(minRevenue).toFixed(2)),
      maxRevenue:     maxRevenue != null ? String(Number(maxRevenue).toFixed(2)) : null,
      incentiveType,
      incentiveRate:  incentiveRate  != null ? String(Number(incentiveRate).toFixed(4))  : null,
      incentiveFixed: incentiveFixed != null ? String(Number(incentiveFixed).toFixed(2)) : null,
      appliesTo,
      effectiveFrom,
      effectiveTo:    effectiveTo ?? null,
      description:    description ?? null,
      createdBy:      req.user?.id ?? null,
    }).returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /incentive-tiers]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH — edit tier (typically just close out via effectiveTo)
router.patch("/incentive-tiers/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { effectiveTo, status, description, maxRevenue, incentiveRate, incentiveFixed } = req.body;
    const patch: Record<string, unknown> = { modifiedOn: new Date() };
    if (effectiveTo    !== undefined) patch.effectiveTo    = effectiveTo;
    if (status         !== undefined) patch.status         = status;
    if (description    !== undefined) patch.description    = description;
    if (maxRevenue     !== undefined) patch.maxRevenue     = maxRevenue != null ? String(Number(maxRevenue).toFixed(2)) : null;
    if (incentiveRate  !== undefined) patch.incentiveRate  = incentiveRate != null ? String(Number(incentiveRate).toFixed(4)) : null;
    if (incentiveFixed !== undefined) patch.incentiveFixed = incentiveFixed != null ? String(Number(incentiveFixed).toFixed(2)) : null;

    const [row] = await db.update(incentiveTiers)
      .set(patch)
      .where(and(
        eq(incentiveTiers.id, req.params.id as string),
        eq(incentiveTiers.organisationId, tenantId),
      ))
      .returning();
    if (!row) return res.status(404).json({ error: "Tier not found" });
    return res.json(row);
  } catch (err) {
    console.error("[PATCH /incentive-tiers/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
