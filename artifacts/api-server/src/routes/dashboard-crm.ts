import { Router } from "express";
import { db } from "@workspace/db";
import { sql, type SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

function setCache(res: any, seconds = 300) {
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

// ── GET /api/dashboard/crm/kpi ────────────────────────────────────────────
router.get("/api/dashboard/crm/kpi", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [
      activeContracts,
      newLeads,
      arOutstanding,
      apPending,
      commissionYtd,
      campRevenueYtd,
    ] = await Promise.all([
      scalar(sql`SELECT COUNT(*)::int AS val FROM contracts WHERE status = 'active'`),
      scalar(sql`SELECT COUNT(*)::int AS val FROM leads WHERE created_at >= date_trunc('month', NOW())`),
      scalar(sql`SELECT COALESCE(SUM(ar_amount),0)::numeric AS val FROM contract_products WHERE ar_status IN ('scheduled','invoiced')`),
      scalar(sql`SELECT COALESCE(SUM(ap_amount),0)::numeric AS val FROM contract_products WHERE ap_status IN ('pending','ready')`),
      scalar(sql`SELECT COALESCE(SUM(amount),0)::numeric AS val FROM journal_entries WHERE credit_coa IN ('3100','3200','3300') AND entry_date >= date_trunc('year', NOW())`),
      scalar(sql`SELECT COALESCE(SUM(amount),0)::numeric AS val FROM journal_entries WHERE credit_coa = '3500' AND entry_date >= date_trunc('year', NOW())`),
    ]);

    setCache(res);
    return res.json({ activeContracts, newLeads, arOutstanding, apPending, commissionYtd, campRevenueYtd });
  } catch (err) {
    console.error("[GET /api/dashboard/crm/kpi]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/crm/revenue ───────────────────────────────────────
router.get("/api/dashboard/crm/revenue", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const data = await rows(sql`
      SELECT
        to_char(date_trunc('month', c.created_at), 'YYYY-MM') AS month,
        COALESCE(cp.service_module_type, 'other')             AS service_type,
        COALESCE(SUM(cp.ar_amount), 0)::numeric               AS total
      FROM contract_products cp
      JOIN contracts c ON c.id = cp.contract_id
      WHERE c.created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY 1, 2
      ORDER BY 1, 2
    `);

    setCache(res);
    return res.json({ data });
  } catch (err) {
    console.error("[GET /api/dashboard/crm/revenue]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/crm/funnel ────────────────────────────────────────
router.get("/api/dashboard/crm/funnel", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const data = await rows(sql`
      SELECT COALESCE(status, 'new') AS status, COUNT(*)::int AS count
      FROM leads
      GROUP BY status
      ORDER BY count DESC
    `);

    setCache(res);
    return res.json({ data });
  } catch (err) {
    console.error("[GET /api/dashboard/crm/funnel]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/crm/ar-aging ──────────────────────────────────────
router.get("/api/dashboard/crm/ar-aging", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const rawRows = await rows(sql`
      SELECT
        CASE
          WHEN ar_due_date >= CURRENT_DATE                           THEN 'current'
          WHEN ar_due_date >= CURRENT_DATE - INTERVAL '30 days'     THEN '1-30'
          WHEN ar_due_date >= CURRENT_DATE - INTERVAL '60 days'     THEN '31-60'
          WHEN ar_due_date >= CURRENT_DATE - INTERVAL '90 days'     THEN '61-90'
          ELSE '90+'
        END AS bucket,
        COUNT(*)::int                    AS count,
        COALESCE(SUM(ar_amount), 0)::numeric AS amount
      FROM contract_products
      WHERE ar_status IN ('scheduled','invoiced')
        AND ar_due_date IS NOT NULL
      GROUP BY 1
    `);

    const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"];
    const total   = rawRows.reduce((s, r) => s + Number(r.amount), 0);
    const data    = BUCKETS.map(b => {
      const row = rawRows.find(r => r.bucket === b);
      const amount = row ? Number(row.amount) : 0;
      return { bucket: b, count: row ? Number(row.count) : 0, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 };
    });

    setCache(res);
    return res.json({ data, total });
  } catch (err) {
    console.error("[GET /api/dashboard/crm/ar-aging]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/crm/staff-kpi ─────────────────────────────────────
router.get("/api/dashboard/crm/staff-kpi", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const data = await rows(sql`
      SELECT
        k.id,
        u.full_name  AS staff_name,
        u.id         AS staff_id,
        k.lead_count,
        k.conversion_count,
        k.conversion_rate,
        k.attributed_revenue,
        k.incentive_amount,
        k.bonus_tier,
        k.status,
        k.period_start,
        k.period_end
      FROM staff_kpi_periods k
      JOIN users u ON u.id = k.staff_id
      WHERE k.period_start = date_trunc('month', NOW())::date
      ORDER BY u.full_name
    `);

    setCache(res, 60);
    return res.json({ data });
  } catch (err) {
    console.error("[GET /api/dashboard/crm/staff-kpi]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /api/dashboard/crm/staff-kpi/approve ───────────────────────────
router.patch("/api/dashboard/crm/staff-kpi/approve", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    const approvedBy = req.user!.id;
    for (const id of ids) {
      await db.execute(sql`
        UPDATE staff_kpi_periods
        SET status = 'approved', approved_by = ${approvedBy}::uuid, approved_at = NOW()
        WHERE id = ${id}::uuid AND status = 'draft'
      `);
    }

    return res.json({ success: true, approved: ids.length });
  } catch (err) {
    console.error("[PATCH /api/dashboard/crm/staff-kpi/approve]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
