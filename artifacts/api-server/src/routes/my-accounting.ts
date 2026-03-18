import { Router } from "express";
import { db } from "@workspace/db";
import { settlementMgt, invoices, banking, contracts, exchangeRates } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ── My Settlements ────────────────────────────────────────────────────

router.get("/my-accounting/settlements", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const data = await db.select().from(settlementMgt)
      .where(eq(settlementMgt.providerUserId, uid))
      .orderBy(desc(settlementMgt.createdAt));
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/my-accounting/settlements/summary", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const all = await db.select().from(settlementMgt).where(eq(settlementMgt.providerUserId, uid));
    const totalEarned = all.reduce((sum, s) => sum + Number(s.netAmount ?? 0), 0);
    const pending = all.filter(s => s.status === "pending").reduce((sum, s) => sum + Number(s.netAmount ?? 0), 0);
    const paid = all.filter(s => s.status === "settled").reduce((sum, s) => sum + Number(s.netAmount ?? 0), 0);
    return res.json({ totalEarned, pending, paid });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── My Invoices ────────────────────────────────────────────────────────

router.get("/my-accounting/invoices", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const data = await db.select().from(invoices)
      .where(eq(invoices.recipientId, uid))
      .orderBy(desc(invoices.createdAt));
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── My Revenue ────────────────────────────────────────────────────────

router.get("/my-accounting/revenue", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const all = await db.select().from(settlementMgt).where(eq(settlementMgt.providerUserId, uid));

    // Group by month
    const byMonth: Record<string, number> = {};
    all.forEach(s => {
      const month = new Date(s.createdAt!).toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + Number(s.netAmount ?? 0);
    });

    const totalYtd = all.filter(s => {
      const yr = new Date(s.createdAt!).getFullYear();
      return yr === new Date().getFullYear();
    }).reduce((sum, s) => sum + Number(s.netAmount ?? 0), 0);

    const totalCommission = all.reduce((sum, s) => sum + Number(s.commissionAmount ?? 0), 0);

    return res.json({
      totalYtd, totalCommission, netRevenue: totalYtd - totalCommission,
      byMonth: Object.entries(byMonth).sort().map(([month, amount]) => ({ month, amount })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── My Banking ────────────────────────────────────────────────────────

router.get("/my-accounting/banking", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const data = await db.select().from(banking).where(eq(banking.userId, uid));
    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/my-accounting/banking", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const [rec] = await db.insert(banking).values({ ...req.body, userId: uid }).returning();
    return res.status(201).json(rec);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/my-accounting/banking/:id", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const [rec] = await db.select().from(banking).where(eq(banking.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (rec.userId !== uid) return res.status(403).json({ error: "Forbidden" });
    const [updated] = await db.update(banking).set({ ...req.body, updatedAt: new Date() })
      .where(eq(banking.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
