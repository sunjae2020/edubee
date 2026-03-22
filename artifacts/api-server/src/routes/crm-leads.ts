import { Router } from "express";
import { db } from "@workspace/db";
import { leads, lead_activities, quotes, campApplications } from "@workspace/db/schema";
import { eq, ilike, and, or, count, SQL, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];
const PAGE_SIZE = 20;

const KANBAN_STATUSES = ["new", "open", "in_progress", "qualified", "unqualified"];

function genLeadRef() {
  return "LD-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}
function genQuoteRef() {
  return "QTE-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

router.get("/crm/leads", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { leadStatus, assignedStaffId, search, page = "1", limit = String(PAGE_SIZE) } =
      req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (leadStatus)      conditions.push(eq(leads.status, leadStatus));
    if (assignedStaffId) conditions.push(eq(leads.assignedStaffId, assignedStaffId));
    if (search) {
      conditions.push(
        or(
          ilike(leads.fullName,      `%${search}%`),
          ilike(leads.email,         `%${search}%`),
          ilike(leads.leadRefNumber, `%${search}%`),
        )!
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(leads).where(where);
    const data = await db.select().from(leads).where(where)
      .orderBy(desc(leads.createdAt)).limit(limitNum).offset(offset);

    return res.json({
      data,
      meta: { total: Number(totalResult.count), page: pageNum, limit: limitNum,
              totalPages: Math.ceil(Number(totalResult.count) / limitNum) },
    });
  } catch (err) {
    console.error("[GET /api/crm/leads]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/crm/leads/kanban", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const counts = await db.select({ status: leads.status, count: count() })
      .from(leads).groupBy(leads.status);

    const countMap: Record<string, number> = {};
    for (const row of counts) countMap[row.status ?? "new"] = Number(row.count);

    const columns = await Promise.all(
      KANBAN_STATUSES.map(async (s) => {
        const cards = await db.select().from(leads)
          .where(eq(leads.status, s)).orderBy(desc(leads.createdAt)).limit(50);
        return { status: s, count: countMap[s] ?? 0, cards };
      })
    );

    return res.json({ columns });
  } catch (err) {
    console.error("[GET /api/crm/leads/kanban]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/crm/leads/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const activities = await db.select().from(lead_activities)
      .where(eq(lead_activities.leadId, req.params.id))
      .orderBy(desc(lead_activities.createdOn));

    let campApplication: object | null = null;
    if (lead.source === "Camp Application") {
      const [ca] = await db.select({
        id:                campApplications.id,
        applicationRef:    campApplications.applicationRef,
        packageGroupId:    campApplications.packageGroupId,
        preferredStartDate: campApplications.preferredStartDate,
        applicationStatus: campApplications.applicationStatus,
      }).from(campApplications)
        .where(eq(campApplications.leadId, req.params.id))
        .limit(1);
      campApplication = ca ?? null;
    }

    return res.json({ ...lead, activities, campApplication });
  } catch (err) {
    console.error("[GET /api/crm/leads/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/leads", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { fullName, email, phone, nationality, source, interestedIn, notes,
            assignedStaffId, inquiryType, budget, expectedStartDate, contactId,
            status } = req.body;

    if (!fullName) return res.status(400).json({ error: "fullName is required" });

    const leadRefNumber = genLeadRef();

    const [created] = await db.insert(leads).values({
      leadRefNumber, fullName, email, phone, nationality, source, interestedIn, notes,
      assignedStaffId, inquiryType, budget, expectedStartDate, contactId,
      status: status ?? "new",
    }).returning();

    return res.status(201).json(created);
  } catch (err) {
    console.error("[POST /api/crm/leads]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/crm/leads/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Lead not found" });

    const { fullName, email, phone, nationality, source, interestedIn, notes,
            assignedStaffId, inquiryType, budget, expectedStartDate, contactId, status } = req.body;

    const [updated] = await db.update(leads)
      .set({ fullName, email, phone, nationality, source, interestedIn, notes,
             assignedStaffId, inquiryType, budget, expectedStartDate, contactId, status,
             updatedAt: new Date() })
      .where(eq(leads.id, req.params.id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("[PUT /api/crm/leads/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/crm/leads/:id/status", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });

    const [updated] = await db.update(leads)
      .set({ status, updatedAt: new Date() })
      .where(eq(leads.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Lead not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/crm/leads/:id/status]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/leads/:id/activities", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const { channel, scheduledAt, description } = req.body;
    if (!channel || !description) return res.status(400).json({ error: "channel and description are required" });

    const user = (req as any).user;
    const [activity] = await db.insert(lead_activities).values({
      leadId:      req.params.id,
      channel,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      description,
      createdBy:   user?.id ?? null,
    }).returning();

    return res.status(201).json(activity);
  } catch (err) {
    console.error("[POST /api/crm/leads/:id/activities]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/leads/:id/convert-to-quote", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const user = (req as any).user;
    const quoteRefNumber = genQuoteRef();

    const [newQuote] = await db.insert(quotes).values({
      quoteRefNumber,
      leadId:      lead.id,
      contactId:   lead.contactId ?? null,
      quoteStatus: "Draft",
      createdBy:   user?.id ?? null,
    }).returning();

    return res.status(201).json({ quoteId: newQuote.id, quoteRefNumber: newQuote.quoteRefNumber,
                                  redirectTo: `/admin/crm/quotes/${newQuote.id}` });
  } catch (err) {
    console.error("[POST /api/crm/leads/:id/convert-to-quote]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
