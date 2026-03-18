import { Router } from "express";
import { db } from "@workspace/db";
import { contracts, applications } from "@workspace/db/schema";
import { eq, and, ilike, count, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

function generateContractNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CON-${year}${month}-${random}`;
}

router.get("/contracts", authenticate, async (req, res) => {
  try {
    const { status, campProviderId, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(contracts.status, status));
    if (campProviderId) conditions.push(eq(contracts.campProviderId, campProviderId));
    if (search) conditions.push(ilike(contracts.contractNumber, `%${search}%`));
    if (req.user!.role === "camp_coordinator") conditions.push(eq(contracts.campProviderId, req.user!.id));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(contracts).where(whereClause);
    const data = await db.select().from(contracts).where(whereClause).limit(limitNum).offset(offset).orderBy(contracts.createdAt);

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/contracts", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const body = req.body;
    body.contractNumber = generateContractNumber();
    const [contract] = await db.insert(contracts).values(body).returning();
    return res.status(201).json(contract);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/contracts/:id", authenticate, async (req, res) => {
  try {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, req.params.id)).limit(1);
    if (!contract) return res.status(404).json({ error: "Not Found" });

    let application = null;
    if (contract.applicationId) {
      const [app] = await db.select().from(applications).where(eq(applications.id, contract.applicationId)).limit(1);
      application = app || null;
    }

    return res.json({ ...contract, application });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/contracts/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [contract] = await db.update(contracts).set({ ...req.body, updatedAt: new Date() })
      .where(eq(contracts.id, req.params.id)).returning();
    if (!contract) return res.status(404).json({ error: "Not Found" });
    return res.json(contract);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
