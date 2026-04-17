import { Router } from "express";
import { db } from "@workspace/db";
import {
  schoolingConsultations,
  schoolingConsultationStudents,
  studyAbroadConsultations,
  generalConsultations,
} from "@workspace/db/schema";
import { leads, organisations } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

function genRef(prefix: string) {
  return `${prefix}-` + Date.now().toString(36).toUpperCase().padStart(8, "0");
}

async function resolveOrgId(slug: string | undefined): Promise<string | undefined> {
  if (!slug) return undefined;
  try {
    const [org] = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.subdomain, slug))
      .limit(1);
    return org?.id;
  } catch {
    return undefined;
  }
}

async function createLead(opts: {
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  inquiryType: string;
  source: string;
  orgId?: string;
}) {
  const refNumber = "LD-" + Date.now().toString(36).toUpperCase().padStart(7, "0");
  const [lead] = await db
    .insert(leads)
    .values({
      fullName:       opts.fullName,
      firstName:      opts.firstName,
      lastName:       opts.lastName,
      email:          opts.email,
      phone:          opts.phone,
      nationality:    opts.nationality,
      source:         opts.source,
      inquiryType:    opts.inquiryType,
      status:         "new",
      leadRefNumber:  refNumber,
      organisationId: opts.orgId,
      isActive:       true,
    } as any)
    .returning({ id: leads.id, leadRefNumber: leads.leadRefNumber });
  return lead;
}

// ── POST /api/public/consultations/schooling ──────────────────────────────────
router.post("/api/public/consultations/schooling", async (req, res) => {
  try {
    const orgSlug = req.headers["x-organisation-slug"] as string | undefined
      || (req as any).tenantId ? undefined : req.query.org as string | undefined;
    const orgId = await resolveOrgId(orgSlug || req.query.org as string);

    const body = req.body as any;
    const refNumber = genRef("SC");

    // Create lead first
    const guardianName = body.guardianName || "Unknown";
    const lead = await createLead({
      fullName:    guardianName,
      email:       body.email,
      phone:       body.phone,
      inquiryType: "Schooling Consultation",
      source:      "Public Form",
      orgId,
    });

    const [consultation] = await db
      .insert(schoolingConsultations)
      .values({
        refNumber,
        leadId:          lead?.id,
        submittedVia:    "public",
        status:          "new",
        language:        body.language || "en",
        guardianName:    body.guardianName,
        relationship:    body.relationship,
        phone:           body.phone,
        email:           body.email,
        kakaoId:         body.kakaoId,
        messengerId:     body.messengerId,
        accompaniment:   body.accompaniment,
        referralSources: body.referralSources || [],
        preferredStates: body.preferredStates || [],
        urbanPreference: body.urbanPreference,
        schoolTypes:     body.schoolTypes || [],
        schoolPriorities: body.schoolPriorities || [],
        preferredSchools: body.preferredSchools,
        studyDuration:   body.studyDuration,
        targetTerm:      body.targetTerm,
        accommodation:   body.accommodation || [],
        annualBudget:    body.annualBudget,
        concerns:        body.concerns || [],
        specialNote:     body.specialNote,
        consultMethod:   body.consultMethod,
        consultTimes:    body.consultTimes || [],
        privacyConsent:  body.privacyConsent || false,
        organisationId:  orgId,
      } as any)
      .returning({ id: schoolingConsultations.id, refNumber: schoolingConsultations.refNumber });

    // Insert students if provided
    const students = Array.isArray(body.students) ? body.students : [];
    if (students.length > 0) {
      await db.insert(schoolingConsultationStudents).values(
        students.map((s: any) => ({
          consultationId:     consultation.id,
          name:               s.name,
          gender:             s.gender,
          dateOfBirth:        s.dateOfBirth,
          currentGrade:       s.currentGrade,
          currentSchool:      s.currentSchool,
          currentCity:        s.currentCity,
          englishLevel:       s.englishLevel,
          englishScore:       s.englishScore,
          targetAuGrade:      s.targetAuGrade,
          learningStyle:      s.learningStyle,
          sociability:        s.sociability,
          independence:       s.independence,
          emotionalStability: s.emotionalStability,
          interests:          s.interests || [],
          prevExperience:     s.prevExperience || [],
          postGradPlans:      s.postGradPlans || [],
          prInterest:         s.prInterest,
          careerFields:       s.careerFields || [],
          targetUniversity:   s.targetUniversity,
        }))
      );
    }

    res.json({
      success: true,
      refNumber: consultation.refNumber,
      leadRefNumber: lead?.leadRefNumber,
    });
  } catch (err: any) {
    console.error("Public schooling consultation error:", err);
    res.status(500).json({ error: err.message || "Submission failed" });
  }
});

