import { Router } from "express";
import { db } from "@workspace/db";
import { pickupMgt, contracts, users, products } from "@workspace/db/schema";
import { eq, and, sql, count, SQL, gte, lt, lte, isNull, isNotNull } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const STAFF_ROLES = ["super_admin", "admin", "camp_coordinator"];
const ALL_PICKUP_ROLES = [...STAFF_ROLES, "partner_pickup"];

const SELECT_COLS = {
  id:             pickupMgt.id,
  contractId:     pickupMgt.contractId,
  driverId:       pickupMgt.driverId,
  pickupType:     pickupMgt.pickupType,
  fromLocation:   pickupMgt.fromLocation,
  toLocation:     pickupMgt.toLocation,
  pickupDatetime: pickupMgt.pickupDatetime,
  driverName:     pickupMgt.driverName,
  driverContact:  pickupMgt.driverContact,
  vehicleInfo:    pickupMgt.vehicleInfo,
  driverNotes:    pickupMgt.driverNotes,
  status:         pickupMgt.status,
  ledgerEntryId:  pickupMgt.ledgerEntryId,
  productId:      pickupMgt.productId,
  serviceFee:     pickupMgt.serviceFee,
  apCost:         pickupMgt.apCost,
  flightNo:       pickupMgt.flightNo,
  timezone:       pickupMgt.timezone,
  createdAt:      pickupMgt.createdAt,
  updatedAt:      pickupMgt.updatedAt,
  // joined
  contractNumber:    contracts.contractNumber,
  studentName:       contracts.studentName,
  clientEmail:       contracts.clientEmail,
  agentName:         contracts.agentName,
  contractStatus:    contracts.status,
  contractStartDate: contracts.startDate,
  contractEndDate:   contracts.endDate,
  totalAmount:       contracts.totalAmount,
  currency:          contracts.currency,
};

