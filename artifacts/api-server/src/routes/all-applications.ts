import { Router } from "express";
import { db } from "@workspace/db";
import { applications, campApplications } from "@workspace/db/schema";
import { sql, ilike, eq, or, desc, and } from "drizzle-orm";

const router = Router();

// GET /api/admin/all-applications
// Merges camp_applications (type='camp') + applications (type=service)
// Dedup: landing-page submissions appear in both tables under the same applicationNumber/applicationRef
//        → show camp_applications version only (skip matching applications row)
router.get("/admin/all-applications", async (req, res) => {
  try {
    const search   = (req.query.search   as string) || "";
    const type     = (req.query.type     as string) || "all";  // all | camp | service
    const status   = (req.query.status   as string) || "all";
    const page     = Math.max(1, Number(req.query.page)     || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset   = (page - 1) * pageSize;

    // ── 1. Fetch camp_applications ─────────────────────────────────────────
    let campRows: any[] = [];
    if (type === "all" || type === "camp") {
      const q = db
        .select({
          id:           campApplications.id,
          ref:          campApplications.applicationRef,
          sourceType:   sql<string>`'camp'`,
          firstName:    campApplications.applicantFirstName,
          lastName:     campApplications.applicantLastName,
          originalName: campApplications.applicantOriginalName,
          englishName:  campApplications.applicantEnglishName,
          fullName:     campApplications.applicantName,
          email:        campApplications.applicantEmail,
          phone:        campApplications.applicantPhone,
          nationality:  campApplications.applicantNationality,
          status:       campApplications.applicationStatus,
          packageGroupId: campApplications.packageGroupId,
          packageId:    campApplications.packageId,
          quoteId:      campApplications.quoteId,
          contractId:   campApplications.contractId,
          createdAt:    campApplications.createdAt,
        })
        .from(campApplications)
        .orderBy(desc(campApplications.createdAt));

      const where: any[] = [];
      if (search) {
        where.push(
          or(
            ilike(campApplications.applicantName,      `%${search}%`),
            ilike(campApplications.applicantFirstName, `%${search}%`),
            ilike(campApplications.applicantLastName,  `%${search}%`),
            ilike(campApplications.applicantEmail,     `%${search}%`),
            ilike(campApplications.applicationRef,     `%${search}%`),
          )
        );
      }
      if (status !== "all") {
        where.push(eq(campApplications.applicationStatus, status));
      }
      campRows = await (where.length ? q.where(and(...where)) : q);
    }

    // ── 2. Collect applicationRefs that are already represented in campRows ─
    const mirroredRefs = new Set(campRows.map((r: any) => r.ref).filter(Boolean));

    // ── 3. Fetch applications (service type) ──────────────────────────────
    let serviceRows: any[] = [];
    if (type === "all" || type === "service") {
      const q = db
        .select({
          id:           applications.id,
          ref:          applications.applicationNumber,
          sourceType:   applications.applicationType,
          firstName:    applications.firstName,
          lastName:     applications.lastName,
          originalName: applications.originalName,
          englishName:  applications.englishName,
          fullName:     applications.applicantName,
          email:        applications.applicantEmail,
          phone:        applications.applicantPhone,
          nationality:  applications.applicantNationality,
          status:       applications.applicationStatus,
          packageGroupId: applications.packageGroupId,
          packageId:    applications.packageId,
          quoteId:      applications.quoteId,
          contractId:   sql<null>`NULL`,
          createdAt:    applications.createdAt,
        })
        .from(applications)
        .orderBy(desc(applications.createdAt));

      const where: any[] = [];
      if (search) {
        where.push(
          or(
            ilike(applications.applicantName,   `%${search}%`),
            ilike(applications.firstName,       `%${search}%`),
            ilike(applications.lastName,        `%${search}%`),
            ilike(applications.applicantEmail,  `%${search}%`),
            ilike(applications.applicationNumber, `%${search}%`),
          )
        );
      }
      if (status !== "all") {
        where.push(eq(applications.applicationStatus, status));
      }
      serviceRows = await (where.length ? q.where(and(...where)) : q);

      // Exclude rows already mirrored in camp_applications
      serviceRows = serviceRows.filter(
        (r: any) => !r.ref || !mirroredRefs.has(r.ref)
      );
    }

    // ── 4. Merge & sort ───────────────────────────────────────────────────
    const allRows = [...campRows, ...serviceRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = allRows.length;
    const paged = allRows.slice(offset, offset + pageSize);

    return res.json({ data: paged, total, page, pageSize });
  } catch (err) {
    console.error("[GET /api/admin/all-applications]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
