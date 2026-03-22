import { Router } from "express";
import { db } from "@workspace/db";
import { studyAbroadMgt, contracts, users } from "@workspace/db/schema";
import { eq, and, ilike, or, lte, isNotNull, sql, count, SQL } from "drizzle-orm";
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
  createdAt:           studyAbroadMgt.createdAt,
  updatedAt:           studyAbroadMgt.updatedAt,
  contractNumber:      contracts.contractNumber,
  studentName:         contracts.studentName,
  agentName:           contracts.agentName,
  staffFirstName:      users.firstName,
  staffLastName:       users.lastName,
};

// ─── GET /api/services/study-abroad/visa-alerts ──────────────────────────────
// MUST be registered BEFORE /:id to avoid path conflict
router.get(
  "/api/services/study-abroad/visa-alerts",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const rows = await db
        .select(SELECT_COLS)
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .leftJoin(users, eq(studyAbroadMgt.assignedStaffId, users.id))
        .where(
          and(
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
  "/api/services/study-abroad",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { applicationStage, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;

      const conds: SQL[] = [];
      if (applicationStage) conds.push(eq(studyAbroadMgt.applicationStage, applicationStage));
      if (status)           conds.push(eq(studyAbroadMgt.status, status));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
          ilike(studyAbroadMgt.coeNumber, `%${search}%`),
        )!);
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .where(where);

      const rows = await db
        .select(SELECT_COLS)
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .leftJoin(users, eq(studyAbroadMgt.assignedStaffId, users.id))
        .where(where)
        .orderBy(studyAbroadMgt.createdAt)
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
  "/api/services/study-abroad/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select(SELECT_COLS)
        .from(studyAbroadMgt)
        .leftJoin(contracts, eq(studyAbroadMgt.contractId, contracts.id))
        .leftJoin(users, eq(studyAbroadMgt.assignedStaffId, users.id))
        .where(eq(studyAbroadMgt.id, req.params.id));

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
  "/api/services/study-abroad/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: studyAbroadMgt.id })
        .from(studyAbroadMgt)
        .where(eq(studyAbroadMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Study abroad record not found" });

      const {
        applicationStage, targetSchools,
        coeNumber, coeExpiryDate,
        visaType, visaApplicationDate, visaDecisionDate, visaExpiryDate, visaGranted,
        departureDate, orientationCompleted, status, notes,
        assignedStaffId,
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
          updatedAt: new Date(),
        })
        .where(eq(studyAbroadMgt.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/study-abroad/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
