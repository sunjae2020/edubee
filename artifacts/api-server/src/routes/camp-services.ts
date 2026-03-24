import { Router } from "express";
import { db } from "@workspace/db";
import { campInstituteMgt, campTourMgt, campApplications } from "@workspace/db/schema";
import { contracts } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

// ─── INSTITUTE ───────────────────────────────────────────────────────────────

router.get("/camp-services/institutes", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { contractId } = req.query as Record<string, string>;
    const where = contractId ? eq(campInstituteMgt.contractId, contractId) : undefined;
    const rows = await db.select().from(campInstituteMgt).where(where);
    return res.json({ data: rows });
  } catch (err) {
    console.error("[GET /api/camp-services/institutes]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/camp-services/institutes/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [row] = await db.select().from(campInstituteMgt).where(eq(campInstituteMgt.id, req.params.id)).limit(1);
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
    console.error("[GET /api/camp-services/institutes/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/camp-services/institutes", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { contractId, campApplicationId, className, classLevel, teacherName, status, notes, retailPrice, partnerCost, coaArCode, coaApCode } = req.body;
    if (!contractId) return res.status(400).json({ error: "contractId is required" });

    const [row] = await db.insert(campInstituteMgt).values({
      contractId,
      campApplicationId:  campApplicationId ?? null,
      className:          className ?? null,
      classLevel:         classLevel ?? null,
      teacherName:        teacherName ?? null,
      status:             status ?? "pending",
      notes:              notes ?? null,
      retailPrice:        retailPrice ? String(retailPrice) : null,
      partnerCost:        partnerCost ? String(partnerCost) : null,
      coaArCode:          coaArCode ?? "3500",
      coaApCode:          coaApCode ?? "4700",
    }).returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /api/camp-services/institutes]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/camp-services/institutes/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [existing] = await db.select({ id: campInstituteMgt.id }).from(campInstituteMgt).where(eq(campInstituteMgt.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const allowedFields = [
      "className", "classLevel", "teacherName", "teacherComment",
      "certificateIssued", "certificateIssuedAt",
      "status", "notes", "retailPrice", "partnerCost",
      "arStatus", "apStatus", "coaArCode", "coaApCode",
      "instituteAccountId",
    ];
    const patch: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.retailPrice !== undefined) patch.retailPrice = String(patch.retailPrice);
    if (patch.partnerCost !== undefined) patch.partnerCost = String(patch.partnerCost);

    const [updated] = await db.update(campInstituteMgt).set(patch).where(eq(campInstituteMgt.id, req.params.id)).returning();
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
