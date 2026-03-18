import { Router } from "express";
import { db } from "@workspace/db";
import { leads, applications, applicationParticipants } from "@workspace/db/schema";
import { eq, and, ilike, or, count, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

function generateApplicationNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `APP-${year}${month}-${random}`;
}

// Leads
router.get("/leads", authenticate, async (req, res) => {
  try {
    const { agentId, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (agentId) conditions.push(eq(leads.agentId, agentId));
    if (status) conditions.push(eq(leads.status, status));
    if (search) conditions.push(or(ilike(leads.fullName, `%${search}%`), ilike(leads.email, `%${search}%`))!);
    if (req.user!.role === "education_agent") conditions.push(eq(leads.agentId, req.user!.id));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(leads).where(whereClause);
    const data = await db.select().from(leads).where(whereClause).limit(limitNum).offset(offset).orderBy(leads.createdAt);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/leads", authenticate, async (req, res) => {
  try {
    const body = req.body;
    if (req.user!.role === "education_agent") body.agentId = req.user!.id;
    const [lead] = await db.insert(leads).values(body).returning();
    return res.status(201).json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/leads/:id", authenticate, async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/leads/:id", authenticate, async (req, res) => {
  try {
    const [lead] = await db.update(leads).set({ ...req.body, updatedAt: new Date() })
      .where(eq(leads.id, req.params.id)).returning();
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/leads/:id", authenticate, async (req, res) => {
  try {
    await db.delete(leads).where(eq(leads.id, req.params.id));
    return res.json({ success: true, message: "Lead deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Applications
router.get("/applications", authenticate, async (req, res) => {
  try {
    const { agentId, status, packageGroupId, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (agentId) conditions.push(eq(applications.agentId, agentId));
    if (status) conditions.push(eq(applications.status, status));
    if (packageGroupId) conditions.push(eq(applications.packageGroupId, packageGroupId));
    if (search) conditions.push(ilike(applications.applicationNumber, `%${search}%`));
    if (req.user!.role === "education_agent") conditions.push(eq(applications.agentId, req.user!.id));
    if (req.user!.role === "parent_client") conditions.push(eq(applications.clientId, req.user!.id));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(applications).where(whereClause);
    const data = await db.select().from(applications).where(whereClause).limit(limitNum).offset(offset).orderBy(applications.createdAt);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/applications", authenticate, async (req, res) => {
  try {
    const body = req.body;
    if (req.user!.role === "education_agent") body.agentId = req.user!.id;
    body.applicationNumber = generateApplicationNumber();
    const [application] = await db.insert(applications).values(body).returning();
    return res.status(201).json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/applications/:id", authenticate, async (req, res) => {
  try {
    const [application] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!application) return res.status(404).json({ error: "Not Found" });
    
    const participants = await db.select().from(applicationParticipants)
      .where(eq(applicationParticipants.applicationId, req.params.id));
    
    return res.json({ ...application, participants });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/applications/:id", authenticate, async (req, res) => {
  try {
    const [application] = await db.update(applications).set({ ...req.body, updatedAt: new Date() })
      .where(eq(applications.id, req.params.id)).returning();
    if (!application) return res.status(404).json({ error: "Not Found" });
    return res.json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/applications/:id/status", authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updates: Record<string, any> = { status, updatedAt: new Date() };
    if (notes) updates.notes = notes;
    const [application] = await db.update(applications).set(updates)
      .where(eq(applications.id, req.params.id)).returning();
    if (!application) return res.status(404).json({ error: "Not Found" });
    return res.json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
