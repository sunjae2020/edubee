import { Router } from "express";
import { db } from "@workspace/db";
import { studyAbroadConsultations } from "@workspace/db/schema";
import { eq, ilike, and, or, desc, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin","admin","finance","admission","team_manager","consultant","camp_coordinator"];
const PAGE_SIZE = 20;

function genRef() {
  return "SAC-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/study-abroad-consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(String(req.query.page || "1")));
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const orgId  = (req as any).tenantId as string | undefined;

    const conditions: any[] = [];
    if (orgId)  conditions.push(eq(studyAbroadConsultations.organisationId, orgId));
    if (status) conditions.push(eq(studyAbroadConsultations.status, status));
    if (search) {
      conditions.push(
        or(
          ilike(studyAbroadConsultations.fullName,  `%${search}%`),
          ilike(studyAbroadConsultations.email,     `%${search}%`),
          ilike(studyAbroadConsultations.phone,     `%${search}%`),
          ilike(studyAbroadConsultations.refNumber, `%${search}%`),
        )
      );
    }

    const where  = conditions.length ? and(...conditions) : undefined;
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, countResult] = await Promise.all([
      db.select({
        id:               studyAbroadConsultations.id,
        refNumber:        studyAbroadConsultations.refNumber,
        status:           studyAbroadConsultations.status,
        assignedTo:       studyAbroadConsultations.assignedTo,
        fullName:         studyAbroadConsultations.fullName,
        email:            studyAbroadConsultations.email,
        phone:            studyAbroadConsultations.phone,
        nationality:      studyAbroadConsultations.nationality,
        studyLevel:       studyAbroadConsultations.studyLevel,
        studyDuration:    studyAbroadConsultations.studyDuration,
        targetStartTerm:  studyAbroadConsultations.targetStartTerm,
        destinationCountries: studyAbroadConsultations.destinationCountries,
        language:         studyAbroadConsultations.language,
        isActive:         studyAbroadConsultations.isActive,
        createdAt:        studyAbroadConsultations.createdAt,
      })
        .from(studyAbroadConsultations)
        .where(where)
        .orderBy(desc(studyAbroadConsultations.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(studyAbroadConsultations).where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return res.json({ data: rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error("[GET /api/study-abroad-consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────────────
router.get("/study-abroad-consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await db.select().from(studyAbroadConsultations).where(eq(studyAbroadConsultations.id, req.params.id));
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[GET /api/study-abroad-consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/study-abroad-consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = (req as any).tenantId as string | undefined;
    const b = req.body;

    const inserted = await db.insert(studyAbroadConsultations).values({
      refNumber:        genRef(),
      status:           b.status           || "new",
      assignedTo:       b.assignedTo       || null,
      adminNotes:       b.adminNotes       || null,
      language:         b.language         || "en",
      fullName:         b.fullName         || null,
      firstName:        b.firstName        || null,
      lastName:         b.lastName         || null,
      dateOfBirth:      b.dateOfBirth      || null,
      gender:           b.gender           || null,
      email:            b.email            || null,
      phone:            b.phone            || null,
      currentCity:      b.currentCity      || null,
      currentCountry:   b.currentCountry   || null,
      nationality:      b.nationality      || null,
      kakaoId:          b.kakaoId          || null,
      messengerId:      b.messengerId      || null,
      destinationCountries: b.destinationCountries ?? [],
      courseTypes:      b.courseTypes      ?? [],
      fieldOfStudy:     b.fieldOfStudy     || null,
      studyLevel:       b.studyLevel       || null,
      studyDuration:    b.studyDuration    || null,
      targetStartTerm:  b.targetStartTerm  || null,
      preferredInstitutions: b.preferredInstitutions || null,
      englishLevel:     b.englishLevel     || null,
      englishTestType:  b.englishTestType  || null,
      englishScore:     b.englishScore     || null,
      currentEducationLevel: b.currentEducationLevel || null,
      currentInstitution:    b.currentInstitution    || null,
      workExperience:   b.workExperience   || null,
      annualBudget:     b.annualBudget     || null,
      fundingSource:    b.fundingSource    || null,
      visaTypeInterest: b.visaTypeInterest || null,
      accommodationPreference: b.accommodationPreference || null,
      airportPickup:    b.airportPickup    ?? false,
      healthSpecialNeeds: b.healthSpecialNeeds || null,
      referralConsultant: b.referralConsultant || null,
      questionsNotes:   b.questionsNotes   || null,
      documentNotes:    b.documentNotes    || null,
      privacyConsent:   b.privacyConsent   ?? false,
      marketingConsent: b.marketingConsent ?? false,
      referralSources:  b.referralSources  ?? [],
      isActive:         true,
      organisationId:   orgId || null,
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("[POST /api/study-abroad-consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.patch("/study-abroad-consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const b = req.body;
    const updated = await db.update(studyAbroadConsultations)
      .set({
        status:           b.status           ?? undefined,
        assignedTo:       b.assignedTo       ?? undefined,
        adminNotes:       b.adminNotes       ?? undefined,
        language:         b.language         ?? undefined,
        fullName:         b.fullName         ?? undefined,
        firstName:        b.firstName        ?? undefined,
        lastName:         b.lastName         ?? undefined,
        dateOfBirth:      b.dateOfBirth      ?? undefined,
        gender:           b.gender           ?? undefined,
        email:            b.email            ?? undefined,
        phone:            b.phone            ?? undefined,
        currentCity:      b.currentCity      ?? undefined,
        currentCountry:   b.currentCountry   ?? undefined,
        nationality:      b.nationality      ?? undefined,
        kakaoId:          b.kakaoId          ?? undefined,
        messengerId:      b.messengerId      ?? undefined,
        destinationCountries: b.destinationCountries ?? undefined,
        courseTypes:      b.courseTypes      ?? undefined,
        fieldOfStudy:     b.fieldOfStudy     ?? undefined,
        studyLevel:       b.studyLevel       ?? undefined,
        studyDuration:    b.studyDuration    ?? undefined,
        targetStartTerm:  b.targetStartTerm  ?? undefined,
        preferredInstitutions: b.preferredInstitutions ?? undefined,
        englishLevel:     b.englishLevel     ?? undefined,
        englishTestType:  b.englishTestType  ?? undefined,
        englishScore:     b.englishScore     ?? undefined,
        currentEducationLevel: b.currentEducationLevel ?? undefined,
        currentInstitution:    b.currentInstitution    ?? undefined,
        workExperience:   b.workExperience   ?? undefined,
        annualBudget:     b.annualBudget     ?? undefined,
        fundingSource:    b.fundingSource    ?? undefined,
        visaTypeInterest: b.visaTypeInterest ?? undefined,
        accommodationPreference: b.accommodationPreference ?? undefined,
        airportPickup:    b.airportPickup    ?? undefined,
        healthSpecialNeeds: b.healthSpecialNeeds ?? undefined,
        referralConsultant: b.referralConsultant ?? undefined,
        questionsNotes:   b.questionsNotes   ?? undefined,
        documentNotes:    b.documentNotes    ?? undefined,
        privacyConsent:   b.privacyConsent   ?? undefined,
        marketingConsent: b.marketingConsent ?? undefined,
        referralSources:  b.referralSources  ?? undefined,
        updatedAt:        new Date(),
      })
      .where(eq(studyAbroadConsultations.id, req.params.id))
      .returning();

    if (!updated.length) return res.status(404).json({ error: "Not found" });
    return res.json(updated[0]);
  } catch (err) {
    console.error("[PATCH /api/study-abroad-consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── SOFT DELETE (bulk) ───────────────────────────────────────────────────────
router.patch("/study-abroad-consultations/bulk/soft-delete", authenticate, requireRole("super_admin","admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.update(studyAbroadConsultations).set({ isActive: false, updatedAt: new Date() }).where(inArray(studyAbroadConsultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (bulk) ───────────────────────────────────────────────────────
router.delete("/study-abroad-consultations/bulk", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.delete(studyAbroadConsultations).where(inArray(studyAbroadConsultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (single) ─────────────────────────────────────────────────────
router.delete("/study-abroad-consultations/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    await db.delete(studyAbroadConsultations).where(eq(studyAbroadConsultations.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
