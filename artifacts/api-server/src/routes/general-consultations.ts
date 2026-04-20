import { Router } from "express";
import { db } from "@workspace/db";
import { generalConsultations } from "@workspace/db/schema";
import { eq, ilike, and, or, desc, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin","admin","finance","admission","team_manager","consultant","camp_coordinator"];
const PAGE_SIZE = 20;

function genRef() {
  return "GC-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/general-consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(String(req.query.page as string || "1")));
    const search = String(req.query.search as string || "").trim();
    const status = String(req.query.status as string || "").trim();
    const orgId  = (req as any).tenantId as string | undefined;

    const conditions: any[] = [];
    if (orgId)  conditions.push(eq(generalConsultations.organisationId, orgId));
    if (status) conditions.push(eq(generalConsultations.status, status));
    if (search) {
      conditions.push(
        or(
          ilike(generalConsultations.fullName,  `%${search}%`),
          ilike(generalConsultations.email,     `%${search}%`),
          ilike(generalConsultations.phone,     `%${search}%`),
          ilike(generalConsultations.refNumber, `%${search}%`),
        )
      );
    }

    const where  = conditions.length ? and(...conditions) : undefined;
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, countResult] = await Promise.all([
      db.select({
        id:               generalConsultations.id,
        refNumber:        generalConsultations.refNumber,
        status:           generalConsultations.status,
        assignedTo:       generalConsultations.assignedTo,
        fullName:         generalConsultations.fullName,
        email:            generalConsultations.email,
        phone:            generalConsultations.phone,
        nationality:      generalConsultations.nationality,
        topics:           generalConsultations.topics,
        targetTimeline:   generalConsultations.targetTimeline,
        preferredDestination: generalConsultations.preferredDestination,
        language:         generalConsultations.language,
        isActive:         generalConsultations.isActive,
        createdAt:        generalConsultations.createdAt,
      })
        .from(generalConsultations)
        .where(where)
        .orderBy(desc(generalConsultations.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(generalConsultations).where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return res.json({ data: rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error("[GET /api/general-consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────────────
router.get("/general-consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await db.select().from(generalConsultations).where(eq(generalConsultations.id, req.params.id as string));
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[GET /api/general-consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/general-consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = (req as any).tenantId as string | undefined;
    const b = req.body;

    const inserted = await db.insert(generalConsultations).values({
      refNumber:        genRef(),
      status:           b.status           || "new",
      assignedTo:       b.assignedTo       || null,
      adminNotes:       b.adminNotes       || null,
      language:         b.language         || "en",
      firstName:        b.firstName        || null,
      lastName:         b.lastName         || null,
      fullName:         b.fullName         || null,
      dateOfBirth:      b.dateOfBirth      || null,
      gender:           b.gender           || null,
      email:            b.email            || null,
      phone:            b.phone            || null,
      currentCity:      b.currentCity      || null,
      currentCountry:   b.currentCountry   || null,
      nationality:      b.nationality      || null,
      kakaoId:          b.kakaoId          || null,
      messengerId:      b.messengerId      || null,
      topics:           b.topics           ?? [],
      topicOther:       b.topicOther       || null,
      inquirySummary:   b.inquirySummary   || null,
      targetTimeline:   b.targetTimeline   || null,
      budgetRange:      b.budgetRange      || null,
      preferredDestination: b.preferredDestination || null,
      questionsNotes:   b.questionsNotes   || null,
      referralSources:  b.referralSources  ?? [],
      preferredContactMethod: b.preferredContactMethod || null,
      preferredContactTime:   b.preferredContactTime   || null,
      consultantName:   b.consultantName   || null,
      documentNotes:    b.documentNotes    || null,
      privacyConsent:   b.privacyConsent   ?? false,
      marketingConsent: b.marketingConsent ?? false,
      isActive:         true,
      organisationId:   orgId || null,
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("[POST /api/general-consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.patch("/general-consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const b = req.body;
    const updated = await db.update(generalConsultations)
      .set({
        status:           b.status           ?? undefined,
        assignedTo:       b.assignedTo       ?? undefined,
        adminNotes:       b.adminNotes       ?? undefined,
        language:         b.language         ?? undefined,
        firstName:        b.firstName        ?? undefined,
        lastName:         b.lastName         ?? undefined,
        fullName:         b.fullName         ?? undefined,
        dateOfBirth:      b.dateOfBirth      ?? undefined,
        gender:           b.gender           ?? undefined,
        email:            b.email            ?? undefined,
        phone:            b.phone            ?? undefined,
        currentCity:      b.currentCity      ?? undefined,
        currentCountry:   b.currentCountry   ?? undefined,
        nationality:      b.nationality      ?? undefined,
        kakaoId:          b.kakaoId          ?? undefined,
        messengerId:      b.messengerId      ?? undefined,
        topics:           b.topics           ?? undefined,
        topicOther:       b.topicOther       ?? undefined,
        inquirySummary:   b.inquirySummary   ?? undefined,
        targetTimeline:   b.targetTimeline   ?? undefined,
        budgetRange:      b.budgetRange      ?? undefined,
        preferredDestination: b.preferredDestination ?? undefined,
        questionsNotes:   b.questionsNotes   ?? undefined,
        referralSources:  b.referralSources  ?? undefined,
        preferredContactMethod: b.preferredContactMethod ?? undefined,
        preferredContactTime:   b.preferredContactTime   ?? undefined,
        consultantName:   b.consultantName   ?? undefined,
        documentNotes:    b.documentNotes    ?? undefined,
        privacyConsent:   b.privacyConsent   ?? undefined,
        marketingConsent: b.marketingConsent ?? undefined,
        updatedAt:        new Date(),
      })
      .where(eq(generalConsultations.id, req.params.id as string))
      .returning();

    if (!updated.length) return res.status(404).json({ error: "Not found" });
    return res.json(updated[0]);
  } catch (err) {
    console.error("[PATCH /api/general-consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── SOFT DELETE (bulk) ───────────────────────────────────────────────────────
router.patch("/general-consultations/bulk/soft-delete", authenticate, requireRole("super_admin","admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.update(generalConsultations).set({ isActive: false, updatedAt: new Date() }).where(inArray(generalConsultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (bulk) ───────────────────────────────────────────────────────
router.delete("/general-consultations/bulk", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.delete(generalConsultations).where(inArray(generalConsultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (single) ─────────────────────────────────────────────────────
router.delete("/general-consultations/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    await db.delete(generalConsultations).where(eq(generalConsultations.id, req.params.id as string));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
