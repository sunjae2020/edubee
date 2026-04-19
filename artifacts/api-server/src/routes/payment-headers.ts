import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentHeaders,
  paymentLines,
} from "@workspace/db/schema";
import { eq, and, gte, lte, SQL, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { logAudit, auditParamsFromReq } from "../lib/auditLogger.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];
const ADMIN_ROLES = ["super_admin", "admin"];

function genPayRef(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "PAY-";
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

function userId(req: any): string {
  return req.user?.id ?? "00000000-0000-0000-0000-000000000000";
}

// ─── GET /api/payment-headers ────────────────────────────────────────────────
router.get(
  "/payment-headers",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { student_id, payment_type, from_date, to_date } =
        req.query as Record<string, string>;
      const conds: SQL[] = [];
      if (payment_type) conds.push(eq(paymentHeaders.paymentType, payment_type));
      if (from_date) conds.push(gte(paymentHeaders.paymentDate, from_date));
      if (to_date) conds.push(lte(paymentHeaders.paymentDate, to_date));
      if (student_id) conds.push(eq(paymentHeaders.receivedFrom, student_id));
      const where = conds.length ? and(...conds) : undefined;

      const rows = await db
        .select()
        .from(paymentHeaders)
        .where(where)
        .orderBy(desc(paymentHeaders.createdOn))
        .limit(300);

      return res.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/payment-headers]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/payment-headers/:id ────────────────────────────────────────────
router.get(
  "/payment-headers/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [header] = await db
        .select()
        .from(paymentHeaders)
        .where(eq(paymentHeaders.id, req.params.id));
      if (!header) return res.status(404).json({ error: "Payment header not found" });

      const lines = await db
        .select()
        .from(paymentLines)
        .where(eq(paymentLines.paymentHeaderId, req.params.id));

      return res.json({ ...header, lines });
    } catch (err) {
      console.error("[GET /api/payment-headers/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/payment-headers ───────────────────────────────────────────────
router.post(
  "/payment-headers",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const {
        paymentDate,
        paymentMethod,
        paymentType,
        currency,
        receivedFrom,
        paidTo,
        bankReference,
        paymentInfoId,
        notes,
        approvedBy,
      } = req.body;

      if (!paymentDate || !paymentType) {
        return res.status(400).json({ error: "paymentDate and paymentType are required" });
      }

      const [header] = await db
        .insert(paymentHeaders)
        .values({
          paymentRef: genPayRef(),
          paymentDate,
          totalAmount: "0",
          currency: currency ?? "AUD",
          paymentMethod: paymentMethod ?? null,
          paymentType,
          receivedFrom: receivedFrom ?? null,
          paidTo: paidTo ?? null,
          bankReference: bankReference ?? null,
          paymentInfoId: paymentInfoId ?? null,
          notes: notes ?? null,
          createdBy: userId(req),
          approvedBy: approvedBy ?? null,
          status: "Active",
        })
        .returning();

      logAudit({ tableName: "payment_headers", recordId: header.id, action: "CREATE", newValues: header as unknown as Record<string, unknown>, ...auditParamsFromReq(req) }).catch(() => {});
      return res.status(201).json(header);
    } catch (err) {
      console.error("[POST /api/payment-headers]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PUT /api/payment-headers/:id ────────────────────────────────────────────
router.put(
  "/payment-headers/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: paymentHeaders.id, status: paymentHeaders.status })
        .from(paymentHeaders)
        .where(eq(paymentHeaders.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Payment header not found" });
      if (existing.status === "Void") {
        return res.status(400).json({ error: "Cannot modify a voided payment" });
      }

      const {
        paymentDate,
        paymentMethod,
        paymentType,
        currency,
        bankReference,
        notes,
        approvedBy,
        status,
      } = req.body;

      const updatePayload: Record<string, unknown> = { modifiedOn: new Date() };
      if (paymentDate !== undefined) updatePayload.paymentDate = paymentDate;
      if (paymentMethod !== undefined) updatePayload.paymentMethod = paymentMethod;
      if (paymentType !== undefined) updatePayload.paymentType = paymentType;
      if (currency !== undefined) updatePayload.currency = currency;
      if (bankReference !== undefined) updatePayload.bankReference = bankReference;
      if (notes !== undefined) updatePayload.notes = notes;
      if (approvedBy !== undefined) updatePayload.approvedBy = approvedBy;
      if (status !== undefined && status !== "Void") updatePayload.status = status;

      const [updated] = await db
        .update(paymentHeaders)
        .set(updatePayload as any)
        .where(eq(paymentHeaders.id, req.params.id))
        .returning();

      logAudit({ tableName: "payment_headers", recordId: updated.id, action: "UPDATE", newValues: updatePayload, changedFields: Object.keys(updatePayload), ...auditParamsFromReq(req) }).catch(() => {});
      return res.json(updated);
    } catch (err) {
      console.error("[PUT /api/payment-headers/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── DELETE /api/payment-headers/:id  (soft delete → Void) ──────────────────
router.delete(
  "/payment-headers/:id",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: paymentHeaders.id, status: paymentHeaders.status })
        .from(paymentHeaders)
        .where(eq(paymentHeaders.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Payment header not found" });
      if (existing.status === "Void") {
        return res.status(400).json({ error: "Payment already voided" });
      }

      const [updated] = await db
        .update(paymentHeaders)
        .set({ status: "Void", modifiedOn: new Date() })
        .where(eq(paymentHeaders.id, req.params.id))
        .returning();

      logAudit({ tableName: "payment_headers", recordId: existing.id, action: "DELETE", oldValues: existing as unknown as Record<string, unknown>, ...auditParamsFromReq(req) }).catch(() => {});
      return res.json({ message: "Payment voided", data: updated });
    } catch (err) {
      console.error("[DELETE /api/payment-headers/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
