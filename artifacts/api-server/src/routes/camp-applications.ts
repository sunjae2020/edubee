import { Router } from "express";
import { db, runWithTenantSchema } from "@workspace/db";
import { campApplications, applicationParticipants, applications, campApplicationContacts } from "@workspace/db/schema";
import { contacts, leads, contracts, quotes, quote_products, accounts, account_contacts } from "@workspace/db/schema";
import { packageProducts, products, packageGroups, packages as pkgsTable } from "@workspace/db/schema";
import { eq, ilike, or, count, and, desc, SQL, sql, inArray } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { generateCampApplicationPdf, CampAppEmailData, fetchTermsForPackageGroup } from "../services/campApplicationEmailService.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];
const READ_ROLES = [...ADMIN_ROLES, "consultant", "finance", "admission", "team_manager"];
const MASTER_TENANT = process.env.PLATFORM_SUBDOMAIN ?? "myagency";
const VALID_STATUSES = ["submitted", "reviewing", "quoted", "confirmed", "cancelled"] as const;

router.get("/camp-applications", authenticate, requireRole(...READ_ROLES), async (req, res) => {
  const isCC = (req.user as any)?.role === "camp_coordinator";

  const handler = async () => {
  try {
    const { applicationStatus, search, contractId, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];
    if (applicationStatus) conditions.push(eq(campApplications.applicationStatus, applicationStatus));
    if (contractId) conditions.push(eq(campApplications.contractId, contractId));
    if (search) {
      conditions.push(
        or(
          ilike(campApplications.applicantName,  `%${search}%`),
          ilike(campApplications.applicantEmail, `%${search}%`),
          ilike(campApplications.applicationRef, `%${search}%`),
        )!,
      );
    }

    // Camp coordinators: only see applications linked to their package groups
    // Priority: org impersonation (req.tenant) → user's own org → user's id
    if (isCC) {
      const ccOrgId = req.tenant?.id ?? (req.user as any).organisationId ?? (req.user as any).id;
      conditions.push(sql`EXISTS (
        SELECT 1 FROM package_groups pg_cc
        WHERE pg_cc.id = ${campApplications.packageGroupId}
        AND (
          pg_cc.camp_provider_id = ${ccOrgId}::uuid
          OR pg_cc.coordinator_id = ${ccOrgId}::uuid
        )
      )` as unknown as SQL);
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
  };

  if (isCC) {
    await runWithTenantSchema(MASTER_TENANT, handler);
  } else {
    await handler();
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/camp-applications/:id", authenticate, requireRole(...READ_ROLES), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id as string))
      return res.status(400).json({ error: "Invalid application ID format" });
    const [application] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id as string)).limit(1);
    if (!application) return res.status(404).json({ error: "Not found" });

    // Fetch package group name
    const [pgRow] = application.packageGroupId
      ? await db.select({ nameEn: packageGroups.nameEn })
          .from(packageGroups)
          .where(eq(packageGroups.id, application.packageGroupId))
          .limit(1)
      : [null];

    // Fetch package name
    const [pkgRow] = application.packageId
      ? await db.select({ name: pkgsTable.name })
          .from(pkgsTable)
          .where(eq(pkgsTable.id, application.packageId))
          .limit(1)
      : [null];

    // Fetch package products with product details
    const packageProductDetails = application.packageId
      ? await db.select({
          id:          packageProducts.id,
          productId:   packageProducts.productId,
          isOptional:  packageProducts.isOptional,
          quantity:    packageProducts.quantity,
          unitPrice:   packageProducts.unitPrice,
          productName: products.productName,
          price:       products.price,
          currency:    products.currency,
          description: products.description,
        })
        .from(packageProducts)
        .leftJoin(products, eq(packageProducts.productId, products.id))
        .where(eq(packageProducts.packageId, application.packageId))
      : [];

    let participants = await db.select().from(applicationParticipants)
      .where(eq(applicationParticipants.campApplicationId, req.params.id as string));

    // Fallback: if no application_participants, read from camp_application_contacts → contacts
    if (participants.length === 0) {
      const contactLinks = await db
        .select({
          id:              campApplicationContacts.id,
          campApplicationId: campApplicationContacts.campApplicationId,
          participantType: campApplicationContacts.role,
          firstName:       contacts.firstName,
          lastName:        contacts.lastName,
          dateOfBirth:     contacts.dob,
          gender:          contacts.gender,
          nationality:     contacts.nationality,
          email:           contacts.email,
          phone:           contacts.mobile,
        })
        .from(campApplicationContacts)
        .leftJoin(contacts, eq(campApplicationContacts.contactId, contacts.id))
        .where(eq(campApplicationContacts.campApplicationId, req.params.id as string));

      participants = contactLinks.map((c, i) => ({
        id:                   c.id,
        applicationId:        null,
        campApplicationId:    c.campApplicationId,
        participantType:      c.participantType ?? "child",
        sequenceOrder:        i + 1,
        fullName:             `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
        firstName:            c.firstName  ?? null,
        lastName:             c.lastName   ?? null,
        fullNameNative:       null,
        englishName:          null,
        dateOfBirth:          c.dateOfBirth ?? null,
        gender:               c.gender      ?? null,
        nationality:          c.nationality ?? null,
        passportNumber:       null,
        passportExpiry:       null,
        grade:                null,
        schoolName:           null,
        englishLevel:         null,
        medicalConditions:    null,
        dietaryRequirements:  null,
        specialNeeds:         null,
        relationshipToStudent: null,
        isEmergencyContact:   false,
        email:                c.email  ?? null,
        phone:                c.phone  ?? null,
        whatsapp:             null,
        lineId:               null,
        guardianConsentGiven: false,
        guardianConsentAt:    null,
        guardianEmail:        null,
        guardianPhone:        null,
        createdAt:            new Date(),
        updatedAt:            new Date(),
      })) as any[];
    }

    return res.json({
      ...application,
      packageGroupName:    pgRow?.nameEn  ?? null,
      packageName:         pkgRow?.name   ?? null,
      packageProductDetails,
      participants,
    });
  } catch (err) {
    console.error("[GET /api/camp-applications/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/camp-applications/:id/pdf — generate and download PDF
router.get("/camp-applications/:id/pdf", authenticate, requireRole(...READ_ROLES), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id as string))
      return res.status(400).json({ error: "Invalid application ID format" });

    const [app] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id as string)).limit(1);
    if (!app) return res.status(404).json({ error: "Application not found" });

    // Resolve program / package names
    const [pgRow] = app.packageGroupId
      ? await db.select({ nameEn: packageGroups.nameEn })
          .from(packageGroups).where(eq(packageGroups.id, app.packageGroupId)).limit(1)
      : [null];

    const [pkgRow] = app.packageId
      ? await db.select({ name: pkgsTable.name })
          .from(pkgsTable).where(eq(pkgsTable.id, app.packageId)).limit(1)
      : [null];

    // Fetch participants
    const rawParticipants = await db.select().from(applicationParticipants)
      .where(eq(applicationParticipants.campApplicationId, req.params.id as string));

    const participants: CampAppEmailData["participants"] = rawParticipants.map(p => ({
      participantType:        p.participantType ?? "student",
      firstName:              p.firstName ?? "",
      lastName:               p.lastName  ?? "",
      dateOfBirth:            p.dateOfBirth ?? undefined,
      gender:                 p.gender ?? undefined,
      nationality:            p.nationality ?? undefined,
      passportNumber:         p.passportNumber ?? undefined,
      passportExpiry:         p.passportExpiry ?? undefined,
      grade:                  p.grade ?? undefined,
      schoolName:             p.schoolName ?? undefined,
      englishLevel:           p.englishLevel ?? undefined,
      medicalConditions:      p.medicalConditions ?? undefined,
      dietaryRequirements:    p.dietaryRequirements ?? undefined,
      specialNeeds:           p.specialNeeds ?? undefined,
      relationshipToStudent:  p.relationshipToStudent ?? undefined,
      phone:                  p.phone ?? undefined,
      email:                  p.email ?? undefined,
      whatsapp:               p.whatsapp ?? undefined,
    }));

    // Fetch Terms & Conditions
    const termsContent = app.packageGroupId
      ? (await fetchTermsForPackageGroup(app.packageGroupId)) ?? undefined
      : undefined;

    const data: CampAppEmailData = {
      applicationNumber:     app.applicationRef ?? "N/A",
      packageGroupId:        app.packageGroupId ?? "",
      packageId:             app.packageId ?? undefined,
      programName:           pgRow?.nameEn ?? undefined,
      packageName:           pkgRow?.name  ?? undefined,
      termsContent,
      applicantFirstName:    app.applicantFirstName ?? "",
      applicantLastName:     app.applicantLastName  ?? "",
      applicantPhone:        app.applicantPhone     ?? undefined,
      applicantEmail:        app.applicantEmail     ?? undefined,
      preferredStartDate:    app.preferredStartDate ?? undefined,
      specialRequests:       app.specialRequirements    ?? undefined,
      emergencyContactName:  app.emergencyContactName  ?? undefined,
      emergencyContactPhone: app.emergencyContactPhone ?? undefined,
      signatureImage:        app.signatureImage   ?? undefined,
      signatureDate:         app.signatureDate    ?? undefined,
      participants,
    };

    const pdfBuffer = await generateCampApplicationPdf(data);
    const filename = `camp-application-${app.applicationRef ?? req.params.id as string}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[GET /api/camp-applications/:id/pdf]", err);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// POST /api/camp-applications — create new camp application (admin)
router.post("/camp-applications", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const {
      applicantFirstName, applicantLastName, applicantOriginalName, applicantEnglishName,
      applicantEmail, applicantPhone, applicantNationality, applicantDob,
      packageGroupId, packageId,
      preferredStartDate, studentCount, adultCount,
      specialRequirements, dietaryRequirements, medicalConditions,
      emergencyContactName, emergencyContactPhone,
      notes, assignedStaffId, agentAccountId,
      signatureImage, signatureDate,
      participants,
      // ── Guardian consent for minors (Australian Privacy Act — APP 3.3) ────────
      guardianConsentGiven, guardianConsentAt, guardianEmail, guardianPhone,
    } = req.body;

    if (!applicantFirstName || !applicantLastName || !applicantEmail) {
      return res.status(400).json({ error: "First name, last name, and email are required" });
    }
    if (!packageGroupId) {
      return res.status(400).json({ error: "Package group is required" });
    }
    if (!packageId) {
      return res.status(400).json({ error: "Package is required" });
    }

    // ── Guardian consent validation for minors ────────────────────────────────
    if (applicantDob) {
      const ageMs = Date.now() - new Date(applicantDob).getTime();
      const ageMY = ageMs / (365.25 * 24 * 60 * 60 * 1000);
      if (ageMY < 18) {
        if (!guardianConsentGiven) {
          return res.status(400).json({
            error: "Parental/guardian consent is required for applicants under 18 years of age.",
            requiresGuardianConsent: true,
            applicantAge: Math.floor(ageMY),
          });
        }
        if (!guardianEmail) {
          return res.status(400).json({
            error: "Guardian email is required for minor applicants.",
            requiresGuardianConsent: true,
          });
        }
      }
    }

    // Generate applicationRef: APP-YYYY-XXXX
    const year = new Date().getFullYear();
    const prefix = `APP-${year}-`;
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(sql`application_number LIKE ${prefix + "%"}`);
    const seq = (Number(countResult?.count ?? 0) + 1).toString().padStart(4, "0");
    const applicationRef = `${prefix}${seq}`;

    const fullName = `${applicantFirstName} ${applicantLastName.toUpperCase()}`.trim();

    const [newApp] = await db.insert(campApplications).values({
      applicationRef,
      packageGroupId,
      packageId:             packageId || null,
      applicantFirstName,
      applicantLastName,
      applicantOriginalName: applicantOriginalName || null,
      applicantEnglishName:  applicantEnglishName  || null,
      applicantName:         fullName,
      applicantEmail,
      applicantPhone:        applicantPhone        || null,
      applicantNationality:  applicantNationality  || null,
      applicantDob:          applicantDob          || null,
      preferredStartDate:    preferredStartDate    || null,
      studentCount:          Number(studentCount)  || 0,
      adultCount:            Number(adultCount)    || 1,
      specialRequirements:   specialRequirements   || null,
      dietaryRequirements:   dietaryRequirements   || null,
      medicalConditions:     medicalConditions     || null,
      emergencyContactName:  emergencyContactName  || null,
      emergencyContactPhone: emergencyContactPhone || null,
      guardianConsentGiven:  guardianConsentGiven  ?? false,
      guardianConsentAt:     guardianConsentGiven ? (guardianConsentAt ? new Date(guardianConsentAt) : new Date()) : null,
      guardianEmail:         guardianEmail         || null,
      guardianPhone:         guardianPhone         || null,
      applicationStatus: "submitted",
      status: "Active",
      assignedStaffId: assignedStaffId || null,
      agentAccountId:  agentAccountId  || null,
      signatureImage:  signatureImage  || null,
      signatureDate:   signatureDate   || null,
      notes:           notes           || null,
    }).returning();

    // Insert participants
    if (Array.isArray(participants) && participants.length > 0) {
      const participantRows = participants.map((p: any) => ({
        campApplicationId: newApp.id,
        participantType:   p.participantType ?? "child",
        sequenceOrder:     p.sequenceOrder   ?? 1,
        fullName:          p.fullName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
        firstName:         p.firstName         || null,
        lastName:          p.lastName          || null,
        fullNameNative:    p.fullNameNative    || null,
        englishName:       p.englishName       || null,
        dateOfBirth:       p.dateOfBirth       || null,
        gender:            p.gender            || null,
        nationality:       p.nationality       || null,
        passportNumber:    p.passportNumber    || null,
        passportExpiry:    p.passportExpiry    || null,
        grade:             p.grade             || null,
        schoolName:        p.schoolName        || null,
        englishLevel:      p.englishLevel      || null,
        medicalConditions: p.medicalConditions || null,
        dietaryRequirements: p.dietaryRequirements || null,
        specialNeeds:      p.specialNeeds      || null,
        relationshipToStudent: p.relationshipToStudent || null,
        isEmergencyContact: p.isEmergencyContact ?? false,
        email:             p.email             || null,
        phone:             p.phone             || null,
        whatsapp:          p.whatsapp          || null,
        lineId:            p.lineId            || null,
      }));
      await db.insert(applicationParticipants).values(participantRows);
    }

    return res.status(201).json(newApp);
  } catch (err) {
    console.error("[POST /api/camp-applications]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/camp-applications/:id/status", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { applicationStatus: newStatus } = req.body;
    if (!newStatus) return res.status(400).json({ error: "applicationStatus is required" });
    if (!(VALID_STATUSES as readonly string[]).includes(newStatus))
      return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` });

    const [application] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id as string)).limit(1);
    if (!application) return res.status(404).json({ error: "Not found" });

    await db.update(campApplications)
      .set({ applicationStatus: newStatus, updatedAt: new Date() })
      .where(eq(campApplications.id, req.params.id as string));

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
          firstName:   application.applicantFirstName ?? nameParts[0],
          lastName:    (application.applicantLastName ?? nameParts.slice(1).join(" ")) || "-",
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
      .where(eq(campApplications.id, req.params.id as string)).limit(1);
    return res.json(refreshed);
  } catch (err) {
    console.error("[PATCH /api/camp-applications/:id/status]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/camp-applications/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id as string)) {
      console.warn("[PUT /camp-applications/:id] Invalid UUID:", req.params.id as string);
      return res.status(400).json({ error: "Invalid application ID format" });
    }

    const ALLOWED_FIELDS = [
      "applicantFirstName", "applicantLastName",
      "applicantOriginalName", "applicantEnglishName",
      "applicantName", "applicantEmail", "applicantPhone", "applicantNationality", "applicantDob",
      "adultCount", "studentCount", "preferredStartDate",
      "specialRequirements", "dietaryRequirements", "medicalConditions",
      "emergencyContactName", "emergencyContactPhone",
      "assignedStaffId", "applicationStatus", "notes",
      "packageGroupId", "packageId",
    ] as const;

    const payload: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ALLOWED_FIELDS) {
      if (key in req.body) {
        const val = req.body[key];
        payload[key] = (val === "" || val === undefined) ? null : val;
      }
    }

    // Auto-compute applicantName from first/last name if either provided
    const fn = (payload.applicantFirstName ?? req.body.applicantFirstName ?? "") as string;
    const ln = (payload.applicantLastName  ?? req.body.applicantLastName  ?? "") as string;
    if (fn || ln) {
      payload.applicantName = [fn, ln ? ln.toUpperCase() : ""].filter(Boolean).join(" ") || payload.applicantName;
    }

    if (payload.applicationStatus !== undefined && payload.applicationStatus !== null) {
      if (!(VALID_STATUSES as readonly string[]).includes(payload.applicationStatus as string)) {
        console.warn("[PUT /camp-applications/:id] Invalid status:", payload.applicationStatus);
        return res.status(400).json({ error: `Invalid status "${payload.applicationStatus}". Allowed: ${VALID_STATUSES.join(", ")}` });
      }
    } else if (payload.applicationStatus === null) {
      // null status → remove from payload (keep existing DB value)
      delete payload.applicationStatus;
    }

    const [updated] = await db.update(campApplications)
      .set(payload as any)
      .where(eq(campApplications.id, req.params.id as string))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[PUT /api/camp-applications/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/camp-applications/:id/convert-to-quote", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [application] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id as string)).limit(1);
    if (!application) return res.status(404).json({ error: "Camp application not found" });

    // Check for existing quote first → 409 regardless of current status
    if (application.quoteId)
      return res.status(409).json({ error: "Quote already exists for this application", quoteId: application.quoteId });

    if (!["submitted", "reviewing"].includes(application.applicationStatus))
      return res.status(400).json({ error: "Application must be in submitted or reviewing status to convert to quote" });

    const quoteRefNumber = "QTE-" + Date.now().toString().slice(-8);

    // ── Pre-check: find existing client Account by email ─────────────────
    let existingClientAccountId: string | null = null;
    const applicantEmail = application.applicantEmail ?? null;
    if (applicantEmail) {
      const emailCheck = await db.execute(sql`
        SELECT id FROM accounts WHERE email = ${applicantEmail} LIMIT 1
      `);
      const emailRow = ((emailCheck as any).rows ?? (emailCheck as unknown as any[]))[0];
      if (emailRow?.id) existingClientAccountId = emailRow.id;
    }

    const result = await db.transaction(async (tx) => {
      // ── Auto-create Account + Contact from applicant data ─────────────
      let clientAccountId: string | null = existingClientAccountId;

      const hasApplicantName = !!(
        application.applicantFirstName ||
        application.applicantLastName  ||
        application.applicantName
      );

      if (!clientAccountId && req.user?.id && hasApplicantName) {
        const firstName = application.applicantFirstName
          ?? application.applicantName?.split(" ")[0]
          ?? "Unknown";
        const lastName  = application.applicantLastName
          ?? application.applicantName?.split(" ").slice(1).join(" ")
          ?? "";

        const [newContact] = await tx.insert(contacts).values({
          firstName,
          lastName,
          originalName: application.applicantOriginalName ?? null,
          englishName:  application.applicantEnglishName  ?? null,
          email:        applicantEmail,
          mobile:       application.applicantPhone        ?? null,
          nationality:  application.applicantNationality  ?? null,
          dob:          application.applicantDob          ?? null,
          accountType:  "Student",
          status:       "Active",
        }).returning({ id: contacts.id });

        const accountName =
          [application.applicantFirstName, application.applicantLastName]
            .filter(Boolean).join(" ")
          || application.applicantName
          || "Client";

        const [newAccount] = await tx.insert(accounts).values({
          name:             accountName,
          email:            applicantEmail,
          phoneNumber:      application.applicantPhone       ?? null,
          country:          application.applicantNationality ?? null,
          accountType:      "Student",
          ownerId:          req.user!.id,
          status:           "Active",
          primaryContactId: newContact.id,
        }).returning({ id: accounts.id });

        await tx.insert(account_contacts).values({
          accountId: newAccount.id,
          contactId: newContact.id,
          role:      "Primary",
        });

        clientAccountId = newAccount.id;
      }

      const [newQuote] = await tx.insert(quotes).values({
        quoteRefNumber,
        campApplicationId: application.id,
        leadId:            application.leadId          ?? null,
        studentAccountId:  clientAccountId,
        customerName:      application.applicantName,
        originalName:      application.applicantOriginalName ?? null,
        customerContactId: null,
        quoteStatus:       "Draft",
        isTemplate:        false,
        createdBy:         req.user?.id                ?? null,
        ownerId:           application.assignedStaffId ?? null,
        notes:             `Created from Camp Application: ${application.applicationRef ?? ""}`,
      }).returning();

      await tx.update(campApplications).set({
        quoteId:           newQuote.id,
        applicationStatus: "quoted",
        quotedAt:          new Date(),
        updatedAt:         new Date(),
      }).where(eq(campApplications.id, application.id));

      // ── Add package products to the quote ──────────────────────────────
      if (application.packageId) {
        const pkgProds = await tx
          .select({
            productId:   packageProducts.productId,
            isOptional:  packageProducts.isOptional,
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
              productName: pp.productName ?? "Product",
              price:       pp.price ?? pp.unitPrice ?? "0",
              quantity:    pp.quantity ?? 1,
              unitPrice:   pp.unitPrice ?? pp.price ?? "0",
              total:       String(
                (Number(pp.unitPrice ?? pp.price ?? 0)) * (pp.quantity ?? 1)
              ),
              sortOrder:   i,
              sortIndex:   i,
              manualInput: false,
            }))
          );
        } else {
          // No package_products defined — add the package itself as a single line item
          const [pkg] = await tx
            .select({ id: pkgsTable.id, name: pkgsTable.name, priceAud: pkgsTable.priceAud })
            .from(pkgsTable)
            .where(eq(pkgsTable.id, application.packageId))
            .limit(1);
          if (pkg) {
            const unitAmt = String(pkg.priceAud ?? "0");
            await tx.insert(quote_products).values({
              quoteId:     newQuote.id,
              name:        pkg.name ?? "Package",
              productName: pkg.name ?? "Package",
              price:       unitAmt,
              quantity:    1,
              unitPrice:   unitAmt,
              total:       unitAmt,
              sortOrder:   0,
              sortIndex:   0,
              manualInput: false,
              isInitialPayment: true,
            });
          }
        }
      }

      return { newQuote, clientAccountId };
    });

    return res.json({
      success:           true,
      quoteId:           result.newQuote.id,
      quoteRefNumber:    result.newQuote.quoteRefNumber,
      campApplicationId: application.id,
      clientAccountId:   result.clientAccountId,
      message:           "Quote created successfully",
    });
  } catch (err: any) {
    console.error("[POST /api/camp-applications/:id/convert-to-quote]", err);
    return res.status(500).json({ error: "Failed to convert to quote", detail: err.message });
  }
});

router.post("/camp-applications/:id/convert-to-contract", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id as string))
      return res.status(400).json({ error: "Invalid application ID format" });

    const [application] = await db.select().from(campApplications)
      .where(eq(campApplications.id, req.params.id as string)).limit(1);
    if (!application) return res.status(404).json({ error: "Camp application not found" });

    if (application.contractId)
      return res.status(409).json({ error: "Contract already exists for this application", contractId: application.contractId });

    if (application.applicationStatus !== "quoted")
      return res.status(400).json({ error: "Application must be in quoted status to convert to contract" });

    if (!application.quoteId)
      return res.status(400).json({ error: "No quote found. Please convert to quote first." });

    const contractNumber = "CNT-" + Date.now().toString().slice(-8);

    const result = await db.transaction(async (tx) => {
      const [newContract] = await tx.insert(contracts).values({
        contractNumber,
        studentName:   application.applicantName,
        clientEmail:   application.applicantEmail,
        clientCountry: application.applicantNationality ?? null,
        status:        "draft",
        currency:      "AUD",
        notes:         `Created from Camp Application: ${application.applicationRef ?? application.id}`,
        updatedAt:     new Date(),
      }).returning();

      await tx.update(campApplications).set({
        contractId:        newContract.id,
        applicationStatus: "confirmed",
        updatedAt:         new Date(),
      }).where(eq(campApplications.id, application.id));

      return newContract;
    });

    return res.json({
      success:          true,
      contractId:       result.id,
      contractNumber:   result.contractNumber,
      campApplicationId: application.id,
      message:          "Contract created successfully",
    });
  } catch (err: any) {
    console.error("[POST /api/camp-applications/:id/convert-to-contract]", err);
    return res.status(500).json({ error: "Failed to convert to contract", detail: err.message });
  }
});

// ─── DELETE /api/camp-applications/bulk  (super_admin soft/permanent delete) ──
router.delete("/camp-applications/bulk", authenticate, async (req, res) => {
  if (!["super_admin","admin"].includes((req.user as any)?.role)) return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids, soft } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    if (soft) {
      await db.update(campApplications).set({ applicationStatus: "cancelled", updatedAt: new Date() }).where(inArray(campApplications.id, ids));
      return res.json({ success: true, updated: ids.length });
    }
    await db.delete(campApplications).where(inArray(campApplications.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/camp-applications/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
