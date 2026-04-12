import { Router } from "express";
import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

function setCache(res: any, seconds = 60) {
  res.set("Cache-Control", `private, max-age=${seconds}`);
}

async function rows(q: SQL): Promise<any[]> {
  const result = await db.execute(q);
  const r = result as any;
  return Array.isArray(r) ? r : (r.rows ?? []);
}

async function scalar(q: SQL): Promise<number> {
  const data = await rows(q);
  return Number(data[0]?.val ?? 0);
}

// ── GET /api/dashboard/v2/overview ────────────────────────────────────────
router.get("/dashboard/v2/overview", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [
      totalLeads,
      activeLeads,
      totalContracts,
      activeContracts,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      scalar(sql`SELECT COUNT(*)::int AS val FROM leads`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM leads WHERE status NOT IN ('closed_won','closed_lost','cancelled','converted') AND is_active = true`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM contracts`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM contracts WHERE status = 'active'`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM users WHERE role != 'super_admin'`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM users WHERE status = 'active' AND role != 'super_admin'`),
    ]);

    // Month-over-month lead comparison
    const [leadMoM] = await rows(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int               AS this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
                           AND created_at < date_trunc('month', NOW()))::int                AS last_month
      FROM leads
    `);
    const thisMonthLeads  = Number(leadMoM?.this_month  ?? 0);
    const lastMonthLeads  = Number(leadMoM?.last_month  ?? 0);
    const leadMoMPct = lastMonthLeads > 0
      ? Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100)
      : (thisMonthLeads > 0 ? 100 : 0);

    // Contract MoM
    const [contractMoM] = await rows(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int  AS this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
                           AND created_at < date_trunc('month', NOW()))::int   AS last_month
      FROM contracts
    `);
    const thisMonthContracts = Number(contractMoM?.this_month ?? 0);
    const lastMonthContracts = Number(contractMoM?.last_month ?? 0);
    const contractMoMPct = lastMonthContracts > 0
      ? Math.round(((thisMonthContracts - lastMonthContracts) / lastMonthContracts) * 100)
      : (thisMonthContracts > 0 ? 100 : 0);

    const periodStart = new Date();
    periodStart.setDate(1);
    const periodStartStr = periodStart.toISOString().split("T")[0];
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    const [kpiRow] = await rows(sql`
      SELECT
        COALESCE(SUM(ar_collected),0)::numeric      AS ar_collected,
        COALESCE(SUM(ar_scheduled),0)::numeric      AS ar_scheduled,
        COALESCE(SUM(ap_paid),0)::numeric           AS ap_paid,
        COALESCE(SUM(net_revenue),0)::numeric       AS net_revenue,
        COALESCE(SUM(incentive_amount),0)::numeric  AS total_incentive,
        COUNT(DISTINCT staff_id)::int               AS incentive_staff_count
      FROM staff_kpi_periods
      WHERE period_start = date_trunc('month', NOW())::date
    `);

    const kpi = {
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      netRevenue:          Number(kpiRow?.net_revenue         ?? 0),
      arCollected:         Number(kpiRow?.ar_collected        ?? 0),
      arScheduled:         Number(kpiRow?.ar_scheduled        ?? 0),
      apPaid:              Number(kpiRow?.ap_paid             ?? 0),
      totalIncentive:      Number(kpiRow?.total_incentive     ?? 0),
      incentiveStaffCount: Number(kpiRow?.incentive_staff_count ?? 0),
    };

    const recentLeadsRows = await rows(sql`
      SELECT id, full_name AS name, status, source, created_at AS "createdAt"
      FROM leads
      ORDER BY created_at DESC
      LIMIT 5
    `);

    setCache(res);
    return res.json({
      totalLeads, activeLeads,
      totalContracts, activeContracts,
      totalUsers, activeUsers,
      thisMonthLeads, lastMonthLeads, leadMoMPct,
      thisMonthContracts, lastMonthContracts, contractMoMPct,
      kpi,
      recentLeads: recentLeadsRows.map(r => ({
        id:        r.id,
        name:      r.name,
        status:    r.status,
        source:    r.source,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("[GET /api/dashboard/v2/overview]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/v2/operation ───────────────────────────────────────
router.get("/dashboard/v2/operation", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [
      tasksDueCount,
      tasksOverdueCount,
      interviewsThisWeek,
      visaPendingCount,
      visaUrgentCount,
      tasksUrgentCount,
    ] = await Promise.all([
      scalar(sql`SELECT COUNT(*)::int AS val FROM tasks WHERE status NOT IN ('closed','resolved','done') AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days'`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM tasks WHERE status NOT IN ('closed','resolved','done') AND due_date < CURRENT_DATE`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM interview_schedules WHERE scheduled_datetime >= date_trunc('week', NOW()) AND scheduled_datetime < date_trunc('week', NOW()) + INTERVAL '7 days'`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM visa_services_mgt WHERE visa_status NOT IN ('granted','rejected') OR visa_status IS NULL`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM visa_services_mgt WHERE visa_expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND visa_expiry_date >= CURRENT_DATE`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM tasks WHERE status NOT IN ('closed','resolved','done') AND priority = 'urgent'`),
    ]);

    const pendingTasksRows = await rows(sql`
      SELECT
        t.id,
        COALESCE(t.task_title, t.title, 'Untitled Task') AS title,
        t.due_date             AS "dueDate",
        u.full_name            AS "assignedTo",
        COALESCE(t.priority, 'normal') AS priority,
        t.status
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.status NOT IN ('closed','resolved','done')
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high'   THEN 2
          WHEN 'normal' THEN 3
          ELSE 4
        END,
        t.due_date ASC NULLS LAST
      LIMIT 8
    `);

    // Interview: join to interviewer (users) for the name
    const upcomingInterviewsRows = await rows(sql`
      SELECT
        i.id,
        COALESCE(u.full_name, 'Unknown') AS "contactName",
        UPPER(LEFT(COALESCE(u.full_name, 'UN'), 2)) AS initials,
        i.format AS "interviewType",
        i.location,
        i.scheduled_datetime AS "scheduledAt"
      FROM interview_schedules i
      LEFT JOIN users u ON u.id = i.interviewer_id
      WHERE i.scheduled_datetime >= NOW()
        AND i.status = 'pending'
      ORDER BY i.scheduled_datetime ASC
      LIMIT 5
    `);

    const recentActivityRows = await rows(sql`
      SELECT id, 'lead' AS type,
        'Lead: ' || full_name AS description,
        updated_at AS "createdAt"
      FROM leads
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    const visaStageRows = await rows(sql`
      SELECT
        COALESCE(visa_status, 'pending') AS stage,
        COUNT(*)::int AS count
      FROM visa_services_mgt
      GROUP BY visa_status
      ORDER BY count DESC
      LIMIT 8
    `);

    setCache(res);
    return res.json({
      tasksDueCount,
      tasksOverdueCount,
      tasksUrgentCount,
      interviewsThisWeek,
      visaPendingCount,
      visaUrgentCount,
      enrollmentTotal: 0,
      enrollmentAvailable: 0,
      visaStages: visaStageRows.map(r => ({ stage: r.stage, count: Number(r.count) })),
      pendingTasks: pendingTasksRows,
      upcomingInterviews: upcomingInterviewsRows,
      recentActivity: recentActivityRows.map(r => ({
        id: r.id,
        type: r.type,
        description: r.description,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("[GET /api/dashboard/v2/operation]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/v2/sales ───────────────────────────────────────────
router.get("/dashboard/v2/sales", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const pipelineRows = await rows(sql`
      SELECT COALESCE(status, 'new') AS status, COUNT(*)::int AS count
      FROM leads
      WHERE is_active = true
      GROUP BY status
    `);

    const statusMap: Record<string, number> = {};
    for (const r of pipelineRows) statusMap[r.status] = Number(r.count);

    const pipeline = {
      new:        statusMap["new"]         ?? 0,
      open:       statusMap["open"]        ?? 0,
      inProgress: (statusMap["in_progress"] ?? 0),
      qualified:  statusMap["qualified"]   ?? 0,
      contracted: statusMap["converted"]   ?? 0,
      total:      Object.values(statusMap).reduce((a, b) => a + b, 0),
    };

    const monthlyLeadsRows = await rows(sql`
      SELECT
        to_char(date_trunc('month', created_at), 'Mon') AS month,
        EXTRACT(YEAR FROM created_at)::int               AS year,
        COUNT(*)::int                                    AS count
      FROM leads
      WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY date_trunc('month', created_at), month, year
      ORDER BY date_trunc('month', created_at)
    `);

    // Monthly contracts
    const monthlyContractsRows = await rows(sql`
      SELECT
        to_char(date_trunc('month', created_at), 'Mon') AS month,
        COUNT(*)::int AS count
      FROM contracts
      WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY date_trunc('month', created_at), month
      ORDER BY date_trunc('month', created_at)
    `);
    const contractMap: Record<string, number> = {};
    for (const r of monthlyContractsRows) contractMap[r.month] = Number(r.count);

    const sourceRows = await rows(sql`
      SELECT COALESCE(source,'Unknown') AS source, COUNT(*)::int AS count
      FROM leads
      WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY source
      ORDER BY count DESC
    `);
    const srcTotal = sourceRows.reduce((s: number, r: any) => s + Number(r.count), 0);
    const leadSources = sourceRows.map((r: any) => ({
      source:     r.source,
      count:      Number(r.count),
      percentage: srcTotal > 0 ? Math.round((Number(r.count) / srcTotal) * 100) : 0,
    }));

    const recentQuotesRows = await rows(sql`
      SELECT
        q.id,
        q.quote_ref_number  AS "quoteNumber",
        COALESCE(q.customer_name, 'Unknown') AS "contactName",
        COALESCE(
          (SELECT SUM(qp.total) FROM quote_products qp WHERE qp.quote_id = q.id AND qp.status = 'Active'),
          0
        )::numeric AS "totalAmount",
        q.quote_status AS status,
        q.created_on   AS "createdAt"
      FROM quotes q
      ORDER BY q.created_on DESC
      LIMIT 5
    `);

    const totalQuoteValue = await scalar(sql`
      SELECT COALESCE(SUM(total),0)::numeric AS val
      FROM quote_products
      WHERE status = 'Active'
    `);

    const thisMonth          = await scalar(sql`SELECT COUNT(*)::int AS val FROM leads WHERE created_at >= date_trunc('month', NOW())`);
    const thisMonthContracts = await scalar(sql`SELECT COUNT(*)::int AS val FROM contracts WHERE created_at >= date_trunc('month', NOW())`);

    // Conversion rate (new leads this month → contracts)
    const conversionRate = thisMonth > 0
      ? Math.round((thisMonthContracts / thisMonth) * 100)
      : 0;

    setCache(res);
    return res.json({
      pipeline,
      monthlyLeads: monthlyLeadsRows.map((r: any) => ({
        month:     r.month,
        year:      r.year,
        count:     Number(r.count),
        contracts: contractMap[r.month] ?? 0,
      })),
      leadSources,
      recentQuotes: recentQuotesRows.map((r: any) => ({ ...r, totalAmount: Number(r.totalAmount) })),
      goals: {
        newLeadsTarget:      50,
        newLeadsActual:      thisMonth,
        contractsTarget:     10,
        contractsActual:     thisMonthContracts,
        conversionRate,
      },
      totalQuoteValue,
    });
  } catch (err) {
    console.error("[GET /api/dashboard/v2/sales]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/v2/finance ─────────────────────────────────────────
router.get("/dashboard/v2/finance", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [kpiRow] = await rows(sql`
      SELECT
        COALESCE(SUM(ar_collected),0)::numeric   AS ar_collected,
        COALESCE(SUM(ar_scheduled),0)::numeric   AS ar_scheduled,
        COALESCE(SUM(ap_paid),0)::numeric        AS ap_paid,
        COALESCE(SUM(ap_scheduled),0)::numeric   AS ap_scheduled,
        COALESCE(SUM(net_revenue),0)::numeric    AS net_revenue,
        COALESCE(SUM(incentive_amount),0)::numeric AS total_incentive
      FROM staff_kpi_periods
      WHERE period_start = date_trunc('month', NOW())::date
    `);

    const monthlyRevenueRows = await rows(sql`
      SELECT
        to_char(date_trunc('month', c.created_at), 'Mon') AS month,
        EXTRACT(YEAR FROM c.created_at)::int               AS year,
        COALESCE(SUM(cp.ar_amount),0)::numeric             AS ar,
        COALESCE(SUM(cp.ap_amount),0)::numeric             AS ap
      FROM contract_products cp
      JOIN contracts c ON c.id = cp.contract_id
      WHERE c.created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY date_trunc('month', c.created_at), month, year
      ORDER BY date_trunc('month', c.created_at)
    `);

    const arTotal        = await scalar(sql`SELECT COALESCE(SUM(ar_amount),0)::numeric AS val FROM contract_products WHERE ar_status IN ('scheduled','invoiced')`);
    const arOutstanding  = await scalar(sql`SELECT COALESCE(SUM(ar_amount),0)::numeric AS val FROM contract_products WHERE ar_status = 'invoiced'`);
    const arOverdueCount = await scalar(sql`SELECT COUNT(*)::int AS val FROM contract_products WHERE ar_status IN ('scheduled','invoiced') AND ar_due_date < CURRENT_DATE`);
    const arInvoiceCount = await scalar(sql`SELECT COUNT(*)::int AS val FROM contract_products WHERE ar_status IN ('scheduled','invoiced')`);

    const apTotal        = await scalar(sql`SELECT COALESCE(SUM(ap_amount),0)::numeric AS val FROM contract_products WHERE ap_status IN ('pending','ready')`);
    const apOverdue      = await scalar(sql`SELECT COALESCE(SUM(ap_amount),0)::numeric AS val FROM contract_products WHERE ap_status IN ('pending','ready') AND ap_due_date < CURRENT_DATE`);
    const apUrgentCount  = await scalar(sql`SELECT COUNT(*)::int AS val FROM contract_products WHERE ap_status IN ('pending','ready') AND ap_due_date <= CURRENT_DATE + INTERVAL '7 days'`);
    const apPayableCount = await scalar(sql`SELECT COUNT(*)::int AS val FROM contract_products WHERE ap_status IN ('pending','ready')`);

    // Commissions: use student_name from contracts (no lead_id in contracts)
    const commissionsRows = await rows(sql`
      SELECT
        cp.id,
        COALESCE(a.name, 'Unknown Partner')   AS "schoolName",
        COALESCE(c.student_name, 'Unknown')   AS "studentName",
        COALESCE(cp.ap_amount, 0)::numeric    AS "expectedAmount",
        COALESCE(cp.ap_status, 'pending')     AS status,
        cp.ap_due_date                        AS "dueDate"
      FROM contract_products cp
      LEFT JOIN contracts c ON c.id = cp.contract_id
      LEFT JOIN accounts a ON a.id = cp.provider_account_id
      WHERE cp.ap_status IN ('pending','ready')
      ORDER BY cp.ap_amount DESC NULLS LAST
      LIMIT 10
    `);

    const totalExpectedCommission = await scalar(sql`
      SELECT COALESCE(SUM(ap_amount),0)::numeric AS val
      FROM contract_products
      WHERE ap_status IN ('pending','ready')
    `);

    const staffIncentivesRows = await rows(sql`
      SELECT
        k.staff_id      AS "staffId",
        u.full_name     AS "staffName",
        k.lead_count,
        k.conversion_count,
        k.incentive_amount::numeric AS amount,
        k.bonus_tier,
        k.status,
        to_char(k.period_start,'Mon YYYY') AS period
      FROM staff_kpi_periods k
      JOIN users u ON u.id = k.staff_id
      WHERE k.period_start = date_trunc('month', NOW())::date
      ORDER BY k.incentive_amount DESC
      LIMIT 10
    `);

    const upcomingPaymentsRows = await rows(sql`
      SELECT
        cp.id,
        COALESCE(a.name, 'Unknown') || ' — ' || COALESCE(cp.service_module_type,'Payment') AS description,
        cp.ap_due_date::text AS "dueDate",
        cp.ap_amount::numeric AS amount,
        CASE
          WHEN cp.ap_due_date <= CURRENT_DATE + INTERVAL '3 days'  THEN 'high'
          WHEN cp.ap_due_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'medium'
          ELSE 'low'
        END AS urgency
      FROM contract_products cp
      LEFT JOIN contracts c ON c.id = cp.contract_id
      LEFT JOIN accounts a ON a.id = cp.provider_account_id
      WHERE cp.ap_status IN ('pending','ready')
        AND cp.ap_due_date IS NOT NULL
        AND cp.ap_due_date >= CURRENT_DATE
      ORDER BY cp.ap_due_date ASC
      LIMIT 5
    `);

    setCache(res);
    return res.json({
      netRevenue:     Number(kpiRow?.net_revenue     ?? 0),
      arCollected:    Number(kpiRow?.ar_collected    ?? 0),
      arScheduled:    Number(kpiRow?.ar_scheduled    ?? 0),
      apPaid:         Number(kpiRow?.ap_paid         ?? 0),
      apScheduled:    Number(kpiRow?.ap_scheduled    ?? 0),
      totalIncentive: Number(kpiRow?.total_incentive ?? 0),
      monthlyRevenue: monthlyRevenueRows.map((r: any) => ({
        month: r.month, year: r.year, ar: Number(r.ar), ap: Number(r.ap),
      })),
      arSummary: { total: arTotal, outstanding: arOutstanding, overdueCount: arOverdueCount, invoiceCount: arInvoiceCount },
      apSummary: { total: apTotal, overdue: apOverdue, urgentCount: apUrgentCount, payableCount: apPayableCount },
      commissions: commissionsRows.map((r: any) => ({ ...r, expectedAmount: Number(r.expectedAmount) })),
      totalExpectedCommission,
      staffIncentives: staffIncentivesRows.map((r: any) => ({ ...r, amount: Number(r.amount) })),
      upcomingPayments: upcomingPaymentsRows.map((r: any) => ({ ...r, amount: Number(r.amount) })),
    });
  } catch (err) {
    console.error("[GET /api/dashboard/v2/finance]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
