import { Router } from "express";
import { db } from "@workspace/db";
import { applications, contracts, leads, notifications, users, pickupMgt, tourMgt } from "@workspace/db/schema";
import { eq, count, ne, sql, and, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/dashboard/stats", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.id;
    const isSAorAD = role === "super_admin" || role === "admin";
    const isCC = role === "camp_coordinator";
    const isEA = false; // education_agent role removed
    const isPartner = role.startsWith("partner_");

    // 임프로소네이션 시 테넌트 필터 적용
    const tenantId = req.tenant?.id ?? null;

    // --- SA / AD: full platform stats ---
    if (isSAorAD) {
      const [totalApps] = await db.select({ count: count() }).from(applications);
      const [pendingApps] = await db.select({ count: count() }).from(applications).where(eq(applications.status, "submitted"));
      const [contractedApps] = await db.select({ count: count() }).from(applications).where(eq(applications.status, "contracted"));
      const [totalContracts] = await db.select({ count: count() }).from(contracts)
        .where(tenantId ? eq(contracts.organisationId, tenantId) : undefined);
      const [activeContracts] = await db.select({ count: count() }).from(contracts)
        .where(tenantId ? and(eq(contracts.organisationId, tenantId), eq(contracts.status, "active")) : eq(contracts.status, "active"));
      const [totalLeads] = await db.select({ count: count() }).from(leads)
        .where(tenantId ? eq(leads.organisationId, tenantId) : undefined);
      const [activeLeads] = await db.select({ count: count() }).from(leads)
        .where(tenantId ? and(eq(leads.organisationId, tenantId), ne(leads.status, "converted")) : ne(leads.status, "converted"));
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.status, "active"));

      const recentApplications = await db.select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        createdAt: applications.createdAt,
        studentName: applications.specialRequests,
      }).from(applications).orderBy(sql`${applications.createdAt} DESC`).limit(5);

      const recentLeads = await db.select({
        id: leads.id,
        studentName: leads.fullName,
        status: leads.status,
        createdAt: leads.createdAt,
      }).from(leads)
        .where(tenantId ? eq(leads.organisationId, tenantId) : undefined)
        .orderBy(sql`${leads.createdAt} DESC`).limit(5);

      const appsByStatus = await db.execute(sql`
        SELECT status, COUNT(*)::int as count FROM applications GROUP BY status ORDER BY count DESC
      `);

      // KPI 요약 집계 — 이번 달 기준
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split("T")[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString().split("T")[0];

      const kpiRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(cp.ar_amount), 0)                                AS ar_scheduled,
          COALESCE(SUM(
            CASE WHEN cp.ar_status = 'paid' THEN cp.ar_amount ELSE 0 END
          ), 0)                                                         AS ar_collected,
          COALESCE(SUM(cp.ap_amount), 0)                                AS ap_scheduled,
          COALESCE(SUM(
            CASE WHEN cp.ap_status = 'paid' THEN cp.ap_amount ELSE 0 END
          ), 0)                                                         AS ap_paid,
          COALESCE(SUM(cp.ar_amount), 0)
            - COALESCE(SUM(
                CASE WHEN cp.ap_status = 'paid' THEN cp.ap_amount ELSE 0 END
              ), 0)                                                     AS net_revenue,
          COUNT(DISTINCT c.owner_id)                                    AS active_staff_count
        FROM contract_products cp
        JOIN contracts c ON cp.contract_id = c.id
        WHERE cp.status IN ('pending', 'active')
          AND cp.ar_due_date >= ${periodStart}
          AND cp.ar_due_date <= ${periodEnd}
      `);
      const kpi = kpiRes.rows[0] as any;

      const incentiveRes = await db.execute(sql`
        SELECT COALESCE(SUM(incentive_amount), 0) AS total_incentive
        FROM staff_kpi_periods
        WHERE period_type  = 'monthly'
          AND period_start = ${periodStart}
      `);
      const totalIncentive = Number(
        (incentiveRes.rows[0] as any)?.total_incentive ?? 0
      );

      return res.json({
        role,
        totalApplications: Number(totalApps.count),
        pendingApplications: Number(pendingApps.count),
        contractedApplications: Number(contractedApps.count),
        totalContracts: Number(totalContracts.count),
        activeContracts: Number(activeContracts.count),
        totalLeads: Number(totalLeads.count),
        activeLeads: Number(activeLeads.count),
        totalUsers: Number(totalUsers.count),
        activeUsers: Number(activeUsers.count),
        recentApplications,
        recentLeads,
        applicationsByStatus: (appsByStatus.rows as any[]).map(r => ({ status: r.status, count: r.count })),
        kpiSummary: {
          periodStart,
          periodEnd,
          arScheduled:    Number(kpi.ar_scheduled    ?? 0),
          arCollected:    Number(kpi.ar_collected    ?? 0),
          apScheduled:    Number(kpi.ap_scheduled    ?? 0),
          apPaid:         Number(kpi.ap_paid         ?? 0),
          netRevenue:     Number(kpi.net_revenue     ?? 0),
          activeStaff:    Number(kpi.active_staff_count ?? 0),
          totalIncentive,
        },
      });
    }

    // --- Education Agent ---
    if (isEA) {
      const [myLeads] = await db.select({ count: count() }).from(leads).where(eq(leads.agentId, userId));
      const [myActiveLeads] = await db.select({ count: count() }).from(leads).where(and(eq(leads.agentId, userId), ne(leads.status, "converted")));
      const [myApps] = await db.select({ count: count() }).from(applications).where(eq(applications.agentId, userId));
      const [myPendingApps] = await db.select({ count: count() }).from(applications).where(and(eq(applications.agentId, userId), eq(applications.status, "submitted")));
      const [myContracts] = await db.select({ count: count() }).from(contracts).where(eq(contracts.agentId, userId));

      const recentLeads = await db.select({
        id: leads.id,
        studentName: leads.fullName,
        status: leads.status,
        createdAt: leads.createdAt,
      }).from(leads).where(eq(leads.agentId, userId)).orderBy(sql`${leads.createdAt} DESC`).limit(5);

      const recentApplications = await db.select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        createdAt: applications.createdAt,
        studentName: applications.specialRequests,
      }).from(applications).where(eq(applications.agentId, userId)).orderBy(sql`${applications.createdAt} DESC`).limit(5);

      const appsByStatus = await db.execute(sql`
        SELECT status, COUNT(*)::int as count FROM applications WHERE agent_id = ${userId} GROUP BY status ORDER BY count DESC
      `);

      return res.json({
        role,
        totalLeads: Number(myLeads.count),
        activeLeads: Number(myActiveLeads.count),
        totalApplications: Number(myApps.count),
        pendingApplications: Number(myPendingApps.count),
        totalContracts: Number(myContracts.count),
        recentLeads,
        recentApplications,
        applicationsByStatus: (appsByStatus.rows as any[]).map(r => ({ status: r.status, count: r.count })),
      });
    }

    // --- Camp Coordinator ---
    if (isCC) {
      const [myApps] = await db.select({ count: count() }).from(applications);
      const [myContracts] = await db.select({ count: count() }).from(contracts);
      const [activeContracts] = await db.select({ count: count() }).from(contracts).where(eq(contracts.status, "active"));
      const recentApplications = await db.select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        createdAt: applications.createdAt,
        studentName: applications.specialRequests,
      }).from(applications).orderBy(sql`${applications.createdAt} DESC`).limit(5);

      const appsByStatus = await db.execute(sql`
        SELECT status, COUNT(*)::int as count FROM applications GROUP BY status ORDER BY count DESC
      `);

      return res.json({
        role,
        totalApplications: Number(myApps.count),
        totalContracts: Number(myContracts.count),
        activeContracts: Number(activeContracts.count),
        recentApplications,
        recentLeads: [],
        applicationsByStatus: (appsByStatus.rows as any[]).map(r => ({ status: r.status, count: r.count })),
      });
    }

    // --- Partner roles ---
    if (isPartner) {
      const partnerType = role.replace("partner_", "");
      let bookings = 0;
      let active = 0;
      if (partnerType === "pickup") {
        const [b] = await db.select({ count: count() }).from(pickupMgt).where(eq(pickupMgt.partnerId, userId));
        const [a] = await db.select({ count: count() }).from(pickupMgt).where(and(eq(pickupMgt.partnerId, userId), eq(pickupMgt.status, "confirmed")));
        bookings = Number(b.count); active = Number(a.count);
      } else if (partnerType === "tour") {
        const [b] = await db.select({ count: count() }).from(tourMgt).where(eq(tourMgt.partnerId, userId));
        const [a] = await db.select({ count: count() }).from(tourMgt).where(and(eq(tourMgt.partnerId, userId), eq(tourMgt.status, "confirmed")));
        bookings = Number(b.count); active = Number(a.count);
      }
      return res.json({ role, partnerType, totalBookings: bookings, activeBookings: active, recentApplications: [], recentLeads: [], applicationsByStatus: [] });
    }

    // --- Parent client ---
    const [myApps] = await db.select({ count: count() }).from(applications).where(eq(applications.clientId, userId));
    const recentApplications = await db.select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      status: applications.status,
      createdAt: applications.createdAt,
      studentName: applications.specialRequests,
    }).from(applications).where(eq(applications.clientId, userId)).orderBy(sql`${applications.createdAt} DESC`).limit(5);

    return res.json({
      role,
      totalApplications: Number(myApps.count),
      recentApplications,
      recentLeads: [],
      applicationsByStatus: [],
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/notifications", authenticate, async (req, res) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const [totalResult] = await db.select({ count: count() }).from(notifications).where(eq(notifications.userId, req.user!.id));
    const data = await db.select().from(notifications).where(eq(notifications.userId, req.user!.id)).limit(limitNum).offset(offset).orderBy(sql`${notifications.createdAt} DESC`);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/notifications/unread-count", authenticate, async (req, res) => {
  try {
    const [result] = await db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.userId, req.user!.id), eq(notifications.isRead, false)));
    return res.json({ count: Number(result.count) });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/notifications/mark-all-read", authenticate, async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, req.user!.id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
