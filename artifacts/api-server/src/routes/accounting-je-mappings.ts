import { Router } from "express";
import { db } from "@workspace/db";
import { journalEntryMappings } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { invalidateMappingCache } from "../services/journalEntryService.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "finance"];
const ADMIN_ROLES = ["super_admin", "admin"];

// GET — list all mappings
router.get(
  "/accounting/je-mappings",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
      const rows = await db
        .select()
        .from(journalEntryMappings)
        .where(eq(journalEntryMappings.organisationId, tenantId))
        .orderBy(asc(journalEntryMappings.paymentType), asc(journalEntryMappings.splitType));
      return res.json({ data: rows });
    } catch (err) {
      console.error("[GET /api/accounting/je-mappings]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST — create new mapping
router.post(
  "/accounting/je-mappings",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
      const { paymentType, splitType, debitCoa, creditCoa, entryType, description } = req.body;
      if (!paymentType || !debitCoa || !creditCoa || !entryType) {
        return res.status(400).json({ error: "paymentType, debitCoa, creditCoa, entryType are required" });
      }
      const [row] = await db.insert(journalEntryMappings).values({
        organisationId: tenantId,
        paymentType,
        splitType:   splitType || "*",
        debitCoa,
        creditCoa,
        entryType,
        description: description ?? null,
        createdBy:   req.user?.id ?? null,
      }).returning();
      invalidateMappingCache(tenantId);
      return res.status(201).json(row);
    } catch (err) {
      console.error("[POST /api/accounting/je-mappings]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PATCH — update mapping
router.patch(
  "/accounting/je-mappings/:id",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(400).json({ error: "Tenant context required" });
      const { debitCoa, creditCoa, entryType, description, isActive } = req.body;
      const patch: Record<string, unknown> = { modifiedOn: new Date() };
      if (debitCoa    !== undefined) patch.debitCoa    = debitCoa;
      if (creditCoa   !== undefined) patch.creditCoa   = creditCoa;
      if (entryType   !== undefined) patch.entryType   = entryType;
      if (description !== undefined) patch.description = description;
      if (isActive    !== undefined) patch.isActive    = isActive;

      const [row] = await db
        .update(journalEntryMappings)
        .set(patch)
        .where(and(
          eq(journalEntryMappings.id, req.params.id as string),
          eq(journalEntryMappings.organisationId, tenantId),
        ))
        .returning();
      if (!row) return res.status(404).json({ error: "Mapping not found" });
      invalidateMappingCache(tenantId);
      return res.json(row);
    } catch (err) {
      console.error("[PATCH /api/accounting/je-mappings/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST — refresh cache manually
router.post(
  "/accounting/je-mappings/refresh-cache",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    invalidateMappingCache(req.tenantId);
    return res.json({ ok: true });
  }
);

export default router;
