import { Router } from "express";
import { db } from "@workspace/db";
import {
  programReports,
  reportSections,
  contracts,
  applications,
  applicationParticipants,
  notifications,
  users,
} from "@workspace/db/schema";
import { eq, and, desc, isNull, asc, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { autoPopulateSections } from "../services/reportAutoPopulate.js";
import { generateReportPdf } from "../utils/generateReportPdf.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────

function isAdminish(role: string) {
  return role === "super_admin" || role === "admin";
}

function canManage(role: string) {
  return isAdminish(role) || role === "camp_coordinator";
}

/** Return the contract IDs visible to this user based on their role */
async function visibleContractIds(role: string, uid: string): Promise<string[] | null> {
  if (isAdminish(role)) return null; // null = no filter

  if (role === "camp_coordinator") {
    const rows = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.campProviderId, uid));
    return rows.map((r) => r.id);
  }

  if (role === "education_agent") {
    const rows = await db
      .select({ contractId: contracts.id })
      .from(contracts)
      .innerJoin(applications, eq(applications.id, contracts.applicationId))
      .where(eq(applications.agentId, uid));
    return rows.map((r) => r.contractId);
  }

  if (role === "parent_client") {
    const rows = await db
      .select({ contractId: contracts.id })
      .from(contracts)
      .innerJoin(applications, eq(applications.id, contracts.applicationId))
      .where(eq(applications.clientId, uid));
    return rows.map((r) => r.contractId);
  }

  return []; // everyone else sees nothing
}

