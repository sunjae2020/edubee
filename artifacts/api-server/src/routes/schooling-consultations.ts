import { Router } from "express";
import { db } from "@workspace/db";
import { schoolingConsultations, schoolingConsultationStudents } from "@workspace/db/schema";
import { eq, ilike, and, or, desc, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin","admin","finance","admission","team_manager","consultant","camp_coordinator"];
const PAGE_SIZE = 20;

function genRef() {
  return "SC-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/schooling-consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(String(req.query.page || "1")));
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const orgId  = (req as any).tenantId as string | undefined;

    const conditions: any[] = [];
    if (orgId) conditions.push(eq(schoolingConsultations.organisationId, orgId));
    if (status) conditions.push(eq(schoolingConsultations.status, status));
    if (search) {
      conditions.push(
        or(
          ilike(schoolingConsultations.guardianName, `%${search}%`),
          ilike(schoolingConsultations.email,        `%${search}%`),
          ilike(schoolingConsultations.phone,        `%${search}%`),
          ilike(schoolingConsultations.refNumber,    `%${search}%`),
        )
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, countResult] = await Promise.all([
      db.select({
        id:           schoolingConsultations.id,
        refNumber:    schoolingConsultations.refNumber,
        status:       schoolingConsultations.status,
        assignedTo:   schoolingConsultations.assignedTo,
        guardianName: schoolingConsultations.guardianName,
        relationship: schoolingConsultations.relationship,
        phone:        schoolingConsultations.phone,
        email:        schoolingConsultations.email,
        studyDuration: schoolingConsultations.studyDuration,
        targetTerm:   schoolingConsultations.targetTerm,
        consultMethod: schoolingConsultations.consultMethod,
        language:     schoolingConsultations.language,
        isActive:     schoolingConsultations.isActive,
        createdAt:    schoolingConsultations.createdAt,
        studentCount: sql<number>`(SELECT count(*) FROM schooling_consultation_students WHERE consultation_id = ${schoolingConsultations.id})`,
      })
        .from(schoolingConsultations)
        .where(where)
        .orderBy(desc(schoolingConsultations.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(schoolingConsultations).where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return res.json({ data: rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error("[GET /api/schooling-consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET ONE (with students) ───────────────────────────────────────────────────
router.get("/schooling-consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await db.select().from(schoolingConsultations).where(eq(schoolingConsultations.id, req.params.id));
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const students = await db.select().from(schoolingConsultationStudents)
      .where(eq(schoolingConsultationStudents.consultationId, req.params.id))
      .orderBy(schoolingConsultationStudents.createdAt);
    return res.json({ ...rows[0], students });
  } catch (err) {
    console.error("[GET /api/schooling-consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/schooling-consultations", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const orgId = (req as any).tenantId as string | undefined;
    const { students, ...body } = req.body;

    const inserted = await db.insert(schoolingConsultations).values({
      refNumber:        genRef(),
      status:           body.status           || "new",
      assignedTo:       body.assignedTo        || null,
      adminNotes:       body.adminNotes        || null,
      language:         body.language          || "en",
      guardianName:     body.guardianName      || null,
      relationship:     body.relationship      || null,
      phone:            body.phone             || null,
      email:            body.email             || null,
      kakaoId:          body.kakaoId           || null,
      messengerId:      body.messengerId       || null,
      accompaniment:    body.accompaniment     || null,
      referralSources:  body.referralSources   ?? [],
      preferredStates:  body.preferredStates   ?? [],
      urbanPreference:  body.urbanPreference   ?? null,
      schoolTypes:      body.schoolTypes       ?? [],
      schoolPriorities: body.schoolPriorities  ?? [],
      preferredSchools: body.preferredSchools  || null,
      studyDuration:    body.studyDuration     || null,
      targetTerm:       body.targetTerm        || null,
      accommodation:    body.accommodation     ?? [],
      annualBudget:     body.annualBudget      || null,
      concerns:         body.concerns          ?? [],
      specialNote:      body.specialNote       || null,
      consultMethod:    body.consultMethod     || null,
      consultTimes:     body.consultTimes      ?? [],
      privacyConsent:   body.privacyConsent    ?? false,
      isActive:         true,
      organisationId:   orgId || null,
    }).returning();

    const consultation = inserted[0];

    if (Array.isArray(students) && students.length > 0) {
      await db.insert(schoolingConsultationStudents).values(
        students.map((s: any) => ({
          consultationId:    consultation.id,
          name:              s.name              || null,
          gender:            s.gender            || null,
          dateOfBirth:       s.dateOfBirth       || null,
          currentGrade:      s.currentGrade      || null,
          currentSchool:     s.currentSchool     || null,
          currentCity:       s.currentCity       || null,
          englishLevel:      s.englishLevel      || null,
          englishScore:      s.englishScore      || null,
          targetAuGrade:     s.targetAuGrade     || null,
          specialNotes:      s.specialNotes      || null,
          learningStyle:     s.learningStyle     ?? null,
          sociability:       s.sociability       ?? null,
          independence:      s.independence      ?? null,
          emotionalStability:s.emotionalStability ?? null,
          interests:         s.interests         ?? [],
          prevExperience:    s.prevExperience    ?? [],
          postGradPlans:     s.postGradPlans     ?? [],
          prInterest:        s.prInterest        ?? null,
          careerFields:      s.careerFields      ?? [],
          targetUniversity:  s.targetUniversity  || null,
        }))
      );
    }

    const studentRows = await db.select().from(schoolingConsultationStudents).where(eq(schoolingConsultationStudents.consultationId, consultation.id));
    return res.status(201).json({ ...consultation, students: studentRows });
  } catch (err) {
    console.error("[POST /api/schooling-consultations]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.patch("/schooling-consultations/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { students, ...body } = req.body;

    const updated = await db.update(schoolingConsultations)
      .set({
        status:           body.status           ?? undefined,
        assignedTo:       body.assignedTo        ?? undefined,
        adminNotes:       body.adminNotes        ?? undefined,
        language:         body.language          ?? undefined,
        guardianName:     body.guardianName      ?? undefined,
        relationship:     body.relationship      ?? undefined,
        phone:            body.phone             ?? undefined,
        email:            body.email             ?? undefined,
        kakaoId:          body.kakaoId           ?? undefined,
        messengerId:      body.messengerId       ?? undefined,
        accompaniment:    body.accompaniment     ?? undefined,
        referralSources:  body.referralSources   ?? undefined,
        preferredStates:  body.preferredStates   ?? undefined,
        urbanPreference:  body.urbanPreference   ?? undefined,
        schoolTypes:      body.schoolTypes       ?? undefined,
        schoolPriorities: body.schoolPriorities  ?? undefined,
        preferredSchools: body.preferredSchools  ?? undefined,
        studyDuration:    body.studyDuration     ?? undefined,
        targetTerm:       body.targetTerm        ?? undefined,
        accommodation:    body.accommodation     ?? undefined,
        annualBudget:     body.annualBudget      ?? undefined,
        concerns:         body.concerns          ?? undefined,
        specialNote:      body.specialNote       ?? undefined,
        consultMethod:    body.consultMethod     ?? undefined,
        consultTimes:     body.consultTimes      ?? undefined,
        privacyConsent:   body.privacyConsent    ?? undefined,
        updatedAt:        new Date(),
      })
      .where(eq(schoolingConsultations.id, req.params.id))
      .returning();

    if (!updated.length) return res.status(404).json({ error: "Not found" });

    if (Array.isArray(students)) {
      await db.delete(schoolingConsultationStudents).where(eq(schoolingConsultationStudents.consultationId, req.params.id));
      if (students.length > 0) {
        await db.insert(schoolingConsultationStudents).values(
          students.map((s: any) => ({
            consultationId:    req.params.id,
            name:              s.name              || null,
            gender:            s.gender            || null,
            dateOfBirth:       s.dateOfBirth       || null,
            currentGrade:      s.currentGrade      || null,
            currentSchool:     s.currentSchool     || null,
            currentCity:       s.currentCity       || null,
            englishLevel:      s.englishLevel      || null,
            englishScore:      s.englishScore      || null,
            targetAuGrade:     s.targetAuGrade     || null,
            specialNotes:      s.specialNotes      || null,
            learningStyle:     s.learningStyle     ?? null,
            sociability:       s.sociability       ?? null,
            independence:      s.independence      ?? null,
            emotionalStability:s.emotionalStability ?? null,
            interests:         s.interests         ?? [],
            prevExperience:    s.prevExperience    ?? [],
            postGradPlans:     s.postGradPlans     ?? [],
            prInterest:        s.prInterest        ?? null,
            careerFields:      s.careerFields      ?? [],
            targetUniversity:  s.targetUniversity  || null,
          }))
        );
      }
    }

    const studentRows = await db.select().from(schoolingConsultationStudents).where(eq(schoolingConsultationStudents.consultationId, req.params.id));
    return res.json({ ...updated[0], students: studentRows });
  } catch (err) {
    console.error("[PATCH /api/schooling-consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── SOFT DELETE (bulk) ───────────────────────────────────────────────────────
router.patch("/schooling-consultations/bulk/soft-delete", authenticate, requireRole("super_admin","admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.update(schoolingConsultations).set({ isActive: false, updatedAt: new Date() }).where(inArray(schoolingConsultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/schooling-consultations/bulk/soft-delete]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (bulk) ───────────────────────────────────────────────────────
router.delete("/schooling-consultations/bulk", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: "No ids provided" });
    await db.delete(schoolingConsultations).where(inArray(schoolingConsultations.id, ids));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/schooling-consultations/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── HARD DELETE (single) ─────────────────────────────────────────────────────
router.delete("/schooling-consultations/:id", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    await db.delete(schoolingConsultations).where(eq(schoolingConsultations.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/schooling-consultations/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
