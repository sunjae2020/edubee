import { Router } from "express";
import { db } from "@workspace/db";
import { applications, contracts, leads, notifications } from "@workspace/db/schema";
import { eq, count, gte, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/dashboard/stats", authenticate, async (req, res) => {
  try {
    const [totalApps] = await db.select({ count: count() }).from(applications);
    const [pendingApps] = await db.select({ count: count() }).from(applications).where(eq(applications.status, "pending"));
    const [activeContracts] = await db.select({ count: count() }).from(contracts).where(eq(contracts.status, "active"));
    const [totalLeads] = await db.select({ count: count() }).from(leads);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [newLeads] = await db.select({ count: count() }).from(leads).where(gte(leads.createdAt, startOfMonth));

    const revenueResult = await db.execute(sql`SELECT COALESCE(SUM(total_amount::numeric), 0) as total FROM contracts WHERE status NOT IN ('cancelled')`);
    const totalRevenue = (revenueResult.rows[0] as any)?.total || "0";

    const recentApplications = await db.select().from(applications).orderBy(applications.createdAt).limit(5);

    const appsByStatus = await db.execute(sql`
      SELECT status, COUNT(*)::int as count FROM applications GROUP BY status ORDER BY count DESC
    `);

    return res.json({
      totalApplications: Number(totalApps.count),
      pendingApplications: Number(pendingApps.count),
      activeContracts: Number(activeContracts.count),
      totalRevenue: String(totalRevenue),
      totalLeads: Number(totalLeads.count),
      newLeadsThisMonth: Number(newLeads.count),
      recentApplications,
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

    const conditions = [eq(notifications.userId, req.user!.id)];
    if (isRead !== undefined) {
      conditions.push(eq(notifications.isRead, isRead === "true"));
    }
    const whereClause = conditions.length > 1 
      ? sql`${notifications.userId} = ${req.user!.id} AND ${notifications.isRead} = ${isRead === "true"}`
      : eq(notifications.userId, req.user!.id);

    const [totalResult] = await db.select({ count: count() }).from(notifications).where(eq(notifications.userId, req.user!.id));
    const data = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user!.id))
      .limit(limitNum).offset(offset).orderBy(notifications.createdAt);

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
