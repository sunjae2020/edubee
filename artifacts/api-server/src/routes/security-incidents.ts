import { Router } from "express";
import { db } from "@workspace/db";
import { securityIncidents } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { reportSecurityIncident } from "../lib/incidentReporter.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";

const router = Router();
const SUPER_ADMIN_ROLES = ["super_admin", "admin"] as const;

const IncidentSchema = z.object({
  type: z.enum(["unauthorized_access", "data_breach", "account_compromise", "suspicious_activity"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(10),
  affectedDataTypes: z.array(z.string()).optional().default([]),
  estimatedAffectedCount: z.number().int().nonnegative().optional().default(0),
  notes: z.string().optional(),
});

// GET /api/security-incidents — 목록 (super_admin / admin만)
router.get("/security-incidents", authenticate, requireRole(...SUPER_ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(securityIncidents)
      .orderBy(desc(securityIncidents.detectedAt))
      .limit(100);
    return res.json(rows);
  } catch (err) {
    logger.error({ err }, "[GET /security-incidents] Internal error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/security-incidents — 사고 기록 + 알림 발송
router.post("/security-incidents", authenticate, requireRole(...SUPER_ADMIN_ROLES), async (req, res) => {
  try {
    const parsed = IncidentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
    }
    const { type, severity, description, affectedDataTypes, estimatedAffectedCount, notes } = parsed.data;
    const incidentId = await reportSecurityIncident({
      type,
      severity,
      description,
      affectedDataTypes,
      estimatedAffectedCount,
      reportedBy: (req.user as any).id,
      notes,
    });
    return res.status(201).json({
      success: true,
      incidentId,
      message: severity === "high" || severity === "critical"
        ? "Incident recorded. Alert email sent. Remember: NDB Scheme requires OAIC notification within 30 days."
        : "Incident recorded.",
    });
  } catch (err) {
    logger.error({ err }, "[POST /security-incidents] Internal error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/security-incidents/:id — OAIC 신고 완료 표시
router.patch("/security-incidents/:id", authenticate, requireRole(...SUPER_ADMIN_ROLES), async (req, res) => {
  try {
    const { reportedToOaic, oaicReportNumber, notificationSentToAffected, resolvedAt, notes } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (reportedToOaic !== undefined) {
      updates.reportedToOaic = reportedToOaic;
      if (reportedToOaic) updates.reportedToOaicAt = new Date();
    }
    if (oaicReportNumber !== undefined) updates.oaicReportNumber = oaicReportNumber;
    if (notificationSentToAffected !== undefined) {
      updates.notificationSentToAffected = notificationSentToAffected;
      if (notificationSentToAffected) updates.notificationSentAt = new Date();
    }
    if (resolvedAt !== undefined) updates.resolvedAt = resolvedAt ? new Date(resolvedAt) : null;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
      .update(securityIncidents)
      .set(updates)
      .where(eq(securityIncidents.id, req.params.id as string))
      .returning();
    if (!updated) return res.status(404).json({ error: "Incident not found" });
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "[PATCH /security-incidents/:id] Internal error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
