import { Router } from "express";
import { encryptField, decryptField, maskPassport } from "../lib/crypto.js";
import { db, staticDb, runWithTenantSchema, pool } from "@workspace/db";
import { leads, applications, applicationParticipants, contracts, pickupMgt, tourMgt, interviewSchedules, users, settlementMgt, quotes, packages, quote_products, packageGroups, packageGroupCoordinators } from "@workspace/db/schema";
import { packageProducts, products } from "@workspace/db/schema";
import { eq, and, ilike, or, count, inArray, sql, asc, desc, SQL, isNull } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { financeAutoGenerate } from "../services/contractFinanceService.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];
const MASTER_TENANT = process.env.PLATFORM_SUBDOMAIN ?? "myagency";

function generateApplicationNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `APP-${year}${month}-${random}`;
}

// Leads
router.get("/leads", authenticate, async (req, res) => {
  try {
    const { agentId, status, search, page = "1", limit = "20", sortBy = "createdAt", sortDir = "desc" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    const orgId = req.tenant?.id ?? (req.user as any)?.organisationId ?? null;
    if (orgId) conditions.push(eq(leads.organisationId, orgId));
    if (agentId) conditions.push(eq(leads.agentId, agentId));
    if (status) conditions.push(eq(leads.status, status));
    if (search) conditions.push(or(ilike(leads.fullName, `%${search}%`), ilike(leads.email, `%${search}%`))!);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(leads).where(whereClause);
    const rawData = await db.select().from(leads).where(whereClause).limit(limitNum).offset(offset).orderBy(sortDir === "asc" ? asc(leads.createdAt) : desc(leads.createdAt));
    const data = rawData.map(l => ({ ...l, studentName: l.fullName }));

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/leads", authenticate, async (req, res) => {
  try {
    const body = req.body;
    // consultant sets their own agentId if applicable
    const [lead] = await db.insert(leads).values(body).returning();
    return res.status(201).json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/leads/:id", authenticate, async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id as string)).limit(1);
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/leads/:id", authenticate, async (req, res) => {
  try {
    const [lead] = await db.update(leads).set({ ...req.body, updatedAt: new Date() })
      .where(eq(leads.id, req.params.id as string)).returning();
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/leads/bulk  (super_admin 임시/영구 삭제) ────────────────────
router.delete("/leads/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(leads).set({ status: "deleted", updatedAt: new Date() }).where(inArray(leads.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(leads).where(inArray(leads.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/leads/bulk]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/leads/:id", authenticate, async (req, res) => {
  try {
    await db.delete(leads).where(eq(leads.id, req.params.id as string));
    return res.json({ success: true, message: "Lead deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/leads/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const [lead] = await db.update(leads).set({ status, updatedAt: new Date() })
      .where(eq(leads.id, req.params.id as string)).returning();
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/leads/:id/convert", authenticate, async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id as string)).limit(1);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    const applicationNumber = generateApplicationNumber();
    const [app] = await db.insert(applications).values({
      applicationNumber,
      agentId: lead.agentId ?? req.user!.id,
      packageGroupId: lead.interestedIn ?? undefined,
      status: "submitted",
      referralSource: lead.source ?? undefined,
      notes: [
        `Converted from lead: ${lead.fullName}`,
        lead.email ? `Email: ${lead.email}` : "",
        lead.phone ? `Phone: ${lead.phone}` : "",
        lead.nationality ? `Nationality: ${lead.nationality}` : "",
        lead.notes ? `Original notes: ${lead.notes}` : "",
      ].filter(Boolean).join("\n"),
      specialRequests: lead.fullName,
    }).returning();
    await db.update(leads).set({ status: "converted", updatedAt: new Date() }).where(eq(leads.id, lead.id));
    return res.status(201).json({ success: true, application: app });
  } catch (err) {
    console.error("Lead convert error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Applications stats
router.get("/applications/stats", authenticate, async (req, res) => {
  try {
    const buildCount = async (extra?: SQL) => {
      const conditions: SQL[] = [];
      // Internal staff see all applications
      // parent_client no longer in user system
      if (extra) conditions.push(extra);
      const where = conditions.length ? and(...conditions) : undefined;
      const [r] = await db.select({ count: count() }).from(applications).where(where);
      return Number(r.count);
    };
    const [total, submitted, reviewing, converted] = await Promise.all([
      buildCount(),
      buildCount(eq(applications.applicationStatus, "submitted")),
      buildCount(eq(applications.applicationStatus, "reviewing")),
      buildCount(eq(applications.applicationStatus, "converted")),
    ]);
    return res.json({ total, submitted, reviewing, converted });
  } catch (err) {
    console.error("[GET /applications/stats]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Applications
router.get("/applications", authenticate, async (req, res) => {
  const user = req.user!;
  const isCC = user.role === "camp_coordinator";

  const handler = async (delegatedIds?: string[]) => {
  try {
    const { agentId, status, appStatus, applicationType, packageGroupId, search, page = "1", limit = "20", sortBy = "createdAt", sortDir = "desc" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (agentId) conditions.push(eq(applications.agentId, agentId));
    if (status) conditions.push(eq(applications.status, status));
    if (appStatus) conditions.push(eq(applications.applicationStatus, appStatus));
    if (applicationType) conditions.push(eq(applications.applicationType, applicationType));
    if (packageGroupId) conditions.push(eq(applications.packageGroupId, packageGroupId));
    if (search) conditions.push(or(
      ilike(applications.applicationNumber, `%${search}%`),
      ilike(applications.applicantName, `%${search}%`),
      ilike(applications.applicantEmail, `%${search}%`),
    )!);

    if (isCC) {
      if (!delegatedIds || delegatedIds.length === 0) {
        return res.json({ data: [], meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } });
      }
      conditions.push(inArray(applications.packageGroupId, delegatedIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(applications).where(whereClause);
    const rawData = await db
      .select({ app: applications, packageName: packages.name })
      .from(applications)
      .leftJoin(packages, eq(applications.packageId, packages.id))
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(sortDir === "asc" ? asc(applications.createdAt) : desc(applications.createdAt));

    const clientIds = [...new Set(rawData.map(r => r.app.clientId).filter(Boolean))] as string[];
    const userRows = clientIds.length > 0
      ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, clientIds))
      : [];
    const userMap = new Map(userRows.map(u => [u.id, u.fullName]));
    const data = rawData.map(({ app: a, packageName }) => ({
      ...a,
      packageName: packageName ?? null,
      studentName: a.clientId ? (userMap.get(a.clientId) ?? a.applicantName ?? a.applicationNumber) : (a.applicantName ?? a.applicationNumber),
    }));

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
  };

  if (isCC) {
    const orgId = user.organisationId;
    if (!orgId) return res.json({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    const delegResult = await pool.query<{ package_group_id: string }>(
      `SELECT package_group_id FROM public.package_group_coordinators
       WHERE coordinator_org_id = $1 AND status = 'Active' AND revoked_at IS NULL`,
      [orgId]
    );
    const delegatedIds = delegResult.rows.map(r => r.package_group_id).filter(Boolean) as string[];
    await runWithTenantSchema(MASTER_TENANT, () => handler(delegatedIds));
  } else {
    await handler();
  }
});

router.post("/applications", authenticate, async (req, res) => {
  try {
    const body = req.body;
    // consultant sets agentId manually if needed
    body.applicationNumber = generateApplicationNumber();
    const fn = (body.applicantFirstName ?? "").trim();
    const ln = (body.applicantLastName  ?? "").trim();
    if (fn || ln) body.applicantName = [fn, ln].filter(Boolean).join(" ");
    const [application] = await db.insert(applications).values(body).returning();
    return res.status(201).json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/applications/:id", authenticate, async (req, res) => {
  try {
    const [application] = await db.select().from(applications).where(eq(applications.id, req.params.id as string)).limit(1);
    if (!application) return res.status(404).json({ error: "Not Found" });
    
    const participants = await db.select().from(applicationParticipants)
      .where(eq(applicationParticipants.applicationId, req.params.id as string));

    // Always look up linked contract (handles status inconsistency edge cases)
    let contractInfo: { contractId: string; contractNumber: string } | null = null;
    const [linkedContract] = await db
      .select({ id: contracts.id, contractNumber: contracts.contractNumber })
      .from(contracts)
      .where(eq(contracts.applicationId, req.params.id as string))
      .limit(1);
    if (linkedContract) {
      contractInfo = { contractId: linkedContract.id, contractNumber: linkedContract.contractNumber ?? "" };
    }
    
    return res.json({ ...application, participants, ...contractInfo });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/applications/participants", authenticate, async (req, res) => {
  try {
    const { applicationId, campApplicationId, participantType, sequenceOrder,
      firstName, lastName, fullName: rawFullName, fullNameNative, englishName, dateOfBirth,
      gender, nationality, passportNumber, passportExpiry, grade, schoolName, englishLevel,
      medicalConditions, dietaryRequirements, specialNeeds, relationshipToStudent,
      isEmergencyContact, email, phone, whatsapp, lineId } = req.body;
    const computedFullName = rawFullName
      || (firstName && lastName ? `${firstName} ${lastName.toUpperCase()}` : null)
      || firstName || null;
    if (!computedFullName) return res.status(400).json({ error: "name is required" });
    if (!applicationId && !campApplicationId) return res.status(400).json({ error: "applicationId or campApplicationId is required" });
    const [created] = await db.insert(applicationParticipants).values({
      applicationId: campApplicationId ? null : (applicationId ?? null),
      campApplicationId: campApplicationId ?? null,
      participantType: participantType ?? "child",
      sequenceOrder: sequenceOrder ?? 1,
      firstName: firstName ?? null, lastName: lastName ?? null,
      fullName: computedFullName,
      fullNameNative: fullNameNative || null,
      englishName: englishName || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null, nationality: nationality || null,
      passportNumber: encryptField(passportNumber || null), passportExpiry: passportExpiry || null,
      grade: grade || null, schoolName: schoolName || null, englishLevel: englishLevel || null,
      medicalConditions: medicalConditions || null, dietaryRequirements: dietaryRequirements || null,
      specialNeeds: specialNeeds || null, relationshipToStudent: relationshipToStudent || null,
      isEmergencyContact: isEmergencyContact ?? false,
      email: email || null, phone: phone || null, whatsapp: whatsapp || null, lineId: lineId || null,
    }).returning();
    if (created) {
      created.passportNumber = decryptField(created.passportNumber);
    }
    return res.status(201).json(created);
  } catch (err) {
    console.error("POST participant error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/applications/participants/:id", authenticate, async (req, res) => {
  try {
    const {
      firstName, lastName,
      fullName, fullNameNative, englishName, dateOfBirth, gender, nationality,
      passportNumber, passportExpiry, grade, schoolName, englishLevel,
      medicalConditions, dietaryRequirements, specialNeeds,
      relationshipToStudent, isEmergencyContact, email, phone, whatsapp, lineId,
    } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName  !== undefined) updates.lastName  = lastName;
    // Auto-compute fullName from first/last when provided
    if (firstName !== undefined || lastName !== undefined) {
      const fn = firstName ?? "";
      const ln = lastName  ?? "";
      updates.fullName = [fn, ln ? ln.toUpperCase() : ""].filter(Boolean).join(" ") || fullName;
    } else if (fullName !== undefined) {
      updates.fullName = fullName;
    }
    if (fullNameNative !== undefined) updates.fullNameNative = fullNameNative;
    if (englishName    !== undefined) updates.englishName    = englishName;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth || null;
    if (gender !== undefined) updates.gender = gender;
    if (nationality !== undefined) updates.nationality = nationality;
    if (passportNumber !== undefined) updates.passportNumber = encryptField(passportNumber);
    if (passportExpiry !== undefined) updates.passportExpiry = passportExpiry || null;
    if (grade !== undefined) updates.grade = grade;
    if (schoolName !== undefined) updates.schoolName = schoolName;
    if (englishLevel !== undefined) updates.englishLevel = englishLevel;
    if (medicalConditions !== undefined) updates.medicalConditions = medicalConditions;
    if (dietaryRequirements !== undefined) updates.dietaryRequirements = dietaryRequirements;
    if (specialNeeds !== undefined) updates.specialNeeds = specialNeeds;
    if (relationshipToStudent !== undefined) updates.relationshipToStudent = relationshipToStudent;
    if (isEmergencyContact !== undefined) updates.isEmergencyContact = isEmergencyContact;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (lineId !== undefined) updates.lineId = lineId;
    const [updated] = await db.update(applicationParticipants).set(updates)
      .where(eq(applicationParticipants.id, req.params.id as string)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    if (updated.passportNumber) updated.passportNumber = decryptField(updated.passportNumber);
    return res.json(updated);
  } catch (err) {
    console.error("PATCH participant error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/applications/:id", authenticate, async (req, res) => {
  try {
    const [application] = await db.update(applications).set({ ...req.body, updatedAt: new Date() })
      .where(eq(applications.id, req.params.id as string)).returning();
    if (!application) return res.status(404).json({ error: "Not Found" });
    return res.json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/applications/:id/status", authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updates: Record<string, any> = { status, updatedAt: new Date() };
    if (notes) updates.notes = notes;
    const [application] = await db.update(applications).set(updates)
      .where(eq(applications.id, req.params.id as string)).returning();
    if (!application) return res.status(404).json({ error: "Not Found" });
    return res.json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/applications/:id/convert-contract", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const [application] = await db.select().from(applications).where(eq(applications.id, req.params.id as string)).limit(1);
    if (!application) return res.status(404).json({ error: "Not Found" });

    const existingContract = await db.select().from(contracts).where(eq(contracts.applicationId, req.params.id as string)).limit(1);
    if (existingContract.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "Contract already exists", contractId: existingContract[0].id, contractNumber: existingContract[0].contractNumber });
    }

    const year = new Date().getFullYear();
    const [countResult] = await db.select({ count: count() }).from(contracts);
    const seq = String(Number(countResult.count) + 1).padStart(4, "0");
    const contractNumber = `CNT-${year}-${seq}`;

    // ── Atomic transaction: all records or nothing ──────────────────────────
    const result = await db.transaction(async (tx) => {
      const [contract] = await tx.insert(contracts).values({
        contractNumber,
        applicationId: req.params.id as string,
        campProviderId: req.user!.id,
        status: "draft",
        currency: "AUD",
      }).returning();

      await tx.insert(pickupMgt).values({ contractId: contract.id, status: "pending" });
      await tx.insert(tourMgt).values({ contractId: contract.id, status: "pending" });

      // Create settlement_mgt record for the education agent (if any)
      if (application.agentId) {
        await tx.insert(settlementMgt).values({
          contractId: contract.id,
          providerUserId: application.agentId,
          providerRole: "education_agent",
          status: "pending",
          currency: "AUD",
          grossAmount: "0",
          commissionRate: "10",
          commissionAmount: "0",
          netAmount: "0",
        });
      }

      // Create settlement_mgt record for the coordinator
      if (req.user!.role === "camp_coordinator") {
        await tx.insert(settlementMgt).values({
          contractId: contract.id,
          providerUserId: req.user!.id,
          providerRole: "camp_coordinator",
          status: "pending",
          currency: "AUD",
          grossAmount: "0",
          commissionRate: "0",
          commissionAmount: "0",
          netAmount: "0",
        });
      }

      await tx.update(applications).set({ status: "contracted", updatedAt: new Date() }).where(eq(applications.id, req.params.id as string));

      console.log("[FIX APPLIED] convert-contract: atomic transaction completed", { contractId: contract.id, contractNumber });
      return { contractId: contract.id, contractNumber };
    });

    // Auto-generate finance items (idempotent — safe to call after transaction)
    try {
      await financeAutoGenerate(result.contractId);
    } catch (financeErr: any) {
      console.error("financeAutoGenerate failed (non-fatal):", financeErr.message);
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error("Convert contract error (transaction rolled back):", err);
    return res.status(500).json({ error: "Internal Server Error", detail: String(err) });
  }
});

router.patch("/applications/:id", authenticate, async (req, res) => {
  try {
    const [application] = await db.update(applications).set({ ...req.body, updatedAt: new Date() })
      .where(eq(applications.id, req.params.id as string)).returning();
    if (!application) return res.status(404).json({ error: "Not Found" });
    return res.json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/applications/:id/toggle-active", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const [existing] = await db.select({ id: applications.id, isActive: applications.isActive })
      .from(applications).where(eq(applications.id, req.params.id as string)).limit(1);
    if (!existing) return res.status(404).json({ error: "Not Found" });
    const [updated] = await db.update(applications)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(applications.id, req.params.id as string)).returning({ id: applications.id, isActive: applications.isActive });
    return res.json(updated);
  } catch (err) {
    console.error("[PATCH /api/applications/:id/toggle-active]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/applications/bulk  (super_admin 임시/영구 삭제) ─────────────
router.delete("/applications/bulk", authenticate, requireRole("super_admin"), async (req, res) => {
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }
    if (soft) {
      await db.update(applications).set({ applicationStatus: "cancelled", updatedAt: new Date() }).where(inArray(applications.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(applications).where(inArray(applications.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/applications/bulk]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/applications/:id", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    // CC: 위임된 PG 소속 application만 취소 가능 (Soft Delete 전용)
    if (req.user!.role === "camp_coordinator") {
      const orgId = req.user!.organisationId;
      if (!orgId) return res.status(403).json({ error: "Forbidden" });
      const [app] = await db.select({ packageGroupId: applications.packageGroupId })
        .from(applications).where(eq(applications.id, req.params.id as string)).limit(1);
      if (!app) return res.status(404).json({ error: "Not Found" });
      const check = await pool.query(
        `SELECT 1 FROM public.package_group_coordinators
         WHERE coordinator_org_id = $1 AND package_group_id = $2
           AND status = 'Active' AND revoked_at IS NULL LIMIT 1`,
        [orgId, app.packageGroupId]
      );
      if ((check.rowCount ?? 0) === 0)
        return res.status(403).json({ error: "Forbidden: not delegated to this package group" });
    }
    const [application] = await db.update(applications)
      .set({ applicationStatus: "cancelled", updatedAt: new Date() })
      .where(eq(applications.id, req.params.id as string)).returning();
    if (!application) return res.status(404).json({ error: "Not Found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/applications/:id/convert-to-quote", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const [application] = await db.select().from(applications).where(eq(applications.id, req.params.id as string)).limit(1);
    if (!application) return res.status(404).json({ error: "Not Found" });
    if (application.quoteId) {
      return res.status(409).json({ error: "Already converted", quoteId: application.quoteId });
    }

    const quoteRefNumber = "QTE-" + Date.now().toString(36).toUpperCase().padStart(8, "0");
    const serviceList = Array.isArray(application.serviceTypes) ? (application.serviceTypes as string[]).join(", ") : "";
    const noteLines = [
      `Created from Application ${application.applicationNumber}`,
      application.applicantName   ? `Applicant: ${application.applicantName}` : "",
      application.applicantEmail  ? `Email: ${application.applicantEmail}` : "",
      application.applicantPhone  ? `Phone: ${application.applicantPhone}` : "",
      serviceList ? `Services: ${serviceList}` : "",
      application.notes ? `Notes: ${application.notes}` : "",
    ].filter(Boolean).join("\n");

    const result = await db.transaction(async (tx) => {
      const [newQuote] = await tx.insert(quotes).values({
        quoteRefNumber,
        leadId:        application.agentId ?? null,
        customerName:  application.applicantName ?? null,
        originalName:  application.originalName ?? null,
        quoteStatus:   "Draft",
        notes:         noteLines,
        createdBy:     req.user!.id,
      }).returning();

      await tx.update(applications).set({
        applicationStatus: "quoted",
        quoteId: newQuote.id,
        updatedAt: new Date(),
      }).where(eq(applications.id, req.params.id as string));

      // ── Add package products to the quote (if packageId linked) ──────────
      if (application.packageId) {
        const pkgProds = await tx
          .select({
            productId:   packageProducts.productId,
            quantity:    packageProducts.quantity,
            unitPrice:   packageProducts.unitPrice,
            productName: products.productName,
            price:       products.price,
          })
          .from(packageProducts)
          .leftJoin(products, eq(packageProducts.productId, products.id))
          .where(eq(packageProducts.packageId, application.packageId));

        if (pkgProds.length > 0) {
          await tx.insert(quote_products).values(
            pkgProds.map((pp, i) => ({
              quoteId:     newQuote.id,
              productId:   pp.productId ?? undefined,
              name:        pp.productName ?? "Product",
              price:       pp.price ?? pp.unitPrice ?? "0",
              quantity:    pp.quantity ?? 1,
              unitPrice:   pp.unitPrice ?? pp.price ?? "0",
              total:       String((Number(pp.unitPrice ?? pp.price ?? 0)) * (pp.quantity ?? 1)),
              sortOrder:   i,
              sortIndex:   i,
              manualInput: false,
            }))
          );
        } else {
          // No package_products defined — fall back to the package itself as a single line item
          const [pkg] = await tx
            .select({ id: packages.id, name: packages.name, priceAud: packages.priceAud })
            .from(packages)
            .where(eq(packages.id, application.packageId!))
            .limit(1);
          if (pkg) {
            const unitAmt = String(pkg.priceAud ?? "0");
            await tx.insert(quote_products).values({
              quoteId:          newQuote.id,
              name:             pkg.name ?? "Package",
              price:            unitAmt,
              quantity:         1,
              unitPrice:        unitAmt,
              total:            unitAmt,
              sortOrder:        0,
              sortIndex:        0,
              manualInput:      false,
              isInitialPayment: true,
            });
          }
        }
      }

      // ── Add service type items to the quote ────────────────────────────
      const SERVICE_LABELS: Record<string, string> = {
        pickup:       "Airport Pickup & Drop",
        accommodation: "Accommodation",
        internship:   "Internship Program",
        study_abroad: "Study Abroad Program",
        settlement:   "Settlement Service",
        tour:         "Tour Program",
        visa:         "Visa Assistance",
        insurance:    "Insurance",
      };
      const serviceTypes = Array.isArray(application.serviceTypes)
        ? (application.serviceTypes as string[])
        : [];
      if (serviceTypes.length > 0) {
        // Find offset after any existing items
        const existingCount = application.packageId ? 1 : 0;
        await tx.insert(quote_products).values(
          serviceTypes.map((svc, i) => ({
            quoteId:          newQuote.id,
            name:             SERVICE_LABELS[svc] ?? svc.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            price:            "0",
            quantity:         1,
            unitPrice:        "0",
            total:            "0",
            sortOrder:        existingCount + i,
            sortIndex:        existingCount + i,
            manualInput:      true,
            isInitialPayment: false,
            serviceModuleType: svc,
          }))
        );
      }

      return newQuote;
    });

    return res.status(201).json({ quoteId: result.id, quoteRefNumber: result.quoteRefNumber });
  } catch (err) {
    console.error("[convert-to-quote]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Interview Schedules ───────────────────────────────────────
router.get("/interview-schedules", authenticate, async (req, res) => {
  try {
    const { applicationId, studyAbroadId, status } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (applicationId) conditions.push(eq(interviewSchedules.applicationId, applicationId));
    if (studyAbroadId) conditions.push(eq(interviewSchedules.studyAbroadId, studyAbroadId));
    if (status) conditions.push(eq(interviewSchedules.status, status));

    const rows = conditions.length > 0
      ? await db.select().from(interviewSchedules).where(and(...conditions)).orderBy(interviewSchedules.scheduledDatetime)
      : await db.select().from(interviewSchedules).orderBy(interviewSchedules.scheduledDatetime);

    return res.json({ data: rows, total: rows.length });
  } catch (err) {
    console.error("GET interview-schedules error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/interview-schedules", authenticate, async (req, res) => {
  try {
    const { applicationId, studyAbroadId, packageGroupId, interviewerId, scheduledDatetime, timezone, format, meetingLink, location, candidateNotes } = req.body;
    if (!scheduledDatetime) return res.status(400).json({ error: "scheduledDatetime is required" });
    const [created] = await db.insert(interviewSchedules).values({
      applicationId: applicationId || null,
      studyAbroadId: studyAbroadId || null,
      packageGroupId: packageGroupId || null,
      interviewerId: interviewerId || null,
      scheduledDatetime: new Date(scheduledDatetime),
      timezone: timezone ?? "Asia/Seoul",
      format: format ?? "online",
      meetingLink: meetingLink || null,
      location: location || null,
      status: "scheduled",
      candidateNotes: candidateNotes || null,
    }).returning();
    return res.status(201).json(created);
  } catch (err) {
    console.error("POST interview-schedules error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/interview-schedules/:id", authenticate, async (req, res) => {
  try {
    const { scheduledDatetime, format, meetingLink, location, status, result, interviewerNotes, candidateNotes, timezone } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (scheduledDatetime) updates.scheduledDatetime = new Date(scheduledDatetime);
    if (format !== undefined) updates.format = format;
    if (meetingLink !== undefined) updates.meetingLink = meetingLink;
    if (location !== undefined) updates.location = location;
    if (status !== undefined) updates.status = status;
    if (result !== undefined) updates.result = result;
    if (interviewerNotes !== undefined) updates.interviewerNotes = interviewerNotes;
    if (candidateNotes !== undefined) updates.candidateNotes = candidateNotes;
    if (timezone !== undefined) updates.timezone = timezone;

    const [updated] = await db.update(interviewSchedules).set(updates).where(eq(interviewSchedules.id, req.params.id as string)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH interview-schedules error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

