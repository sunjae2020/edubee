import { Router } from "express";
import { db, staticDb } from "@workspace/db";
import {
  communityPosts,
  communityComments,
  accounts,
} from "@workspace/db/schema";
import { eq, and, desc, inArray, or, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { authenticatePortal } from "../middleware/authenticatePortal.js";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(v: string) { return UUID_RE.test(v); }

const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

/**
 * Build a WHERE clause for communityPosts that filters by role + visibility.
 * Admin sees everything.
 * Agents: public + internal posts for all/agents audience
 * Partners: public + internal posts for all/partners audience
 * Students: only public posts for all/students audience
 */
function buildVisibilityFilter(role: string, accountId?: string) {
  if (role === "admin") return undefined; // admin sees all

  const audiences =
    role === "student"  ? ["all", "students"] :
    PARTNER_ROLES.includes(role) ? ["all", "partners"] :
    ["all", "agents"];

  const visibilities =
    role === "student" ? ["public"] : ["public", "internal"];

  return and(
    inArray(communityPosts.audience,    audiences),
    inArray(communityPosts.visibility,  visibilities),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTAL ROUTES — authenticated portal users
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/portal/community ─────────────────────────────────────────────
router.get("/portal/community", authenticatePortal, async (req, res) => {
  try {
    const { accountId, portalRole } = req.portalUser!;
    const { type } = req.query as Record<string, string>;

    const visFilter = buildVisibilityFilter(portalRole, accountId);

    const conditions = visFilter ? [visFilter] : [];
    if (type && type !== "all") {
      conditions.push(eq(communityPosts.type, type));
    }

    // Own private posts always visible
    const rows = await db
      .select()
      .from(communityPosts)
      .where(
        conditions.length
          ? or(
              and(...conditions),
              and(
                eq(communityPosts.visibility, "private"),
                eq(communityPosts.authorAccountId, accountId),
              )
            )
          : undefined
      )
      .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))
      .limit(100);

    return res.json({ data: rows });
  } catch (err) {
    console.error("[portal/community GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/portal/community/:id ─────────────────────────────────────────
router.get("/portal/community/:id", authenticatePortal, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "Invalid ID" });
    const { accountId } = req.portalUser!;

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, id))
      .limit(1);

    if (!post) return res.status(404).json({ error: "Not found" });

    if (
      post.visibility === "private" &&
      post.authorAccountId !== accountId
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const comments = await db
      .select()
      .from(communityComments)
      .where(eq(communityComments.postId, id))
      .orderBy(communityComments.createdAt);

    return res.json({ data: post, comments });
  } catch (err) {
    console.error("[portal/community/:id GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/portal/community ────────────────────────────────────────────
router.post("/portal/community", authenticatePortal, async (req, res) => {
  try {
    const { accountId, portalRole, accountName } = req.portalUser!;
    const { title, content, type = "question", visibility = "public" } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: "title and content are required" });
    }

    // Students and partners can only post questions (qna)
    const allowedType =
      portalRole === "student" || PARTNER_ROLES.includes(portalRole)
        ? "question"
        : type;

    // Students can only post public; agents can post internal too
    const allowedVisibility =
      portalRole === "student" ? "public" :
      ["public", "internal", "private"].includes(visibility) ? visibility : "public";

    const [post] = await db
      .insert(communityPosts)
      .values({
        title:           title.trim(),
        content:         content.trim(),
        type:            allowedType,
        visibility:      allowedVisibility,
        audience:        "all",
        authorAccountId: accountId,
        authorRole:      portalRole,
        authorName:      accountName ?? "Unknown",
      })
      .returning();

    return res.status(201).json({ data: post });
  } catch (err) {
    console.error("[portal/community POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/portal/community/:id/comments ───────────────────────────────
router.post("/portal/community/:id/comments", authenticatePortal, async (req, res) => {
  try {
    const { id: postId } = req.params;
    if (!isUUID(postId)) return res.status(400).json({ error: "Invalid ID" });
    const { accountId, portalRole, accountName } = req.portalUser!;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const [post] = await db
      .select({ id: communityPosts.id, visibility: communityPosts.visibility, authorAccountId: communityPosts.authorAccountId })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.visibility === "private" && post.authorAccountId !== accountId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [comment] = await db
      .insert(communityComments)
      .values({
        postId,
        content:         content.trim(),
        authorAccountId: accountId,
        authorRole:      portalRole,
        authorName:      accountName ?? "Unknown",
      })
      .returning();

    // Increment comment count
    await db
      .update(communityPosts)
      .set({ commentCount: sql`${communityPosts.commentCount} + 1`, updatedAt: new Date() })
      .where(eq(communityPosts.id, postId));

    return res.status(201).json({ data: comment });
  } catch (err) {
    console.error("[portal/community/:id/comments POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── DELETE /api/portal/community/:id ──────────────────────────────────────
router.delete("/portal/community/:id", authenticatePortal, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "Invalid ID" });
    const { accountId } = req.portalUser!;

    const [post] = await db
      .select({ authorAccountId: communityPosts.authorAccountId })
      .from(communityPosts)
      .where(eq(communityPosts.id, id))
      .limit(1);

    if (!post) return res.status(404).json({ error: "Not found" });
    if (post.authorAccountId !== accountId) {
      return res.status(403).json({ error: "Forbidden: can only delete own posts" });
    }

    await db.delete(communityPosts).where(eq(communityPosts.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[portal/community/:id DELETE]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — authenticated admin/staff users
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/community ────────────────────────────────────────────────────
router.get("/community", authenticate, async (req, res) => {
  try {
    const { type, visibility } = req.query as Record<string, string>;

    const conditions: any[] = [];
    if (type && type !== "all")             conditions.push(eq(communityPosts.type, type));
    if (visibility && visibility !== "all") conditions.push(eq(communityPosts.visibility, visibility));

    const rows = await db
      .select()
      .from(communityPosts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))
      .limit(200);

    return res.json({ data: rows });
  } catch (err) {
    console.error("[community GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/community ───────────────────────────────────────────────────
router.post("/community", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, content, type = "notice", visibility = "public", audience = "all" } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: "title and content are required" });
    }

    const [post] = await db
      .insert(communityPosts)
      .values({
        title:      title.trim(),
        content:    content.trim(),
        type,
        visibility,
        audience,
        authorRole: "admin",
        authorName: user?.name ?? user?.email ?? "Admin",
      })
      .returning();

    return res.status(201).json({ data: post });
  } catch (err) {
    console.error("[community POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/community/:id ────────────────────────────────────────────────
router.get("/community/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "Invalid ID" });

    const [post] = await db
      .select()
      .from(communityPosts)
      .where(eq(communityPosts.id, id))
      .limit(1);

    if (!post) return res.status(404).json({ error: "Not found" });

    const comments = await db
      .select()
      .from(communityComments)
      .where(eq(communityComments.postId, id))
      .orderBy(communityComments.createdAt);

    return res.json({ data: post, comments });
  } catch (err) {
    console.error("[community/:id GET]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PUT /api/community/:id ────────────────────────────────────────────────
router.put("/community/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "Invalid ID" });
    const { title, content, type, visibility, audience, isPinned, isResolved } = req.body;

    const update: Partial<typeof communityPosts.$inferInsert> = { updatedAt: new Date() };
    if (title      !== undefined) update.title      = title.trim();
    if (content    !== undefined) update.content    = content.trim();
    if (type       !== undefined) update.type       = type;
    if (visibility !== undefined) update.visibility = visibility;
    if (audience   !== undefined) update.audience   = audience;
    if (isPinned   !== undefined) update.isPinned   = isPinned;
    if (isResolved !== undefined) update.isResolved = isResolved;

    const [updated] = await db
      .update(communityPosts)
      .set(update)
      .where(eq(communityPosts.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json({ data: updated });
  } catch (err) {
    console.error("[community/:id PUT]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── DELETE /api/community/:id ─────────────────────────────────────────────
router.delete("/community/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(communityPosts).where(eq(communityPosts.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error("[community/:id DELETE]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/community/:id/comments ─────────────────────────────────────
router.post("/community/:id/comments", authenticate, async (req, res) => {
  try {
    const { id: postId } = req.params;
    if (!isUUID(postId)) return res.status(400).json({ error: "Invalid ID" });
    const user = (req as any).user;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: "content is required" });
    }

    const [comment] = await db
      .insert(communityComments)
      .values({
        postId,
        content:      content.trim(),
        authorRole:   "admin",
        authorName:   user?.name ?? user?.email ?? "Admin",
        isAdminReply: true,
      })
      .returning();

    await db
      .update(communityPosts)
      .set({ commentCount: sql`${communityPosts.commentCount} + 1`, updatedAt: new Date() })
      .where(eq(communityPosts.id, postId));

    return res.status(201).json({ data: comment });
  } catch (err) {
    console.error("[community/:id/comments POST]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── DELETE /api/community/comments/:id ───────────────────────────────────
router.delete("/community/comments/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [comment] = await db
      .select({ postId: communityComments.postId })
      .from(communityComments)
      .where(eq(communityComments.id, id))
      .limit(1);

    if (!comment) return res.status(404).json({ error: "Not found" });

    await db.delete(communityComments).where(eq(communityComments.id, id));

    await db
      .update(communityPosts)
      .set({ commentCount: sql`GREATEST(${communityPosts.commentCount} - 1, 0)`, updatedAt: new Date() })
      .where(eq(communityPosts.id, comment.postId));

    return res.json({ success: true });
  } catch (err) {
    console.error("[community/comments/:id DELETE]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
