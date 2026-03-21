import { Router } from "express";
import { db } from "@workspace/db";
import { leads, applications, applicationParticipants, contracts, instituteMgt, hotelMgt, pickupMgt, tourMgt, interviewSchedules, users, settlementMgt } from "@workspace/db/schema";
import { eq, and, ilike, or, count, inArray, sql, SQL } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { financeAutoGenerate } from "../services/contractFinanceService.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

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
    const { agentId, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (agentId) conditions.push(eq(leads.agentId, agentId));
    if (status) conditions.push(eq(leads.status, status));
    if (search) conditions.push(or(ilike(leads.fullName, `%${search}%`), ilike(leads.email, `%${search}%`))!);
    if (req.user!.role === "education_agent") conditions.push(eq(leads.agentId, req.user!.id));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(leads).where(whereClause);
    const rawData = await db.select().from(leads).where(whereClause).limit(limitNum).offset(offset).orderBy(leads.createdAt);
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
    if (req.user!.role === "education_agent") body.agentId = req.user!.id;
    const [lead] = await db.insert(leads).values(body).returning();
    return res.status(201).json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/leads/:id", authenticate, async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/leads/:id", authenticate, async (req, res) => {
  try {
    const [lead] = await db.update(leads).set({ ...req.body, updatedAt: new Date() })
      .where(eq(leads.id, req.params.id)).returning();
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/leads/:id", authenticate, async (req, res) => {
  try {
    await db.delete(leads).where(eq(leads.id, req.params.id));
    return res.json({ success: true, message: "Lead deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/leads/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const [lead] = await db.update(leads).set({ status, updatedAt: new Date() })
      .where(eq(leads.id, req.params.id)).returning();
    if (!lead) return res.status(404).json({ error: "Not Found" });
    return res.json(lead);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/leads/:id/convert", authenticate, async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
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

// Applications
router.get("/applications", authenticate, async (req, res) => {
  try {
    const { agentId, status, packageGroupId, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (agentId) conditions.push(eq(applications.agentId, agentId));
    if (status) conditions.push(eq(applications.status, status));
    if (packageGroupId) conditions.push(eq(applications.packageGroupId, packageGroupId));
    if (search) conditions.push(ilike(applications.applicationNumber, `%${search}%`));
    if (req.user!.role === "education_agent") conditions.push(eq(applications.agentId, req.user!.id));
    if (req.user!.role === "parent_client") conditions.push(eq(applications.clientId, req.user!.id));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: count() }).from(applications).where(whereClause);
    const rawData = await db.select().from(applications).where(whereClause).limit(limitNum).offset(offset).orderBy(applications.createdAt);

    // Enrich with student name (client user's fullName)
    const clientIds = [...new Set(rawData.map(a => a.clientId).filter(Boolean))] as string[];
    const userRows = clientIds.length > 0
      ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, clientIds))
      : [];
    const userMap = new Map(userRows.map(u => [u.id, u.fullName]));
    const data = rawData.map(a => ({
      ...a,
      studentName: a.clientId ? (userMap.get(a.clientId) ?? a.applicationNumber) : a.applicationNumber,
    }));

    const total = Number(totalResult.count);
    return res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/applications", authenticate, async (req, res) => {
  try {
    const body = req.body;
    if (req.user!.role === "education_agent") body.agentId = req.user!.id;
    body.applicationNumber = generateApplicationNumber();
    const [application] = await db.insert(applications).values(body).returning();
    return res.status(201).json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/applications/:id", authenticate, async (req, res) => {
  try {
    const [application] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!application) return res.status(404).json({ error: "Not Found" });
    
    const participants = await db.select().from(applicationParticipants)
      .where(eq(applicationParticipants.applicationId, req.params.id));

    // Always look up linked contract (handles status inconsistency edge cases)
    let contractInfo: { contractId: string; contractNumber: string } | null = null;
    const [linkedContract] = await db
      .select({ id: contracts.id, contractNumber: contracts.contractNumber })
      .from(contracts)
      .where(eq(contracts.applicationId, req.params.id))
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
    const { applicationId, participantType, sequenceOrder, fullName, fullNameNative, dateOfBirth,
      gender, nationality, passportNumber, passportExpiry, grade, schoolName, englishLevel,
      medicalConditions, dietaryRequirements, specialNeeds, relationshipToStudent,
      isEmergencyContact, email, phone, whatsapp, lineId } = req.body;
    if (!applicationId || !fullName) return res.status(400).json({ error: "applicationId and fullName are required" });
    const [created] = await db.insert(applicationParticipants).values({
      applicationId, participantType: participantType ?? "child",
      sequenceOrder: sequenceOrder ?? 1, fullName,
      fullNameNative: fullNameNative ?? null, dateOfBirth: dateOfBirth ?? null,
      gender: gender ?? null, nationality: nationality ?? null,
      passportNumber: passportNumber ?? null, passportExpiry: passportExpiry ?? null,
      grade: grade ?? null, schoolName: schoolName ?? null, englishLevel: englishLevel ?? null,
      medicalConditions: medicalConditions ?? null, dietaryRequirements: dietaryRequirements ?? null,
      specialNeeds: specialNeeds ?? null, relationshipToStudent: relationshipToStudent ?? null,
      isEmergencyContact: isEmergencyContact ?? false,
      email: email ?? null, phone: phone ?? null, whatsapp: whatsapp ?? null, lineId: lineId ?? null,
    }).returning();
    return res.status(201).json(created);
  } catch (err) {
    console.error("POST participant error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/applications/participants/:id", authenticate, async (req, res) => {
  try {
    const {
      fullName, fullNameNative, dateOfBirth, gender, nationality,
      passportNumber, passportExpiry, grade, schoolName, englishLevel,
      medicalConditions, dietaryRequirements, specialNeeds,
      relationshipToStudent, isEmergencyContact, email, phone, whatsapp, lineId,
    } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (fullName !== undefined) updates.fullName = fullName;
    if (fullNameNative !== undefined) updates.fullNameNative = fullNameNative;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth || null;
    if (gender !== undefined) updates.gender = gender;
    if (nationality !== undefined) updates.nationality = nationality;
    if (passportNumber !== undefined) updates.passportNumber = passportNumber;
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
      .where(eq(applicationParticipants.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH participant error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/applications/:id", authenticate, async (req, res) => {
  try {
    const [application] = await db.update(applications).set({ ...req.body, updatedAt: new Date() })
      .where(eq(applications.id, req.params.id)).returning();
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
      .where(eq(applications.id, req.params.id)).returning();
    if (!application) return res.status(404).json({ error: "Not Found" });
    return res.json(application);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/applications/:id/convert-contract", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const [application] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!application) return res.status(404).json({ error: "Not Found" });

    const existingContract = await db.select().from(contracts).where(eq(contracts.applicationId, req.params.id)).limit(1);
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
        applicationId: req.params.id,
        campProviderId: req.user!.id,
        status: "draft",
        currency: "AUD",
      }).returning();

      await tx.insert(instituteMgt).values({ contractId: contract.id, status: "pending" });
      await tx.insert(hotelMgt).values({ contractId: contract.id, status: "pending" });
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

      await tx.update(applications).set({ status: "contracted", updatedAt: new Date() }).where(eq(applications.id, req.params.id));

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

// ── Interview Schedules ───────────────────────────────────────
router.get("/interview-schedules", authenticate, async (req, res) => {
  try {
    const { applicationId, status } = req.query as Record<string, string>;
    const conditions: any[] = [];
    if (applicationId) conditions.push(eq(interviewSchedules.applicationId, applicationId));
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
    const { applicationId, packageGroupId, interviewerId, scheduledDatetime, timezone, format, meetingLink, location, candidateNotes } = req.body;
    if (!scheduledDatetime) return res.status(400).json({ error: "scheduledDatetime is required" });
    const [created] = await db.insert(interviewSchedules).values({
      applicationId: applicationId || null,
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

    const [updated] = await db.update(interviewSchedules).set(updates).where(eq(interviewSchedules.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not Found" });
    return res.json(updated);
  } catch (err) {
    console.error("PATCH interview-schedules error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

