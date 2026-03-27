import { Router } from "express";
import { db } from "@workspace/db";
import { notes, users } from "@workspace/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const ALLOWED_ENTITY_TYPES = [
  "task", "lead", "application", "contract",
  "pickup_mgt",
  "tour_mgt", "settlement_mgt", "interview_schedule",
  "other_services_mgt",
  "package",
] as const;

const ALLOWED_NOTE_TYPES: Record<string, string[]> = {
  task:               ["internal"],
  lead:               ["internal"],
  application:        ["internal", "special_request"],
  contract:           ["internal"],
  pickup_mgt:         ["internal", "driver"],
  tour_mgt:           ["internal", "guide"],
  settlement_mgt:     ["internal"],
  interview_schedule: ["internal", "interviewer", "candidate"],
  other_services_mgt: ["internal"],
  package:            ["internal"],
};

function getAllowedVisibility(role: string): string[] {
  switch (role) {
    case "super_admin":
    case "admin":
    case "camp_coordinator":
      return ["internal", "partner", "client"];
    case "education_agent":
      return ["partner", "client"];
    case "partner_institute":
    case "partner_hotel":
    case "partner_pickup":
    case "partner_tour":
      return ["partner"];
    case "parent_client":
      return ["client"];
    default:
      return [];
  }
}

router.get("/notes", authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.query as Record<string, string>;

    if (!entityType || !entityId) {
      return res.status(400).json({ success: false, error: "entityType and entityId are required" });
    }
    if (!ALLOWED_ENTITY_TYPES.includes(entityType as any)) {
      return res.status(400).json({ success: false, error: "Invalid entityType" });
    }

    const role = req.user!.role;
    const allowedVis = getAllowedVisibility(role);
    if (allowedVis.length === 0) return res.json({ success: true, data: [] });

    const rows = await db
      .select({
        id: notes.id, entityType: notes.entityType, entityId: notes.entityId,
        noteType: notes.noteType, content: notes.content, visibility: notes.visibility,
        isPinned: notes.isPinned, createdBy: notes.createdBy,
        createdAt: notes.createdAt, updatedAt: notes.updatedAt,
        createdByName: users.fullName,
      })
      .from(notes)
      .leftJoin(users, eq(notes.createdBy, users.id))
      .where(and(eq(notes.entityType, entityType), eq(notes.entityId, entityId)))
      .orderBy(desc(notes.isPinned), desc(notes.createdAt));

    const filtered = rows.filter(n => allowedVis.includes(n.visibility ?? "internal"));
    return res.json({ success: true, data: filtered });
  } catch (err) {
    console.error("[notes GET]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/notes", authenticate, async (req, res) => {
  try {
    const { entityType, entityId, noteType = "internal",
            content, visibility = "internal", isPinned = false } = req.body;

    if (!entityType || !entityId || !content?.trim()) {
      return res.status(400).json({ success: false, error: "entityType, entityId, content are required" });
    }
    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({ success: false, error: "Invalid entityType" });
    }
    const validTypes = ALLOWED_NOTE_TYPES[entityType] ?? ["internal"];
    if (!validTypes.includes(noteType)) {
      return res.status(400).json({ success: false, error: `Invalid noteType '${noteType}' for entity '${entityType}'` });
    }

    const role = req.user!.role;
    const canWriteInternal = ["super_admin", "admin", "camp_coordinator"].includes(role);
    if (visibility === "internal" && !canWriteInternal) {
      return res.status(403).json({ success: false, error: "Not permitted to write internal notes" });
    }

    const [created] = await db.insert(notes).values({
      entityType, entityId, noteType,
      content: content.trim(),
      visibility,
      isPinned: Boolean(isPinned),
      createdBy: req.user!.id,
    }).returning();

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("[notes POST]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

router.patch("/notes/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) return res.status(404).json({ success: false, error: "Not found" });

    const role = req.user!.role;
    const isAdmin = ["super_admin", "admin"].includes(role);
    const isAuthor = existing.createdBy === req.user!.id;
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ success: false, error: "Not permitted" });
    }

    const { content, isPinned } = req.body;
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (content !== undefined) updateData.content = content.trim();
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);

    const [updated] = await db.update(notes).set(updateData).where(eq(notes.id, id)).returning();
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[notes PATCH]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

router.delete("/notes/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!existing) return res.status(404).json({ success: false, error: "Not found" });

    const role = req.user!.role;
    const isAdmin = ["super_admin", "admin"].includes(role);
    const isAuthor = existing.createdBy === req.user!.id;
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ success: false, error: "Not permitted" });
    }

    await db.delete(notes).where(eq(notes.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[notes DELETE]", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
