import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, taskComments, taskAttachments, notifications, users, contracts, applications } from "@workspace/db/schema";
import { eq, and, ilike, count, desc, or, inArray, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const ALL_INTERNAL_ROLES = ["super_admin","admin","finance","admission","team_manager","consultant","camp_coordinator"] as const;
const ADMIN_ROLES = ["super_admin", "admin"] as const;

function generateTaskNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TSK-${year}-${rand}`;
}

async function createNotification(userId: string, type: string, title: string, message: string, referenceId?: string) {
  try {
    await db.insert(notifications).values({ userId, type, title, message, referenceType: "task", referenceId, isRead: false });
  } catch {}
}

async function notifyAdmins(type: string, title: string, message: string, referenceId?: string) {
  try {
    const admins = await db.select({ id: users.id }).from(users)
      .where(or(eq(users.role, "super_admin"), eq(users.role, "admin")));
    for (const a of admins) {
      await createNotification(a.id, type, title, message, referenceId);
    }
  } catch {}
}

function buildScopeConditions(role: string, uid: string): SQL | undefined {
  if (role === "camp_coordinator") {
    return or(
      eq(tasks.assignedTo, uid),
      eq(tasks.assignedTeam, "camp_coordinator"),
    )!;
  }
  if (role === "consultant") {
    return or(
      eq(tasks.assignedTo, uid),
      eq(tasks.submittedBy, uid),
    )!;
  }
  return undefined;
}

// ── PUBLIC: create cs_request from landing page ──────────────────────────────
router.post("/public/tasks", async (req, res) => {
  try {
    const { name, email, phone, category, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: "name, email, message are required" });
    const taskNumber = generateTaskNumber();
    const [task] = await db.insert(tasks).values({
      taskNumber,
      taskType: "cs_request",
      category: category ?? "inquiry",
      source: "landing",
      submittedName: name,
      submittedEmail: email,
      submittedPhone: phone ?? null,
      title: `[${category ?? "inquiry"}] ${message.slice(0, 80)}`,
      description: message,
      priority: "normal",
      status: "open",
      visibility: "shared",
    }).returning();
    await notifyAdmins("new_cs_request", "New CS Request", `${name} submitted a new request: ${task.title}`, task.id);
    return res.status(201).json({ taskNumber: task.taskNumber, id: task.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── LIST tasks ───────────────────────────────────────────────────────────────
router.get("/tasks", authenticate, async (req, res) => {
  try {
    const { status, taskType, priority, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;
    const role = req.user!.role;
    const uid = req.user!.id;

    const conditions: SQL[] = [];
    if (status) conditions.push(eq(tasks.status, status));
    if (taskType) conditions.push(eq(tasks.taskType, taskType));
    if (priority) conditions.push(eq(tasks.priority, priority));
    if (search) conditions.push(or(
      ilike(tasks.taskNumber, `%${search}%`),
      ilike(tasks.title, `%${search}%`),
      ilike(tasks.submittedName, `%${search}%`),
    )!);

    const scopeCond = buildScopeConditions(role, uid);
    if (scopeCond) conditions.push(scopeCond);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(tasks).where(whereClause);
    const data = await db.select().from(tasks).where(whereClause)
      .orderBy(desc(tasks.createdAt)).limit(limitNum).offset(offset);

    const assigneeIds = [...new Set(data.map(t => t.assignedTo).filter(Boolean))] as string[];
    let assigneeMap: Record<string, string> = {};
    if (assigneeIds.length > 0) {
      const assignees = await db.select({ id: users.id, name: users.fullName }).from(users)
        .where(inArray(users.id, assigneeIds));
      assigneeMap = Object.fromEntries(assignees.map(u => [u.id, u.name ?? ""]));
    }

    const enriched = data.map(t => ({
      ...t,
      assignedToName: t.assignedTo ? (assigneeMap[t.assignedTo] ?? null) : null,
    }));

    return res.json({ data: enriched, meta: { total: Number(totalResult.count), page: pageNum, limit: limitNum } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET task detail ──────────────────────────────────────────────────────────
router.get("/tasks/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params.id)).limit(1);
    if (!task) return res.status(404).json({ error: "Not Found" });

    if (false) {
      return res.status(403).json({ success: false, code: "FORBIDDEN", message: "Forbidden" });
    }

    const isInternal = true;
    const commentsWhere = isInternal
      ? eq(taskComments.taskId, task.id)
      : and(eq(taskComments.taskId, task.id), eq(taskComments.isInternal, false));
    const comments = await db.select().from(taskComments).where(commentsWhere)
      .orderBy(taskComments.createdAt);
    const attachments = await db.select().from(taskAttachments)
      .where(eq(taskAttachments.taskId, task.id)).orderBy(taskAttachments.createdAt);

    let assigneeName: string | null = null;
    if (task.assignedTo) {
      const [u] = await db.select({ name: users.fullName }).from(users).where(eq(users.id, task.assignedTo)).limit(1);
      assigneeName = u?.name ?? null;
    }

    return res.json({ ...task, assignedToName: assigneeName, comments, attachments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── CREATE task (admin) ──────────────────────────────────────────────────────
router.post("/tasks", authenticate, requireRole(...ALL_INTERNAL_ROLES), async (req, res) => {
  try {
    const body = req.body;
    const taskNumber = generateTaskNumber();
    const [task] = await db.insert(tasks).values({
      ...body,
      taskNumber,
      submittedBy: body.submittedBy ?? req.user!.id,
    }).returning();

    if (task.assignedTo && task.assignedTo !== req.user!.id) {
      await createNotification(task.assignedTo, "task_assigned", "Task Assigned", `Task ${task.taskNumber} has been assigned to you`, task.id);
    }
    return res.status(201).json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── UPDATE task ──────────────────────────────────────────────────────────────
router.put("/tasks/:id", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const [task] = await db.update(tasks)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(tasks.id, req.params.id))
      .returning();
    if (!task) return res.status(404).json({ error: "Not Found" });
    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH status ─────────────────────────────────────────────────────────────
router.patch("/tasks/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "resolved") updates.resolvedAt = new Date();

    const [task] = await db.update(tasks).set(updates)
      .where(eq(tasks.id, req.params.id)).returning();
    if (!task) return res.status(404).json({ error: "Not Found" });

    if (status === "resolved" && task.submittedBy) {
      await createNotification(task.submittedBy, "task_resolved", "Your request has been resolved",
        `Task ${task.taskNumber} has been resolved. Please rate your experience.`, task.id);
    }
    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── ADD comment ──────────────────────────────────────────────────────────────
router.post("/tasks/:id/comments", authenticate, async (req, res) => {
  try {
    const uid = req.user!.id;
    const role = req.user!.role;
    const { content, isInternal = false } = req.body;
    if (!content) return res.status(400).json({ error: "content required" });

    const forcePublic = false;
    const [u] = await db.select({ name: users.fullName }).from(users).where(eq(users.id, uid)).limit(1);

    const [comment] = await db.insert(taskComments).values({
      taskId: req.params.id,
      authorId: uid,
      authorName: u?.name ?? "Unknown",
      content,
      isInternal: forcePublic ? false : Boolean(isInternal),
    }).returning();

    if (!comment.isInternal) {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params.id)).limit(1);
      if (task) {
        if (task.submittedBy && task.submittedBy !== uid) {
          await createNotification(task.submittedBy, "task_comment", "New reply on your request",
            `New reply on ${task.taskNumber}`, task.id);
        }
        if (task.assignedTo && task.assignedTo !== uid) {
          await createNotification(task.assignedTo, "task_comment", "New comment on task",
            `New comment on ${task.taskNumber}`, task.id);
        }
      }
    }

    if (comment) {
      await db.update(tasks).set({ firstResponseAt: new Date(), updatedAt: new Date() })
        .where(and(eq(tasks.id, req.params.id)));
    }
    return res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
