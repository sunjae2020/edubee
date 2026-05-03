import { Router } from "express";
import { db } from "@workspace/db";
import { invoiceSchedules, invoiceScheduleRuns } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { runDueInvoiceSchedules } from "../jobs/invoiceScheduler.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "finance"];
const ADMIN_ROLES = ["super_admin", "admin"];

const VALID_FREQ = new Set(["weekly", "monthly", "quarterly", "termly"]);

// GET — list schedules
router.get("/invoice-schedules", authenticate, requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const rows = await db.select().from(invoiceSchedules)
      .where(eq(invoiceSchedules.organisationId, tenantId))
      .orderBy(desc(invoiceSchedules.nextRunDate));
    return res.json({ data: rows });
  } catch (err) {
    console.error("[GET /invoice-schedules]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST — create schedule
router.post("/invoice-schedules", authenticate, requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const {
      contractId, contractProductId, accountId,
      invoiceType = "client", frequency, amount, currency = "AUD",
      description, startDate, endDate, maxRuns,
    } = req.body;

    if (!frequency || !VALID_FREQ.has(frequency)) {
      return res.status(400).json({ error: `frequency must be one of: ${[...VALID_FREQ].join(", ")}` });
    }
    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ error: "amount must be > 0" });
    }
    if (!startDate) return res.status(400).json({ error: "startDate is required" });

    const [row] = await db.insert(invoiceSchedules).values({
      organisationId:    tenantId,
      contractId:        contractId ?? null,
      contractProductId: contractProductId ?? null,
      accountId:         accountId ?? null,
      invoiceType,
      frequency,
      amount:            String(Number(amount).toFixed(2)),
      currency,
      description:       description ?? null,
      startDate,
      endDate:           endDate ?? null,
      nextRunDate:       startDate,
      maxRuns:           maxRuns ?? null,
      status:            "active",
      createdBy:         req.user?.id ?? null,
    }).returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /invoice-schedules]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH — pause/resume/cancel/edit
router.patch("/invoice-schedules/:id", authenticate, requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const { status, amount, endDate, description, nextRunDate } = req.body;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (status      !== undefined) patch.status      = status;
    if (amount      !== undefined) patch.amount      = String(Number(amount).toFixed(2));
    if (endDate     !== undefined) patch.endDate     = endDate;
    if (description !== undefined) patch.description = description;
    if (nextRunDate !== undefined) patch.nextRunDate = nextRunDate;

    const [row] = await db.update(invoiceSchedules)
      .set(patch)
      .where(and(
        eq(invoiceSchedules.id, req.params.id as string),
        eq(invoiceSchedules.organisationId, tenantId),
      ))
      .returning();
    if (!row) return res.status(404).json({ error: "Schedule not found" });
    return res.json(row);
  } catch (err) {
    console.error("[PATCH /invoice-schedules/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET — runs history for a schedule
router.get("/invoice-schedules/:id/runs", authenticate, requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
    const rows = await db.select().from(invoiceScheduleRuns)
      .where(and(
        eq(invoiceScheduleRuns.scheduleId, req.params.id as string),
        eq(invoiceScheduleRuns.organisationId, tenantId),
      ))
      .orderBy(desc(invoiceScheduleRuns.runDate));
    return res.json({ data: rows });
  } catch (err) {
    console.error("[GET /invoice-schedules/:id/runs]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST — manual trigger (admin only)
router.post("/invoice-schedules/run-now", authenticate, requireRole(...ADMIN_ROLES), async (_req, res) => {
  try {
    const r = await runDueInvoiceSchedules();
    return res.json(r);
  } catch (err) {
    console.error("[POST /invoice-schedules/run-now]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
