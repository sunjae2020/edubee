import { Router } from "express";
import { db } from "@workspace/db";
import { accommodationMgt, contracts, users, accounts } from "@workspace/db/schema";
import { eq, and, ilike, or, sql, count, asc, desc, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

const SELECT_COLS = {
  id:                accommodationMgt.id,
  contractId:        accommodationMgt.contractId,
  leadId:            accommodationMgt.leadId,
  assignedStaffId:   accommodationMgt.assignedStaffId,
  providerAccountId: accommodationMgt.providerAccountId,
  accommodationType: accommodationMgt.accommodationType,
  checkinDate:       accommodationMgt.checkinDate,
  checkoutDate:      accommodationMgt.checkoutDate,
  mealIncluded:      accommodationMgt.mealIncluded,
  roomType:          accommodationMgt.roomType,
  weeklyRate:        accommodationMgt.weeklyRate,
  partnerWeeklyCost: accommodationMgt.partnerWeeklyCost,
  hostName:          accommodationMgt.hostName,
  hostAddress:       accommodationMgt.hostAddress,
  hostContact:       accommodationMgt.hostContact,
  distanceToSchool:  accommodationMgt.distanceToSchool,
  welfareCheckDates: accommodationMgt.welfareCheckDates,
  relocationReason:  accommodationMgt.relocationReason,
  settlementId:          accommodationMgt.settlementId,
  // Hotel MGT fields
  bookingConfirmationNo: accommodationMgt.bookingConfirmationNo,
  roomNumber:            accommodationMgt.roomNumber,
  perNightRate:          accommodationMgt.perNightRate,
  subTotal:              accommodationMgt.subTotal,
  otherFee:              accommodationMgt.otherFee,
  totalHotelFee:         accommodationMgt.totalHotelFee,
  paymentDate:           accommodationMgt.paymentDate,
  status:                accommodationMgt.status,
  notes:             accommodationMgt.notes,
  isActive:          accommodationMgt.isActive,
  createdAt:         accommodationMgt.createdAt,
  updatedAt:         accommodationMgt.updatedAt,
  contractNumber:       contracts.contractNumber,
  clientName:           accounts.name,
  studentName:          contracts.studentName,
  agentName:            contracts.agentName,
  staffFirstName:       users.fullName,
  contractStatus:       contracts.status,
  contractStartDate:    contracts.startDate,
  contractEndDate:      contracts.endDate,
  contractTotalAmount:  contracts.totalAmount,
  contractCurrency:     contracts.currency,
  contractPaidAmount:   contracts.paidAmount,
  contractBalanceAmount: contracts.balanceAmount,
};

// ─── GET /api/services/accommodation ─────────────────────────────────────────
router.get(
  "/services/accommodation",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        status, accommodationType, search,
        page = "1", limit = "20",
        sortBy = "createdOn", sortDir = "desc",
      } = req.query as Record<string, string>;

      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const conds: SQL[] = [];
      if (status)            conds.push(eq(accommodationMgt.status, status));
      if (accommodationType) conds.push(eq(accommodationMgt.accommodationType, accommodationType));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(accommodationMgt.hostName, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
        )!);
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(accommodationMgt)
        .leftJoin(contracts, eq(accommodationMgt.contractId, contracts.id))
        .where(where);

      const orderExpr = sortDir === "asc" ? asc(accommodationMgt.createdAt) : desc(accommodationMgt.createdAt);
      const rows = await db
        .select(SELECT_COLS)
        .from(accommodationMgt)
        .leftJoin(contracts, eq(accommodationMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(accommodationMgt.assignedStaffId, users.id))
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
      console.error("[GET /api/services/accommodation]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/accommodation/:id ──────────────────────────────────────
router.get(
  "/services/accommodation/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select(SELECT_COLS)
        .from(accommodationMgt)
        .leftJoin(contracts, eq(accommodationMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(accommodationMgt.assignedStaffId, users.id))
        .where(eq(accommodationMgt.id, req.params.id as string));

      if (!row) return res.status(404).json({ error: "Accommodation record not found" });
      return res.json(row);
    } catch (err) {
      console.error("[GET /api/services/accommodation/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/accommodation/:id ────────────────────────────────────
router.patch(
  "/services/accommodation/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: accommodationMgt.id })
        .from(accommodationMgt)
        .where(eq(accommodationMgt.id, req.params.id as string));

      if (!existing) return res.status(404).json({ error: "Accommodation record not found" });

      const {
        accommodationType, checkinDate, checkoutDate,
        mealIncluded, roomType, weeklyRate, partnerWeeklyCost,
        hostName, hostAddress, hostContact, distanceToSchool,
        relocationReason, status, notes, assignedStaffId,
        bookingConfirmationNo, roomNumber, perNightRate,
        subTotal, otherFee, totalHotelFee, paymentDate,
      } = req.body;

      const [updated] = await db
        .update(accommodationMgt)
        .set({
          ...(accommodationType    !== undefined && { accommodationType }),
          ...(checkinDate          !== undefined && { checkinDate: checkinDate || null }),
          ...(checkoutDate         !== undefined && { checkoutDate: checkoutDate || null }),
          ...(mealIncluded         !== undefined && { mealIncluded }),
          ...(roomType             !== undefined && { roomType }),
          ...(weeklyRate           !== undefined && { weeklyRate }),
          ...(partnerWeeklyCost    !== undefined && { partnerWeeklyCost }),
          ...(hostName             !== undefined && { hostName }),
          ...(hostAddress          !== undefined && { hostAddress }),
          ...(hostContact          !== undefined && { hostContact }),
          ...(distanceToSchool     !== undefined && { distanceToSchool }),
          ...(relocationReason     !== undefined && { relocationReason }),
          ...(status               !== undefined && { status }),
          ...(notes                !== undefined && { notes }),
          ...(assignedStaffId      !== undefined && { assignedStaffId }),
          ...(bookingConfirmationNo !== undefined && { bookingConfirmationNo }),
          ...(roomNumber           !== undefined && { roomNumber }),
          ...(perNightRate         !== undefined && { perNightRate: perNightRate || null }),
          ...(subTotal             !== undefined && { subTotal: subTotal || null }),
          ...(otherFee             !== undefined && { otherFee: otherFee || null }),
          ...(totalHotelFee        !== undefined && { totalHotelFee: totalHotelFee || null }),
          ...(paymentDate          !== undefined && { paymentDate: paymentDate || null }),
          updatedAt: new Date(),
        })
        .where(eq(accommodationMgt.id, req.params.id as string))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/accommodation/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/accommodation ────────────────────────────────────────
router.post(
  "/services/accommodation",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { contractId, accommodationType, status, assignedStaffId, notes } = req.body;
      if (!contractId) return res.status(400).json({ error: "contractId is required" });

      const [record] = await db
        .insert(accommodationMgt)
        .values({
          contractId,
          status: status ?? "searching",
          ...(accommodationType && { accommodationType }),
          ...(assignedStaffId   && { assignedStaffId }),
          ...(notes             && { notes }),
        })
        .returning({ id: accommodationMgt.id });

      return res.status(201).json(record);
    } catch (err) {
      console.error("[POST /api/services/accommodation]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/accommodation/:id/welfare-check ──────────────────────
router.post(
  "/services/accommodation/:id/welfare-check",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: accommodationMgt.id, welfareCheckDates: accommodationMgt.welfareCheckDates })
        .from(accommodationMgt)
        .where(eq(accommodationMgt.id, req.params.id as string));

      if (!existing) return res.status(404).json({ error: "Accommodation record not found" });

      const { date, staff, notes, status } = req.body;
      if (!date || !status) {
        return res.status(400).json({ error: "date and status are required" });
      }

      const existing_checks = Array.isArray(existing.welfareCheckDates)
        ? (existing.welfareCheckDates as object[])
        : [];

      const newCheck = { date, staff: staff || null, notes: notes || null, status };
      const updated_checks = [...existing_checks, newCheck];

      const [updated] = await db
        .update(accommodationMgt)
        .set({
          welfareCheckDates: updated_checks,
          updatedAt: new Date(),
        })
        .where(eq(accommodationMgt.id, req.params.id as string))
        .returning({ id: accommodationMgt.id, welfareCheckDates: accommodationMgt.welfareCheckDates });

      return res.json(updated);
    } catch (err) {
      console.error("[POST /api/services/accommodation/:id/welfare-check]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/services/accommodation/:id/toggle-active",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: accommodationMgt.id, isActive: accommodationMgt.isActive })
        .from(accommodationMgt)
        .where(eq(accommodationMgt.id, req.params.id as string));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [updated] = await db
        .update(accommodationMgt)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(accommodationMgt.id, req.params.id as string))
        .returning();
      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/accommodation/:id/toggle-active]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
