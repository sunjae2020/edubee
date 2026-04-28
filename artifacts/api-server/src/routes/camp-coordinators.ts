import { Router } from "express";
import { db, staticDb, pool } from "@workspace/db";
import { packageGroupCoordinators, packageGroups, organisations, tenantAuditLogs } from "@workspace/db/schema";

const MASTER_TENANT = process.env.PLATFORM_SUBDOMAIN ?? "myagency";
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
// Owner retrieves the delegation list for a specific Package Group
router.get(
  "/package-groups/:id/coordinators",
  authenticate,
  requireRole(...OWNER_ROLES, "camp_coordinator"),
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      const rows = await staticDb
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
// Owner designates a Coordinator Tenant (status = 'Pending')
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

      // Verify the owning org of the Package Group
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

      // Check whether the same tenant is already registered as Pending/Active
      const [existing] = await staticDb
        .select({ id: packageGroupCoordinators.id, status: packageGroupCoordinators.status })
        .from(packageGroupCoordinators)
        .where(
          and(
            eq(packageGroupCoordinators.packageGroupId, id),
            eq(packageGroupCoordinators.coordinatorOrgId, coordinatorOrgId),
            isNull(packageGroupCoordinators.revokedAt)
          )
        )
        .limit(1);

      if (existing) {
        const msg = existing.status === "Active"
          ? "This organisation is already an active coordinator for this package group"
          : "This organisation already has a pending delegation for this package group";
        return res.status(409).json({ success: false, message: msg });
      }

      const [created] = await staticDb
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

// ── PATCH /package-groups/:id/coordinators/:coordinatorId ────────────────
// Owner updates permissions / notes
router.patch(
  "/package-groups/:id/coordinators/:coordinatorId",
  authenticate,
  requireRole(...OWNER_ROLES),
  async (req, res) => {
    try {
      const { coordinatorId } = req.params as { id: string; coordinatorId: string };
      const { permissions, notes } = req.body as {
        permissions?: { view: boolean; edit: boolean; soft_delete: boolean; manage_finance: boolean };
        notes?: string | null;
      };

      if (!permissions) {
        return res.status(400).json({ success: false, message: "permissions is required" });
      }

      const [updated] = await staticDb
        .update(packageGroupCoordinators)
        .set({ permissions, notes: notes ?? null, modifiedAt: new Date() })
        .where(eq(packageGroupCoordinators.id, coordinatorId))
        .returning();

      if (!updated) {
        return res.status(404).json({ success: false, message: "Delegation not found" });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PATCH coordinators/:id]", err);
      res.status(500).json({ success: false, message: "Failed to update delegation" });
    }
  }
);

// ── DELETE /package-groups/:id/coordinators/:coordinatorId ───────────────
// Owner permanently deletes an incorrectly assigned delegation record (Pending/Revoked status only)
router.delete(
  "/package-groups/:id/coordinators/:coordinatorId",
  authenticate,
  requireRole(...OWNER_ROLES),
  async (req, res) => {
    try {
      const { coordinatorId } = req.params as { id: string; coordinatorId: string };

      const [row] = await staticDb
        .select({ id: packageGroupCoordinators.id, status: packageGroupCoordinators.status, ownerOrgId: packageGroupCoordinators.ownerOrgId, coordinatorOrgId: packageGroupCoordinators.coordinatorOrgId })
        .from(packageGroupCoordinators)
        .where(eq(packageGroupCoordinators.id, coordinatorId))
        .limit(1);

      if (!row) {
        return res.status(404).json({ success: false, message: "Delegation not found" });
      }

      if (row.status === "Active") {
        return res.status(400).json({ success: false, message: "Active delegations cannot be deleted — use Revoke instead" });
      }

      await staticDb.delete(packageGroupCoordinators).where(eq(packageGroupCoordinators.id, coordinatorId));

      res.json({ success: true, message: "Delegation deleted" });
    } catch (err) {
      console.error("[DELETE coordinators/:id]", err);
      res.status(500).json({ success: false, message: "Failed to delete delegation" });
    }
  }
);

// ── PUT /package-groups/:id/coordinators/:coordinatorId/accept ────────────
// Coordinator accepts the delegation (status: Pending → Active)
router.put(
  "/package-groups/:id/coordinators/:coordinatorId/accept",
  authenticate,
  requireRole(...OWNER_ROLES, "camp_coordinator"),
  async (req, res) => {
    try {
      const { coordinatorId } = req.params as { id: string; coordinatorId: string };

      const [updated] = await staticDb
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
// Owner revokes the delegation (status: Active → Revoked, 30-day grace period)
router.put(
  "/package-groups/:id/coordinators/:coordinatorId/revoke",
  authenticate,
  requireRole(...OWNER_ROLES),
  async (req, res) => {
    try {
      const { coordinatorId } = req.params as { id: string; coordinatorId: string };

      const [updated] = await staticDb
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
// Search orgs when designating a Coordinator (excludes current tenant)
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
// Coordinator retrieves the list of package groups delegated to them
router.get(
  "/my-delegated-packages",
  authenticate,
  async (req, res) => {
    try {
      const userOrgId = req.user?.organisationId;
      if (!userOrgId) {
        return res.json({ success: true, data: [] });
      }

      // Step 1: Get delegations + owner org info (no package_groups join — schema varies per owner)
      const delegResult = await pool.query<{
        delegation_id: string; status: string; permissions: any;
        granted_at: string | null; accepted_at: string | null; revoked_at: string | null;
        package_group_id: string; owner_org_id: string | null;
        owner_org_name: string | null; owner_org_subdomain: string | null;
        owner_logo_url: string | null; owner_favicon_url: string | null;
        owner_primary_color: string | null; owner_secondary_color: string | null; owner_accent_color: string | null;
      }>(
        `SELECT
           pgc.id              AS delegation_id,
           pgc.status,
           pgc.permissions,
           pgc.granted_at,
           pgc.accepted_at,
           pgc.revoked_at,
           pgc.package_group_id,
           pgc.owner_org_id,
           o.name              AS owner_org_name,
           o.subdomain         AS owner_org_subdomain,
           o.logo_url          AS owner_logo_url,
           o.favicon_url       AS owner_favicon_url,
           o.primary_color     AS owner_primary_color,
           o.secondary_color   AS owner_secondary_color,
           o.accent_color      AS owner_accent_color
         FROM public.package_group_coordinators pgc
         LEFT JOIN public.organisations o ON o.id = pgc.owner_org_id
         WHERE pgc.coordinator_org_id = $1
           AND pgc.status = 'Active'
           AND pgc.revoked_at IS NULL
         ORDER BY pgc.granted_at DESC`,
        [userOrgId]
      );

      if (delegResult.rows.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Step 2: Fetch package_group details from each owner's tenant schema dynamically
      const bySchema: Record<string, string[]> = {};
      for (const row of delegResult.rows) {
        const schema = row.owner_org_subdomain ?? MASTER_TENANT;
        if (!bySchema[schema]) bySchema[schema] = [];
        bySchema[schema].push(row.package_group_id);
      }

      const pgDetails: Record<string, { name_en: string | null; location: string | null; country_code: string | null; status: string | null }> = {};
      for (const [schema, ids] of Object.entries(bySchema)) {
        try {
          const pgResult = await pool.query<{ id: string; name_en: string | null; location: string | null; country_code: string | null; status: string | null }>(
            `SELECT id, name_en, location, country_code, status FROM "${schema}".package_groups WHERE id = ANY($1::uuid[])`,
            [ids]
          );
          for (const pg of pgResult.rows) pgDetails[pg.id] = pg;
        } catch { /* schema may not exist */ }
      }

      // Step 3: Merge delegation rows with package_group details
      const rows = delegResult.rows.map(r => {
        const pg = pgDetails[r.package_group_id];
        return {
          delegationId:        r.delegation_id,
          status:              r.status,
          permissions:         r.permissions,
          grantedAt:           r.granted_at,
          acceptedAt:          r.accepted_at,
          revokedAt:           r.revoked_at,
          packageGroupId:      r.package_group_id,
          packageGroupName:    pg?.name_en ?? null,
          location:            pg?.location ?? null,
          countryCode:         pg?.country_code ?? null,
          pgStatus:            pg?.status ?? null,
          ownerOrgId:          r.owner_org_id,
          ownerOrgName:        r.owner_org_name,
          ownerOrgSubdomain:   r.owner_org_subdomain,
          ownerLogoUrl:        r.owner_logo_url,
          ownerFaviconUrl:     r.owner_favicon_url,
          ownerPrimaryColor:   r.owner_primary_color,
          ownerSecondaryColor: r.owner_secondary_color,
          ownerAccentColor:    r.owner_accent_color,
        };
      });

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("[GET /my-delegated-packages]", err);
      res.status(500).json({ success: false, message: "Failed to fetch delegated packages" });
    }
  }
);

// ── GET /debug/cc-delegation (super_admin / admin only) ───────────────────
// Diagnoses CC delegation state: user org, delegations, package schemas
router.get(
  "/debug/cc-delegation",
  authenticate,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const { userId } = req.query as { userId?: string };

      // 1. Resolve the user being diagnosed
      let targetUserId = userId ?? req.user!.id;
      const { staticDb: sDb } = await import("@workspace/db");
      const { users: usersTable } = await import("@workspace/db/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      const [targetUser] = await sDb
        .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role, organisationId: usersTable.organisationId })
        .from(usersTable)
        .where(eqFn(usersTable.id, targetUserId))
        .limit(1);

      if (!targetUser) return res.json({ error: "User not found", userId: targetUserId });

      // 2. Get all delegations for this user's org
      const orgId = targetUser.organisationId;
      if (!orgId) return res.json({ user: targetUser, error: "User has no organisationId — delegation lookup impossible" });

      const delegResult = await pool.query(
        `SELECT pgc.*, o.name AS owner_name, o.subdomain AS owner_subdomain
         FROM public.package_group_coordinators pgc
         LEFT JOIN public.organisations o ON o.id = pgc.owner_org_id
         WHERE pgc.coordinator_org_id = $1
         ORDER BY pgc.status, pgc.granted_at DESC`,
        [orgId]
      );

      // 3. Check package schemas
      const schemaChecks: Record<string, any> = {};
      for (const row of delegResult.rows) {
        const schema = row.owner_subdomain;
        if (schema && !(schema in schemaChecks)) {
          try {
            const pgCheck = await pool.query(
              `SELECT id, name_en FROM "${schema}".package_groups WHERE id = $1`,
              [row.package_group_id]
            );
            schemaChecks[`${schema}.${row.package_group_id}`] = pgCheck.rows[0] ?? "NOT FOUND";
          } catch (e: any) {
            schemaChecks[`${schema}.${row.package_group_id}`] = `SCHEMA ERROR: ${e.message}`;
          }
        }
      }

      return res.json({
        user: targetUser,
        orgId,
        delegations: delegResult.rows,
        schemaChecks,
        activeCount: delegResult.rows.filter((r: any) => r.status === "Active" && !r.revoked_at).length,
        reqUser: req.user,
      });
    } catch (err) {
      console.error("[GET /debug/cc-delegation]", err);
      return res.status(500).json({ error: String(err) });
    }
  }
);

export default router;