// ─── GET /api/services/pickup ─────────────────────────────────────────────────
router.get(
  "/services/pickup",
  authenticate,
  requireRole(...ALL_PICKUP_ROLES),
  async (req, res) => {
    try {
      const {
        today, this_week, status, source, search,
        page = "1", limit = "20",
      } = req.query as Record<string, string>;

      const pageNum  = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, parseInt(limit));
      const offset   = (pageNum - 1) * limitNum;
      const role     = (req.user as any)?.role;
      const uid      = (req.user as any)?.id;

      const conds: SQL[] = [];

      // Drivers (partner_pickup) only see their own assigned pickups
      if (role === "partner_pickup") {
        conds.push(eq(pickupMgt.driverId, uid));
      }

      if (today === "true") {
        conds.push(
          sql`DATE(${pickupMgt.pickupDatetime}) = CURRENT_DATE`
        );
      } else if (this_week === "true") {
        conds.push(
          sql`DATE(${pickupMgt.pickupDatetime}) >= date_trunc('week', CURRENT_DATE)`,
          sql`DATE(${pickupMgt.pickupDatetime}) < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'`
        );
      }

      if (status) conds.push(eq(pickupMgt.status, status));

      // source=camp  → contracts linked to a camp application (applicationId IS NOT NULL)
      // source=services → CRM contracts (applicationId IS NULL)
      if (source === "camp")     conds.push(isNotNull(contracts.applicationId));
      if (source === "services") conds.push(isNull(contracts.applicationId));

      if (search) {
        conds.push(
          sql`(${contracts.studentName} ILIKE ${'%' + search + '%'} OR ${contracts.contractNumber} ILIKE ${'%' + search + '%'})`
        );
      }

      const where = conds.length ? and(...conds) : undefined;

      const [{ total }] = await db
        .select({ total: count() })
        .from(pickupMgt)
        .leftJoin(contracts, eq(pickupMgt.contractId, contracts.id))
        .where(where);

      const rows = await db
        .select({
          ...SELECT_COLS,
          driverName:    sql<string>`${pickupMgt}.driver_name`,
          driverContact: sql<string>`${pickupMgt}.driver_contact`,
        })
        .from(pickupMgt)
        .leftJoin(contracts, eq(pickupMgt.contractId, contracts.id))
        .where(where)
        .orderBy(pickupMgt.pickupDatetime)
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
      console.error("[GET /api/services/pickup]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── POST /api/services/pickup ───────────────────────────────────────────────
router.post(
  "/services/pickup",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const { contractId, pickupType, fromLocation, toLocation, pickupDatetime, notes } = req.body;
      if (!contractId) return res.status(400).json({ error: "contractId is required" });

      const [record] = await db
        .insert(pickupMgt)
        .values({
          contractId,
          pickupType:     pickupType     || "arrival",
          fromLocation:   fromLocation   || null,
          toLocation:     toLocation     || null,
          pickupDatetime: pickupDatetime ? new Date(pickupDatetime) : null,
          driverNotes:    notes          || null,
          status:         "pending",
        })
        .returning({ id: pickupMgt.id });

      return res.status(201).json(record);
    } catch (err) {
      console.error("[POST /api/services/pickup]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/services/pickup/:id ────────────────────────────────────────────
router.get(
  "/services/pickup/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [row] = await db
        .select({
          ...SELECT_COLS,
          productName: sql<string>`p.name`,
        })
        .from(pickupMgt)
        .leftJoin(contracts, eq(pickupMgt.contractId, contracts.id))
        .leftJoin(sql`products p`, sql`p.id = ${pickupMgt.productId}`)
        .where(eq(pickupMgt.id, req.params.id));

      if (!row) return res.status(404).json({ error: "Pickup record not found" });
      return res.json(row);
    } catch (err) {
      console.error("[GET /api/services/pickup/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/pickup/:id ──────────────────────────────────────────
router.patch(
  "/services/pickup/:id",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: pickupMgt.id })
        .from(pickupMgt)
        .where(eq(pickupMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Pickup record not found" });

      const {
        pickupType, fromLocation, toLocation, pickupDatetime,
        vehicleInfo, driverNotes, driverName, driverContact,
        status, productId, serviceFee, apCost, flightNo, timezone,
      } = req.body;

      const [updated] = await db
        .update(pickupMgt)
        .set({
          ...(pickupType     !== undefined && { pickupType }),
          ...(fromLocation   !== undefined && { fromLocation }),
          ...(toLocation     !== undefined && { toLocation }),
          ...(pickupDatetime !== undefined && { pickupDatetime: pickupDatetime ? new Date(pickupDatetime) : null }),
          ...(vehicleInfo    !== undefined && { vehicleInfo }),
          ...(driverNotes    !== undefined && { driverNotes }),
          ...(driverName     !== undefined && { driverName }),
          ...(driverContact  !== undefined && { driverContact }),
          ...(status         !== undefined && { status }),
          ...(productId      !== undefined && { productId: productId || null }),
          ...(serviceFee     !== undefined && { serviceFee: serviceFee != null ? String(serviceFee) : null }),
          ...(apCost         !== undefined && { apCost: apCost != null ? String(apCost) : null }),
          ...(flightNo       !== undefined && { flightNo: flightNo || null }),
          ...(timezone       !== undefined && { timezone: timezone || null }),
          updatedAt: new Date(),
        })
        .where(eq(pickupMgt.id, req.params.id))
        .returning();

      return res.json(updated);
    } catch (err) {
      console.error("[PATCH /api/services/pickup/:id]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PATCH /api/services/pickup/:id/assign ───────────────────────────────────
router.patch(
  "/services/pickup/:id/assign",
  authenticate,
  requireRole(...STAFF_ROLES),
  async (req, res) => {
    try {
      const [existing] = await db
        .select({ id: pickupMgt.id })
        .from(pickupMgt)
        .where(eq(pickupMgt.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Pickup record not found" });

      const { driverName, driverContact, vehicleInfo } = req.body;

      const [updated] = await db.execute(
        sql`
          UPDATE pickup_mgt
          SET
            driver_name    = ${driverName    ?? null},
            driver_contact = ${driverContact ?? null},
            vehicle_info   = ${vehicleInfo   ?? null},
            status         = 'driver_assigned',
            updated_at     = NOW()
          WHERE id = ${req.params.id}
          RETURNING *
        `
      ) as any;

      return res.json(updated.rows?.[0] ?? updated);
    } catch (err) {
      console.error("[PATCH /api/services/pickup/:id/assign]", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
