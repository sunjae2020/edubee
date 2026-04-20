import { Router } from "express";
import { db } from "@workspace/db";
import { notifications } from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Unread count — polled every 30s by frontend
router.get("/notifications/unread-count", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const [result] = await db.select({ count: count() }).from(notifications)
      .where(and(eq(notifications.userId, uid), eq(notifications.isRead, false)));
    return res.json({ count: Number(result?.count ?? 0) });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// List notifications (last N)
router.get("/notifications", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const limit = Math.min(50, parseInt((req.query.limit as string) ?? "10"));
    const data = await db.select().from(notifications)
      .where(eq(notifications.userId, uid))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Mark single as read
router.patch("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, req.params.id as string), eq(notifications.userId, uid)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Mark all as read
router.post("/notifications/mark-all-read", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.userId, uid), eq(notifications.isRead, false)));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
