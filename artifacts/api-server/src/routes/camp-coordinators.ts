import { Router } from "express";
import { db } from "@workspace/db";
import { staticDb } from "@workspace/db";
import { packageGroupCoordinators, packageGroups, organisations, tenantAuditLogs } from "@workspace/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

async function logDelegationEvent(params: {
  organisationId: string;
  userId: string | undefined;
  action: "DELEGATION_GRANT" | "DELEGATION_ACCEPT" | "DELEGATION_REVOKE";
  entityId: string;
  actingOrgId?: string | null;
  targetOrgId?: string | null;
  newValues?: object;
  ipAddress?: string;
}) {
  try {
    await db.insert(tenantAuditLogs).values({
      organisationId: params.organisationId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: "package_group_coordinators",
      entityId: params.entityId,
      actingOrgId: params.actingOrgId ?? null,
      targetOrgId: params.targetOrgId ?? null,
      viaDelegation: false,
      newValues: params.newValues ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error(`[AuditLog] Failed to write ${params.action}:`, err);
  }
}

const router = Router();
const OWNER_ROLES = ["super_admin", "admin"];

// ── GET /package-groups/:id/coordinators ──────────────────────────────────
// Owner 가 특정 Package Group의 위임 내역을 조회
router.get(
  "/package-groups/:id/coordinators",
  authenticate,
  requireRole(...OWNER_ROLES, "camp_coordinator"),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      const rows = await db
        .select({
          id: packageGroupCoordinators.id,
          packageGroupId: packageGroupCoordinators.packageGroupId,
          ownerOrgId: packageGroupCoordinators.ownerOrgId,
          coordinatorOrgId: packageGroupCoordinators.coordinatorOrgId,
          coordinatorOrgName: organisations.name,
          coordinatorOrgSubdomain: organisations.subdomain,
          coordinatorOrgEmail: organisations.email,
          permissions: packageGroupCoordinators.permissions,
          status: packageGroupCoordinators.status,
          grantedAt: packageGroupCoordinators.grantedAt,
          acceptedAt: packageGroupCoordinators.acceptedAt,
          revokedAt: packageGroupCoordinators.revokedAt,
          notes: packageGroupCoordinators.notes,
          createdAt: packageGroupCoordinators.createdAt,
        })
        .from(packageGroupCoordinators)
        .leftJoin(organisations, eq(organisations.id, packageGroupCoordinators.coordinatorOrgId))
        .where(eq(packageGroupCoordinators.packageGroupId, id))
        .orderBy(desc(packageGroupCoordinators.createdAt));

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("[GET /package-groups/:id/coordinators]", err);
      res.status(500).json({ success: false, message: "Failed to fetch coordinators" });
    }
  }
);

