import { Router } from "express";
import { db } from "@workspace/db";
import {
  instituteMgt, hotelMgt, pickupMgt, tourMgt, settlementMgt, contracts, applications, users
} from "@workspace/db/schema";
import { eq, and, inArray, sql, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

type UserRole = string;

function isAdminOrCC(role: UserRole) {
  return ["super_admin", "admin", "camp_coordinator"].includes(role);
}

/** Batch enrich rows with full contract info via contractId → contract → application → client user */
async function enrichWithContractInfo(rows: any[]): Promise<any[]> {
  const contractIds = [...new Set(rows.map(r => r.contractId).filter(Boolean))];
  if (contractIds.length === 0) return rows;

  const contractRows = await db
    .select({
      contractId: contracts.id,
      contractNumber: contracts.contractNumber,
      contractStatus: contracts.status,
      contractStartDate: contracts.startDate,
      contractEndDate: contracts.endDate,
      totalAmount: contracts.totalAmount,
      currency: contracts.currency,
      studentName: users.fullName,
      clientEmail: users.email,
    })
    .from(contracts)
    .leftJoin(applications, eq(contracts.applicationId, applications.id))
    .leftJoin(users, eq(applications.clientId, users.id))
    .where(inArray(contracts.id, contractIds));

  const contractMap = new Map(contractRows.map(c => [c.contractId, {
    studentName: c.studentName ?? null,
    clientEmail: c.clientEmail ?? null,
    contractNumber: c.contractNumber ?? null,
    contractStatus: c.contractStatus ?? null,
    contractStartDate: c.contractStartDate ?? null,
    contractEndDate: c.contractEndDate ?? null,
    totalAmount: c.totalAmount ?? null,
    currency: c.currency ?? null,
  }]));

  return rows.map(r => {
    const info = contractMap.get(r.contractId) ?? {};
    return { ...r, ...info };
  });
}

// ── Institute Management ─────────────────────────────────────────────

router.get("/services/institute", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    let query = db.select().from(instituteMgt);
    const data = role === "partner_institute"
      ? await query.where(eq(instituteMgt.instituteId, uid))
      : await query;
    return res.json({ data: await enrichWithContractInfo(data) });
  } catch (err) {
    console.error("Institute list error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/services/institute/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(instituteMgt).where(eq(instituteMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_institute" && rec.instituteId !== uid) return res.status(403).json({ error: "Forbidden" });
    return res.json(rec);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/institute/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(instituteMgt).where(eq(instituteMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_institute" && rec.instituteId !== uid) return res.status(403).json({ error: "Forbidden" });

    const { schedule, teacherComments, englishLevelEnd, status, progressNotes,
      programDetails, startDate, endDate, totalHours, englishLevelStart, instituteId } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (schedule !== undefined) updates.schedule = schedule;
    if (teacherComments !== undefined) updates.teacherComments = teacherComments;
    if (englishLevelEnd !== undefined) updates.englishLevelEnd = englishLevelEnd;
    if (status !== undefined) updates.status = status;
    if (progressNotes !== undefined) updates.progressNotes = progressNotes;

    if (isAdminOrCC(role)) {
      if (programDetails !== undefined) updates.programDetails = programDetails;
      if (startDate !== undefined) updates.startDate = startDate;
      if (endDate !== undefined) updates.endDate = endDate;
      if (totalHours !== undefined) updates.totalHours = totalHours;
      if (englishLevelStart !== undefined) updates.englishLevelStart = englishLevelStart;
      if (instituteId !== undefined) updates.instituteId = instituteId;
    }

    const [updated] = await db.update(instituteMgt).set(updates).where(eq(instituteMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Hotel Management ─────────────────────────────────────────────────

router.get("/services/hotel", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    let query = db.select().from(hotelMgt);
    const data = role === "partner_hotel"
      ? await query.where(eq(hotelMgt.hotelId, uid))
      : await query;
    return res.json({ data: await enrichWithContractInfo(data) });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/services/hotel/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(hotelMgt).where(eq(hotelMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_hotel" && rec.hotelId !== uid) return res.status(403).json({ error: "Forbidden" });
    return res.json(rec);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/hotel/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(hotelMgt).where(eq(hotelMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_hotel" && rec.hotelId !== uid) return res.status(403).json({ error: "Forbidden" });

    const { roomType, checkinTime, checkoutTime, confirmationNo, guestNotes, status,
      checkinDate, checkoutDate, hotelId } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (roomType !== undefined) updates.roomType = roomType;
    if (checkinTime !== undefined) updates.checkinTime = checkinTime;
    if (checkoutTime !== undefined) updates.checkoutTime = checkoutTime;
    if (confirmationNo !== undefined) updates.confirmationNo = confirmationNo;
    if (guestNotes !== undefined) updates.guestNotes = guestNotes;
    if (status !== undefined) updates.status = status;

    if (isAdminOrCC(role)) {
      if (checkinDate !== undefined) updates.checkinDate = checkinDate;
      if (checkoutDate !== undefined) updates.checkoutDate = checkoutDate;
      if (hotelId !== undefined) updates.hotelId = hotelId;
    }

    const [updated] = await db.update(hotelMgt).set(updates).where(eq(hotelMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Pickup Management ────────────────────────────────────────────────

router.get("/services/pickup", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    let query = db.select().from(pickupMgt);
    const data = role === "partner_pickup"
      ? await query.where(eq(pickupMgt.driverId, uid))
      : await query;
    return res.json({ data: await enrichWithContractInfo(data) });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/services/pickup/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(pickupMgt).where(eq(pickupMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_pickup" && rec.driverId !== uid) return res.status(403).json({ error: "Forbidden" });
    return res.json(rec);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/pickup/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(pickupMgt).where(eq(pickupMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_pickup" && rec.driverId !== uid) return res.status(403).json({ error: "Forbidden" });

    const { vehicleInfo, driverNotes, status, pickupType, fromLocation, toLocation, pickupDatetime, driverId } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (vehicleInfo !== undefined) updates.vehicleInfo = vehicleInfo;
    if (driverNotes !== undefined) updates.driverNotes = driverNotes;
    if (status !== undefined) updates.status = status;

    if (isAdminOrCC(role)) {
      if (pickupType !== undefined) updates.pickupType = pickupType;
      if (fromLocation !== undefined) updates.fromLocation = fromLocation;
      if (toLocation !== undefined) updates.toLocation = toLocation;
      if (pickupDatetime !== undefined) updates.pickupDatetime = pickupDatetime;
      if (driverId !== undefined) updates.driverId = driverId;
    }

    const [updated] = await db.update(pickupMgt).set(updates).where(eq(pickupMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Tour Management ──────────────────────────────────────────────────

router.get("/services/tour", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    let query = db.select().from(tourMgt);
    const data = role === "partner_tour"
      ? await query.where(eq(tourMgt.tourCompanyId, uid))
      : await query;
    return res.json({ data: await enrichWithContractInfo(data) });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/services/tour/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(tourMgt).where(eq(tourMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_tour" && rec.tourCompanyId !== uid) return res.status(403).json({ error: "Forbidden" });
    return res.json(rec);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/tour/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(tourMgt).where(eq(tourMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role === "partner_tour" && rec.tourCompanyId !== uid) return res.status(403).json({ error: "Forbidden" });

    const { highlights, guideInfo, tourNotes, status, tourName, tourDate, startTime, endTime, meetingPoint, tourCompanyId } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (highlights !== undefined) updates.highlights = highlights;
    if (guideInfo !== undefined) updates.guideInfo = guideInfo;
    if (tourNotes !== undefined) updates.tourNotes = tourNotes;
    if (status !== undefined) updates.status = status;

    if (isAdminOrCC(role)) {
      if (tourName !== undefined) updates.tourName = tourName;
      if (tourDate !== undefined) updates.tourDate = tourDate;
      if (startTime !== undefined) updates.startTime = startTime;
      if (endTime !== undefined) updates.endTime = endTime;
      if (meetingPoint !== undefined) updates.meetingPoint = meetingPoint;
      if (tourCompanyId !== undefined) updates.tourCompanyId = tourCompanyId;
    }

    const [updated] = await db.update(tourMgt).set(updates).where(eq(tourMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Settlement Management ────────────────────────────────────────────

router.get("/services/settlement", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;

    if (role === "parent_client") return res.status(403).json({ error: "Forbidden" });

    const { contractId, providerId, status } = req.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (contractId) conditions.push(eq(settlementMgt.contractId, contractId));
    if (providerId) conditions.push(eq(settlementMgt.providerUserId, providerId));
    if (status) conditions.push(eq(settlementMgt.status, status));

    if (role.startsWith("partner_")) {
      conditions.push(eq(settlementMgt.providerUserId, uid));
    } else if (role === "camp_coordinator") {
      const ownContracts = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.campProviderId, uid));
      const contractIds = ownContracts.map(c => c.id);
      if (contractIds.length === 0) return res.json({ data: [] });
      const rawData = await db.select().from(settlementMgt);
      const data = rawData.filter(s => s.contractId && contractIds.includes(s.contractId));
      return res.json({ data: await enrichWithContractInfo(data) });
    } else if (role === "education_agent") {
      conditions.push(eq(settlementMgt.providerUserId, uid));
    }

    const data = conditions.length > 0
      ? await db.select().from(settlementMgt).where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : await db.select().from(settlementMgt);

    return res.json({ data: await enrichWithContractInfo(data) });
  } catch (err) {
    console.error("Settlement list error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/services/settlement", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!isAdminOrCC(role)) return res.status(403).json({ error: "Forbidden" });
    const [settlement] = await db.insert(settlementMgt).values({
      ...req.body,
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    return res.status(201).json(settlement);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/settlement/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(settlementMgt).where(eq(settlementMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role.startsWith("partner_") && rec.providerUserId !== uid) return res.status(403).json({ error: "Forbidden" });

    const [updated] = await db.update(settlementMgt).set({ ...req.body, updatedAt: new Date() })
      .where(eq(settlementMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/services/settlement/:id/status", authenticate, async (req, res) => {
  try {
    const { status, settlementDate } = req.body;
    const updates: Record<string, any> = { status, updatedAt: new Date() };
    if (settlementDate) updates.settlementDate = settlementDate;
    const [updated] = await db.update(settlementMgt).set(updates)
      .where(eq(settlementMgt.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
