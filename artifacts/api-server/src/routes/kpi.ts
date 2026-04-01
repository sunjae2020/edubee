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
// 헬퍼: 기간 start/end 자동 계산
// ─────────────────────────────────────────────
function resolvePeriod(
  periodType: string,
  yearMonth?: string // 'YYYY-MM' 형식, 없으면 현재 월
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
// 직원 KPI 조회 (계산만, 저장 안함)
// Query: ?periodType=monthly&yearMonth=2026-03
// Access: admin/super_admin 전체 + 본인 + team_manager(팀원만)
// ─────────────────────────────────────────────
router.get(
  "/staff/:staffId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { staffId }   = req.params;
      const currentUser   = (req as any).user as { id: string; role: string };
      const role          = currentUser?.role ?? "";

      // ── 접근 제어 ────────────────────────────────────────────────────────
      if (!ADMIN_ROLES.includes(role)) {
        if (currentUser.id === staffId) {
          // 본인 KPI → 허용
        } else if (role === "team_manager") {
          // 팀장 → 같은 팀 직원만 허용
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
// 팀 KPI 조회 (소속 직원 롤업)
// Query: ?periodType=monthly&yearMonth=2026-03
// ─────────────────────────────────────────────
router.get(
  "/team/:teamId",
  authenticate,
  requireRole(...ADMIN_ROLES, "camp_coordinator"),
  async (req: Request, res: Response) => {
    try {
      const { teamId }  = req.params;
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
// 전체 직원 KPI 요약 (Admin용)
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
// 직원 KPI 계산 후 DB 저장 (upsert)
// ─────────────────────────────────────────────
router.post(
  "/calculate/staff/:staffId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { staffId }            = req.params;
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
// 팀 KPI 계산 후 DB 저장 (upsert)
// ─────────────────────────────────────────────
router.post(
  "/calculate/team/:teamId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { teamId }             = req.params;
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
// 목표 설정 목록 조회
// Query: ?staffId=xxx 또는 ?teamId=xxx
// ─────────────────────────────────────────────
router.get(
  "/targets",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { staffId, teamId } = req.query;

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
// 목표 설정 생성 (Admin 전용)
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
          error: "staffId 또는 teamId 중 하나는 필수입니다.",
        });
      }
      if (!periodType || !targetAmount || !validFrom) {
        return res.status(400).json({
          success: false,
          error: "periodType, targetAmount, validFrom 은 필수입니다.",
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
// 목표 설정 수정
// ─────────────────────────────────────────────
router.put(
  "/targets/:id",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
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

      res.json({ success: true, message: "목표 설정이 수정되었습니다." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// PATCH /api/kpi/approve/:kpiPeriodId
// KPI 기간 승인 (Admin 전용)
// Body: { type: 'staff' | 'team', approvedBy }
// 상태: submitted → approved
// ─────────────────────────────────────────────
router.patch(
  "/approve/:kpiPeriodId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { kpiPeriodId } = req.params;
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

      res.json({ success: true, message: "승인 완료되었습니다." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// PATCH /api/kpi/pay/:kpiPeriodId
// 성과급 지급 처리 (Admin 전용)
// Body: { type: 'staff' | 'team' }
// 상태: approved → paid
// ─────────────────────────────────────────────
router.patch(
  "/pay/:kpiPeriodId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req: Request, res: Response) => {
    try {
      const { kpiPeriodId } = req.params;
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

      res.json({ success: true, message: "지급 처리 완료되었습니다." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/kpi/scheduler/run
// 스케줄러 즉시 수동 실행 (Admin/SuperAdmin 전용, 테스트용)
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
