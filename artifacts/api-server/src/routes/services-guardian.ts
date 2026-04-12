import { Router } from "express";
import { db } from "@workspace/db";
import { guardianMgt, contracts, users, invoices, accounts } from "@workspace/db/schema";
import { eq, and, ilike, or, count, isNotNull, lte, gte, isNull, sql, asc, desc, SQL, max } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];

// guardian users alias for guardian staff
const guardianUsers = users;

const SELECT_COLS = {
  id:                             guardianMgt.id,
  contractId:                     guardianMgt.contractId,
  leadId:                         guardianMgt.leadId,
  assignedStaffId:                guardianMgt.assignedStaffId,
  guardianStaffId:                guardianMgt.guardianStaffId,
  serviceStartDate:               guardianMgt.serviceStartDate,
  serviceEndDate:                 guardianMgt.serviceEndDate,
  billingCycle:                   guardianMgt.billingCycle,
  schoolId:                       guardianMgt.schoolId,
  officialGuardianRegistered:     guardianMgt.officialGuardianRegistered,
  schoolGuardianRegistrationDate: guardianMgt.schoolGuardianRegistrationDate,
  monthlyReports:                 guardianMgt.monthlyReports,
  parentContact:                  guardianMgt.parentContact,
  emergencyContact:               guardianMgt.emergencyContact,
  schoolEventsAttended:           guardianMgt.schoolEventsAttended,
  medicalEmergencies:             guardianMgt.medicalEmergencies,
  welfareInterventions:           guardianMgt.welfareInterventions,
  status:                         guardianMgt.status,
  notes:                          guardianMgt.notes,
  isActive:                       guardianMgt.isActive,
  createdAt:                      guardianMgt.createdAt,
  updatedAt:                      guardianMgt.updatedAt,
  serviceFee:                     guardianMgt.serviceFee,
  contractNumber:                 contracts.contractNumber,
  clientName:                     accounts.name,
  studentName:                    contracts.studentName,
  agentName:                      contracts.agentName,
  staffFirstName:                 users.fullName,
  contractStatus:                 contracts.status,
  contractStartDate:              contracts.startDate,
  contractEndDate:                contracts.endDate,
  contractTotalAmount:            contracts.totalAmount,
  contractCurrency:               contracts.currency,
  contractPaidAmount:             contracts.paidAmount,
  contractBalanceAmount:          contracts.balanceAmount,
};

