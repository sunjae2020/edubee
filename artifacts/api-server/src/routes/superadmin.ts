import { Router } from "express";
import { db } from "@workspace/db";
import { organisations, platformPlans } from "@workspace/db/schema";
import { eq, ilike, sql, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { superAdminOnly } from "../middleware/superAdminOnly.js";

const router = Router();
const guard  = [authenticate, superAdminOnly];

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/superadmin/stats", ...guard, async (_req, res) => {
  try {
    const [tenantsRes, usersRes, studentsRes] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int                                                             AS total_tenants,
          COUNT(*) FILTER (WHERE status = 'Active')::int                           AS active_tenants,
          COUNT(*) FILTER (WHERE plan_status = 'trial')::int                       AS trial_tenants,
          COUNT(*) FILTER (WHERE plan_type = 'starter')::int                       AS starter_count,
          COUNT(*) FILTER (WHERE plan_type = 'professional')::int                  AS professional_count,
          COUNT(*) FILTER (WHERE plan_type = 'enterprise')::int                    AS enterprise_count
        FROM organisations
      `),
      db.execute(sql`SELECT COUNT(*)::int AS cnt FROM users`),
      db.execute(sql`SELECT COUNT(*)::int AS cnt FROM accounts WHERE account_type = 'Student'`),
    ]);

    const r   = (x: any) => x.rows ?? (x as any[]);
    const t   = r(tenantsRes)[0]  ?? {};
    const u   = r(usersRes)[0]    ?? {};
    const s   = r(studentsRes)[0] ?? {};

    return res.json({
      totalTenants:       t.total_tenants    ?? 0,
      activeTenants:      t.active_tenants   ?? 0,
      trialTenants:       t.trial_tenants    ?? 0,
      planDistribution: {
        starter:          t.starter_count      ?? 0,
        professional:     t.professional_count ?? 0,
        enterprise:       t.enterprise_count   ?? 0,
      },
      totalUsers:    u.cnt ?? 0,
      totalStudents: s.cnt ?? 0,
    });
  } catch (err) {
    console.error("GET /api/superadmin/stats", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenants
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/superadmin/tenants", ...guard, async (req, res) => {
  try {
    const { search = "", page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const pageNum     = Math.max(1, parseInt(page));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize)));
    const offsetNum   = (pageNum - 1) * pageSizeNum;

    const conds = search
      ? sql`WHERE (o.name ILIKE ${"%" + search + "%"} OR o.subdomain ILIKE ${"%" + search + "%"} OR o.owner_email ILIKE ${"%" + search + "%"})`
      : sql``;

    const [countRes, rowsRes] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS total FROM organisations o ${conds}`),
      db.execute(sql`
        SELECT
          o.id, o.name, o.trading_name, o.subdomain, o.custom_domain,
          o.plan_type, o.plan_status, o.status, o.trial_ends_at,
          o.max_users, o.max_students, o.owner_email,
          o.created_on, o.onboarded_at, o.last_login_at,
          (SELECT COUNT(*)::int FROM users u WHERE u.organisation_id = o.id) AS user_count
        FROM organisations o
        ${conds}
        ORDER BY o.created_on DESC
        LIMIT ${pageSizeNum} OFFSET ${offsetNum}
      `),
    ]);

    const r     = (x: any) => x.rows ?? (x as any[]);
    const total = parseInt(r(countRes)[0]?.total ?? "0");

    return res.json({
      data:       r(rowsRes),
      pagination: {
        total,
        page:       pageNum,
        pageSize:   pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (err) {
    console.error("GET /api/superadmin/tenants", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/api/superadmin/tenants/:id", ...guard, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(organisations)
      .where(eq(organisations.id, req.params.id))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: "Tenant not found" });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/api/superadmin/tenants/:id", ...guard, async (req, res) => {
  try {
    const { planType, planStatus, status, maxUsers, maxStudents, trialEndsAt, features } = req.body;

    const [updated] = await db
      .update(organisations)
      .set({
        ...(planType    !== undefined && { planType }),
        ...(planStatus  !== undefined && { planStatus }),
        ...(status      !== undefined && { status }),
        ...(maxUsers    !== undefined && { maxUsers }),
        ...(maxStudents !== undefined && { maxStudents }),
        ...(trialEndsAt !== undefined && { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null }),
        ...(features    !== undefined && { features }),
        modifiedOn: new Date(),
      })
      .where(eq(organisations.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Tenant not found" });
    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/superadmin/tenants/:id", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/superadmin/plans", ...guard, async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(platformPlans)
      .orderBy(platformPlans.priceMonthly);
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/superadmin/plans", ...guard, async (req, res) => {
  try {
    const {
      name, code, priceMonthly, priceAnnually,
      maxUsers, maxStudents, features, isPopular,
    } = req.body;

    const [plan] = await db
      .insert(platformPlans)
      .values({ name, code, priceMonthly, priceAnnually, maxUsers, maxStudents, features, isPopular })
      .returning();

    return res.status(201).json(plan);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Plan code already exists" });
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/api/superadmin/plans/:id", ...guard, async (req, res) => {
  try {
    const {
      name, priceMonthly, priceAnnually,
      maxUsers, maxStudents, features, isPopular, status,
    } = req.body;

    const [updated] = await db
      .update(platformPlans)
      .set({
        ...(name          !== undefined && { name }),
        ...(priceMonthly  !== undefined && { priceMonthly }),
        ...(priceAnnually !== undefined && { priceAnnually }),
        ...(maxUsers      !== undefined && { maxUsers }),
        ...(maxStudents   !== undefined && { maxStudents }),
        ...(features      !== undefined && { features }),
        ...(isPopular     !== undefined && { isPopular }),
        ...(status        !== undefined && { status }),
        modifiedOn: new Date(),
      })
      .where(eq(platformPlans.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Plan not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