// ── POST /package-groups/:id/coordinators ─────────────────────────────────
// Owner 가 Coordinator Tenant 지정 (status = 'Pending')
router.post(
  "/package-groups/:id/coordinators",
  authenticate,
  requireRole(...OWNER_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { coordinatorOrgId, permissions, notes } = req.body as {
        coordinatorOrgId: string;
        permissions: { view: boolean; edit: boolean; soft_delete: boolean; manage_finance: boolean };
        notes?: string;
      };

      if (!coordinatorOrgId || !permissions) {
        return res.status(400).json({ success: false, message: "coordinatorOrgId and permissions are required" });
      }

      // Package Group 소유 org 확인
      const [group] = await db
        .select({ organisationId: packageGroups.organisationId })
        .from(packageGroups)
        .where(eq(packageGroups.id, id))
        .limit(1);

      if (!group) {
        return res.status(404).json({ success: false, message: "Package group not found" });
      }

      const ownerOrgId = group.organisationId;
      if (!ownerOrgId) {
        return res.status(400).json({ success: false, message: "Package group has no owner organisation" });
      }

      if (ownerOrgId === coordinatorOrgId) {
        return res.status(400).json({ success: false, message: "Owner and coordinator cannot be the same organisation" });
      }

      // 이미 Active 위임 있는지 확인
      const [existing] = await db
        .select({ id: packageGroupCoordinators.id, status: packageGroupCoordinators.status })
        .from(packageGroupCoordinators)
        .where(
          and(
            eq(packageGroupCoordinators.packageGroupId, id),
            eq(packageGroupCoordinators.status, "Active"),
            isNull(packageGroupCoordinators.revokedAt)
          )
        )
        .limit(1);

      if (existing) {
        return res.status(409).json({ success: false, message: "This package group already has an active coordinator" });
      }

      const [created] = await db
        .insert(packageGroupCoordinators)
        .values({
          packageGroupId: id,
          ownerOrgId,
          coordinatorOrgId,
          permissions,
          grantedByUserId: req.user!.id,
          status: "Pending",
          notes: notes ?? null,
        })
        .returning();

      await logDelegationEvent({
        organisationId: ownerOrgId,
        userId: req.user!.id,
        action: "DELEGATION_GRANT",
        entityId: created.id,
        targetOrgId: coordinatorOrgId,
        newValues: { packageGroupId: id, permissions, status: "Pending" },
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error("[POST /package-groups/:id/coordinators]", err);
      res.status(500).json({ success: false, message: "Failed to create coordinator delegation" });
    }
  }
);

// ── PUT /package-groups/:id/coordinators/:coordinatorId/accept ────────────
// Coordinator 측이 위임을 수락 (status: Pending → Active)
router.put(
  "/package-groups/:id/coordinators/:coordinatorId/accept",
  authenticate,
  requireRole(...OWNER_ROLES, "camp_coordinator"),
  async (req, res) => {
    try {
      const { coordinatorId } = req.params as { id: string; coordinatorId: string };

      const [updated] = await db
        .update(packageGroupCoordinators)
        .set({ status: "Active", acceptedAt: new Date(), modifiedAt: new Date() })
        .where(
          and(
            eq(packageGroupCoordinators.id, coordinatorId),
            eq(packageGroupCoordinators.status, "Pending")
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: "Delegation not found or not in Pending status" });
      }

      await logDelegationEvent({
        organisationId: updated.coordinatorOrgId,
        userId: req.user!.id,
        action: "DELEGATION_ACCEPT",
        entityId: updated.id,
        actingOrgId: updated.coordinatorOrgId,
        targetOrgId: updated.ownerOrgId,
        newValues: { status: "Active", acceptedAt: updated.acceptedAt },
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT coordinators/:id/accept]", err);
      res.status(500).json({ success: false, message: "Failed to accept delegation" });
    }
  }
);

// ── PUT /package-groups/:id/coordinators/:coordinatorId/revoke ────────────
// Owner 가 위임 철회 (status: Active → Revoked, 30일 유예)
router.put(
  "/package-groups/:id/coordinators/:coordinatorId/revoke",
  authenticate,
  requireRole(...OWNER_ROLES),
  async (req, res) => {
    try {
      const { coordinatorId } = req.params as { id: string; coordinatorId: string };

      const [updated] = await db
        .update(packageGroupCoordinators)
        .set({
          status: "Revoked",
          revokedAt: new Date(),
          revokedByUserId: req.user!.id,
          modifiedAt: new Date(),
        })
        .where(
          and(
            eq(packageGroupCoordinators.id, coordinatorId),
            eq(packageGroupCoordinators.status, "Active")
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: "Active delegation not found" });
      }

      await logDelegationEvent({
        organisationId: updated.ownerOrgId,
        userId: req.user!.id,
        action: "DELEGATION_REVOKE",
        entityId: updated.id,
        targetOrgId: updated.coordinatorOrgId,
        newValues: { status: "Revoked", revokedAt: updated.revokedAt },
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT coordinators/:id/revoke]", err);
      res.status(500).json({ success: false, message: "Failed to revoke delegation" });
    }
  }
);

// ── GET /organisations/search ─────────────────────────────────────────────
// Coordinator 지정 시 org 검색 (현재 테넌트 제외)
router.get(
  "/organisations/search",
  authenticate,
  requireRole(...OWNER_ROLES),
  async (req, res) => {
    try {
      const { q = "" } = req.query as { q?: string };

      const rows = await staticDb
        .select({
          id: organisations.id,
          name: organisations.name,
          subdomain: organisations.subdomain,
          email: organisations.email,
          status: organisations.status,
        })
        .from(organisations)
        .where(eq(organisations.status as any, "Active"))
        .limit(50);

      const keyword = q.toLowerCase();
      const filtered = keyword
        ? rows.filter(
            o =>
              o.name?.toLowerCase().includes(keyword) ||
              o.subdomain?.toLowerCase().includes(keyword) ||
              o.email?.toLowerCase().includes(keyword)
          )
        : rows;

      res.json({ success: true, data: filtered });
    } catch (err) {
      console.error("[GET /organisations/search]", err);
      res.status(500).json({ success: false, message: "Failed to search organisations" });
    }
  }
);

// ── GET /my-delegated-packages ────────────────────────────────────────────
// Coordinator 가 자신에게 위임된 패키지 그룹 목록 조회
router.get(
  "/my-delegated-packages",
  authenticate,
  async (req, res) => {
    try {
      const userOrgId = req.user?.organisationId;
      if (!userOrgId) {
        return res.json({ success: true, data: [] });
      }

      const rows = await staticDb
        .select({
          delegationId: packageGroupCoordinators.id,
          status: packageGroupCoordinators.status,
          permissions: packageGroupCoordinators.permissions,
          grantedAt: packageGroupCoordinators.grantedAt,
          acceptedAt: packageGroupCoordinators.acceptedAt,
          revokedAt: packageGroupCoordinators.revokedAt,
          packageGroupId: packageGroups.id,
          packageGroupName: packageGroups.nameEn,
          location: packageGroups.location,
          countryCode: packageGroups.countryCode,
          pgStatus: packageGroups.status,
          ownerOrgId: packageGroupCoordinators.ownerOrgId,
          ownerOrgName: organisations.name,
          ownerOrgSubdomain: organisations.subdomain,
        })
        .from(packageGroupCoordinators)
        .innerJoin(packageGroups, eq(packageGroups.id, packageGroupCoordinators.packageGroupId))
        .leftJoin(organisations, eq(organisations.id, packageGroupCoordinators.ownerOrgId))
        .where(
          and(
            eq(packageGroupCoordinators.coordinatorOrgId, userOrgId),
            eq(packageGroupCoordinators.status, "Active"),
            isNull(packageGroupCoordinators.revokedAt)
          )
        )
        .orderBy(desc(packageGroupCoordinators.grantedAt));

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("[GET /my-delegated-packages]", err);
      res.status(500).json({ success: false, message: "Failed to fetch delegated packages" });
    }
  }
);

export default router;
