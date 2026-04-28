import { Router } from "express";
import { db } from "@workspace/db";
import { platformProspects, platformContacts, platformActivities } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { superAdminOnly } from "../middleware/superAdminOnly.js";

const router = Router();
const guard = [authenticate, superAdminOnly];

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/platform-crm/prospects
router.get("/platform-crm/prospects", ...guard, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(platformProspects)
      .orderBy(desc(platformProspects.createdAt));
    return res.json(rows);
  } catch (err) {
    console.error("[GET /platform-crm/prospects]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/platform-crm/prospects/:id
router.get("/platform-crm/prospects/:id", ...guard, async (req, res) => {
  try {
    const [prospect] = await db
      .select()
      .from(platformProspects)
      .where(eq(platformProspects.id, req.params.id as string))
      .limit(1);

    if (!prospect) return res.status(404).json({ error: "Not Found" });

    const contacts = await db
      .select()
      .from(platformContacts)
      .where(eq(platformContacts.prospectId, req.params.id as string))
      .orderBy(desc(platformContacts.isPrimary), asc(platformContacts.createdAt));

    const activities = await db
      .select()
      .from(platformActivities)
      .where(eq(platformActivities.prospectId, req.params.id as string))
      .orderBy(desc(platformActivities.createdAt));

    return res.json({ ...prospect, contacts, activities });
  } catch (err) {
    console.error("[GET /platform-crm/prospects/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/platform-crm/prospects
router.post("/platform-crm/prospects", ...guard, async (req, res) => {
  try {
    const { companyName, website, industry, country, planInterest, status, source, notes } = req.body;
    if (!companyName) return res.status(400).json({ error: "companyName is required" });

    const [row] = await db
      .insert(platformProspects)
      .values({ companyName, website, industry, country, planInterest, status: status ?? "new", source, notes })
      .returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /platform-crm/prospects]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/platform-crm/prospects/:id
router.patch("/platform-crm/prospects/:id", ...guard, async (req, res) => {
  try {
    const { companyName, website, industry, country, planInterest, status, source, notes, convertedOrgId } = req.body;
    const [row] = await db
      .update(platformProspects)
      .set({
        ...(companyName   !== undefined && { companyName }),
        ...(website       !== undefined && { website }),
        ...(industry      !== undefined && { industry }),
        ...(country       !== undefined && { country }),
        ...(planInterest  !== undefined && { planInterest }),
        ...(status        !== undefined && { status }),
        ...(source        !== undefined && { source }),
        ...(notes         !== undefined && { notes }),
        ...(convertedOrgId !== undefined && { convertedOrgId }),
        updatedAt: new Date(),
      })
      .where(eq(platformProspects.id, req.params.id as string))
      .returning();

    if (!row) return res.status(404).json({ error: "Not Found" });
    return res.json(row);
  } catch (err) {
    console.error("[PATCH /platform-crm/prospects/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/platform-crm/prospects/:id
router.delete("/platform-crm/prospects/:id", ...guard, async (req, res) => {
  try {
    await db.delete(platformProspects).where(eq(platformProspects.id, req.params.id as string));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /platform-crm/prospects/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/platform-crm/prospects/:id/contacts
router.post("/platform-crm/prospects/:id/contacts", ...guard, async (req, res) => {
  try {
    const { fullName, email, phone, title, isPrimary } = req.body;
    if (!fullName) return res.status(400).json({ error: "fullName is required" });

    if (isPrimary) {
      await db
        .update(platformContacts)
        .set({ isPrimary: false })
        .where(eq(platformContacts.prospectId, req.params.id as string));
    }

    const [row] = await db
      .insert(platformContacts)
      .values({ prospectId: req.params.id as string, fullName, email, phone, title, isPrimary: isPrimary ?? false })
      .returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /platform-crm/prospects/:id/contacts]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/platform-crm/contacts/:id
router.patch("/platform-crm/contacts/:id", ...guard, async (req, res) => {
  try {
    const { fullName, email, phone, title, isPrimary } = req.body;
    const [row] = await db
      .update(platformContacts)
      .set({
        ...(fullName   !== undefined && { fullName }),
        ...(email      !== undefined && { email }),
        ...(phone      !== undefined && { phone }),
        ...(title      !== undefined && { title }),
        ...(isPrimary  !== undefined && { isPrimary }),
      })
      .where(eq(platformContacts.id, req.params.id as string))
      .returning();

    if (!row) return res.status(404).json({ error: "Not Found" });
    return res.json(row);
  } catch (err) {
    console.error("[PATCH /platform-crm/contacts/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/platform-crm/contacts/:id
router.delete("/platform-crm/contacts/:id", ...guard, async (req, res) => {
  try {
    await db.delete(platformContacts).where(eq(platformContacts.id, req.params.id as string));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /platform-crm/contacts/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/platform-crm/prospects/:id/activities
router.post("/platform-crm/prospects/:id/activities", ...guard, async (req, res) => {
  try {
    const { activityType, subject, body, scheduledAt, completedAt } = req.body;
    const createdBy = (req as any).user?.id;

    const [row] = await db
      .insert(platformActivities)
      .values({
        prospectId:   req.params.id as string,
        activityType: activityType ?? "note",
        subject,
        body,
        scheduledAt:  scheduledAt  ? new Date(scheduledAt)  : undefined,
        completedAt:  completedAt  ? new Date(completedAt)  : undefined,
        createdBy,
      })
      .returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error("[POST /platform-crm/prospects/:id/activities]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/platform-crm/activities/:id
router.delete("/platform-crm/activities/:id", ...guard, async (req, res) => {
  try {
    await db.delete(platformActivities).where(eq(platformActivities.id, req.params.id as string));
    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE /platform-crm/activities/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/platform-crm/stats — Dashboard summary
router.get("/platform-crm/stats", ...guard, async (_req, res) => {
  try {
    const all = await db.select().from(platformProspects);
    const stats = {
      total:     all.length,
      new:       all.filter(p => p.status === "new").length,
      contacted: all.filter(p => p.status === "contacted").length,
      demo:      all.filter(p => p.status === "demo").length,
      trial:     all.filter(p => p.status === "trial").length,
      converted: all.filter(p => p.status === "converted").length,
      lost:      all.filter(p => p.status === "lost").length,
    };
    return res.json(stats);
  } catch (err) {
    console.error("[GET /platform-crm/stats]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
