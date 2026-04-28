import { Router } from "express";
import { db } from "@workspace/db";
import { tourMgt, contracts, users, products } from "@workspace/db/schema";
import { eq, and, ilike, or, count, asc, desc, SQL, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { getCCDelegatedContractIds } from "../lib/ccDelegationFilter.js";

const router = Router();
const STAFF_ROLES = ["super_admin","admin","finance","admission","team_manager","consultant","camp_coordinator"];
const ALL_TOUR_ROLES = STAFF_ROLES;

const SELECT_COLS = {
  id:             tourMgt.id,
  contractId:     tourMgt.contractId,
  tourCompanyId:  tourMgt.tourCompanyId,
  tourName:       tourMgt.tourName,
  tourDate:       tourMgt.tourDate,
  startTime:      tourMgt.startTime,
  endTime:        tourMgt.endTime,
  meetingPoint:   tourMgt.meetingPoint,
  highlights:     tourMgt.highlights,
  guideInfo:      tourMgt.guideInfo,
  tourNotes:      tourMgt.tourNotes,
  status:         tourMgt.status,
  ledgerEntryId:  tourMgt.ledgerEntryId,
  productId:      tourMgt.productId,
  serviceFee:     tourMgt.serviceFee,
  apCost:         tourMgt.apCost,
  isActive:       tourMgt.isActive,
  tourType:       tourMgt.tourType,
  childFee:       tourMgt.childFee,
  adultFee:       tourMgt.adultFee,
  childNo:        tourMgt.childNo,
  adultNo:        tourMgt.adultNo,
  paymentDate:    tourMgt.paymentDate,
  meal:           tourMgt.meal,
  mealFee:        tourMgt.mealFee,
  tourNo:         tourMgt.tourNo,
  createdAt:      tourMgt.createdAt,
  updatedAt:      tourMgt.updatedAt,
  // joined
  contractNumber:   contracts.contractNumber,
  studentName:      contracts.studentName,
  clientEmail:      contracts.clientEmail,
  agentName:        contracts.agentName,
  contractStatus:   contracts.status,
  contractStartDate: contracts.startDate,
  contractEndDate:   contracts.endDate,
  totalAmount:      contracts.totalAmount,
  currency:         contracts.currency,
  // product
  productName:      products.productName,
};

// ─── GET /api/services/tour ───────────────────────────────────────────────────
router.get(
  "/services/tour",
  authenticate,
  requireRole(...ALL_TOUR_ROLES),
  async (req, res) => {
    try {
      const {
        status, search,
        page = "1", limit = "20",
        sortBy = "createdOn", sortDir = "desc",
      } = req.query as Record<string, string>;

      const role = (req.user as any)?.role;
      const uid  = (req.user as any)?.id;

      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const conds: SQL[] = [];

      // CC: only records linked to contracts in a delegated PG
      if (req.user?.role === "camp_coordinator") {
        const ccIds = await getCCDelegatedContractIds(req.user.organisationId ?? "");
        if (ccIds.length === 0) return res.json({ data: [], meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } });
        conds.push(inArray(tourMgt.contractId, ccIds));
      }

      if (false) { // partner_tour role removed
        conds.push(eq(tourMgt.tourCompanyId, uid));
      }

      if (status) conds.push(eq(tourMgt.status, status));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
          ilike(tourMgt.tourName, `%${search}%`),
        )!);
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(tourMgt)
        .leftJoin(contracts, eq(tourMgt.contractId, contracts.id))
        .where(where);

      const sortColMap: Record<string, any> = { tourDate: tourMgt.tourDate, createdOn: tourMgt.createdAt };
      const sortCol = sortColMap[sortBy] ?? tourMgt.createdAt;
      const orderExpr = sortDir === "asc" ? asc(sortCol) : desc(sortCol);
      const rows = await db
        .select(SELECT_COLS)
        .from(tourMgt)
        .leftJoin(contracts, eq(tourMgt.contractId, contracts.id))
        .leftJoin(products, eq(tourMgt.productId, products.id))
        .where(where)
        .orderBy(orderExpr)
        .limit(limitNum)
        .offset(offset);

      return res.json({
        data: rows,
        meta: {
          total: Number(total),
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(Number(total) / limitNum),
        },
      });
    } catch (err) {
      console.error("[GET /api/services/tour]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/tour ─────────────────────────────────────────────────
router.post(
  "/services/tour",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        contractId, tourName, tourDate, startTime, endTime, meetingPoint,
        guideInfo, tourNotes, status, productId, serviceFee, apCost,
      } = req.body;
      if (!contractId) return res.status(400).json({ error: "contractId is required" });

      const [record] = await db
        .insert(tourMgt)
        .values({
          contractId,
          tourName:     tourName     || null,
          tourDate:     tourDate     || null,
          startTime:    startTime    || null,
          endTime:      endTime      || null,
          meetingPoint: meetingPoint || null,
          guideInfo:    guideInfo    || null,
          tourNotes:    tourNotes    || null,
          status:       status       || "pending",
          productId:    productId    || null,
          serviceFee:   serviceFee   != null ? String(serviceFee) : null,
          apCost:       apCost       != null ? String(apCost)     : null,
        })
        .returning({ id: tourMgt.id });

      return res.status(201).json(record);
    } catch (err) {
      console.error("[POST /api/services/tour]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/tour/:id ──────────────────────────────────────────────
router.get(
  "/services/tour/:id",
  authenticate,
  requireRole(...ALL_TOUR_ROLES),
  async (req, res) => {
    try {
      const role = (req.user as any)?.role;
      const uid  = (req.user as any)?.id;

      const [row] = await db
        .select(SELECT_COLS)
        .from(tourMgt)
        .leftJoin(contracts, eq(tourMgt.contractId, contracts.id))
        .leftJoin(products, eq(tourMgt.productId, products.id))
        .where(eq(tourMgt.id, req.params.id as string));

      if (!row) return res.status(404).json({ error: "Tour record not found" });
      // partner_tour check removed - internal staff access only
      return res.json({ data: row });
    } catch (err) {
      console.error("[GET /api/services/tour/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/tour/:id ────────────────────────────────────────────
router.patch(
  "/services/tour/:id",
  authenticate,
  requireRole(...ALL_TOUR_ROLES),
  async (req, res) => {
    try {
      const role = (req.user as any)?.role;
      const uid  = (req.user as any)?.id;

      const [existing] = await db
        .select({ id: tourMgt.id, tourCompanyId: tourMgt.tourCompanyId })
        .from(tourMgt)
        .where(eq(tourMgt.id, req.params.id as string));

      if (!existing) return res.status(404).json({ error: "Tour record not found" });
      // partner_tour check removed - internal staff access only
      const {
        tourName, tourDate, startTime, endTime, meetingPoint,
        highlights, guideInfo, tourNotes, status, tourCompanyId,
        productId, serviceFee, apCost,
        tourType, childFee, adultFee, childNo, adultNo,
        paymentDate, meal, mealFee, tourNo,
      } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date() };

      if (status        !== undefined) updates.status      = status;
      if (guideInfo     !== undefined) updates.guideInfo   = guideInfo;
      if (highlights    !== undefined) updates.highlights  = highlights;
      if (tourNotes     !== undefined) updates.tourNotes   = tourNotes;

      if (true) {
        if (tourName     !== undefined) updates.tourName     = tourName;
        if (tourDate     !== undefined) updates.tourDate     = tourDate || null;
        if (startTime    !== undefined) updates.startTime    = startTime;
        if (endTime      !== undefined) updates.endTime      = endTime;
        if (meetingPoint !== undefined) updates.meetingPoint = meetingPoint;
        if (tourCompanyId !== undefined) updates.tourCompanyId = tourCompanyId;
        if (productId    !== undefined) updates.productId   = productId || null;
        if (serviceFee   !== undefined) updates.serviceFee  = serviceFee != null ? String(serviceFee) : null;
        if (apCost       !== undefined) updates.apCost      = apCost    != null ? String(apCost)      : null;
        if (tourType     !== undefined) updates.tourType    = tourType  || null;
        if (childFee     !== undefined) updates.childFee    = childFee  != null ? String(childFee)    : null;
        if (adultFee     !== undefined) updates.adultFee    = adultFee  != null ? String(adultFee)    : null;
        if (childNo      !== undefined) updates.childNo     = childNo   != null ? Number(childNo)     : null;
        if (adultNo      !== undefined) updates.adultNo     = adultNo   != null ? Number(adultNo)     : null;
        if (paymentDate  !== undefined) updates.paymentDate = paymentDate || null;
        if (meal         !== undefined) updates.meal        = meal      || null;
        if (mealFee      !== undefined) updates.mealFee     = mealFee   != null ? String(mealFee)     : null;
        if (tourNo       !== undefined) updates.tourNo      = tourNo    || null;
      }

      const [updated] = await db
        .update(tourMgt)
        .set(updates)
        .where(eq(tourMgt.id, req.params.id as string))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/tour/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PUT /api/services/tour/:id (alias for PATCH) ────────────────────────────
router.put(
  "/services/tour/:id",
  authenticate,
  requireRole(...ALL_TOUR_ROLES),
  async (req, res) => {
    try {
      const role = (req.user as any)?.role;
      const uid  = (req.user as any)?.id;

      const [existing] = await db
        .select({ id: tourMgt.id, tourCompanyId: tourMgt.tourCompanyId })
        .from(tourMgt)
        .where(eq(tourMgt.id, req.params.id as string));

      if (!existing) return res.status(404).json({ error: "Tour record not found" });
      // partner_tour check removed - internal staff access only
      const {
        tourName, tourDate, startTime, endTime, meetingPoint,
        highlights, guideInfo, tourNotes, status, tourCompanyId,
        productId, serviceFee, apCost,
        tourType, childFee, adultFee, childNo, adultNo,
        paymentDate, meal, mealFee, tourNo,
      } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date() };

      if (status        !== undefined) updates.status      = status;
      if (guideInfo     !== undefined) updates.guideInfo   = guideInfo;
      if (highlights    !== undefined) updates.highlights  = highlights;
      if (tourNotes     !== undefined) updates.tourNotes   = tourNotes;

      if (true) {
        if (tourName     !== undefined) updates.tourName     = tourName;
        if (tourDate     !== undefined) updates.tourDate     = tourDate || null;
        if (startTime    !== undefined) updates.startTime    = startTime;
        if (endTime      !== undefined) updates.endTime      = endTime;
        if (meetingPoint !== undefined) updates.meetingPoint = meetingPoint;
        if (tourCompanyId !== undefined) updates.tourCompanyId = tourCompanyId;
        if (productId    !== undefined) updates.productId   = productId || null;
        if (serviceFee   !== undefined) updates.serviceFee  = serviceFee != null ? String(serviceFee) : null;
        if (apCost       !== undefined) updates.apCost      = apCost    != null ? String(apCost)      : null;
        if (tourType     !== undefined) updates.tourType    = tourType  || null;
        if (childFee     !== undefined) updates.childFee    = childFee  != null ? String(childFee)    : null;
        if (adultFee     !== undefined) updates.adultFee    = adultFee  != null ? String(adultFee)    : null;
        if (childNo      !== undefined) updates.childNo     = childNo   != null ? Number(childNo)     : null;
        if (adultNo      !== undefined) updates.adultNo     = adultNo   != null ? Number(adultNo)     : null;
        if (paymentDate  !== undefined) updates.paymentDate = paymentDate || null;
        if (meal         !== undefined) updates.meal        = meal      || null;
        if (mealFee      !== undefined) updates.mealFee     = mealFee   != null ? String(mealFee)     : null;
        if (tourNo       !== undefined) updates.tourNo      = tourNo    || null;
      }

      const [updated] = await db
        .update(tourMgt)
        .set(updates)
        .where(eq(tourMgt.id, req.params.id as string))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PUT /api/services/tour/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/services/tour/:id/toggle-active",
  authenticate,
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: tourMgt.id, isActive: tourMgt.isActive })
        .from(tourMgt)
        .where(eq(tourMgt.id, req.params.id as string));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [updated] = await db
        .update(tourMgt)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(tourMgt.id, req.params.id as string))
        .returning();
      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/tour/:id/toggle-active]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── DELETE /api/services/tour/bulk  (super_admin only) ─────────────────────
router.delete("/services/tour/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    await db.delete(tourMgt).where(inArray(tourMgt.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/services/tour/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