// ── POST /api/public/consultations/study-abroad ───────────────────────────────
router.post("/api/public/consultations/study-abroad", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.query.org as string);
    const body = req.body as any;
    const refNumber = genRef("SA");

    const fullName = [body.firstName, body.lastName].filter(Boolean).join(" ") || body.fullName || "Unknown";
    const lead = await createLead({
      fullName,
      firstName:   body.firstName,
      lastName:    body.lastName,
      email:       body.email,
      phone:       body.phone,
      nationality: body.nationality,
      inquiryType: "Study Abroad Consultation",
      source:      "Public Form",
      orgId,
    });

    const [consultation] = await db
      .insert(studyAbroadConsultations)
      .values({
        refNumber,
        leadId:               lead?.id,
        submittedVia:         "public",
        status:               "new",
        language:             body.language || "en",
        firstName:            body.firstName,
        lastName:             body.lastName,
        fullName,
        dateOfBirth:          body.dateOfBirth,
        gender:               body.gender,
        email:                body.email,
        phone:                body.phone,
        currentCity:          body.currentCity,
        currentCountry:       body.currentCountry,
        nationality:          body.nationality,
        kakaoId:              body.kakaoId,
        messengerId:          body.messengerId,
        destinationCountries: body.destinationCountries || [],
        courseTypes:          body.courseTypes || [],
        fieldOfStudy:         body.fieldOfStudy,
        studyLevel:           body.studyLevel,
        studyDuration:        body.studyDuration,
        targetStartTerm:      body.targetStartTerm,
        preferredInstitutions: body.preferredInstitutions,
        englishLevel:         body.englishLevel,
        englishTestType:      body.englishTestType,
        englishScore:         body.englishScore,
        currentEducationLevel: body.currentEducationLevel,
        currentInstitution:   body.currentInstitution,
        workExperience:       body.workExperience,
        annualBudget:         body.annualBudget,
        fundingSource:        body.fundingSource,
        visaTypeInterest:     body.visaTypeInterest,
        accommodationPreference: body.accommodationPreference,
        airportPickup:        body.airportPickup || false,
        healthSpecialNeeds:   body.healthSpecialNeeds,
        questionsNotes:       body.questionsNotes,
        referralSources:      body.referralSources || [],
        privacyConsent:       body.privacyConsent || false,
        marketingConsent:     body.marketingConsent || false,
        organisationId:       orgId,
      } as any)
      .returning({ id: studyAbroadConsultations.id, refNumber: studyAbroadConsultations.refNumber });

    res.json({
      success: true,
      refNumber: consultation.refNumber,
      leadRefNumber: lead?.leadRefNumber,
    });
  } catch (err: any) {
    console.error("Public study abroad consultation error:", err);
    res.status(500).json({ error: err.message || "Submission failed" });
  }
});

// ── POST /api/public/consultations/general ────────────────────────────────────
router.post("/api/public/consultations/general", async (req, res) => {
  try {
    const orgId = await resolveOrgId(req.query.org as string);
    const body = req.body as any;
    const refNumber = genRef("GC");

    const fullName = [body.firstName, body.lastName].filter(Boolean).join(" ") || body.fullName || "Unknown";
    const lead = await createLead({
      fullName,
      firstName:   body.firstName,
      lastName:    body.lastName,
      email:       body.email,
      phone:       body.phone,
      nationality: body.nationality,
      inquiryType: "General Consultation",
      source:      "Public Form",
      orgId,
    });

    const [consultation] = await db
      .insert(generalConsultations)
      .values({
        refNumber,
        leadId:                 lead?.id,
        submittedVia:           "public",
        status:                 "new",
        language:               body.language || "en",
        firstName:              body.firstName,
        lastName:               body.lastName,
        fullName,
        dateOfBirth:            body.dateOfBirth,
        gender:                 body.gender,
        email:                  body.email,
        phone:                  body.phone,
        currentCity:            body.currentCity,
        currentCountry:         body.currentCountry,
        nationality:            body.nationality,
        kakaoId:                body.kakaoId,
        messengerId:            body.messengerId,
        topics:                 body.topics || [],
        topicOther:             body.topicOther,
        inquirySummary:         body.inquirySummary,
        targetTimeline:         body.targetTimeline,
        budgetRange:            body.budgetRange,
        preferredDestination:   body.preferredDestination,
        questionsNotes:         body.questionsNotes,
        referralSources:        body.referralSources || [],
        preferredContactMethod: body.preferredContactMethod,
        preferredContactTime:   body.preferredContactTime,
        documentNotes:          body.documentNotes,
        privacyConsent:         body.privacyConsent || false,
        marketingConsent:       body.marketingConsent || false,
        organisationId:         orgId,
      } as any)
      .returning({ id: generalConsultations.id, refNumber: generalConsultations.refNumber });

    res.json({
      success: true,
      refNumber: consultation.refNumber,
      leadRefNumber: lead?.leadRefNumber,
    });
  } catch (err: any) {
    console.error("Public general consultation error:", err);
    res.status(500).json({ error: err.message || "Submission failed" });
  }
});

export default router;
