import { Router } from "express";
import { db } from "@workspace/db";
import { platformPlans } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { superAdminOnly } from "../middleware/superAdminOnly.js";

const router = Router();
const guard  = [authenticate, superAdminOnly];
const authOnly = [authenticate];

// ─── List all active plans ────────────────────────────────────────────────────

router.get("/api/platform-plans", ...authOnly, async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.isActive, true))
      .orderBy(asc(platformPlans.sortOrder), asc(platformPlans.priceMonthly));
    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error("GET /api/platform-plans", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ─── Get single plan ──────────────────────────────────────────────────────────

router.get("/api/platform-plans/:id", ...authOnly, async (req, res) => {
  try {
    const [plan] = await db
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.id, req.params.id));
    if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });
    return res.json({ success: true, data: plan });
  } catch (err) {
    console.error("GET /api/platform-plans/:id", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ─── Create plan ──────────────────────────────────────────────────────────────

router.post("/api/platform-plans", ...guard, async (req, res) => {
  try {
    const {
      code, name, priceMonthly, priceAnnually,
      maxUsers, maxStudents, maxBranches, storageGb,
      featureCommission, featureVisa, featureServiceModules,
      featureMultiBranch, featureAiAssistant, featureAccounting,
      featureAvetmiss, featureApiAccess, featureWhiteLabel,
      isPopular, sortOrder,
    } = req.body;

    // Validation
    if (!code)           return res.status(400).json({ success: false, error: "code is required" });
    if (!name)           return res.status(400).json({ success: false, error: "displayName is required" });
    if (!/^[a-z0-9-]+$/.test(code))
      return res.status(400).json({ success: false, error: "code must be lowercase letters, numbers, and hyphens only" });
    if (priceMonthly === undefined || priceMonthly === null || Number(priceMonthly) < 0)
      return res.status(400).json({ success: false, error: "monthlyPrice must be >= 0" });
    if (priceAnnually === undefined || priceAnnually === null || Number(priceAnnually) < 0)
      return res.status(400).json({ success: false, error: "annualPrice must be >= 0" });

    const [plan] = await db
      .insert(platformPlans)
      .values({
        code, name,
        priceMonthly:          String(priceMonthly),
        priceAnnually:         String(priceAnnually),
        maxUsers:              Number(maxUsers ?? 5),
        maxStudents:           Number(maxStudents ?? 100),
        maxBranches:           Number(maxBranches ?? 1),
        storageGb:             Number(storageGb ?? 10),
        featureCommission:     Boolean(featureCommission),
        featureVisa:           Boolean(featureVisa),
        featureServiceModules: Boolean(featureServiceModules),
        featureMultiBranch:    Boolean(featureMultiBranch),
        featureAiAssistant:    Boolean(featureAiAssistant),
        featureAccounting:     Boolean(featureAccounting),
        featureAvetmiss:       Boolean(featureAvetmiss),
        featureApiAccess:      Boolean(featureApiAccess),
        featureWhiteLabel:     Boolean(featureWhiteLabel),
        isPopular:             Boolean(isPopular),
        sortOrder:             Number(sortOrder ?? 0),
        isActive:              true,
      })
      .returning();

    return res.status(201).json({ success: true, data: plan });
  } catch (err: any) {
    console.error("POST /api/platform-plans", err);
    if (err?.code === "23505") return res.status(409).json({ success: false, error: "Plan code already exists" });
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ─── Update plan ──────────────────────────────────────────────────────────────

router.put("/api/platform-plans/:id", ...guard, async (req, res) => {
  try {
    const {
      name, priceMonthly, priceAnnually,
      maxUsers, maxStudents, maxBranches, storageGb,
      featureCommission, featureVisa, featureServiceModules,
      featureMultiBranch, featureAiAssistant, featureAccounting,
      featureAvetmiss, featureApiAccess, featureWhiteLabel,
      isPopular, sortOrder,
    } = req.body;

    const set: Record<string, any> = { modifiedOn: new Date() };
    if (name           !== undefined) set.name           = name;
    if (priceMonthly   !== undefined) set.priceMonthly   = String(priceMonthly);
    if (priceAnnually  !== undefined) set.priceAnnually  = String(priceAnnually);
    if (maxUsers       !== undefined) set.maxUsers       = Number(maxUsers);
    if (maxStudents    !== undefined) set.maxStudents    = Number(maxStudents);
    if (maxBranches    !== undefined) set.maxBranches    = Number(maxBranches);
    if (storageGb      !== undefined) set.storageGb      = Number(storageGb);
    if (featureCommission     !== undefined) set.featureCommission     = Boolean(featureCommission);
    if (featureVisa           !== undefined) set.featureVisa           = Boolean(featureVisa);
    if (featureServiceModules !== undefined) set.featureServiceModules = Boolean(featureServiceModules);
    if (featureMultiBranch    !== undefined) set.featureMultiBranch    = Boolean(featureMultiBranch);
    if (featureAiAssistant    !== undefined) set.featureAiAssistant    = Boolean(featureAiAssistant);
    if (featureAccounting     !== undefined) set.featureAccounting     = Boolean(featureAccounting);
    if (featureAvetmiss       !== undefined) set.featureAvetmiss       = Boolean(featureAvetmiss);
    if (featureApiAccess      !== undefined) set.featureApiAccess      = Boolean(featureApiAccess);
    if (featureWhiteLabel     !== undefined) set.featureWhiteLabel     = Boolean(featureWhiteLabel);
    if (isPopular      !== undefined) set.isPopular      = Boolean(isPopular);
    if (sortOrder      !== undefined) set.sortOrder      = Number(sortOrder);

    const [updated] = await db
      .update(platformPlans)
      .set(set)
      .where(eq(platformPlans.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: "Plan not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT /api/platform-plans/:id", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ─── Deactivate plan (soft delete) ───────────────────────────────────────────

router.delete("/api/platform-plans/:id", ...guard, async (req, res) => {
  try {
    const [updated] = await db
      .update(platformPlans)
      .set({ isActive: false, modifiedOn: new Date() })
      .where(eq(platformPlans.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: "Plan not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("DELETE /api/platform-plans/:id", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
