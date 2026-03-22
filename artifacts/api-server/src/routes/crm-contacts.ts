import { Router } from "express";
import { db } from "@workspace/db";
import { contacts } from "@workspace/db/schema";
import { eq, ilike, and, or, count, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

router.get("/api/crm/contacts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { status, accountType, nationality, search, page = "1", limit = "20" } =
      req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (status)      conditions.push(eq(contacts.status, status));
    if (accountType) conditions.push(eq(contacts.accountType, accountType));
    if (nationality) conditions.push(eq(contacts.nationality, nationality));
    if (search) {
      conditions.push(
        or(
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName,  `%${search}%`),
          ilike(contacts.email,     `%${search}%`),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(contacts).where(whereClause);
    const data = await db.select().from(contacts).where(whereClause).limit(limitNum).offset(offset)
      .orderBy(contacts.createdOn);

    return res.json({
      data,
      meta: { total: Number(totalResult.count), page: pageNum, limit: limitNum,
              totalPages: Math.ceil(Number(totalResult.count) / limitNum) },
    });
  } catch (err) {
    console.error("[GET /api/crm/contacts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/crm/contacts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Contact not found" });
    return res.json(row);
  } catch (err) {
    console.error("[GET /api/crm/contacts/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/crm/contacts", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { firstName, lastName, title, dob, gender, nationality, email, mobile,
            officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
            description, status, accountType } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "firstName and lastName are required" });
    }

    const [created] = await db.insert(contacts).values({
      firstName, lastName, title, dob, gender, nationality, email, mobile,
      officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
      description,
      status:      status      ?? "Active",
      accountType: accountType ?? "Student",
    }).returning();

    return res.status(201).json(created);
  } catch (err) {
    console.error("[POST /api/crm/contacts]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/crm/contacts/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Contact not found" });

    const { firstName, lastName, title, dob, gender, nationality, email, mobile,
            officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
            description, status, accountType } = req.body;

    const [updated] = await db.update(contacts)
      .set({ firstName, lastName, title, dob, gender, nationality, email, mobile,
             officeNumber, snsType, snsId, influxChannel, importantDate1, importantDate2,
             description, status, accountType, modifiedOn: new Date() })
      .where(eq(contacts.id, req.params.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("[PUT /api/crm/contacts/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/crm/contacts/:id/status", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });

    const [updated] = await db.update(contacts)
      .set({ status, modifiedOn: new Date() })
      .where(eq(contacts.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Contact not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/crm/contacts/:id/status]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
