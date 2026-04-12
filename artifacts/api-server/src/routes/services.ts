import { Router } from "express";
import { db } from "@workspace/db";
import {
  pickupMgt, tourMgt, settlementMgt,
  settlementChecklistTemplates, contracts, applications, users, accounts
} from "@workspace/db/schema";
import { eq, and, inArray, sql, SQL, asc, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UserRole = string;

function isAdminOrCC(role: UserRole) {
  return ["super_admin", "admin", "camp_coordinator"].includes(role);
}

/** Batch enrich rows with full contract info via contractId → contract → application → client user */
async function enrichWithContractInfo(rows: any[]): Promise<any[]> {
  const contractIds = [...new Set(rows.map(r => r.contractId).filter(Boolean))];
  if (contractIds.length === 0) return rows;

  const contractRows = await db
    .select({
      contractId: contracts.id,
      contractNumber: contracts.contractNumber,
      contractStatus: contracts.status,
      contractStartDate: contracts.startDate,
      contractEndDate: contracts.endDate,
      totalAmount: contracts.totalAmount,
      currency: contracts.currency,
      studentName: users.fullName,
      clientEmail: users.email,
      clientName: accounts.name,
    })
    .from(contracts)
    .leftJoin(applications, eq(contracts.applicationId, applications.id))
    .leftJoin(users, eq(applications.clientId, users.id))
    .leftJoin(accounts, eq(contracts.accountId, accounts.id))
    .where(inArray(contracts.id, contractIds));

  const contractMap = new Map(contractRows.map(c => [c.contractId, {
    clientName: c.clientName ?? null,
    studentName: c.studentName ?? null,
    clientEmail: c.clientEmail ?? null,
    contractNumber: c.contractNumber ?? null,
    contractStatus: c.contractStatus ?? null,
    contractStartDate: c.contractStartDate ?? null,
    contractEndDate: c.contractEndDate ?? null,
    totalAmount: c.totalAmount ?? null,
    currency: c.currency ?? null,
  }]));

  return rows.map(r => {
    const info = contractMap.get(r.contractId) ?? {};
    return { ...r, ...info };
  });
}

async function enrichSettlementConsultants(rows: any[]): Promise<any[]> {
  const consultantIds = [...new Set(rows.map(r => r.assignedConsultantId).filter(Boolean))];
  if (consultantIds.length === 0) return rows;
  const consultantRows = await db.select({ id: users.id, fullName: users.fullName })
    .from(users).where(inArray(users.id, consultantIds));
  const map = new Map(consultantRows.map(u => [u.id, u.fullName]));
  return rows.map(r => ({ ...r, consultantName: map.get(r.assignedConsultantId) ?? null }));
}

// ── Pickup Management ────────────────────────────────────────────────
// NOTE: GET /services/pickup list is handled by services-pickup.ts (supports source/search/pagination filters)

router.get("/services/pickup/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: "Not Found" });
    const [rec] = await db.select().from(pickupMgt).where(eq(pickupMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    // Internal staff: no ownership restriction
    const [enriched] = await enrichWithContractInfo([rec]);
    return res.json({ data: enriched });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/pickup/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(pickupMgt).where(eq(pickupMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    // Internal staff: no ownership restriction

    const { vehicleInfo, driverNotes, status, pickupType, fromLocation, toLocation, pickupDatetime, driverId } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (vehicleInfo !== undefined) updates.vehicleInfo = vehicleInfo;
    if (driverNotes !== undefined) updates.driverNotes = driverNotes;
    if (status !== undefined) updates.status = status;

    if (isAdminOrCC(role)) {
      if (pickupType !== undefined) updates.pickupType = pickupType;
      if (fromLocation !== undefined) updates.fromLocation = fromLocation;
      if (toLocation !== undefined) updates.toLocation = toLocation;
      if (pickupDatetime !== undefined) updates.pickupDatetime = pickupDatetime;
      if (driverId !== undefined) updates.driverId = driverId;
    }

    const [updated] = await db.update(pickupMgt).set(updates).where(eq(pickupMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Tour Management ──────────────────────────────────────────────────

router.get("/services/tour", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    let query = db.select().from(tourMgt);
    const data = false
      ? await query.where(eq(tourMgt.tourCompanyId, uid))
      : await query;
    return res.json({ data: await enrichWithContractInfo(data) });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/services/tour/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: "Not Found" });
    const [rec] = await db.select().from(tourMgt).where(eq(tourMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    // Internal staff: no ownership restriction
    const [enriched] = await enrichWithContractInfo([rec]);
    return res.json({ data: enriched });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/tour/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(tourMgt).where(eq(tourMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    // Internal staff: no ownership restriction

    const { highlights, guideInfo, tourNotes, status, tourName, tourDate, startTime, endTime, meetingPoint, tourCompanyId } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (highlights !== undefined) updates.highlights = highlights;
    if (guideInfo !== undefined) updates.guideInfo = guideInfo;
    if (tourNotes !== undefined) updates.tourNotes = tourNotes;
    if (status !== undefined) updates.status = status;

    if (isAdminOrCC(role)) {
      if (tourName !== undefined) updates.tourName = tourName;
      if (tourDate !== undefined) updates.tourDate = tourDate;
      if (startTime !== undefined) updates.startTime = startTime;
      if (endTime !== undefined) updates.endTime = endTime;
      if (meetingPoint !== undefined) updates.meetingPoint = meetingPoint;
      if (tourCompanyId !== undefined) updates.tourCompanyId = tourCompanyId;
    }

    const [updated] = await db.update(tourMgt).set(updates).where(eq(tourMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Settlement Management ────────────────────────────────────────────

router.get("/services/settlement", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;

    // Internal staff only: access granted

    const { contractId, providerId, status, overallStatus, sortBy = "createdAt", sortDir = "desc" } = req.query as Record<string, string>;
    const colMap: Record<string, unknown> = { createdAt: settlementMgt.createdAt, arrivalDate: settlementMgt.arrivalDate, settlementDate: settlementMgt.settlementDate };
    const col = (colMap[sortBy] ?? settlementMgt.createdAt) as Parameters<typeof desc>[0];
    const orderExpr = sortDir === "asc" ? asc(col) : desc(col);

    const conditions: SQL[] = [];
    if (contractId)   conditions.push(eq(settlementMgt.contractId, contractId));
    if (providerId)   conditions.push(eq(settlementMgt.providerUserId, providerId));
    if (status)       conditions.push(eq(settlementMgt.status, status));
    if (overallStatus) conditions.push(eq(settlementMgt.overallStatus, overallStatus));

    if (role.startsWith("partner_")) {
      conditions.push(eq(settlementMgt.providerUserId, uid));
    } else if (role === "camp_coordinator") {
      const ownContracts = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.campProviderId, uid));
      const contractIds = ownContracts.map(c => c.id);
      if (contractIds.length === 0) return res.json({ data: [] });
      const rawData = await db.select().from(settlementMgt).orderBy(orderExpr);
      const data = rawData.filter(s => s.contractId && contractIds.includes(s.contractId));
      const enriched = await enrichWithContractInfo(data);
      return res.json({ data: await enrichSettlementConsultants(enriched) });
    } else if (role === "consultant") {
      conditions.push(eq(settlementMgt.providerUserId, uid));
    }

    const data = conditions.length > 0
      ? await db.select().from(settlementMgt).where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(orderExpr)
      : await db.select().from(settlementMgt).orderBy(orderExpr);

    const enriched = await enrichWithContractInfo(data);
    return res.json({ data: await enrichSettlementConsultants(enriched) });
  } catch (err) {
    console.error("Settlement list error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/services/settlement", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!isAdminOrCC(role)) return res.status(403).json({ error: "Forbidden" });

    const { contractId } = req.body;
    if (contractId) {
      const [dup] = await db.select({ id: settlementMgt.id }).from(settlementMgt)
        .where(eq(settlementMgt.contractId, contractId)).limit(1);
      if (dup) return res.status(409).json({ error: "Settlement service already exists for this contract" });
    }

    const [settlement] = await db.insert(settlementMgt).values({
      ...req.body,
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    return res.status(201).json(settlement);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/settlement/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [rec] = await db.select().from(settlementMgt).where(eq(settlementMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role.startsWith("partner_") && rec.providerUserId !== uid) return res.status(403).json({ error: "Forbidden" });

    const [updated] = await db.update(settlementMgt).set({ ...req.body, updatedAt: new Date() })
      .where(eq(settlementMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/services/settlement/:id/status", authenticate, async (req, res) => {
  try {
    const { status, settlementDate } = req.body;
    const updates: Record<string, any> = { status, updatedAt: new Date() };
    if (settlementDate) updates.settlementDate = settlementDate;
    const [updated] = await db.update(settlementMgt).set(updates)
      .where(eq(settlementMgt.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET settlement detail
router.get("/services/settlement/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid  = req.user!.id;
    // Internal staff only: access granted

    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: "Not Found" });

    const [rec] = await db.select().from(settlementMgt)
      .where(eq(settlementMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });
    if (role.startsWith("partner_") && rec.providerUserId !== uid)
      return res.status(403).json({ error: "Forbidden" });

    // Enrich with consultant name
    let consultantName: string | null = null;
    if (rec.assignedConsultantId) {
      const [u] = await db.select({ fullName: users.fullName })
        .from(users).where(eq(users.id, rec.assignedConsultantId)).limit(1);
      consultantName = u?.fullName ?? null;
    }

    const [enriched] = await enrichWithContractInfo([rec]);
    return res.json({ ...enriched, consultantName });
  } catch (err) {
    console.error("Settlement detail error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH settlement checklist item
router.patch("/services/settlement/:id/checklist", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!isAdminOrCC(role)) return res.status(403).json({ error: "Forbidden" });

    const { key, updates: itemUpdates } = req.body as { key: string; updates: Record<string, any> };
    const [rec] = await db.select({ checklist: settlementMgt.checklist })
      .from(settlementMgt).where(eq(settlementMgt.id, req.params.id)).limit(1);
    if (!rec) return res.status(404).json({ error: "Not Found" });

    const items: any[] = (rec.checklist as any[]) ?? [];
    const idx = items.findIndex((i: any) => i.key === key);
    if (idx === -1) return res.status(404).json({ error: "Checklist item not found" });
    items[idx] = { ...items[idx], ...itemUpdates };

    const [updated] = await db.update(settlementMgt).set({ checklist: items, updatedAt: new Date() })
      .where(eq(settlementMgt.id, req.params.id)).returning();
    return res.json(updated);
  } catch (err) {
    console.error("Checklist update error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Settlement Checklist Templates ──────────────────────────────────────────

router.get("/services/settlement-templates", authenticate, async (req, res) => {
  try {
    const templates = await db.select().from(settlementChecklistTemplates)
      .orderBy(desc(settlementChecklistTemplates.isDefault), settlementChecklistTemplates.name);
    return res.json({ data: templates });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/services/settlement-templates", authenticate, async (req, res) => {
  try {
    if (!isAdminOrCC(req.user!.role)) return res.status(403).json({ error: "Forbidden" });
    const [tmpl] = await db.insert(settlementChecklistTemplates).values({
      ...req.body,
      createdBy: req.user!.id,
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    return res.status(201).json(tmpl);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/services/settlement-templates/:id", authenticate, async (req, res) => {
  try {
    if (!isAdminOrCC(req.user!.role)) return res.status(403).json({ error: "Forbidden" });
    const [updated] = await db.update(settlementChecklistTemplates)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(settlementChecklistTemplates.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/services/settlement-templates/:id", authenticate, async (req, res) => {
  try {
    if (!isAdminOrCC(req.user!.role)) return res.status(403).json({ error: "Forbidden" });
    await db.delete(settlementChecklistTemplates).where(eq(settlementChecklistTemplates.id, req.params.id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
