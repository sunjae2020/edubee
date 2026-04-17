import { Router } from "express";
import { db } from "@workspace/db";
import { teams, users, applications } from "@workspace/db/schema";
import { eq, count, sql, and, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// ── GET /api/teams ────────────────────────────────────────────────────────────
router.get("/teams", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { search, type, status, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const pageSz   = Math.min(100, Math.max(1, parseInt(pageSize)));

    const allTeams = await db.select().from(teams).orderBy(teams.name);
    const filtered = allTeams.filter(t => {
      if (status && t.status !== status) return false;
      if (type && t.type !== type) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    const total   = filtered.length;
    const sliced  = filtered.slice((pageNum - 1) * pageSz, pageNum * pageSz);

    const teamIds = sliced.map(t => t.id);
    if (teamIds.length === 0) return res.json({ data: [], total, page: pageNum, pageSize: pageSz, totalPages: Math.max(1, Math.ceil(total / pageSz)) });

    // Member count per team
    const memberCounts = await db
      .select({ teamId: users.teamId, cnt: count() })
      .from(users)
      .where(inArray(users.teamId as any, teamIds))
      .groupBy(users.teamId);

    const countMap: Record<string, number> = {};
    for (const r of memberCounts) if (r.teamId) countMap[r.teamId] = Number(r.cnt);

    // Team leads
    const leadIds = sliced.map(t => t.teamLeadId).filter(Boolean) as string[];
    const leads = leadIds.length
      ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, leadIds))
      : [];
    const leadMap: Record<string, string> = {};
    for (const l of leads) leadMap[l.id] = l.fullName;

    const data = sliced.map(t => ({
      ...t,
      memberCount: countMap[t.id] ?? 0,
      teamLeadName: t.teamLeadId ? (leadMap[t.teamLeadId] ?? null) : null,
    }));

    return res.json({ data, total, page: pageNum, pageSize: pageSz, totalPages: Math.max(1, Math.ceil(total / pageSz)) });
  } catch (err) {
    console.error("GET /api/teams error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/teams/:id ────────────────────────────────────────────────────────
router.get("/teams/:id", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { id } = req.params;
    const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const members = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      status: users.status,
      avatarUrl: users.avatarUrl,
      companyName: users.companyName,
      countryOfOps: users.countryOfOps,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.teamId as any, id));

    let teamLeadName: string | null = null;
    if (team.teamLeadId) {
      const [lead] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, team.teamLeadId)).limit(1);
      teamLeadName = lead?.fullName ?? null;
    }

    return res.json({ ...team, members, teamLeadName });
  } catch (err) {
    console.error("GET /api/teams/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/teams/:id/performance ────────────────────────────────────────────
router.get("/teams/:id/performance", authenticate, requireRole(...ADMIN_ROLES, "camp_coordinator"), async (req, res) => {
  try {
    const { id } = req.params;
    const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const memberRows = await db.select({ id: users.id }).from(users).where(eq(users.teamId as any, id));
    const memberIds = memberRows.map(m => m.id);

    if (memberIds.length === 0) {
      return res.json({ totalApplications: 0, approvedApplications: 0, memberCount: 0 });
    }

    // Applications by team members (via agentId)
    const [appCount] = await db.select({ cnt: count() }).from(applications)
      .where(inArray(applications.agentId as any, memberIds));

    const [approvedApps] = await db.select({ cnt: count() }).from(applications)
      .where(and(
        inArray(applications.agentId as any, memberIds),
        eq(applications.status, "approved")
      ));

    return res.json({
      memberCount: memberIds.length,
      totalApplications: Number(appCount?.cnt ?? 0),
      approvedApplications: Number(approvedApps?.cnt ?? 0),
    });
  } catch (err) {
    console.error("GET /api/teams/:id/performance error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/teams ───────────────────────────────────────────────────────────
router.post("/teams", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, description, type = "agent_team", color = "#F5821F", teamLeadId, status = "active" } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Team name is required" });

    const [team] = await db.insert(teams).values({
      name: name.trim(),
      description: description ?? null,
      type,
      color,
      teamLeadId: teamLeadId || null,
      status,
    }).returning();

    return res.status(201).json(team);
  } catch (err) {
    console.error("POST /api/teams error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/teams/:id ──────────────────────────────────────────────────────
router.patch("/teams/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, color, teamLeadId, status } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (color !== undefined) updates.color = color;
    if (teamLeadId !== undefined) updates.teamLeadId = teamLeadId || null;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(teams).set(updates).where(eq(teams.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Team not found" });

    return res.json(updated);
  } catch (err) {
    console.error("PATCH /api/teams/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── DELETE /api/teams/:id ─────────────────────────────────────────────────────
router.delete("/teams/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    // Unassign all members first
    await db.update(users).set({ teamId: null } as any).where(eq(users.teamId as any, id));
    await db.delete(teams).where(eq(teams.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/teams/:id error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/teams/:id/members ─────────────────────────────────────────────
// Assign / remove members
router.patch("/teams/:id/members", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { add = [], remove = [] } = req.body as { add: string[]; remove: string[] };

    if (add.length > 0) {
      await db.update(users).set({ teamId: id } as any).where(inArray(users.id, add));
    }
    if (remove.length > 0) {
      await db.update(users).set({ teamId: null } as any).where(inArray(users.id, remove));
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/teams/:id/members error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/teams/bulk  (super_admin only) ──────────────────────────────
router.delete("/teams/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    await db.delete(teams).where(inArray(teams.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/teams/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
