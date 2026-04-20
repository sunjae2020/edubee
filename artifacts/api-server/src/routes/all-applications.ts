import { Router } from "express";
import { db, runWithTenantSchema } from "@workspace/db";
import { applications, campApplications, packageGroups, packages } from "@workspace/db/schema";
import { quotes }    from "@workspace/db/schema";
import { contracts } from "@workspace/db/schema";
import { users }     from "@workspace/db/schema";
import { sql, ilike, eq, or, desc, and } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const MASTER_TENANT = process.env.PLATFORM_SUBDOMAIN ?? "myagency";

// GET /api/admin/all-applications
router.get("/admin/all-applications", authenticate, async (req, res) => {
  const isCC   = (req.user as any)?.role === "camp_coordinator";
  const ccOrgId = isCC
    ? (req.tenant?.id ?? (req.user as any).organisationId ?? (req.user as any).id)
    : null;

  const handler = async () => {
  try {
    const search   = (req.query.search as string   as string) || "";
    const type     = (req.query.type as string     as string) || "all";
    const status   = (req.query.status as string   as string) || "all";
    const page     = Math.max(1, Number(req.query.page as string)     || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize as string) || 20));
    const offset   = (page - 1) * pageSize;

    // ── 1. camp_applications (with package group + package name + quote + contract) ──
    let campRows: any[] = [];
    if (type === "all" || type === "camp") {
      const q = db
        .select({
          id:               campApplications.id,
          ref:              campApplications.applicationRef,
          sourceType:       sql<string>`'camp'`,
          firstName:        campApplications.applicantFirstName,
          lastName:         campApplications.applicantLastName,
          originalName:     campApplications.applicantOriginalName,
          englishName:      campApplications.applicantEnglishName,
          fullName:         campApplications.applicantName,
          email:            campApplications.applicantEmail,
          phone:            campApplications.applicantPhone,
          nationality:      campApplications.applicantNationality,
          status:           campApplications.applicationStatus,
          quoteId:          campApplications.quoteId,
          quoteRef:         quotes.quoteRefNumber,
          quoteStatus:      quotes.quoteStatus,
          contractId:       campApplications.contractId,
          contractRef:      contracts.contractNumber,
          contractStatus:   contracts.status,
          packageGroupId:   campApplications.packageGroupId,
          packageId:        campApplications.packageId,
          packageGroupName:  packageGroups.nameEn,
          packageName:       packages.name,
          serviceTypes:      sql<null>`NULL`,
          createdAt:         campApplications.createdAt,
          assignedStaffName: users.fullName,
        })
        .from(campApplications)
        .leftJoin(packageGroups, eq(campApplications.packageGroupId, packageGroups.id))
        .leftJoin(packages,      eq(campApplications.packageId,      packages.id))
        .leftJoin(quotes,        eq(campApplications.quoteId,        quotes.id))
        .leftJoin(contracts,     eq(campApplications.contractId,     contracts.id))
        .leftJoin(users,         eq(campApplications.assignedStaffId, users.id))
        .orderBy(desc(campApplications.createdAt));

      const where: any[] = [];
      if (search) {
        where.push(or(
          ilike(campApplications.applicantName,      `%${search}%`),
          ilike(campApplications.applicantFirstName, `%${search}%`),
          ilike(campApplications.applicantLastName,  `%${search}%`),
          ilike(campApplications.applicantEmail,     `%${search}%`),
          ilike(campApplications.applicationRef,     `%${search}%`),
        ));
      }
      if (status !== "all") where.push(eq(campApplications.applicationStatus, status));

      // Camp coordinators: only see applications whose package group they own or coordinate
      if (isCC && ccOrgId) {
        where.push(or(
          eq(packageGroups.campProviderId, ccOrgId),
          eq(packageGroups.coordinatorId,  ccOrgId),
        )!);
      }

      campRows = await (where.length ? q.where(and(...where)) : q);
    }

    // ── 2. Refs mirrored in camp_applications (dedup) ─────────────────────
    const mirroredRefs = new Set(campRows.map((r: any) => r.ref).filter(Boolean));

    // ── 3. applications (service type) ────────────────────────────────────
    let serviceRows: any[] = [];
    if (type === "all" || type === "service") {
      const q = db
        .select({
          id:               applications.id,
          ref:              applications.applicationNumber,
          sourceType:       applications.applicationType,
          firstName:        applications.firstName,
          lastName:         applications.lastName,
          originalName:     applications.originalName,
          englishName:      applications.englishName,
          fullName:         applications.applicantName,
          email:            applications.applicantEmail,
          phone:            applications.applicantPhone,
          nationality:      applications.applicantNationality,
          status:           applications.applicationStatus,
          quoteId:          applications.quoteId,
          quoteRef:         quotes.quoteRefNumber,
          quoteStatus:      quotes.quoteStatus,
          contractId:       contracts.id,
          contractRef:      contracts.contractNumber,
          contractStatus:   contracts.status,
          packageGroupId:   applications.packageGroupId,
          packageId:        applications.packageId,
          packageGroupName:  sql<null>`NULL`,
          packageName:       sql<null>`NULL`,
          serviceTypes:      applications.serviceTypes,
          createdAt:         applications.createdAt,
          assignedStaffName: users.fullName,
        })
        .from(applications)
        .leftJoin(quotes,        eq(applications.quoteId,    quotes.id))
        .leftJoin(contracts,     eq(contracts.applicationId, applications.id))
        .leftJoin(users,         eq(applications.assignedStaffId, users.id))
        .leftJoin(packageGroups, eq(applications.packageGroupId, packageGroups.id))
        .orderBy(desc(applications.createdAt));

      const where: any[] = [];
      if (search) {
        where.push(or(
          ilike(applications.applicantName,     `%${search}%`),
          ilike(applications.firstName,         `%${search}%`),
          ilike(applications.lastName,          `%${search}%`),
          ilike(applications.applicantEmail,    `%${search}%`),
          ilike(applications.applicationNumber, `%${search}%`),
        ));
      }
      if (status !== "all") where.push(eq(applications.applicationStatus, status));

      // Camp coordinators: only see applications linked to their package groups
      if (isCC && ccOrgId) {
        where.push(or(
          eq(packageGroups.campProviderId, ccOrgId),
          eq(packageGroups.coordinatorId,  ccOrgId),
        )!);
      }

      serviceRows = await (where.length ? q.where(and(...where)) : q);

      // Remove rows already mirrored in camp_applications
      serviceRows = serviceRows.filter((r: any) => !r.ref || !mirroredRefs.has(r.ref));
    }

    // ── 4. Merge, sort, paginate ──────────────────────────────────────────
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
  }; // end handler

  // CC users from partner orgs query master tenant schema where camp data lives
  if (isCC) {
    await runWithTenantSchema(MASTER_TENANT, handler);
  } else {
    await handler();
  }
});

export default router;
