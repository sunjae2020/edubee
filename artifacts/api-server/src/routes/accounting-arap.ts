import { Router } from "express";
import { db } from "@workspace/db";
import { contractProducts, contracts } from "@workspace/db/schema";
import { eq, and, or, ilike, gte, lte, inArray, sql, count, sum, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

// ─── helpers ────────────────────────────────────────────────────────────────
function buildWhere(
  statusField: "arStatus" | "apStatus",
  dueDateField: "arDueDate" | "apDueDate",
  {
    status,
    search,
    dateFrom,
    dateTo,
  }: { status?: string; search?: string; dateFrom?: string; dateTo?: string }
): SQL | undefined {
  const conds: SQL[] = [];

  if (status) {
    const statuses = status.split(",").map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      conds.push(eq(contractProducts[statusField], statuses[0]));
    } else if (statuses.length > 1) {
      conds.push(inArray(contractProducts[statusField], statuses));
    }
  }
  if (dateFrom) conds.push(gte(contractProducts[dueDateField], dateFrom));
  if (dateTo)   conds.push(lte(contractProducts[dueDateField], dateTo));

  return conds.length ? and(...conds) : undefined;
}

// ─── GET /api/accounting/ar/summary ─────────────────────────────────────────
router.get(
  "/accounting/ar/summary",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const rows = await db
        .select({
          arStatus: contractProducts.arStatus,
          total: sum(contractProducts.arAmount).mapWith(Number),
          cnt:   count(contractProducts.id).mapWith(Number),
        })
        .from(contractProducts)
        .groupBy(contractProducts.arStatus);

      const summary: Record<string, { total: number; count: number }> = {};
      for (const row of rows) {
        summary[row.arStatus ?? "unknown"] = { total: row.total ?? 0, count: row.cnt ?? 0 };
      }
      return res.json({ summary });
    } catch (err) {
      console.error("[GET /api/accounting/ar/summary]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/accounting/ar ─────────────────────────────────────────────────
router.get(
  "/accounting/ar",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { ar_status, search, date_from, date_to, page = "1", limit = "20" } = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const where = buildWhere("arStatus", "arDueDate", {
        status: ar_status, search, dateFrom: date_from, dateTo: date_to,
      });

      const [totalResult] = await db
        .select({ count: count() })
        .from(contractProducts)
        .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
        .where(where);

      const rows = await db
        .select({
          id:                contractProducts.id,
          contractId:        contractProducts.contractId,
          contractNumber:    contracts.contractNumber,
          studentName:       contracts.studentName,
          serviceModuleType: contractProducts.serviceModuleType,
          arDueDate:         contractProducts.arDueDate,
          arAmount:          contractProducts.arAmount,
          arStatus:          contractProducts.arStatus,
          coaArCode:         contractProducts.coaArCode,
          createdAt:         contractProducts.createdAt,
        })
        .from(contractProducts)
        .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
        .where(where)
        .orderBy(contractProducts.arDueDate)
        .limit(limitNum)
        .offset(offset);

      return res.json({
        data: rows,
        meta: {
          total: Number(totalResult.count),
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(Number(totalResult.count) / limitNum),
        },
      });
    } catch (err) {
      console.error("[GET /api/accounting/ar]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/accounting/ap ─────────────────────────────────────────────────
router.get(
  "/accounting/ap",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { ap_status, search, date_from, date_to, page = "1", limit = "20" } = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const where = buildWhere("apStatus", "apDueDate", {
        status: ap_status, search, dateFrom: date_from, dateTo: date_to,
      });

      const [totalResult] = await db
        .select({ count: count() })
        .from(contractProducts)
        .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
        .where(where);

      const rows = await db
        .select({
          id:                contractProducts.id,
          contractId:        contractProducts.contractId,
          contractNumber:    contracts.contractNumber,
          studentName:       contracts.studentName,
          agentName:         contracts.agentName,
          serviceModuleType: contractProducts.serviceModuleType,
          apDueDate:         contractProducts.apDueDate,
          apAmount:          contractProducts.apAmount,
          apStatus:          contractProducts.apStatus,
          coaApCode:         contractProducts.coaApCode,
          createdAt:         contractProducts.createdAt,
        })
        .from(contractProducts)
        .leftJoin(contracts, eq(contractProducts.contractId, contracts.id))
        .where(where)
        .orderBy(contractProducts.apDueDate)
        .limit(limitNum)
        .offset(offset);

      return res.json({
        data: rows,
        meta: {
          total: Number(totalResult.count),
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(Number(totalResult.count) / limitNum),
        },
      });
    } catch (err) {
      console.error("[GET /api/accounting/ap]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/accounting/ar/:id/status ────────────────────────────────────
router.patch(
  "/accounting/ar/:id/status",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { arStatus } = req.body;
      if (!arStatus) return res.status(400).json({ error: "arStatus is required" });

      const [row] = await db
        .select({ id: contractProducts.id })
        .from(contractProducts)
        .where(eq(contractProducts.id, req.params.id));

      if (!row) return res.status(404).json({ error: "Contract product not found" });

      const [updated] = await db
        .update(contractProducts)
        .set({ arStatus })
        .where(eq(contractProducts.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/accounting/ar/:id/status]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/accounting/ap/:id/status ────────────────────────────────────
router.patch(
  "/accounting/ap/:id/status",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { apStatus } = req.body;
      if (!apStatus) return res.status(400).json({ error: "apStatus is required" });

      const [row] = await db
        .select({ id: contractProducts.id })
        .from(contractProducts)
        .where(eq(contractProducts.id, req.params.id));

      if (!row) return res.status(404).json({ error: "Contract product not found" });

      const [updated] = await db
        .update(contractProducts)
        .set({ apStatus })
        .where(eq(contractProducts.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/accounting/ap/:id/status]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
