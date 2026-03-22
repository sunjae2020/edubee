import { Router } from "express";
import { db } from "@workspace/db";
import { campApplications } from "@workspace/db/schema";
import { contacts, leads, contracts } from "@workspace/db/schema";
import { eq, ilike, or, count, and, desc, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];

router.get("/camp-applications", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { applicationStatus, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (applicationStatus) conditions.push(eq(campApplications.applicationStatus, applicationStatus));
    if (search) {
      conditions.push(
        or(
          ilike(campApplications.applicantName,  `%${search}%`),
          ilike(campApplications.applicantEmail, `%${search}%`),
          ilike(campApplications.applicationRef, `%${search}%`),
        )!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(campApplications).where(where);
    const data = await db.select().from(campApplications)
      .where(where).orderBy(desc(campApplications.createdAt)).limit(limitNum).offset(offset);

    return res.json({
      data,
      meta: { total: Number(totalResult.count), page: pageNum, limit: limitNum, totalPages: Math.ceil(Number(totalResult.count) / limitNum) },
    });
  } catch (err) {
    console.error("[GET /api/camp-applications]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/camp-applications/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [application] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id)).limit(1);
    if (!application) return res.status(404).json({ error: "Not found" });
    return res.json(application);
  } catch (err) {
    console.error("[GET /api/camp-applications/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/camp-applications/:id/status", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { applicationStatus: newStatus } = req.body;
    if (!newStatus) return res.status(400).json({ error: "applicationStatus is required" });

    const [application] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id)).limit(1);
    if (!application) return res.status(404).json({ error: "Not found" });

    await db.update(campApplications)
      .set({ applicationStatus: newStatus, updatedAt: new Date() })
      .where(eq(campApplications.id, req.params.id));

    if (newStatus === "reviewing" && !application.leadId) {
      const leadRef = "LD-" + Date.now().toString(36).toUpperCase().padStart(8, "0");

      let contactId: string | null = null;
      const existing = await db.select().from(contacts)
        .where(eq(contacts.email, application.applicantEmail)).limit(1);

      if (existing.length > 0) {
        contactId = existing[0].id;
      } else {
        const nameParts = application.applicantName.split(" ");
        const [newContact] = await db.insert(contacts).values({
          firstName:   nameParts[0],
          lastName:    nameParts.slice(1).join(" ") || "-",
          email:       application.applicantEmail,
          mobile:      application.applicantPhone    ?? null,
          nationality: application.applicantNationality ?? null,
        }).returning();
        contactId = newContact.id;
      }

      const [newLead] = await db.insert(leads).values({
        leadRefNumber:   leadRef,
        fullName:        application.applicantName,
        email:           application.applicantEmail,
        phone:           application.applicantPhone    ?? null,
        nationality:     application.applicantNationality ?? null,
        source:          "Camp Application",
        inquiryType:     "Camp",
        contactId:       contactId,
        assignedStaffId: application.assignedStaffId ?? null,
        notes:           `Camp Application ${application.applicationRef ?? ""}`,
        status:          "in_progress",
      }).returning();

      await db.update(campApplications)
        .set({ leadId: newLead.id })
        .where(eq(campApplications.id, application.id));
    }

    if (newStatus === "confirmed" && !application.contractId) {
      const [newContract] = await db.insert(contracts).values({
        studentName: application.applicantName,
        status:      "draft",
        currency:    "AUD",
        notes:       `Auto-created for Camp Application ${application.applicationRef ?? ""}`,
      }).returning();

      await db.update(campApplications)
        .set({ contractId: newContract.id })
        .where(eq(campApplications.id, application.id));
    }

    const [refreshed] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id)).limit(1);
    return res.json(refreshed);
  } catch (err) {
    console.error("[PATCH /api/camp-applications/:id/status]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
