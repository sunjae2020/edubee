import { Router } from "express";
import { db } from "@workspace/db";
import { programReports, reportSections, contracts, notifications } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ── Reports CRUD ─────────────────────────────────────────────────────

router.get("/reports", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;

    let data = await db.select().from(programReports).orderBy(desc(programReports.createdAt));

    if (role === "camp_coordinator") {
      const ownContracts = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.campProviderId, uid));
      const contractIds = new Set(ownContracts.map(c => c.id));
      data = data.filter(r => r.contractId && contractIds.has(r.contractId));
    } else if (role === "education_agent" || role === "parent_client") {
      data = data.filter(r => r.status === "published");
    }

    return res.json({ data });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/reports", authenticate, async (req, res) => {
  try {
    const [report] = await db.insert(programReports).values({
      ...req.body,
      generatedBy: req.user!.id,
      status: "draft",
    }).returning();
    return res.status(201).json(report);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/reports/:id", authenticate, async (req, res) => {
  try {
    const [report] = await db.select().from(programReports).where(eq(programReports.id, req.params.id)).limit(1);
    if (!report) return res.status(404).json({ error: "Not Found" });
    const sections = await db.select().from(reportSections).where(eq(reportSections.reportId, req.params.id));
    return res.json({ ...report, sections });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/reports/:id", authenticate, async (req, res) => {
  try {
    const [updated] = await db.update(programReports).set({ ...req.body, updatedAt: new Date() })
      .where(eq(programReports.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/reports/:id/publish", authenticate, async (req, res) => {
  try {
    const [updated] = await db.update(programReports)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(programReports.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Report Sections ──────────────────────────────────────────────────

router.post("/reports/:id/sections", authenticate, async (req, res) => {
  try {
    const [section] = await db.insert(reportSections).values({
      ...req.body, reportId: req.params.id,
    }).returning();
    return res.status(201).json(section);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/reports/:reportId/sections/:sId", authenticate, async (req, res) => {
  try {
    const [updated] = await db.update(reportSections).set({ ...req.body, updatedAt: new Date() })
      .where(eq(reportSections.id, req.params.sId)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/reports/:reportId/sections/:sId", authenticate, async (req, res) => {
  try {
    await db.delete(reportSections).where(eq(reportSections.id, req.params.sId));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
