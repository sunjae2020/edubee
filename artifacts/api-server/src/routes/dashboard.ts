import { Router } from "express";
import { db } from "@workspace/db";
import { applications, contracts, leads, notifications, users } from "@workspace/db/schema";
import { eq, count, gte, sql, ne } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/dashboard/stats", authenticate, async (req, res) => {
  try {
    const [totalApps] = await db.select({ count: count() }).from(applications);
    const [pendingApps] = await db.select({ count: count() }).from(applications).where(eq(applications.status, "submitted"));
    const [contractedApps] = await db.select({ count: count() }).from(applications).where(eq(applications.status, "contracted"));
    const [totalContracts] = await db.select({ count: count() }).from(contracts);
    const [activeContracts] = await db.select({ count: count() }).from(contracts).where(eq(contracts.status, "active"));
    const [totalLeads] = await db.select({ count: count() }).from(leads);
    const [activeLeads] = await db.select({ count: count() }).from(leads).where(ne(leads.status, "converted"));
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.status, "active"));

    const recentApplications = await db.select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      status: applications.status,
      createdAt: applications.createdAt,
      studentName: applications.studentName,
    }).from(applications).orderBy(sql`${applications.createdAt} DESC`).limit(5);

    const recentLeads = await db.select({
      id: leads.id,
      studentName: leads.studentName,
      status: leads.status,
      createdAt: leads.createdAt,
    }).from(leads).orderBy(sql`${leads.createdAt} DESC`).limit(5);

    const appsByStatus = await db.execute(sql`
      SELECT status, COUNT(*)::int as count FROM applications GROUP BY status ORDER BY count DESC
    `);

    return res.json({
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
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/notifications", authenticate, async (req, res) => {
  try {
    const { isRead, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const [totalResult] = await db.select({ count: count() }).from(notifications).where(eq(notifications.userId, req.user!.id));
    let q = db.select().from(notifications).where(eq(notifications.userId, req.user!.id));
    const data = await q.limit(limitNum).offset(offset).orderBy(notifications.createdAt);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, req.params.id));
    return res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
