import { Router } from "express";
import { db } from "@workspace/db";
import {
  contracts, applications, packageGroups,
  pickupMgt, tourMgt, settlementMgt,
  invoices, receipts, transactions, users,
} from "@workspace/db/schema";
import { eq, and, ilike, count, inArray, SQL, exists, or } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { reverseAllPendingForContract } from "../services/ledgerService.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

function generateContractNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CON-${year}${month}-${random}`;
}

router.get("/contracts", authenticate, async (req, res) => {
  try {
    const { status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(contracts.status, status));
    if (search) conditions.push(ilike(contracts.contractNumber, `%${search}%`));

    // Camp coordinators only see contracts for applications in their assigned package groups
    if (req.user!.role === "camp_coordinator") {
      const orgId = req.user!.organisationId ?? req.user!.id;
      conditions.push(
        exists(
          db.select({ _: applications.id })
            .from(applications)
            .innerJoin(packageGroups, eq(applications.packageGroupId, packageGroups.id))
            .where(
              and(
                eq(contracts.applicationId, applications.id),
                or(
                  eq(packageGroups.coordinatorId, orgId),
                  eq(packageGroups.campProviderId, orgId)
                )
              )
            )
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(contracts).where(whereClause);
    
    const rows = await db
      .select({
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        applicationId: contracts.applicationId,
        totalAmount: contracts.totalAmount,
        currency: contracts.currency,
        status: contracts.status,
        studentName: contracts.studentName,
        clientEmail: contracts.clientEmail,
        createdAt: contracts.createdAt,
        updatedAt: contracts.updatedAt,
      })
      .from(contracts)
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(contracts.createdAt);

    const total = Number(totalResult.count);
    return res.json({ data: rows, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error("[GET /contracts]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/contracts", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const body = req.body;
    body.contractNumber = generateContractNumber();
    const [contract] = await db.insert(contracts).values(body).returning();
    return res.status(201).json(contract);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/contracts/:id", authenticate, async (req, res) => {
  try {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, req.params.id)).limit(1);
    if (!contract) return res.status(404).json({ error: "Not Found" });

    let application = null;
    if (contract.applicationId) {
      const [app] = await db.select().from(applications).where(eq(applications.id, contract.applicationId)).limit(1);
      application = app || null;
    }

    return res.json({ ...contract, application });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/contracts/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const ALLOWED = [
      "status", "currency", "totalAmount", "paidAmount", "balanceAmount",
      "startDate", "endDate", "signedAt",
      "studentName", "clientEmail", "clientCountry",
      "packageGroupName", "packageName", "agentName",
      "notes", "campProviderId",
    ];
    const body: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in req.body) body[key] = req.body[key] === "" ? null : req.body[key];
    }
    const [contract] = await db.update(contracts).set({ ...body, updatedAt: new Date() })
      .where(eq(contracts.id, req.params.id)).returning();
    if (!contract) return res.status(404).json({ error: "Not Found" });

    // TRIGGER D: Contract cancelled → reverse all pending ledger entries
    if (body.status === 'cancelled') {
      try {
        const result = await reverseAllPendingForContract(
          req.params.id,
          'Contract cancelled',
          req.user!.id,
        );
        console.log(`Reversed ${result.reversed} ledger entries for contract ${req.params.id}`);
      } catch (e: any) {
        console.error('Contract cancellation ledger reversal failed:', e.message);
      }
    }

    return res.json(contract);
  } catch (err) {
    console.error("PUT /contracts/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/contracts/:id/services", authenticate, async (req, res) => {
  try {
    const cid = req.params.id;
    const [pickupRec] = await db.select().from(pickupMgt).where(eq(pickupMgt.contractId, cid)).limit(1);
    const [tourRec] = await db.select().from(tourMgt).where(eq(tourMgt.contractId, cid)).limit(1);
    const settlements = await db.select().from(settlementMgt).where(eq(settlementMgt.contractId, cid));

    const enrichSettlements = await Promise.all(settlements.map(async (s) => {
      let providerName: string | null = null;
      if (s.providerUserId) {
        const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, s.providerUserId)).limit(1);
        providerName = u?.fullName ?? null;
      }
      return { ...s, providerName };
    }));

    return res.json({
      pickup: pickupRec ?? null,
      tour: tourRec ?? null,
      settlements: enrichSettlements,
    });
  } catch (err) {
    console.error("Contract services error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/contracts/:id/services/pickup", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const cid = req.params.id;
    const { pickupType, fromLocation, toLocation, pickupDatetime, vehicleInfo, driverNotes, status } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (pickupType !== undefined) updates.pickupType = pickupType;
    if (fromLocation !== undefined) updates.fromLocation = fromLocation;
    if (toLocation !== undefined) updates.toLocation = toLocation;
    if (pickupDatetime !== undefined) updates.pickupDatetime = pickupDatetime ? new Date(pickupDatetime) : null;
    if (vehicleInfo !== undefined) updates.vehicleInfo = vehicleInfo;
    if (driverNotes !== undefined) updates.driverNotes = driverNotes;
    if (status !== undefined) updates.status = status;
    const [updated] = await db.update(pickupMgt).set(updates).where(eq(pickupMgt.contractId, cid)).returning();
    if (!updated) return res.status(404).json({ error: "No pickup service found for this contract" });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH pickup error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/contracts/:id/services/tour", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const cid = req.params.id;
    const { tourName, tourDate, startTime, endTime, meetingPoint, highlights, guideInfo, tourNotes, status } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (tourName !== undefined) updates.tourName = tourName;
    if (tourDate !== undefined) updates.tourDate = tourDate || null;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (meetingPoint !== undefined) updates.meetingPoint = meetingPoint;
    if (highlights !== undefined) updates.highlights = highlights;
    if (guideInfo !== undefined) updates.guideInfo = guideInfo;
    if (tourNotes !== undefined) updates.tourNotes = tourNotes;
    if (status !== undefined) updates.status = status;
    const [updated] = await db.update(tourMgt).set(updates).where(eq(tourMgt.contractId, cid)).returning();
    if (!updated) return res.status(404).json({ error: "No tour service found for this contract" });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH tour error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/contracts/:id/accounting", authenticate, async (req, res) => {
  try {
    const cid = req.params.id;
    const contractInvoices = await db.select().from(invoices).where(eq(invoices.contractId, cid));
    const invoiceIds = contractInvoices.map(i => i.id);

    const allReceipts = invoiceIds.length > 0
      ? (await Promise.all(invoiceIds.map(iid =>
          db.select().from(receipts).where(eq(receipts.invoiceId, iid))
        ))).flat()
      : [];

    const contractTxns = await db.select().from(transactions).where(eq(transactions.contractId, cid));

    const totalPaid = contractInvoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
    const totalSent = contractInvoices.filter(i => i.status === "sent").reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
    const totalReceived = allReceipts.filter(r => r.status === "confirmed").reduce((s, r) => s + Number(r.amount ?? 0), 0);

    return res.json({
      invoices: contractInvoices,
      receipts: allReceipts,
      transactions: contractTxns,
      summary: { totalPaid, totalSent, totalReceived },
    });
  } catch (err) {
    console.error("Contract accounting error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/contracts/:id/toggle-active", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const [existing] = await db
      .select({ id: contracts.id, isActive: contracts.isActive })
      .from(contracts)
      .where(eq(contracts.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Contract not found" });
    const [updated] = await db
      .update(contracts)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(contracts.id, req.params.id))
      .returning();
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/contracts/:id/toggle-active]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
