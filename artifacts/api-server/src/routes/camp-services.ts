import { Router } from "express";
import { db } from "@workspace/db";
import { studyAbroadMgt, campTourMgt, campApplications } from "@workspace/db/schema";
import { contracts, accounts } from "@workspace/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

// ─── INSTITUTE (Phase 2: now backed by study_abroad_mgt with program_context='camp') ───

router.get("/camp-services/institutes", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { contractId } = req.query as Record<string, string>;
    const conditions = [eq(studyAbroadMgt.programContext, "camp")];
    if (contractId) conditions.push(eq(studyAbroadMgt.contractId, contractId));
    const rows = await db.select().from(studyAbroadMgt).where(and(...conditions));
    return res.json({ data: rows });
  } catch (err) {
    console.error("[GET /api/camp-services/institutes]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/camp-services/institutes/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(studyAbroadMgt)
      .where(and(eq(studyAbroadMgt.id, req.params.id), eq(studyAbroadMgt.programContext, "camp")))
      .limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });

    const [contract] = await db
      .select({ contractNumber: contracts.contractNumber, status: contracts.status, currency: contracts.currency, studentName: contracts.studentName })
      .from(contracts).where(eq(contracts.id, row.contractId)).limit(1);

    const [account] = row.instituteAccountId
      ? await db.select({ id: accounts.id, accountName: accounts.name })
          .from(accounts).where(eq(accounts.id, row.instituteAccountId)).limit(1)
      : [null];

    return res.json({ ...row, contract: contract ?? null, instituteAccountName: account?.accountName ?? null });
  } catch (err) {
    console.error("[GET /api/camp-services/institutes/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/camp-services/institutes", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const {
      contractId, instituteAccountId, programName, programType,
      programStartDate, programEndDate, weeklyHours, classSizeMax,
      ageGroup, levelAssessmentRequired, levelAssessmentDate,
      assignedClass, partnerCost, status, notes,
    } = req.body;
    if (!contractId) return res.status(400).json({ error: "contractId is required" });

    const [row] = await db.insert(studyAbroadMgt).values({
      contractId,
      programContext:          "camp",
      instituteAccountId:      instituteAccountId ?? null,
      programName:             programName ?? null,
      programType:             programType ?? null,
      programStartDate:        programStartDate ?? null,
      programEndDate:          programEndDate ?? null,
      weeklyHours:             weeklyHours ? Number(weeklyHours) : null,
      classSizeMax:            classSizeMax ? Number(classSizeMax) : null,
      ageGroup:                ageGroup ?? null,
      levelAssessmentRequired: levelAssessmentRequired ?? false,
      levelAssessmentDate:     levelAssessmentDate ?? null,
      assignedClass:           assignedClass ?? null,
      partnerCost:             partnerCost ? String(partnerCost) : null,
      status:                  status ?? "pending",
      notes:                   notes ?? null,
    }).returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /api/camp-services/institutes]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/camp-services/institutes/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db
      .select({ id: studyAbroadMgt.id })
      .from(studyAbroadMgt)
      .where(and(eq(studyAbroadMgt.id, req.params.id), eq(studyAbroadMgt.programContext, "camp")))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const allowedFields = [
      "instituteAccountId", "programName", "programType",
      "programStartDate", "programEndDate", "weeklyHours", "classSizeMax",
      "ageGroup", "levelAssessmentRequired", "levelAssessmentDate",
      "assignedClass", "partnerCost", "status", "notes",
    ];
    const patch: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.partnerCost !== undefined) patch.partnerCost = String(patch.partnerCost);
    if (patch.weeklyHours !== undefined) patch.weeklyHours = Number(patch.weeklyHours);
    if (patch.classSizeMax !== undefined) patch.classSizeMax = Number(patch.classSizeMax);

    const [updated] = await db
      .update(studyAbroadMgt)
      .set(patch)
      .where(and(eq(studyAbroadMgt.id, req.params.id), eq(studyAbroadMgt.programContext, "camp")))
      .returning();
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/camp-services/institutes/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── TOUR ────────────────────────────────────────────────────────────────────

router.get("/camp-services/tours", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { contractId } = req.query as Record<string, string>;
    const where = contractId ? eq(campTourMgt.contractId, contractId) : undefined;
    const rows = await db.select().from(campTourMgt).where(where);
    return res.json({ data: rows });
  } catch (err) {
    console.error("[GET /api/camp-services/tours]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/camp-services/tours/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db.select().from(campTourMgt).where(eq(campTourMgt.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });

    const [contract] = await db
      .select({ contractNumber: contracts.contractNumber, status: contracts.status, currency: contracts.currency, studentName: contracts.studentName })
      .from(contracts).where(eq(contracts.id, row.contractId)).limit(1);

    let application = null;
    if (row.campApplicationId) {
      const [app] = await db.select().from(campApplications).where(eq(campApplications.id, row.campApplicationId)).limit(1);
      application = app ?? null;
    }

    return res.json({ ...row, contract: contract ?? null, application });
  } catch (err) {
    console.error("[GET /api/camp-services/tours/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/camp-services/tours", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { contractId, campApplicationId, tourName, tourType, tourDate, tourDurationHours, pickupLocation, bookingReference, partnerCost, retailPrice, status, notes, coaArCode, coaApCode } = req.body;
    if (!contractId) return res.status(400).json({ error: "contractId is required" });

    const [row] = await db.insert(campTourMgt).values({
      contractId,
      campApplicationId:     campApplicationId ?? null,
      tourName:              tourName ?? null,
      tourType:              tourType ?? null,
      tourDate:              tourDate ?? null,
      tourDurationHours:     tourDurationHours ? Number(tourDurationHours) : null,
      pickupLocation:        pickupLocation ?? null,
      bookingReference:      bookingReference ?? null,
      partnerCost:           partnerCost ? String(partnerCost) : null,
      retailPrice:           retailPrice ? String(retailPrice) : null,
      status:                status ?? "pending",
      notes:                 notes ?? null,
      coaArCode:             coaArCode ?? "3500",
      coaApCode:             coaApCode ?? "4600",
    }).returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /api/camp-services/tours]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/camp-services/tours/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select({ id: campTourMgt.id }).from(campTourMgt).where(eq(campTourMgt.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const allowedFields = [
      "tourName", "tourType", "tourDate", "tourDurationHours",
      "pickupLocation", "bookingReference", "partnerCost", "retailPrice",
      "status", "notes", "arStatus", "apStatus", "coaArCode", "coaApCode",
      "tourProviderAccountId",
    ];
    const patch: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.partnerCost !== undefined) patch.partnerCost = String(patch.partnerCost);
    if (patch.retailPrice !== undefined) patch.retailPrice = String(patch.retailPrice);

    const [updated] = await db.update(campTourMgt).set(patch).where(eq(campTourMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/camp-services/tours/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