// ─── GET /api/services/guardian/billing-due ───────────────────────────────────
// MUST be before /:id
router.get(
  "/services/guardian/billing-due",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const today = new Date();
      const rows = await db
        .select({
          ...SELECT_COLS,
        })
        .from(guardianMgt)
        .leftJoin(contracts, eq(guardianMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(guardianMgt.assignedStaffId, users.id))
        .where(
          and(
            isNotNull(guardianMgt.billingCycle),
            // Service has started
            lte(guardianMgt.serviceStartDate, today.toISOString().slice(0, 10)),
            // Service not yet ended (or no end date set)
            or(
              isNull(guardianMgt.serviceEndDate),
              gte(guardianMgt.serviceEndDate, today.toISOString().slice(0, 10))
            )!
          )
        )
        .orderBy(guardianMgt.createdAt);

      return res.json({ data: rows, count: rows.length });
    } catch (err) {
      console.error("[GET /api/services/guardian/billing-due]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/guardian ───────────────────────────────────────────────
router.get(
  "/services/guardian",
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
      if (status) conds.push(eq(guardianMgt.status, status));
      if (search) {
        conds.push(or(
          ilike(contracts.studentName, `%${search}%`),
          ilike(contracts.contractNumber, `%${search}%`),
        )!);
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(guardianMgt)
        .leftJoin(contracts, eq(guardianMgt.contractId, contracts.id))
        .where(where);

      const orderExpr = sortDir === "asc" ? asc(guardianMgt.createdAt) : desc(guardianMgt.createdAt);
      const rows = await db
        .select(SELECT_COLS)
        .from(guardianMgt)
        .leftJoin(contracts, eq(guardianMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(guardianMgt.assignedStaffId, users.id))
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
      console.error("[GET /api/services/guardian]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/guardian/:id ──────────────────────────────────────────
router.get(
  "/services/guardian/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select(SELECT_COLS)
        .from(guardianMgt)
        .leftJoin(contracts, eq(guardianMgt.contractId, contracts.id))
        .leftJoin(accounts, eq(contracts.accountId, accounts.id))
        .leftJoin(users, eq(guardianMgt.assignedStaffId, users.id))
        .where(eq(guardianMgt.id, req.params.id));

      if (!row) return res.status(404).json({ error: "Guardian record not found" });

      // Also fetch recurring invoices for this contract
      const recurringInvoices = row.contractId
        ? await db
            .select()
            .from(invoices)
            .where(
              and(
                eq(invoices.contractId, row.contractId),
                eq(invoices.isRecurring, true)
              )
            )
            .orderBy(invoices.recurringSeq)
        : [];

      return res.json({ ...row, recurringInvoices });
    } catch (err) {
      console.error("[GET /api/services/guardian/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/guardian/:id ────────────────────────────────────────
router.patch(
  "/services/guardian/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: guardianMgt.id })
        .from(guardianMgt)
        .where(eq(guardianMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Guardian record not found" });

      const {
        serviceStartDate, serviceEndDate, billingCycle,
        officialGuardianRegistered, schoolGuardianRegistrationDate,
        parentContact, emergencyContact,
        schoolEventsAttended, medicalEmergencies, welfareInterventions,
        status, notes, assignedStaffId, guardianStaffId,
      } = req.body;

      const [updated] = await db
        .update(guardianMgt)
        .set({
          ...(serviceStartDate             !== undefined && { serviceStartDate: serviceStartDate || null }),
          ...(serviceEndDate               !== undefined && { serviceEndDate: serviceEndDate || null }),
          ...(billingCycle                 !== undefined && { billingCycle }),
          ...(officialGuardianRegistered   !== undefined && { officialGuardianRegistered }),
          ...(schoolGuardianRegistrationDate !== undefined && { schoolGuardianRegistrationDate: schoolGuardianRegistrationDate || null }),
          ...(parentContact                !== undefined && { parentContact }),
          ...(emergencyContact             !== undefined && { emergencyContact }),
          ...(schoolEventsAttended         !== undefined && { schoolEventsAttended }),
          ...(medicalEmergencies           !== undefined && { medicalEmergencies }),
          ...(welfareInterventions         !== undefined && { welfareInterventions }),
          ...(status                       !== undefined && { status }),
          ...(notes                        !== undefined && { notes }),
          ...(assignedStaffId              !== undefined && { assignedStaffId }),
          ...(guardianStaffId              !== undefined && { guardianStaffId }),
          updatedAt: new Date(),
        })
        .where(eq(guardianMgt.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/guardian/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/guardian/:id/monthly-report ──────────────────────────
router.post(
  "/services/guardian/:id/monthly-report",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: guardianMgt.id, monthlyReports: guardianMgt.monthlyReports })
        .from(guardianMgt)
        .where(eq(guardianMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Guardian record not found" });

      const { month, reportText, sentAt, parentAcked } = req.body;
      if (!month) return res.status(400).json({ error: "month is required" });

      const existingReports = Array.isArray(existing.monthlyReports)
        ? (existing.monthlyReports as object[])
        : [];

      const newReport = {
        month,
        reportText: reportText || null,
        sentAt: sentAt || null,
        parentAcked: parentAcked ?? false,
      };

      const [updated] = await db
        .update(guardianMgt)
        .set({
          monthlyReports: [...existingReports, newReport],
          updatedAt: new Date(),
        })
        .where(eq(guardianMgt.id, req.params.id))
        .returning({ id: guardianMgt.id, monthlyReports: guardianMgt.monthlyReports });

      return res.json(updated);
    } catch (err) {
      console.error("[POST /api/services/guardian/:id/monthly-report]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/accounting/invoices/recurring ──────────────────────────────────
router.post(
  "/accounting/invoices/recurring",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        contractId, lineItems, subtotal, taxAmount, totalAmount, notes,
        invoiceType = "guardian",
        createdBy,
      } = req.body;

      if (!contractId) return res.status(400).json({ error: "contractId is required" });

      // Find parent invoice (first recurring for this contract)
      const existing = await db
        .select({
          id:           invoices.id,
          recurringSeq: invoices.recurringSeq,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.contractId, contractId),
            eq(invoices.isRecurring, true)
          )
        )
        .orderBy(invoices.recurringSeq);

      const prevMax    = existing.length > 0 ? (existing[existing.length - 1].recurringSeq ?? 0) : 0;
      const nextSeq    = prevMax + 1;
      const parentId   = existing.length > 0 ? existing[0].id : null;

      // Generate invoice number
      const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
      const invoiceNumber = `INV-${rand}`;

      const [inserted] = await db
        .insert(invoices)
        .values({
          invoiceNumber,
          contractId,
          invoiceType,
          lineItems: lineItems ?? [],
          subtotal:  subtotal  ?? totalAmount ?? "0",
          taxAmount: taxAmount ?? "0",
          totalAmount: totalAmount ?? "0",
          currency: "AUD",
          status: "draft",
          isRecurring: true,
          recurringSeq: nextSeq,
          parentInvoiceId: parentId ?? undefined,
          notes: notes || null,
          createdBy: createdBy ?? null,
        })
        .returning();

      return res.status(201).json(inserted);
    } catch (err) {
      console.error("[POST /api/accounting/invoices/recurring]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/guardian ─────────────────────────────────────────────
router.post(
  "/services/guardian",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { contractId, status, assignedStaffId, serviceFee, notes } = req.body;
      if (!contractId) return res.status(400).json({ error: "contractId is required" });

      const [dup] = await db.select({ id: guardianMgt.id }).from(guardianMgt)
        .where(eq(guardianMgt.contractId, contractId)).limit(1);
      if (dup) return res.status(409).json({ error: "Guardian service already exists for this contract" });

      const [record] = await db
        .insert(guardianMgt)
        .values({
          contractId,
          status: status ?? "active",
          ...(assignedStaffId && { assignedStaffId }),
          ...(serviceFee      && { serviceFee }),
          ...(notes           && { notes }),
        })
        .returning({ id: guardianMgt.id });

      return res.status(201).json(record);
    } catch (err) {
      console.error("[POST /api/services/guardian]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/services/guardian/:id/toggle-active",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: guardianMgt.id, isActive: guardianMgt.isActive })
        .from(guardianMgt)
        .where(eq(guardianMgt.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Not found" });
      const [updated] = await db
        .update(guardianMgt)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(guardianMgt.id, req.params.id))
        .returning();
      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/guardian/:id/toggle-active]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
