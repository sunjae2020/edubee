import { Router } from "express";
import { db } from "@workspace/db";
import { otherServicesMgt, contracts, users } from "@workspace/db/schema";
import { eq, and, ilike, or, count, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

const SELECT_COLS = {
  id:              otherServicesMgt.id,
  contractId:      otherServicesMgt.contractId,
  assignedStaffId: otherServicesMgt.assignedStaffId,
  partnerId:       otherServicesMgt.partnerId,
  serviceType:     otherServicesMgt.serviceType,
  title:           otherServicesMgt.title,
  startDate:       otherServicesMgt.startDate,
  endDate:         otherServicesMgt.endDate,
  status:          otherServicesMgt.status,
  serviceFee:      otherServicesMgt.serviceFee,
  apCost:          otherServicesMgt.apCost,
  notes:           otherServicesMgt.notes,
  createdAt:       otherServicesMgt.createdAt,
  updatedAt:       otherServicesMgt.updatedAt,
  contractNumber:  contracts.contractNumber,
  studentName:     contracts.studentName,
  agentName:       contracts.agentName,
  contractStatus:  contracts.status,
  contractStartDate: contracts.startDate,
  contractEndDate:   contracts.endDate,
  contractTotalAmount: contracts.totalAmount,
  contractCurrency:    contracts.currency,
  contractPaidAmount:  contracts.paidAmount,
  contractBalanceAmount: contracts.balanceAmount,
  staffFullName:   users.fullName,
};

// ─── GET /api/services/other ───────────────────────────────────────────────
router.get(
  "/services/other",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        status, search,
        page = "1", limit = "20",
      } = req.query as Record<string, string>;

      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const conds: SQL[] = [];
      if (status) conds.push(eq(otherServicesMgt.status, status));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
          ilike(otherServicesMgt.title, `%${search}%`),
        )!);
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(otherServicesMgt)
        .leftJoin(contracts, eq(otherServicesMgt.contractId, contracts.id))
        .where(where);

      const rows = await db
        .select(SELECT_COLS)
        .from(otherServicesMgt)
        .leftJoin(contracts, eq(otherServicesMgt.contractId, contracts.id))
        .leftJoin(users, eq(otherServicesMgt.assignedStaffId, users.id))
        .where(where)
        .orderBy(otherServicesMgt.createdAt)
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
      console.error("[GET /api/services/other]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/other/:id ──────────────────────────────────────────
router.get(
  "/services/other/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select(SELECT_COLS)
        .from(otherServicesMgt)
        .leftJoin(contracts, eq(otherServicesMgt.contractId, contracts.id))
        .leftJoin(users, eq(otherServicesMgt.assignedStaffId, users.id))
        .where(eq(otherServicesMgt.id, req.params.id));

      if (!row) return res.status(404).json({ error: "Other service record not found" });

      return res.json(row);
    } catch (err) {
      console.error("[GET /api/services/other/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/other ──────────────────────────────────────────────
router.post(
  "/services/other",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        contractId, assignedStaffId, partnerId,
        serviceType, title, startDate, endDate,
        status, serviceFee, apCost, notes,
      } = req.body;

      if (!contractId) {
        return res.status(400).json({ error: "contractId is required" });
      }

      const [created] = await db
        .insert(otherServicesMgt)
        .values({
          contractId,
          assignedStaffId: assignedStaffId || null,
          partnerId:       partnerId || null,
          serviceType:     serviceType || null,
          title:           title || null,
          startDate:       startDate || null,
          endDate:         endDate || null,
          status:          status || "pending",
          serviceFee:      serviceFee || null,
          apCost:          apCost || null,
          notes:           notes || null,
        })
        .returning();

      return res.status(201).json(created);
    } catch (err) {
      console.error("[POST /api/services/other]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/other/:id ────────────────────────────────────────
router.patch(
  "/services/other/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: otherServicesMgt.id })
        .from(otherServicesMgt)
        .where(eq(otherServicesMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Other service record not found" });

      const {
        assignedStaffId, partnerId,
        serviceType, title, startDate, endDate,
        status, serviceFee, apCost, notes,
      } = req.body;

      const [updated] = await db
        .update(otherServicesMgt)
        .set({
          ...(assignedStaffId !== undefined && { assignedStaffId: assignedStaffId || null }),
          ...(partnerId       !== undefined && { partnerId: partnerId || null }),
          ...(serviceType     !== undefined && { serviceType }),
          ...(title           !== undefined && { title }),
          ...(startDate       !== undefined && { startDate: startDate || null }),
          ...(endDate         !== undefined && { endDate: endDate || null }),
          ...(status          !== undefined && { status }),
          ...(serviceFee      !== undefined && { serviceFee: serviceFee || null }),
          ...(apCost          !== undefined && { apCost: apCost || null }),
          ...(notes           !== undefined && { notes }),
          updatedAt: new Date(),
        })
        .where(eq(otherServicesMgt.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/other/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
