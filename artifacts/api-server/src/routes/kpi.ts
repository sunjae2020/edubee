import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  calcStaffKpi,
  saveStaffKpi,
  calcTeamKpi,
  saveTeamKpi,
  KpiPeriodInput,
} from "../services/kpiService.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { runKpiSchedulerNow } from "../jobs/kpiScheduler.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// ─────────────────────────────────────────────
// Helper: auto-calculate period start/end
// ─────────────────────────────────────────────
function resolvePeriod(
  periodType: string,
  yearMonth?: string // 'YYYY-MM' format; defaults to current month if omitted
): KpiPeriodInput {
  const base = yearMonth ? new Date(yearMonth + "-01") : new Date();
  const y = base.getFullYear();
  const m = base.getMonth(); // 0-indexed

  let periodStart: Date;
  let periodEnd: Date;

  switch (periodType) {
    case "quarterly": {
      const qStart = Math.floor(m / 3) * 3;
      periodStart  = new Date(y, qStart, 1);
      periodEnd    = new Date(y, qStart + 3, 0);
      break;
    }
    case "half_year": {
      const hStart = m < 6 ? 0 : 6;
      periodStart  = new Date(y, hStart, 1);
      periodEnd    = new Date(y, hStart + 6, 0);
      break;
    }
    case "yearly":
      periodStart = new Date(y, 0, 1);
      periodEnd   = new Date(y, 11, 31);
      break;
    case "monthly":
    default:
      periodStart = new Date(y, m, 1);
      periodEnd   = new Date(y, m + 1, 0);
  }

  return {
    periodType: periodType as KpiPeriodInput["periodType"],
    periodStart: periodStart.toISOString().split("T")[0],
    periodEnd:   periodEnd.toISOString().split("T")[0],
  };
}

