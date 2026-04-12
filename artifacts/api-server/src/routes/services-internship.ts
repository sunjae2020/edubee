import { Router } from "express";
import { db } from "@workspace/db";
import { internshipMgt, contracts, users, accounts } from "@workspace/db/schema";
import { eq, and, ilike, or, count, asc, desc, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

const SELECT_COLS = {
  id:                    internshipMgt.id,
  contractId:            internshipMgt.contractId,
  leadId:                internshipMgt.leadId,
  assignedStaffId:       internshipMgt.assignedStaffId,
  studentAccountId:      internshipMgt.studentAccountId,
  hostCompanyId:         internshipMgt.hostCompanyId,
  englishLevel:          internshipMgt.englishLevel,
  workExperience:        internshipMgt.workExperience,
  preferredIndustry:     internshipMgt.preferredIndustry,
  availableHoursPerWeek: internshipMgt.availableHoursPerWeek,
  positionTitle:         internshipMgt.positionTitle,
  employmentType:        internshipMgt.employmentType,
  hourlyRate:            internshipMgt.hourlyRate,
  resumePrepared:        internshipMgt.resumePrepared,
  coverLetterPrepared:   internshipMgt.coverLetterPrepared,
  interviewDate:         internshipMgt.interviewDate,
  interviewResult:       internshipMgt.interviewResult,
  startDate:             internshipMgt.startDate,
  endDate:               internshipMgt.endDate,
  placementFeeType:      internshipMgt.placementFeeType,
  referenceLetterIssued: internshipMgt.referenceLetterIssued,
  status:                internshipMgt.status,
  notes:                 internshipMgt.notes,
  isActive:              internshipMgt.isActive,
  createdAt:             internshipMgt.createdAt,
  updatedAt:             internshipMgt.updatedAt,
  contractNumber:        contracts.contractNumber,
  clientName:            accounts.name,
  studentName:           contracts.studentName,
  agentName:             contracts.agentName,
  staffFirstName:        users.fullName,
  contractStatus:        contracts.status,
  contractStartDate:     contracts.startDate,
  contractEndDate:       contracts.endDate,
  contractTotalAmount:   contracts.totalAmount,
  contractCurrency:      contracts.currency,
  contractPaidAmount:    contracts.paidAmount,
  contractBalanceAmount: contracts.balanceAmount,
};

// ─── GET /api/services/internship ─────────────────────────────────────────────
router.get(
  "/services/internship",
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
      if (status) conds.push(eq(internshipMgt.status, status));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(internshipMgt.positionTitle, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
        )!);
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(internshipMgt)
        .leftJoin(contracts, eq(internshipMgt.contractId, contracts.id))
        .where(where);

      const orderExpr = sortDir === "asc" ? asc(internshipMgt.createdAt) : desc(internshipMgt.createdAt);
      const rows = await db
        .select(SELECT_COLS)
        .from(internshipMgt)
        .leftJoin(contracts, eq(internshipMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(internshipMgt.assignedStaffId, users.id))
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
      console.error("[GET /api/services/internship]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/internship/:id ─────────────────────────────────────────
router.get(
  "/services/internship/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select(SELECT_COLS)
        .from(internshipMgt)
        .leftJoin(contracts, eq(internshipMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(internshipMgt.assignedStaffId, users.id))
        .where(eq(internshipMgt.id, req.params.id));

      if (!row) return res.status(404).json({ error: "Internship record not found" });
      return res.json(row);
    } catch (err) {
      console.error("[GET /api/services/internship/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/internship/:id ───────────────────────────────────────
router.patch(
  "/services/internship/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: internshipMgt.id })
        .from(internshipMgt)
        .where(eq(internshipMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Internship record not found" });

      const {
        englishLevel, workExperience, preferredIndustry, availableHoursPerWeek,
        positionTitle, employmentType, hourlyRate, placementFeeType,
        resumePrepared, coverLetterPrepared,
        interviewDate, interviewResult,
        startDate, endDate,
        referenceLetterIssued,
        status, notes, assignedStaffId,
      } = req.body;

      const [updated] = await db
        .update(internshipMgt)
        .set({
          ...(englishLevel           !== undefined && { englishLevel }),
          ...(workExperience         !== undefined && { workExperience }),
          ...(preferredIndustry      !== undefined && { preferredIndustry }),
          ...(availableHoursPerWeek  !== undefined && { availableHoursPerWeek }),
          ...(positionTitle          !== undefined && { positionTitle }),
          ...(employmentType         !== undefined && { employmentType }),
          ...(hourlyRate             !== undefined && { hourlyRate }),
          ...(placementFeeType       !== undefined && { placementFeeType }),
          ...(resumePrepared         !== undefined && { resumePrepared }),
          ...(coverLetterPrepared    !== undefined && { coverLetterPrepared }),
          ...(interviewDate          !== undefined && { interviewDate: interviewDate ? new Date(interviewDate) : null }),
          ...(interviewResult        !== undefined && { interviewResult }),
          ...(startDate              !== undefined && { startDate: startDate || null }),
          ...(endDate                !== undefined && { endDate: endDate || null }),
          ...(referenceLetterIssued  !== undefined && { referenceLetterIssued }),
          ...(status                 !== undefined && { status }),
          ...(notes                  !== undefined && { notes }),
          ...(assignedStaffId        !== undefined && { assignedStaffId }),
          updatedAt: new Date(),
        })
        .where(eq(internshipMgt.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/internship/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/internship ────────────────────────────────────────────
router.post(
  "/services/internship",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { contractId, status, assignedStaffId, notes } = req.body;
      if (!contractId) return res.status(400).json({ error: "contractId is required" });

      const [dup] = await db.select({ id: internshipMgt.id }).from(internshipMgt)
        .where(eq(internshipMgt.contractId, contractId)).limit(1);
      if (dup) return res.status(409).json({ error: "Internship service already exists for this contract" });

      const [record] = await db
        .insert(internshipMgt)
        .values({
          contractId,
          status: status ?? "profile_review",
          ...(assignedStaffId && { assignedStaffId }),
          ...(notes          && { notes }),
        })
        .returning({ id: internshipMgt.id });

      return res.status(201).json(record);
    } catch (err) {
      console.error("[POST /api/services/internship]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/services/internship/:id/toggle-active",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: internshipMgt.id, isActive: internshipMgt.isActive })
        .from(internshipMgt)
        .where(eq(internshipMgt.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [updated] = await db
        .update(internshipMgt)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(internshipMgt.id, req.params.id))
        .returning();
      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/internship/:id/toggle-active]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
