import { Router } from "express";
import { db } from "@workspace/db";
import { studyAbroadMgt, contracts, users, accounts } from "@workspace/db/schema";
import { eq, and, ilike, or, lte, isNotNull, sql, count, asc, desc, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

// ─── shared join columns ─────────────────────────────────────────────────────
const SELECT_COLS = {
  id:                  studyAbroadMgt.id,
  contractId:          studyAbroadMgt.contractId,
  leadId:              studyAbroadMgt.leadId,
  assignedStaffId:     studyAbroadMgt.assignedStaffId,
  applicationStage:    studyAbroadMgt.applicationStage,
  targetSchools:       studyAbroadMgt.targetSchools,
  coeNumber:           studyAbroadMgt.coeNumber,
  coeExpiryDate:       studyAbroadMgt.coeExpiryDate,
  visaType:            studyAbroadMgt.visaType,
  visaApplicationDate: studyAbroadMgt.visaApplicationDate,
  visaDecisionDate:    studyAbroadMgt.visaDecisionDate,
  visaExpiryDate:      studyAbroadMgt.visaExpiryDate,
  visaGranted:         studyAbroadMgt.visaGranted,
  departureDate:       studyAbroadMgt.departureDate,
  orientationCompleted: studyAbroadMgt.orientationCompleted,
  status:              studyAbroadMgt.status,
  notes:               studyAbroadMgt.notes,
  programContext:      studyAbroadMgt.programContext,
  isActive:            studyAbroadMgt.isActive,
  createdAt:           studyAbroadMgt.createdAt,
  updatedAt:           studyAbroadMgt.updatedAt,
  contractNumber:      contracts.contractNumber,
  clientName:          accounts.name,
  studentName:         contracts.studentName,
  agentName:           contracts.agentName,
  staffFirstName:      users.fullName,
  contractStatus:      contracts.status,
  contractStartDate:   contracts.startDate,
  contractEndDate:     contracts.endDate,
  contractTotalAmount: contracts.totalAmount,
  contractCurrency:    contracts.currency,
  contractPaidAmount:  contracts.paidAmount,
  contractBalanceAmount: contracts.balanceAmount,
};

// ─── GET /api/services/study-abroad/visa-alerts ──────────────────────────────
// MUST be registered BEFORE /:id to avoid path conflict
router.get(
  "/services/study-abroad/visa-alerts",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const rows = await db
        .select(SELECT_COLS)
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(studyAbroadMgt.assignedStaffId, users.id))
        .where(
          and(
            eq(studyAbroadMgt.programContext, "study_abroad"),
            isNotNull(studyAbroadMgt.visaExpiryDate),
            lte(studyAbroadMgt.visaExpiryDate, sql`CURRENT_DATE + INTERVAL '30 days'`)
          )
        )
        .orderBy(studyAbroadMgt.visaExpiryDate);

      return res.json({ data: rows, count: rows.length });
    } catch (err) {
      console.error("[GET /api/services/study-abroad/visa-alerts]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/study-abroad ──────────────────────────────────────────
router.get(
  "/services/study-abroad",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { applicationStage, status, search, page = "1", limit = "20",
        sortBy = "createdOn", sortDir = "desc" } = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const conds: SQL[] = [
        eq(studyAbroadMgt.programContext, "study_abroad"),
      ];
      if (applicationStage) conds.push(eq(studyAbroadMgt.applicationStage, applicationStage));
      if (status)           conds.push(eq(studyAbroadMgt.status, status));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
          ilike(studyAbroadMgt.coeNumber, `%${search}%`),
        )!);
      }

      const where = and(...conds);

      const [{ total }] = await db
        .select({ total: count() })
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .where(where);

      const orderExpr = sortDir === "asc" ? asc(studyAbroadMgt.createdAt) : desc(studyAbroadMgt.createdAt);
      const rows = await db
        .select(SELECT_COLS)
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(studyAbroadMgt.assignedStaffId, users.id))
        .where(where)
        .orderBy(orderExpr)
        .limit(limitNum)
        .offset(offset);

      return res.json({
        data: rows,
        meta: { total: Number(total), page: pageNum, limit: limitNum, totalPages: Math.ceil(Number(total) / limitNum) },
      });
    } catch (err) {
      console.error("[GET /api/services/study-abroad]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/study-abroad/:id ──────────────────────────────────────
router.get(
  "/services/study-abroad/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select(SELECT_COLS)
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(studyAbroadMgt.assignedStaffId, users.id))
        .where(
          and(
            eq(studyAbroadMgt.id, req.params.id),
            eq(studyAbroadMgt.programContext, "study_abroad")
          )
        );

      if (!row) return res.status(404).json({ error: "Study abroad record not found" });
      return res.json(row);
    } catch (err) {
      console.error("[GET /api/services/study-abroad/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/study-abroad/:id ────────────────────────────────────
router.patch(
  "/services/study-abroad/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: studyAbroadMgt.id })
        .from(studyAbroadMgt)
        .where(
          and(
            eq(studyAbroadMgt.id, req.params.id),
            eq(studyAbroadMgt.programContext, "study_abroad")
          )
        );

      if (!existing) return res.status(404).json({ error: "Study abroad record not found" });

      const {
        applicationStage, targetSchools,
        coeNumber, coeExpiryDate,
        visaType, visaApplicationDate, visaDecisionDate, visaExpiryDate, visaGranted,
        departureDate, orientationCompleted, status, notes,
        assignedStaffId,
        studentFirstName, studentLastName, studentEnglishName, studentOriginalName,
        studentDateOfBirth, studentGender, studentNationality,
        studentPassportNumber, studentPassportExpiry, studentGrade, studentSchoolName,
      } = req.body;

      const [updated] = await db
        .update(studyAbroadMgt)
        .set({
          ...(applicationStage    !== undefined && { applicationStage }),
          ...(targetSchools       !== undefined && { targetSchools }),
          ...(coeNumber           !== undefined && { coeNumber }),
          ...(coeExpiryDate       !== undefined && { coeExpiryDate: coeExpiryDate || null }),
          ...(visaType            !== undefined && { visaType }),
          ...(visaApplicationDate !== undefined && { visaApplicationDate: visaApplicationDate || null }),
          ...(visaDecisionDate    !== undefined && { visaDecisionDate: visaDecisionDate || null }),
          ...(visaExpiryDate      !== undefined && { visaExpiryDate: visaExpiryDate || null }),
          ...(visaGranted         !== undefined && { visaGranted }),
          ...(departureDate       !== undefined && { departureDate: departureDate || null }),
          ...(orientationCompleted !== undefined && { orientationCompleted }),
          ...(status              !== undefined && { status }),
          ...(notes               !== undefined && { notes }),
          ...(assignedStaffId     !== undefined && { assignedStaffId }),
          ...(studentFirstName    !== undefined && { studentFirstName }),
          ...(studentLastName     !== undefined && { studentLastName }),
          ...(studentEnglishName  !== undefined && { studentEnglishName }),
          ...(studentOriginalName !== undefined && { studentOriginalName }),
          ...(studentDateOfBirth  !== undefined && { studentDateOfBirth: studentDateOfBirth || null }),
          ...(studentGender       !== undefined && { studentGender }),
          ...(studentNationality  !== undefined && { studentNationality }),
          ...(studentPassportNumber !== undefined && { studentPassportNumber }),
          ...(studentPassportExpiry !== undefined && { studentPassportExpiry: studentPassportExpiry || null }),
          ...(studentGrade        !== undefined && { studentGrade }),
          ...(studentSchoolName   !== undefined && { studentSchoolName }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(studyAbroadMgt.id, req.params.id),
            eq(studyAbroadMgt.programContext, "study_abroad")
          )
        )
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/study-abroad/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/study-abroad ─────────────────────────────────────────
router.post(
  "/services/study-abroad",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { contractId, applicationStage, assignedStaffId, notes } = req.body;
      if (!contractId) return res.status(400).json({ error: "contractId is required" });

      const [record] = await db
        .insert(studyAbroadMgt)
        .values({
          contractId,
          programContext:   "study_abroad",
          applicationStage: applicationStage ?? "counseling",
          ...(assignedStaffId && { assignedStaffId }),
          ...(notes          && { notes }),
        })
        .returning({ id: studyAbroadMgt.id });

      return res.status(201).json(record);
    } catch (err) {
      console.error("[POST /api/services/study-abroad]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/services/study-abroad/:id/toggle-active",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: studyAbroadMgt.id, isActive: studyAbroadMgt.isActive })
        .from(studyAbroadMgt)
        .where(eq(studyAbroadMgt.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [updated] = await db
        .update(studyAbroadMgt)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(studyAbroadMgt.id, req.params.id))
        .returning();
      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/study-abroad/:id/toggle-active]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
