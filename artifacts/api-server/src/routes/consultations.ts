import { Router } from "express";
import { db } from "@workspace/db";
import { consultations } from "@workspace/db/schema";
import { eq, ilike, and, or, desc, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin","admin","finance","admission","team_manager","consultant","camp_coordinator"];
const PAGE_SIZE = 20;

function genConsRef() {
  return "CONS-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(String(req.query.page as string  || "1")));
    const search = String(req.query.search as string || "").trim();
    const status = String(req.query.status as string || "").trim();
    const orgId  = (req as any).tenantId as string | undefined;

    const conditions: any[] = [];
    if (orgId) conditions.push(eq(consultations.organisationId, orgId));

    if (search) {
      conditions.push(
        or(
          ilike(consultations.clientName,  `%${search}%`),
          ilike(consultations.clientEmail, `%${search}%`),
          ilike(consultations.clientPhone, `%${search}%`),
          ilike(consultations.subject,     `%${search}%`),
          ilike(consultations.refNumber,   `%${search}%`),
        )
      );
    }
    if (status) conditions.push(eq(consultations.status, status));

    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, countResult] = await Promise.all([
      db.select({
        id:               consultations.id,
        refNumber:        consultations.refNumber,
        clientName:       consultations.clientName,
        clientEmail:      consultations.clientEmail,
        clientPhone:      consultations.clientPhone,
        nationality:      consultations.nationality,
        consultationType: consultations.consultationType,
        consultationDate: consultations.consultationDate,
        subject:          consultations.subject,
        status:           consultations.status,
        assignedStaffId:  consultations.assignedStaffId,
        notes:            consultations.notes,
        outcome:          consultations.outcome,
        followUpDate:     consultations.followUpDate,
        followUpAction:   consultations.followUpAction,
        contactId:        consultations.contactId,
        accountId:        consultations.accountId,
        leadId:           consultations.leadId,
        isActive:         consultations.isActive,
        createdAt:        consultations.createdAt,
        updatedAt:        consultations.updatedAt,
        assignedStaffName: sql<string>`(SELECT full_name FROM users WHERE id = ${consultations.assignedStaffId})`,
      })
        .from(consultations)
        .where(where)
        .orderBy(desc(consultations.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(consultations).where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return res.json({ data: rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error("[GET /api/consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET ONE ──────────────────────────────────────────────────────────────────
router.get("/consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await db.select().from(consultations).where(eq(consultations.id, req.params.id as string));
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[GET /api/consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = (req as any).tenantId as string | undefined;
    const {
      clientName, clientEmail, clientPhone, nationality,
      consultationType, consultationDate, subject, status,
      assignedStaffId, notes, outcome, followUpDate, followUpAction,
      contactId, accountId, leadId,
    } = req.body;

    const inserted = await db.insert(consultations).values({
      refNumber:        genConsRef(),
      clientName:       clientName || null,
      clientEmail:      clientEmail || null,
      clientPhone:      clientPhone || null,
      nationality:      nationality || null,
      consultationType: consultationType || "phone",
      consultationDate: consultationDate ? new Date(consultationDate) : null,
      subject:          subject || null,
      status:           status || "scheduled",
      assignedStaffId:  assignedStaffId || null,
      notes:            notes || null,
      outcome:          outcome || null,
      followUpDate:     followUpDate || null,
      followUpAction:   followUpAction || null,
      contactId:        contactId || null,
      accountId:        accountId || null,
      leadId:           leadId || null,
      isActive:         true,
      organisationId:   orgId || null,
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("[POST /api/consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.patch("/consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const {
      clientName, clientEmail, clientPhone, nationality,
      consultationType, consultationDate, subject, status,
      assignedStaffId, notes, outcome, followUpDate, followUpAction,
      contactId, accountId, leadId,
    } = req.body;

    const updated = await db.update(consultations)
      .set({
        clientName:       clientName       ?? undefined,
        clientEmail:      clientEmail      ?? undefined,
        clientPhone:      clientPhone      ?? undefined,
        nationality:      nationality      ?? undefined,
        consultationType: consultationType ?? undefined,
        consultationDate: consultationDate ? new Date(consultationDate) : undefined,
        subject:          subject          ?? undefined,
        status:           status           ?? undefined,
        assignedStaffId:  assignedStaffId  ?? undefined,
        notes:            notes            ?? undefined,
        outcome:          outcome          ?? undefined,
        followUpDate:     followUpDate     ?? undefined,
        followUpAction:   followUpAction   ?? undefined,
        contactId:        contactId        ?? undefined,
        accountId:        accountId        ?? undefined,
        leadId:           leadId           ?? undefined,
        updatedAt:        new Date(),
      })
      .where(eq(consultations.id, req.params.id as string))
      .returning();

    if (!updated.length) return res.status(404).json({ error: "Not found" });
    return res.json(updated[0]);
  } catch (err) {
    console.error("[PATCH /api/consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── SOFT DELETE (bulk) ───────────────────────────────────────────────────────
router.patch("/consultations/bulk/soft-delete", authenticate, requireRole("super_admin","admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.update(consultations).set({ isActive: false, updatedAt: new Date() }).where(inArray(consultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/consultations/bulk/soft-delete]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (bulk) ───────────────────────────────────────────────────────
router.delete("/consultations/bulk", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.delete(consultations).where(inArray(consultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/consultations/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (single) ─────────────────────────────────────────────────────
router.delete("/consultations/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    await db.delete(consultations).where(eq(consultations.id, req.params.id as string));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
