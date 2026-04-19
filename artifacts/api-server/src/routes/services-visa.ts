import { Router } from "express";
import { encryptField, decryptField } from "../lib/crypto.js";
import { db } from "@workspace/db";
import { visaServicesMgt, contracts, users, accounts } from "@workspace/db/schema";
import { eq, and, ilike, or, count, asc, desc, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

const SELECT_COLS = {
  id:              visaServicesMgt.id,
  contractId:      visaServicesMgt.contractId,
  assignedStaffId: visaServicesMgt.assignedStaffId,
  partnerId:       visaServicesMgt.partnerId,
  visaType:        visaServicesMgt.visaType,
  country:         visaServicesMgt.country,
  applicationDate: visaServicesMgt.applicationDate,
  appointmentDate: visaServicesMgt.appointmentDate,
  submissionDate:  visaServicesMgt.submissionDate,
  decisionDate:    visaServicesMgt.decisionDate,
  visaNumber:      visaServicesMgt.visaNumber,
  startDate:       visaServicesMgt.startDate,
  endDate:         visaServicesMgt.endDate,
  status:          visaServicesMgt.status,
  serviceFee:      visaServicesMgt.serviceFee,
  apCost:          visaServicesMgt.apCost,
  notes:           visaServicesMgt.notes,
  isActive:        visaServicesMgt.isActive,
  createdAt:       visaServicesMgt.createdAt,
  updatedAt:       visaServicesMgt.updatedAt,
  contractNumber:  contracts.contractNumber,
  clientName:      accounts.name,
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

// ─── GET /api/services/visa ────────────────────────────────────────────────
router.get(
  "/services/visa",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        status, search,
        page = "1", limit = "20",
        sortBy = "createdOn", sortDir = "desc",
      } = req.query as Record<string, string>;

      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const conds: SQL[] = [];
      if (status) conds.push(eq(visaServicesMgt.status, status));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
          ilike(visaServicesMgt.country, `%${search}%`),
          ilike(visaServicesMgt.visaType, `%${search}%`),
          ilike(visaServicesMgt.visaNumber, `%${search}%`),
        )!);
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(visaServicesMgt)
        .leftJoin(contracts, eq(visaServicesMgt.contractId, contracts.id))
        .where(where);

      const orderExpr = sortDir === "asc" ? asc(visaServicesMgt.createdAt) : desc(visaServicesMgt.createdAt);
      const rows = await db
        .select(SELECT_COLS)
        .from(visaServicesMgt)
        .leftJoin(contracts, eq(visaServicesMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(visaServicesMgt.assignedStaffId, users.id))
        .where(where)
        .orderBy(orderExpr)
        .limit(limitNum)
        .offset(offset);

      // 목록에서 비자번호 마스킹 (앞 2자리 + **** + 뒤 2자리)
      const maskedRows = rows.map((r) => ({
        ...r,
        visaNumber: r.visaNumber
          ? (() => {
              const plain = decryptField(r.visaNumber) ?? r.visaNumber;
              return plain.length <= 4 ? "****" : plain.slice(0, 2) + "****" + plain.slice(-2);
            })()
          : null,
      }));

      return res.json({
        data: maskedRows,
        meta: {
          total: Number(total),
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(Number(total) / limitNum),
        },
      });
    } catch (err) {
      console.error("[GET /api/services/visa]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/visa/:id ───────────────────────────────────────────
router.get(
  "/services/visa/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select(SELECT_COLS)
        .from(visaServicesMgt)
        .leftJoin(contracts, eq(visaServicesMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(visaServicesMgt.assignedStaffId, users.id))
        .where(eq(visaServicesMgt.id, req.params.id));

      if (!row) return res.status(404).json({ error: "Visa service record not found" });

      return res.json(row);
    } catch (err) {
      console.error("[GET /api/services/visa/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/visa ──────────────────────────────────────────────
router.post(
  "/services/visa",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        contractId, assignedStaffId, partnerId,
        visaType, country, applicationDate, appointmentDate,
        submissionDate, decisionDate, visaNumber,
        startDate, endDate, status, serviceFee, apCost, notes,
      } = req.body;

      if (!contractId) {
        return res.status(400).json({ error: "contractId is required" });
      }

      const [created] = await db
        .insert(visaServicesMgt)
        .values({
          contractId,
          assignedStaffId: assignedStaffId || null,
          partnerId:       partnerId || null,
          visaType:        visaType || null,
          country:         country || null,
          applicationDate: applicationDate || null,
          appointmentDate: appointmentDate || null,
          submissionDate:  submissionDate || null,
          decisionDate:    decisionDate || null,
          visaNumber:      encryptField(visaNumber || null),
          startDate:       startDate || null,
          endDate:         endDate || null,
          status:          status || "pending",
          serviceFee:      serviceFee || null,
          apCost:          apCost || null,
          notes:           notes || null,
        })
        .returning();

      if (created) created.visaNumber = decryptField(created.visaNumber);
      return res.status(201).json(created);
    } catch (err) {
      console.error("[POST /api/services/visa]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/visa/:id ─────────────────────────────────────────
router.patch(
  "/services/visa/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: visaServicesMgt.id })
        .from(visaServicesMgt)
        .where(eq(visaServicesMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Visa service record not found" });

      const {
        assignedStaffId, partnerId,
        visaType, country, applicationDate, appointmentDate,
        submissionDate, decisionDate, visaNumber,
        startDate, endDate, status, serviceFee, apCost, notes,
      } = req.body;

      const [updated] = await db
        .update(visaServicesMgt)
        .set({
          ...(assignedStaffId !== undefined && { assignedStaffId: assignedStaffId || null }),
          ...(partnerId       !== undefined && { partnerId: partnerId || null }),
          ...(visaType        !== undefined && { visaType }),
          ...(country         !== undefined && { country }),
          ...(applicationDate !== undefined && { applicationDate: applicationDate || null }),
          ...(appointmentDate !== undefined && { appointmentDate: appointmentDate || null }),
          ...(submissionDate  !== undefined && { submissionDate: submissionDate || null }),
          ...(decisionDate    !== undefined && { decisionDate: decisionDate || null }),
          ...(visaNumber      !== undefined && { visaNumber: encryptField(visaNumber) }),
          ...(startDate       !== undefined && { startDate: startDate || null }),
          ...(endDate         !== undefined && { endDate: endDate || null }),
          ...(status          !== undefined && { status }),
          ...(serviceFee      !== undefined && { serviceFee: serviceFee || null }),
          ...(apCost          !== undefined && { apCost: apCost || null }),
          ...(notes           !== undefined && { notes }),
          updatedAt: new Date(),
        })
        .where(eq(visaServicesMgt.id, req.params.id))
        .returning();

      if (updated) updated.visaNumber = decryptField(updated.visaNumber);
      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/visa/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/services/visa/:id/toggle-active",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: visaServicesMgt.id, isActive: visaServicesMgt.isActive })
        .from(visaServicesMgt)
        .where(eq(visaServicesMgt.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [updated] = await db
        .update(visaServicesMgt)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(visaServicesMgt.id, req.params.id))
        .returning();
      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/visa/:id/toggle-active]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