// ─────────────────────────────────────────────
// GET /api/kpi/staff/:staffId
// Retrieve staff KPI (calculate only, no save)
// Query: ?periodType=monthly&yearMonth=2026-03
// Access: admin/super_admin all + self + team_manager (own team members only)
// ─────────────────────────────────────────────
router.get(
  "/staff/:staffId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { staffId }   = req.params as Record<string, string>;
      const currentUser   = (req as any).user as { id: string; role: string };
      const role          = currentUser?.role ?? "";

      // ── Access control ────────────────────────────────────────────────────────
      if (!ADMIN_ROLES.includes(role)) {
        if (currentUser.id === staffId) {
          // Own KPI → allow
        } else if (role === "team_manager") {
          // Team manager → only allow their team members
          const rows = await db.execute(sql`
            SELECT team_id FROM users WHERE id = ${staffId} LIMIT 1
          `);
          const targetTeamId = (rows.rows?.[0] as any)?.team_id;
          const myRows = await db.execute(sql`
            SELECT team_id FROM users WHERE id = ${currentUser.id} LIMIT 1
          `);
          const myTeamId = (myRows.rows?.[0] as any)?.team_id;
          if (!targetTeamId || targetTeamId !== myTeamId) {
            return res.status(403).json({ success: false, error: "Access denied: not your team member" });
          }
        } else {
          return res.status(403).json({ success: false, error: "Access denied" });
        }
      }

      const periodType   = (req.query.periodType as string) || "monthly";
      const yearMonth    = req.query.yearMonth as string | undefined;
      const period       = resolvePeriod(periodType, yearMonth);

      const result = await calcStaffKpi(staffId, period);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/kpi/team/:teamId
// Retrieve team KPI (rollup of team members)
// Query: ?periodType=monthly&yearMonth=2026-03
// ─────────────────────────────────────────────
router.get(
  "/team/:teamId",
  authenticate,
  requireRole(...ADMIN_ROLES, "camp_coordinator"),
  async (req: Request, res: Response) => {
    try {
      const { teamId }  = req.params as Record<string, string>;
      const periodType  = (req.query.periodType as string) || "monthly";
      const yearMonth   = req.query.yearMonth as string | undefined;
      const period      = resolvePeriod(periodType, yearMonth);

      const result = await calcTeamKpi(teamId, period);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/kpi/summary
// All-staff KPI summary (Admin use)
// Query: ?periodType=monthly&yearMonth=2026-03
// ─────────────────────────────────────────────
router.get(
  "/summary",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const periodType = (req.query.periodType as string) || "monthly";
      const yearMonth  = req.query.yearMonth as string | undefined;
      const period     = resolvePeriod(periodType, yearMonth);

      const staffRes = await db.execute(sql`
        SELECT id FROM users WHERE status = 'active'
      `);
      const staffIds = (staffRes.rows as any[]).map((r) => r.id as string);

      const results = await Promise.all(
        staffIds.map((id) => calcStaffKpi(id, period))
      );

      const totals = {
        totalStaff:       results.length,
        totalLeads:       results.reduce((a, r) => a + r.leadCount, 0),
        totalConversions: results.reduce((a, r) => a + r.conversionCount, 0),
        totalArCollected: results.reduce((a, r) => a + r.arCollected, 0),
        totalApPaid:      results.reduce((a, r) => a + r.apPaid, 0),
        totalNetRevenue:  results.reduce((a, r) => a + r.netRevenue, 0),
        totalIncentive:   results.reduce((a, r) => a + r.incentiveAmount, 0),
      };

      res.json({ success: true, data: { period, summary: totals, staff: results } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/kpi/calculate/staff/:staffId
// Calculate staff KPI and save to DB (upsert)
// ─────────────────────────────────────────────
router.post(
  "/calculate/staff/:staffId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { staffId }            = req.params as Record<string, string>;
      const { periodType, yearMonth } = req.body;
      const period = resolvePeriod(periodType || "monthly", yearMonth);

      const result = await calcStaffKpi(staffId, period);
      const saved  = await saveStaffKpi(result);

      res.json({
        success: true,
        data: { ...result, kpiPeriodId: saved.id, kpiStatus: saved.status },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/kpi/calculate/team/:teamId
// Calculate team KPI and save to DB (upsert)
// ─────────────────────────────────────────────
router.post(
  "/calculate/team/:teamId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { teamId }             = req.params as Record<string, string>;
      const { periodType, yearMonth } = req.body;
      const period = resolvePeriod(periodType || "monthly", yearMonth);

      const result = await calcTeamKpi(teamId, period);
      const saved  = await saveTeamKpi(result);

      res.json({
        success: true,
        data: { ...result, kpiPeriodId: saved.id, kpiStatus: saved.status },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// GET /api/kpi/targets
// List KPI targets
// Query: ?staffId=xxx or ?teamId=xxx
// ─────────────────────────────────────────────
router.get(
  "/targets",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { staffId, teamId } = req.query as Record<string, string>;

      let result;
      if (staffId) {
        result = await db.execute(sql`
          SELECT kt.*, u.full_name AS staff_name, t.name AS team_name
          FROM kpi_targets kt
          LEFT JOIN users u ON kt.staff_id = u.id
          LEFT JOIN teams t ON kt.team_id  = t.id
          WHERE kt.staff_id = ${staffId as string} AND kt.status = 'Active'
          ORDER BY kt.created_on DESC
        `);
      } else if (teamId) {
        result = await db.execute(sql`
          SELECT kt.*, u.full_name AS staff_name, t.name AS team_name
          FROM kpi_targets kt
          LEFT JOIN users u ON kt.staff_id = u.id
          LEFT JOIN teams t ON kt.team_id  = t.id
          WHERE kt.team_id = ${teamId as string} AND kt.status = 'Active'
          ORDER BY kt.created_on DESC
        `);
      } else {
        result = await db.execute(sql`
          SELECT kt.*, u.full_name AS staff_name, t.name AS team_name
          FROM kpi_targets kt
          LEFT JOIN users u ON kt.staff_id = u.id
          LEFT JOIN teams t ON kt.team_id  = t.id
          WHERE kt.status = 'Active'
          ORDER BY kt.created_on DESC
        `);
      }

      res.json({ success: true, data: result.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/kpi/targets
// Create KPI target (Admin only)
// ─────────────────────────────────────────────
router.post(
  "/targets",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const {
        staffId, teamId, periodType,
        targetAmount, incentiveType, incentiveRate, incentiveFixed,
        validFrom, validTo, description,
      } = req.body;

      if (!staffId && !teamId) {
        return res.status(400).json({
          success: false,
          error: "Either staffId or teamId is required.",
        });
      }
      if (!periodType || !targetAmount || !validFrom) {
        return res.status(400).json({
          success: false,
          error: "periodType, targetAmount, and validFrom are required.",
        });
      }

      const createdBy = (req as any).user?.id || req.body.createdBy;

      const inserted = await db.execute(sql`
        INSERT INTO kpi_targets (
          staff_id, team_id, period_type,
          target_amount, incentive_type, incentive_rate, incentive_fixed,
          valid_from, valid_to, description,
          status, created_by, created_on, modified_on
        ) VALUES (
          ${staffId    || null},
          ${teamId     || null},
          ${periodType},
          ${targetAmount},
          ${incentiveType  || "none"},
          ${incentiveRate  || null},
          ${incentiveFixed || null},
          ${validFrom}::date,
          ${validTo    || null},
          ${description || null},
          'Active',
          ${createdBy},
          NOW(), NOW()
        )
        RETURNING *
      `);

      res.json({ success: true, data: inserted.rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// PUT /api/kpi/targets/:id
// Update KPI target
// ─────────────────────────────────────────────
router.put(
  "/targets/:id",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as Record<string, string>;
      const {
        targetAmount, incentiveType, incentiveRate, incentiveFixed,
        validFrom, validTo, description, status,
      } = req.body;

      await db.execute(sql`
        UPDATE kpi_targets SET
          target_amount   = COALESCE(${targetAmount   ?? null}, target_amount),
          incentive_type  = COALESCE(${incentiveType  ?? null}, incentive_type),
          incentive_rate  = COALESCE(${incentiveRate  ?? null}, incentive_rate),
          incentive_fixed = COALESCE(${incentiveFixed ?? null}, incentive_fixed),
          valid_from      = COALESCE(${validFrom      ?? null}, valid_from),
          valid_to        = COALESCE(${validTo        ?? null}, valid_to),
          description     = COALESCE(${description    ?? null}, description),
          status          = COALESCE(${status         ?? null}, status),
          modified_on     = NOW()
        WHERE id = ${id}
      `);

      res.json({ success: true, message: "KPI target updated successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// PATCH /api/kpi/approve/:kpiPeriodId
// Approve KPI period (Admin only)
// Body: { type: 'staff' | 'team', approvedBy }
// Status: submitted → approved
// ─────────────────────────────────────────────
router.patch(
  "/approve/:kpiPeriodId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { kpiPeriodId } = req.params as Record<string, string>;
      const { type, approvedBy } = req.body;
      const approverId = approvedBy || (req as any).user?.id;

      const table = type === "team" ? "team_kpi_periods" : "staff_kpi_periods";

      await db.execute(sql`
        UPDATE ${sql.raw(table)} SET
          status      = 'approved',
          approved_by = ${approverId},
          approved_at = NOW(),
          modified_on = NOW()
        WHERE id     = ${kpiPeriodId}
          AND status IN ('draft', 'submitted')
      `);

      res.json({ success: true, message: "Approval completed." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// PATCH /api/kpi/pay/:kpiPeriodId
// Process incentive payment (Admin only)
// Body: { type: 'staff' | 'team' }
// Status: approved → paid
// ─────────────────────────────────────────────
router.patch(
  "/pay/:kpiPeriodId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { kpiPeriodId } = req.params as Record<string, string>;
      const { type } = req.body;

      const table = type === "team" ? "team_kpi_periods" : "staff_kpi_periods";

      await db.execute(sql`
        UPDATE ${sql.raw(table)} SET
          status      = 'paid',
          paid_at     = NOW(),
          modified_on = NOW()
        WHERE id     = ${kpiPeriodId}
          AND status  = 'approved'
      `);

      res.json({ success: true, message: "Payment processed successfully." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/kpi/scheduler/run
// Trigger scheduler immediately / manually (Admin/SuperAdmin only, for testing)
// Body: { periodType?: 'monthly' | 'quarterly' }
// ─────────────────────────────────────────────
router.post(
  "/scheduler/run",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { periodType } = req.body;
      const result = await runKpiSchedulerNow(periodType ?? "monthly");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