/** Fetch enriched report rows with joined data */
async function fetchReportList(
  where: Parameters<typeof db.select>[0] extends undefined ? unknown : unknown,
  page: number,
  limit: number,
  role: string,
  uid: string,
) {
  const offset = (page - 1) * limit;

  const contractIds = await visibleContractIds(role, uid);
  const isPublishedOnly = role === "education_agent" || role === "parent_client";

  const rows = await db
    .select({
      id: programReports.id,
      contractId: programReports.contractId,
      reportTitle: programReports.reportTitle,
      status: programReports.status,
      generatedBy: programReports.generatedBy,
      publishedAt: programReports.publishedAt,
      summaryNotes: programReports.summaryNotes,
      createdAt: programReports.createdAt,
      updatedAt: programReports.updatedAt,
      contractNumber: contracts.contractNumber,
      studentName: contracts.studentName,
      packageGroupName: contracts.packageGroupName,
      generatedByName: users.fullName,
    })
    .from(programReports)
    .leftJoin(contracts, eq(contracts.id, programReports.contractId))
    .leftJoin(users, eq(users.id, programReports.generatedBy))
    .where(isNull(programReports.deletedAt))
    .orderBy(desc(programReports.createdAt))
    .limit(limit)
    .offset(offset);

  let filtered = rows;

  if (contractIds !== null) {
    const cset = new Set(contractIds);
    filtered = filtered.filter((r) => r.contractId && cset.has(r.contractId));
  }
  if (isPublishedOnly) {
    filtered = filtered.filter((r) => r.status === "published");
  }

  // Section counts
  const reportIds = filtered.map((r) => r.id);
  let sectionCounts: Record<string, number> = {};
  if (reportIds.length > 0) {
    const counts = await db
      .select({
        reportId: reportSections.reportId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(reportSections)
      .where(inArray(reportSections.reportId, reportIds))
      .groupBy(reportSections.reportId);
    counts.forEach((c) => {
      if (c.reportId) sectionCounts[c.reportId] = c.cnt;
    });
  }

  return filtered.map((r) => ({
    ...r,
    programName: r.packageGroupName,
    sectionsCount: sectionCounts[r.id] ?? 0,
  }));
}

// ── GET /api/reports ──────────────────────────────────────────────
router.get("/reports", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;
    const page = parseInt(String(req.query.page ?? "1"), 10);
    const limit = parseInt(String(req.query.limit ?? "20"), 10);

    if (!canManage(role) && role !== "education_agent" && role !== "parent_client") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const data = await fetchReportList({}, page, limit, role, uid);

    // Filter by contractId / status query params
    const contractId = req.query.contractId as string | undefined;
    const status = req.query.status as string | undefined;

    let result = data;
    if (contractId) result = result.filter((r) => r.contractId === contractId);
    if (status) result = result.filter((r) => r.status === status);

    return res.json({ data: result, total: result.length, page, limit });
  } catch (err: any) {
    console.error("GET /reports error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/reports/:id ──────────────────────────────────────────
router.get("/reports/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;

    if (!canManage(role) && role !== "education_agent" && role !== "parent_client") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [report] = await db
      .select({
        id: programReports.id,
        contractId: programReports.contractId,
        reportTitle: programReports.reportTitle,
        status: programReports.status,
        generatedBy: programReports.generatedBy,
        publishedAt: programReports.publishedAt,
        summaryNotes: programReports.summaryNotes,
        deletedAt: programReports.deletedAt,
        createdAt: programReports.createdAt,
        updatedAt: programReports.updatedAt,
        contractNumber: contracts.contractNumber,
        studentName: contracts.studentName,
        packageGroupName: contracts.packageGroupName,
        generatedByName: users.fullName,
      })
      .from(programReports)
      .leftJoin(contracts, eq(contracts.id, programReports.contractId))
      .leftJoin(users, eq(users.id, programReports.generatedBy))
      .where(
        and(
          eq(programReports.id, req.params.id),
          isNull(programReports.deletedAt),
        ),
      )
      .limit(1);

    if (!report) return res.status(404).json({ error: "Not Found" });

    // EA / parent cannot see draft reports
    if (
      report.status === "draft" &&
      (role === "education_agent" || role === "parent_client")
    ) {
      return res.status(403).json({ error: "Forbidden: report is not yet published" });
    }

    // CC scope check
    if (role === "camp_coordinator" && report.contractId) {
      const [c] = await db
        .select({ campProviderId: contracts.campProviderId })
        .from(contracts)
        .where(eq(contracts.id, report.contractId))
        .limit(1);
      if (c?.campProviderId !== uid) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const sections = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.reportId, req.params.id))
      .orderBy(asc(reportSections.displayOrder));

    return res.json({ ...report, sections });
  } catch (err: any) {
    console.error("GET /reports/:id error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/reports ─────────────────────────────────────────────
router.post("/reports", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;

    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const { contractId, reportTitle } = req.body as {
      contractId: string;
      reportTitle?: string;
    };

    if (!contractId) return res.status(400).json({ error: "contractId is required" });

    // Validate contract exists
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    // CC: must own the contract
    if (role === "camp_coordinator" && contract.campProviderId !== uid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // No duplicate reports per contract
    const [existing] = await db
      .select({ id: programReports.id })
      .from(programReports)
      .where(
        and(
          eq(programReports.contractId, contractId),
          isNull(programReports.deletedAt),
        ),
      )
      .limit(1);
    if (existing) {
      return res.status(409).json({ error: "A report already exists for this contract" });
    }

    // Auto-generate title
    const title = reportTitle
      ?? `${contract.studentName ?? "Student"} — ${contract.packageGroupName ?? "Program"} Report`;

    // Create report
    const [report] = await db
      .insert(programReports)
      .values({
        contractId,
        reportTitle: title,
        generatedBy: uid,
        status: "draft",
      })
      .returning();

    // Auto-populate sections
    const sectionData = await autoPopulateSections(contractId);
    const insertedSections = await db
      .insert(reportSections)
      .values(
        sectionData.map((s) => ({
          reportId: report.id,
          sectionType: s.sectionType,
          sectionTitle: s.sectionTitle,
          displayOrder: s.displayOrder,
          content: s.content,
          isVisible: true,
        })),
      )
      .returning();

    return res.status(201).json({ ...report, sections: insertedSections });
  } catch (err: any) {
    console.error("POST /reports error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PUT /api/reports/:id ──────────────────────────────────────────
router.put("/reports/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;

    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const [existing] = await db
      .select()
      .from(programReports)
      .where(and(eq(programReports.id, req.params.id), isNull(programReports.deletedAt)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Not Found" });

    if (existing.status === "published") {
      return res.status(400).json({
        error: "Cannot edit a published report. Unpublish first.",
      });
    }

    // CC scope
    if (role === "camp_coordinator" && existing.contractId) {
      const [c] = await db
        .select({ campProviderId: contracts.campProviderId })
        .from(contracts)
        .where(eq(contracts.id, existing.contractId))
        .limit(1);
      if (c?.campProviderId !== uid) return res.status(403).json({ error: "Forbidden" });
    }

    const { reportTitle, summaryNotes } = req.body;
    const [updated] = await db
      .update(programReports)
      .set({ reportTitle, summaryNotes, updatedAt: new Date() })
      .where(eq(programReports.id, req.params.id))
      .returning();

    return res.json(updated);
  } catch (err: any) {
    console.error("PUT /reports/:id error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/reports/:id/publish ────────────────────────────────
router.patch("/reports/:id/publish", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    const uid = req.user!.id;

    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const [report] = await db
      .select()
      .from(programReports)
      .where(and(eq(programReports.id, req.params.id), isNull(programReports.deletedAt)))
      .limit(1);
    if (!report) return res.status(404).json({ error: "Not Found" });

    // CC scope
    if (role === "camp_coordinator" && report.contractId) {
      const [c] = await db
        .select({ campProviderId: contracts.campProviderId })
        .from(contracts)
        .where(eq(contracts.id, report.contractId))
        .limit(1);
      if (c?.campProviderId !== uid) return res.status(403).json({ error: "Forbidden" });
    }

    const publishedAt = new Date();
    const [updated] = await db
      .update(programReports)
      .set({ status: "published", publishedAt, updatedAt: new Date() })
      .where(eq(programReports.id, req.params.id))
      .returning();

    // Send notifications to agent + parent
    if (report.contractId) {
      const [contractRow] = await db
        .select({ applicationId: contracts.applicationId })
        .from(contracts)
        .where(eq(contracts.id, report.contractId))
        .limit(1);

      if (contractRow?.applicationId) {
        const [app] = await db
          .select({ agentId: applications.agentId, clientId: applications.clientId })
          .from(applications)
          .where(eq(applications.id, contractRow.applicationId))
          .limit(1);

        const studentName = (
          await db
            .select({ fullName: applicationParticipants.fullName })
            .from(applicationParticipants)
            .where(
              and(
                eq(applicationParticipants.applicationId, contractRow.applicationId),
                eq(applicationParticipants.participantType, "primary_student"),
              ),
            )
            .limit(1)
        )[0]?.fullName ?? "the student";

        const notifPayload = {
          type: "report_published",
          title: "Program Report Available",
          message: `Program report for ${studentName} is now ready.`,
          referenceType: "report",
          referenceId: updated.id,
          isRead: false,
        };

        const notifTargets: string[] = [];
        if (app?.agentId) notifTargets.push(app.agentId);
        if (app?.clientId) notifTargets.push(app.clientId);

        for (const userId of notifTargets) {
          await db.insert(notifications).values({ ...notifPayload, userId });
        }
      }
    }

    return res.json({ success: true, publishedAt: updated.publishedAt });
  } catch (err: any) {
    console.error("PATCH /reports/:id/publish error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/reports/:id/unpublish ─────────────────────────────
router.patch("/reports/:id/unpublish", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!isAdminish(role)) return res.status(403).json({ error: "Only admins can unpublish reports" });

    const [updated] = await db
      .update(programReports)
      .set({ status: "draft", publishedAt: null, updatedAt: new Date() })
      .where(and(eq(programReports.id, req.params.id), isNull(programReports.deletedAt)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err: any) {
    console.error("PATCH /reports/:id/unpublish error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── DELETE /api/reports/:id ───────────────────────────────────────
router.delete("/reports/:id", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (role !== "super_admin") return res.status(403).json({ error: "Only super_admin can delete reports" });

    const [updated] = await db
      .update(programReports)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(programReports.id, req.params.id), isNull(programReports.deletedAt)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /reports/:id error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/reports/:id/sections/reorder ───────────────────────
// MUST be before /:id/sections/:sectionId to avoid route conflict
router.patch("/reports/:id/sections/reorder", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(reportSections)
          .set({ displayOrder: i, updatedAt: new Date() })
          .where(eq(reportSections.id, orderedIds[i]));
      }
    });

    const sections = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.reportId, req.params.id))
      .orderBy(asc(reportSections.displayOrder));

    return res.json({ sections });
  } catch (err: any) {
    console.error("PATCH /reports/:id/sections/reorder error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/reports/:id/sections/:sectionId ────────────────────
router.patch("/reports/:id/sections/:sectionId", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const { sectionTitle, content, isVisible, displayOrder } = req.body;
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (sectionTitle !== undefined) updatePayload.sectionTitle = sectionTitle;
    if (content !== undefined) updatePayload.content = content;
    if (isVisible !== undefined) updatePayload.isVisible = isVisible;
    if (displayOrder !== undefined) updatePayload.displayOrder = displayOrder;

    const [updated] = await db
      .update(reportSections)
      .set(updatePayload)
      .where(eq(reportSections.id, req.params.sectionId))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err: any) {
    console.error("PATCH /reports/:id/sections/:sectionId error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/reports/:id/sections ────────────────────────────────
router.post("/reports/:id/sections", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const { sectionType, sectionTitle, content } = req.body;
    if (sectionType !== "custom") {
      return res.status(400).json({ error: "Only custom sections can be added" });
    }
    if (!sectionTitle) return res.status(400).json({ error: "sectionTitle is required" });

    // max displayOrder + 1
    const existing = await db
      .select({ displayOrder: reportSections.displayOrder })
      .from(reportSections)
      .where(eq(reportSections.reportId, req.params.id))
      .orderBy(desc(reportSections.displayOrder))
      .limit(1);
    const nextOrder = (existing[0]?.displayOrder ?? -1) + 1;

    const [section] = await db
      .insert(reportSections)
      .values({
        reportId: req.params.id,
        sectionType: "custom",
        sectionTitle,
        displayOrder: nextOrder,
        content: content ?? {},
        isVisible: true,
      })
      .returning();

    return res.status(201).json(section);
  } catch (err: any) {
    console.error("POST /reports/:id/sections error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── DELETE /api/reports/:id/sections/:sectionId ───────────────────
router.delete("/reports/:id/sections/:sectionId", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const [section] = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.id, req.params.sectionId))
      .limit(1);

    if (!section) return res.status(404).json({ error: "Not Found" });
    if (section.sectionType !== "custom") {
      return res.status(400).json({ error: "Default sections cannot be deleted." });
    }

    await db.delete(reportSections).where(eq(reportSections.id, req.params.sectionId));
    return res.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /reports/:id/sections/:sectionId error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/reports/:id/sync ────────────────────────────────────
router.post("/reports/:id/sync", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;
    if (!canManage(role)) return res.status(403).json({ error: "Forbidden" });

    const [report] = await db
      .select()
      .from(programReports)
      .where(and(eq(programReports.id, req.params.id), isNull(programReports.deletedAt)))
      .limit(1);
    if (!report) return res.status(404).json({ error: "Not Found" });
    if (!report.contractId) return res.status(400).json({ error: "Report has no contract" });

    const freshData = await autoPopulateSections(report.contractId);
    const existingSections = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.reportId, req.params.id));

    const synced: string[] = [];
    const skipped: string[] = [];

    for (const fresh of freshData) {
      const existing = existingSections.find((s) => s.sectionType === fresh.sectionType);
      if (!existing) continue;

      // Never-edited: updatedAt equals createdAt (within 1 second tolerance)
      const neverEdited =
        existing.updatedAt && existing.createdAt &&
        Math.abs(new Date(existing.updatedAt).getTime() - new Date(existing.createdAt).getTime()) < 1000;

      if (neverEdited) {
        await db
          .update(reportSections)
          .set({ content: fresh.content, updatedAt: new Date() })
          .where(eq(reportSections.id, existing.id));
        synced.push(fresh.sectionType);
      } else {
        skipped.push(fresh.sectionType);
      }
    }

    return res.json({ synced, skipped });
  } catch (err: any) {
    console.error("POST /reports/:id/sync error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/reports/:id/pdf ──────────────────────────────────────
router.get("/reports/:id/pdf", authenticate, async (req, res) => {
  try {
    const role = req.user!.role;

    if (!canManage(role) && role !== "education_agent" && role !== "parent_client") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [report] = await db
      .select()
      .from(programReports)
      .where(and(eq(programReports.id, req.params.id), isNull(programReports.deletedAt)))
      .limit(1);

    if (!report) return res.status(404).json({ error: "Not Found" });

    if (
      report.status === "draft" &&
      (role === "education_agent" || role === "parent_client")
    ) {
      return res.status(403).json({ error: "Forbidden: report is not yet published" });
    }

    const sections = await db
      .select()
      .from(reportSections)
      .where(eq(reportSections.reportId, req.params.id))
      .orderBy(asc(reportSections.displayOrder));

    // Build filename from student profile content or report title
    const spSection = sections.find(s => s.sectionType === "student_profile");
    const spContent = (spSection?.content ?? {}) as Record<string, unknown>;
    const nameForFile = (spContent.fullName as string) || report.reportTitle || "Report";
    const year = new Date().getFullYear();
    const safeName = nameForFile.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    const filename = `EdubeeCamp_Report_${safeName}_${year}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const pdfBuffer = await generateReportPdf(report as any, sections, role);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error("GET /reports/:id/pdf error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
