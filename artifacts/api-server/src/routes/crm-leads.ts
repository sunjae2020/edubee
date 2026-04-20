import { Router } from "express";
import { db } from "@workspace/db";
import { leads, lead_activities, quotes, campApplications, accounts } from "@workspace/db/schema";
import { eq, ilike, and, or, count, SQL, desc, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin","admin","finance","admission","team_manager","consultant","camp_coordinator"];
const PAGE_SIZE = 20;

const KANBAN_STATUSES = ["new", "open", "in_progress", "qualified", "unqualified"];

function genLeadRef() {
  return "LD-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}
function genQuoteRef() {
  return "QTE-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

// ── Staff list (for selectors) ──────────────────────────────────────────────
router.get("/crm/staff", authenticate, requireRole(...ADMIN_ROLES), async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, full_name AS name FROM users
      WHERE role IN ('admin','super_admin','camp_coordinator','agent')
      AND full_name IS NOT NULL
      ORDER BY full_name
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error("[GET /api/crm/staff]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Camp Coordinator organisations (for package group selector) ──────────────
// Returns all registered organisations (tenants) that can act as camp coordinators.
// The coordinator_id in package_groups references organisations.id (not users.id).
router.get("/crm/coordinators", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        id,
        name,
        subdomain,
        email,
        website_url AS "websiteUrl",
        status
      FROM organisations
      WHERE status != 'Inactive'
      ORDER BY name
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error("[GET /api/crm/coordinators]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/crm/leads", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { leadStatus, assignedStaffId, search, page = "1", limit = String(PAGE_SIZE) } =
      req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (req.tenant) conditions.push(eq(leads.organisationId, req.tenant.id));
    if (leadStatus)      conditions.push(eq(leads.status, leadStatus));
    if (assignedStaffId) conditions.push(eq(leads.assignedStaffId, assignedStaffId));
    if (search) {
      conditions.push(
        or(
          ilike(leads.fullName,       `%${search}%`),
          ilike(leads.email,          `%${search}%`),
          ilike(leads.leadRefNumber,  `%${search}%`),
          ilike(leads.firstName,      `%${search}%`),
          ilike(leads.lastName,       `%${search}%`),
          ilike(leads.originalName,   `%${search}%`),
        )!
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(leads).where(where);
    const data = await db.select({
      id: leads.id, leadRefNumber: leads.leadRefNumber,
      fullName: leads.fullName, firstName: leads.firstName, lastName: leads.lastName,
      englishName: leads.englishName, originalName: leads.originalName,
      email: leads.email, phone: leads.phone, nationality: leads.nationality,
      source: leads.source, status: leads.status, inquiryType: leads.inquiryType,
      budget: leads.budget, expectedStartDate: leads.expectedStartDate,
      assignedStaffId: leads.assignedStaffId, notes: leads.notes,
      contactId: leads.contactId, accountId: leads.accountId,
      createdAt: leads.createdAt, updatedAt: leads.updatedAt,
      assignedStaffName: sql<string | null>`(SELECT u.full_name FROM users u WHERE u.id = ${leads.assignedStaffId})`,
    }).from(leads).where(where)
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
    const rows = await db
      .select({
        lead: leads,
        accountName: accounts.name,
        accountType: accounts.accountType,
      })
      .from(leads)
      .leftJoin(accounts, eq(leads.accountId, accounts.id))
      .where(eq(leads.id, req.params.id as string))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: "Lead not found" });
    const { lead, accountName, accountType } = rows[0];

    const activities = await db.select().from(lead_activities)
      .where(eq(lead_activities.leadId, req.params.id as string))
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
        .where(eq(campApplications.leadId, req.params.id as string))
        .limit(1);
      campApplication = ca ?? null;
    }

    let assignedStaffName: string | null = null;
    if (lead.assignedStaffId) {
      const staffResult = await db.execute(sql`
        SELECT full_name FROM users WHERE id = ${lead.assignedStaffId}
      `);
      assignedStaffName = (staffResult.rows?.[0] as any)?.full_name ?? null;
    }

    // Fetch all quotes linked to this lead
    const linkedQuotes = await db.select({
      id:             quotes.id,
      quoteRefNumber: quotes.quoteRefNumber,
      quoteStatus:    quotes.quoteStatus,
      createdOn:      quotes.createdOn,
    }).from(quotes).where(eq(quotes.leadId, req.params.id as string))
      .orderBy(desc(quotes.createdOn));

    return res.json({
      ...lead,
      accountName: accountName ?? null,
      accountType: accountType ?? null,
      assignedStaffName,
      activities,
      campApplication,
      quotes: linkedQuotes,
    });
  } catch (err) {
    console.error("[GET /api/crm/leads/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/leads", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { firstName, lastName, englishName, originalName,
            email, phone, nationality, source, interestedIn, notes,
            assignedStaffId, inquiryType, budget, expectedStartDate, contactId,
            accountId, status } = req.body;
    let { fullName } = req.body;

    if (!fullName && !firstName) return res.status(400).json({ error: "firstName or fullName is required" });

    if (!fullName) {
      const ln = lastName?.trim().toUpperCase() || "";
      const fn = firstName?.trim() || "";
      fullName = [fn, ln].filter(Boolean).join(" ");
    }

    const leadRefNumber = genLeadRef();

    const [created] = await db.insert(leads).values({
      leadRefNumber, fullName,
      firstName:    firstName?.trim()  || null,
      lastName:     lastName?.trim()   || null,
      englishName:  englishName        || null,
      originalName: originalName       || null,
      email:        email              || null,
      phone:        phone              || null,
      nationality:  nationality        || null,
      source, interestedIn, notes,
      assignedStaffId:   assignedStaffId   || null,
      inquiryType:       inquiryType       || null,
      budget:            budget            || null,
      expectedStartDate: expectedStartDate || null,
      contactId:         contactId         || null,
      accountId:         accountId         || null,
      status:         status ?? "new",
      organisationId: req.tenant?.id ?? null,
    }).returning();

    return res.status(201).json(created);
  } catch (err) {
    console.error("[POST /api/crm/leads]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/crm/leads/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select().from(leads).where(eq(leads.id, req.params.id as string));
    if (!existing) return res.status(404).json({ error: "Lead not found" });

    const { firstName, lastName, englishName, originalName,
            email, phone, nationality, source, interestedIn, notes,
            assignedStaffId, inquiryType, budget, expectedStartDate, contactId,
            accountId, status } = req.body;
    let { fullName } = req.body;

    if (!fullName && firstName) {
      const ln = lastName?.trim().toUpperCase() || "";
      const fn = firstName?.trim() || "";
      fullName = [fn, ln].filter(Boolean).join(" ");
    }

    const [updated] = await db.update(leads)
      .set({
        fullName: fullName || existing.fullName,
        firstName:    firstName    !== undefined ? (firstName?.trim()  || null) : existing.firstName,
        lastName:     lastName     !== undefined ? (lastName?.trim()   || null) : existing.lastName,
        englishName:  englishName  !== undefined ? (englishName        || null) : existing.englishName,
        originalName: originalName !== undefined ? (originalName       || null) : existing.originalName,
        email:        email        !== undefined ? (email              || null) : existing.email,
        phone:        phone        !== undefined ? (phone              || null) : existing.phone,
        nationality:  nationality  !== undefined ? (nationality        || null) : existing.nationality,
        source, interestedIn, notes,
        assignedStaffId:   assignedStaffId   !== undefined ? (assignedStaffId   || null) : existing.assignedStaffId,
        inquiryType:       inquiryType       !== undefined ? (inquiryType       || null) : existing.inquiryType,
        budget:            budget            !== undefined ? (budget            || null) : existing.budget,
        expectedStartDate: expectedStartDate !== undefined ? (expectedStartDate || null) : existing.expectedStartDate,
        contactId:         contactId         !== undefined ? (contactId         || null) : existing.contactId,
        accountId:         accountId         !== undefined ? (accountId         || null) : existing.accountId,
        status,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, req.params.id as string))
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
      .where(eq(leads.id, req.params.id as string))
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
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id as string));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const { channel, scheduledAt, description } = req.body;
    if (!channel || !description) return res.status(400).json({ error: "channel and description are required" });

    const user = (req as any).user;
    const [activity] = await db.insert(lead_activities).values({
      leadId:      req.params.id as string,
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
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id as string));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const user = (req as any).user;
    const quoteRefNumber = genQuoteRef();

    // Build client name from lead: "FirstName LASTNAME"
    const fn = (lead.firstName ?? "").trim();
    const ln = (lead.lastName  ?? "").trim().toUpperCase();
    const customerName = fn && ln ? `${fn} ${ln}` : (fn || ln || lead.fullName || null);

    // Lookup account name if accountId is set
    let accountName: string | null = null;
    if (lead.accountId) {
      const [acct] = await db.select({ name: accounts.name })
        .from(accounts).where(eq(accounts.id, lead.accountId));
      accountName = acct?.name ?? null;
    }

    // Expiry date = today + 7 days
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    const expiryDate = expiry.toISOString().slice(0, 10); // YYYY-MM-DD

    const [newQuote] = await db.insert(quotes).values({
      quoteRefNumber,
      leadId:           lead.id,
      contactId:        lead.contactId      || null,
      customerName:     customerName        || null,
      studentAccountId: lead.accountId      || null,
      accountName:      accountName         || null,
      expiryDate:       expiryDate,
      quoteStatus:      "Draft",
      createdBy:        user?.id            ?? null,
      ownerId:          lead.assignedStaffId || null,
    }).returning();

    return res.status(201).json({ quoteId: newQuote.id, quoteRefNumber: newQuote.quoteRefNumber,
                                  redirectTo: `/admin/crm/quotes/${newQuote.id}` });
  } catch (err) {
    console.error("[POST /api/crm/leads/:id/convert-to-quote]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/crm/leads/:id/toggle-active", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db
      .select({ id: leads.id, isActive: leads.isActive })
      .from(leads)
      .where(eq(leads.id, req.params.id as string));
    if (!existing) return res.status(404).json({ error: "Lead not found" });
    const [updated] = await db
      .update(leads)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(leads.id, req.params.id as string))
      .returning();
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/crm/leads/:id/toggle-active]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/crm/leads/bulk  (super_admin 임시/영구 삭제) ────────────────
router.delete("/crm/leads/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(leads).set({ status: "Deleted", updatedAt: new Date() }).where(inArray(leads.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(leads).where(inArray(leads.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/crm/leads/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
