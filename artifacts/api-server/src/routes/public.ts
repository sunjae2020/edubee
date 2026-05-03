import { Router } from "express";
import { db, pool, staticDb, runWithTenantSchema } from "@workspace/db";
import { GoogleGenAI } from "@google/genai";
import {
  packageGroups,
  packages,
  enrollmentSpots,
  enrollmentSettings,
  interviewSettings,
  applications,
  applicationParticipants,
  applicationGrade,
  exchangeRates,
  campApplications,
  applicationForms,
  formTermsContent,
  leads,
  platformPlans,
  organisations,
  users,
} from "@workspace/db/schema";
import { eq, and, inArray, sql, desc, isNotNull, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { isReservedSubdomain } from "../utils/reservedSubdomains.js";
import { sendCampApplicationEmails } from "../services/campApplicationEmailService.js";
import { listTenantSchemas } from "../seeds/provision-tenant.js";
import { onboardTenant } from "../services/onboardingService.js";
import { getDefaultFeatures } from "../middleware/featureGuard.js";
import { sendCampOnboardWelcomeEmail } from "../services/emailService.js";
import {
  initKnowledgeBase,
  retrieveContext,
  getSystemPrompt,
} from "../services/knowledgeBase.js";
import { z } from "zod/v4";

// KB lazy init for public chatbot widget (idempotent)
let kbReadyPublic = false;
async function ensureKBPublic() {
  if (!kbReadyPublic) { kbReadyPublic = true; await initKnowledgeBase(); }
}

// Session history for public widget users (keyed by browser-generated sessionId)
type Turn = { role: "user" | "model"; parts: { text: string }[] };
const pubSessions = new Map<string, Turn[]>();

const router = Router();

// camp.edubee.co always serves data from this tenant (override via env if needed).
const CAMP_TENANT = process.env.PLATFORM_SUBDOMAIN ?? "myagency";

// Country → currency mapping
const COUNTRY_CURRENCY: Record<string, { currency: string; symbol: string; flag: string; decimalPlaces: number }> = {
  AU: { currency: "AUD", symbol: "A$", flag: "🇦🇺", decimalPlaces: 2 },
  PH: { currency: "PHP", symbol: "₱", flag: "🇵🇭", decimalPlaces: 0 },
  SG: { currency: "SGD", symbol: "S$", flag: "🇸🇬", decimalPlaces: 2 },
  TH: { currency: "THB", symbol: "฿", flag: "🇹🇭", decimalPlaces: 0 },
  KR: { currency: "KRW", symbol: "₩", flag: "🇰🇷", decimalPlaces: 0 },
  JP: { currency: "JPY", symbol: "¥", flag: "🇯🇵", decimalPlaces: 0 },
  GB: { currency: "GBP", symbol: "£", flag: "🇬🇧", decimalPlaces: 2 },
  US: { currency: "USD", symbol: "$", flag: "🇺🇸", decimalPlaces: 2 },
};

const CURRENCY_FIELD: Record<string, keyof typeof packages.$inferSelect> = {
  AUD: "priceAud",
  PHP: "pricePhp",
  SGD: "priceSgd",
  THB: "priceThb",
  KRW: "priceKrw",
  JPY: "priceJpy",
  GBP: "priceGbp",
  USD: "priceUsd",
};

function formatPrice(amount: string | null, symbol: string, decimalPlaces: number): string {
  if (!amount) return "";
  const num = parseFloat(amount);
  return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}`;
}

// GET /api/public/packages — no auth (camp.edubee.co tenant)
router.get("/public/packages", async (req, res) => {
  await runWithTenantSchema(CAMP_TENANT, async () => {
  try {
    const groups = await db
      .select()
      .from(packageGroups)
      .where(and(eq(packageGroups.status, "active"), isNotNull(packageGroups.landingOrder)))
      .orderBy(asc(packageGroups.landingOrder));

    if (groups.length === 0) {
      return res.json([]);
    }

    const groupIds = groups.map((g) => g.id);

    const [pkgList, spotList, settingsList, interviewList, allRates] = await Promise.all([
      db.select().from(packages).where(and(inArray(packages.packageGroupId, groupIds), eq(packages.status, "active"))),
      db.select().from(enrollmentSpots).where(inArray(enrollmentSpots.packageGroupId, groupIds)).orderBy(enrollmentSpots.gradeOrder),
      db.select().from(enrollmentSettings).where(inArray(enrollmentSettings.packageGroupId, groupIds)),
      db.select().from(interviewSettings).where(inArray(interviewSettings.packageGroupId, groupIds)),
      db.select().from(exchangeRates).orderBy(desc(exchangeRates.effectiveDate)),
    ]);

    // Build latest AUD→X rate map (from_currency=AUD)
    const latestRateMap: Record<string, { rate: number; date: string }> = {};
    for (const r of allRates) {
      if (r.fromCurrency === "AUD") {
        const key = r.toCurrency.toUpperCase();
        if (!latestRateMap[key]) {
          latestRateMap[key] = { rate: parseFloat(r.rate), date: r.effectiveDate };
        }
      }
    }
    // Also build X→AUD map so we can invert for currencies stored as X→AUD
    const invertedRateMap: Record<string, { rate: number; date: string }> = {};
    for (const r of allRates) {
      if (r.toCurrency === "AUD") {
        const key = r.fromCurrency.toUpperCase();
        if (!invertedRateMap[key]) {
          invertedRateMap[key] = { rate: 1 / parseFloat(r.rate), date: r.effectiveDate };
        }
      }
    }
    const rateMap = { ...invertedRateMap, ...latestRateMap, AUD: { rate: 1, date: new Date().toISOString().slice(0, 10) } };

    const result = groups.map((group) => {
      const countryInfo = COUNTRY_CURRENCY[group.countryCode ?? "AU"] ?? COUNTRY_CURRENCY["AU"];
      const { currency, symbol, flag, decimalPlaces } = countryInfo;

      const groupPackages = pkgList
        .filter((p) => p.packageGroupId === group.id)
        .map((pkg) => {
          const currencyField = CURRENCY_FIELD[currency] ?? "priceAud";
          const rawPrice = (pkg as Record<string, unknown>)[currencyField] as string | null;
          const displayFormatted = rawPrice ? formatPrice(rawPrice, symbol, decimalPlaces) : null;

          const audPrice = pkg.priceAud ? parseFloat(pkg.priceAud) : null;
          const convertedPrices: Record<string, { amount: number | null; rate: number | null; rateDate: string | null }> = {};
          for (const [ccy, info] of Object.entries(rateMap)) {
            convertedPrices[ccy.toLowerCase()] = {
              amount: audPrice !== null ? Math.round(audPrice * info.rate * 100) / 100 : null,
              rate: info.rate,
              rateDate: info.date,
            };
          }

          return {
            id: pkg.id,
            name: pkg.name,
            durationDays: pkg.durationDays,
            displayPrice: rawPrice ? parseFloat(rawPrice) : null,
            displayCurrency: currency,
            displaySymbol: symbol,
            displayFormatted,
            allPrices: {
              aud: pkg.priceAud,
              usd: pkg.priceUsd,
              krw: pkg.priceKrw,
              jpy: pkg.priceJpy,
              thb: pkg.priceThb,
              php: pkg.pricePhp,
              sgd: pkg.priceSgd,
              gbp: pkg.priceGbp,
            },
            convertedPrices,
          };
        });

      const groupSpots = spotList.filter((s) => s.packageGroupId === group.id);
      const groupSetting = settingsList.find((s) => s.packageGroupId === group.id);
      const groupInterview = interviewList.find((s) => s.packageGroupId === group.id);

      const spotSummary =
        groupSetting?.isSpotLimited && groupSpots.length > 0
          ? {
              grades: groupSpots.map((spot) => {
                const available = Math.max(0, spot.totalSpots - (spot.reservedSpots ?? 0) - (spot.manualReserved ?? 0));
                let status: "available" | "limited" | "full" = "available";
                if (available === 0) status = "full";
                else if (available <= 3) status = "limited";
                return {
                  id: spot.id,
                  label: spot.gradeLabel,
                  available,
                  total: spot.totalSpots,
                  status,
                };
              }),
            }
          : null;

      return {
        id: group.id,
        nameEn: group.nameEn,
        nameKo: group.nameKo,
        nameJa: group.nameJa,
        nameTh: group.nameTh,
        descriptionEn: group.descriptionEn,
        descriptionKo: group.descriptionKo,
        descriptionJa: group.descriptionJa,
        descriptionTh: group.descriptionTh,
        thumbnailUrl: group.thumbnailUrl,
        location: group.location,
        countryCode: group.countryCode,
        startDate: group.startDate ? group.startDate.toISOString().slice(0, 10) : null,
        endDate: group.endDate ? group.endDate.toISOString().slice(0, 10) : null,
        primaryCurrency: currency,
        primaryCurrencySymbol: symbol,
        countryFlag: flag,
        interviewRequired: groupInterview?.isRequired ?? false,
        spotSummary,
        packages: groupPackages,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
  });
});

// Participant schema
const participantSchema = z.object({
  participantType: z.enum(["primary_student", "child", "adult"]),
  fullName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullNameNative: z.string().optional(),
  englishName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  grade: z.string().optional(),
  schoolName: z.string().optional(),
  englishLevel: z.string().optional(),
  medicalConditions: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  specialNeeds: z.string().optional(),
  relationshipToStudent: z.string().optional(),
  isEmergencyContact: z.boolean().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  lineId: z.string().optional(),
  enrollmentSpotId: z.string().uuid().optional(),
});

const publicApplicationSchema = z.object({
  packageGroupId: z.string().uuid(),
  packageId: z.string().uuid().optional(),
  preferredStartDate: z.string().optional(),
  referralSource: z.string().optional(),
  referralAgentCode: z.string().optional(),
  primaryLanguage: z.string().default("en"),
  specialRequests: z.string().optional(),
  signatureImage: z.string().optional(),
  termsAccepted: z.literal(true),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  participants: z.array(participantSchema).min(1),
});

// POST /api/public/applications — no auth
router.post("/public/applications", async (req, res) => {
  try {
    const parsed = publicApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    }

    const data = parsed.data;

    // Check enrollment spot availability for children participants requesting a spot
    const spotRequests = data.participants.filter((p) => p.enrollmentSpotId);
    if (spotRequests.length > 0) {
      const spotIds = [...new Set(spotRequests.map((p) => p.enrollmentSpotId!))];
      const spots = await db.select().from(enrollmentSpots).where(inArray(enrollmentSpots.id, spotIds));

      for (const spot of spots) {
        const available = spot.totalSpots - (spot.reservedSpots ?? 0) - (spot.manualReserved ?? 0);
        const requested = spotRequests.filter((p) => p.enrollmentSpotId === spot.id).length;
        if (available < requested) {
          return res.status(409).json({
            error: "Spot unavailable",
            message: `Grade "${spot.gradeLabel}" has only ${available} spot(s) available but ${requested} requested.`,
          });
        }
      }
    }

    // Generate application number: APP-YYYY-XXXX
    const year = new Date().getFullYear();
    const prefix = `APP-${year}-`;
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(sql`application_number LIKE ${prefix + "%"}`);
    const seq = (Number(countResult?.count ?? 0) + 1).toString().padStart(4, "0");
    const applicationNumber = `${prefix}${seq}`;

    // Atomic insert
    const totalChildren = data.participants.filter((p) => p.participantType !== "adult").length;
    const totalAdults = data.participants.filter((p) => p.participantType === "adult").length;

    // Extract primary applicant name fields from primary_student (or first adult)
    const primaryP = data.participants.find(p => p.participantType === "primary_student")
                  ?? data.participants.find(p => p.participantType === "adult")
                  ?? data.participants[0];
    const applicantFirstName = primaryP?.firstName ?? null;
    const applicantLastName  = primaryP?.lastName  ?? null;
    const applicantOriginalName = primaryP?.fullNameNative ?? null;
    const applicantEnglishName  = primaryP?.englishName    ?? null;
    const applicantFullName = primaryP?.fullName ?? null;
    const applicantEmail = data.participants.find(p => p.email)?.email ?? null;
    const applicantPhone = data.participants.find(p => p.phone)?.phone ?? null;
    const applicantNationality = primaryP?.nationality ?? null;

    const [newApp] = await db
      .insert(applications)
      .values({
        applicationNumber,
        packageGroupId: data.packageGroupId,
        packageId: data.packageId ?? null,
        preferredStartDate: data.preferredStartDate ?? null,
        referralSource: data.referralSource ?? null,
        referralAgentCode: data.referralAgentCode ?? null,
        primaryLanguage: data.primaryLanguage,
        specialRequests: data.specialRequests ?? null,
        signatureImage: data.signatureImage ?? null,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        status: "pending",
        applicationStatus: "submitted",
        applicationType: "camp",
        totalChildren,
        totalAdults,
        firstName:    applicantFirstName,
        lastName:     applicantLastName,
        originalName: applicantOriginalName,
        englishName:  applicantEnglishName,
        applicantName:        applicantFullName,
        applicantEmail:       applicantEmail,
        applicantPhone:       applicantPhone,
        applicantNationality: applicantNationality,
      })
      .returning();

    // Insert participants
    for (let i = 0; i < data.participants.length; i++) {
      const p = data.participants[i];
      const { enrollmentSpotId, ...pData } = p;
      const [participant] = await db
        .insert(applicationParticipants)
        .values({ ...pData, applicationId: newApp.id, sequenceOrder: i + 1 })
        .returning();

      if (enrollmentSpotId) {
        await db.insert(applicationGrade).values({
          applicationId: newApp.id,
          participantId: participant.id,
          enrollmentSpotId,
          gradeLabel: p.grade ?? null,
        });

        await db
          .update(enrollmentSpots)
          .set({ reservedSpots: sql`reserved_spots + 1`, updatedAt: new Date() })
          .where(eq(enrollmentSpots.id, enrollmentSpotId));
      }
    }

    // Mirror into camp_applications so admin view can see landing-page submissions
    if (data.packageId) {
      try {
        const studentCount = data.participants.filter(p => p.participantType !== "adult").length;
        // adultCount = 1 (main applicant/contact) + accompanying adults
        const adultCount = 1 + data.participants.filter(p => p.participantType === "adult").length;

        const [newCampApp] = await db.insert(campApplications).values({
          applicationRef: applicationNumber,
          packageGroupId: data.packageGroupId,
          packageId: data.packageId,
          applicantName:         applicantFullName ?? "Unknown",
          applicantEmail:        applicantEmail ?? "",
          applicantPhone:        applicantPhone,
          applicantNationality:  applicantNationality,
          applicantFirstName:    applicantFirstName,
          applicantLastName:     applicantLastName,
          applicantOriginalName: applicantOriginalName,
          applicantEnglishName:  applicantEnglishName,
          studentCount,
          adultCount,
          preferredStartDate: data.preferredStartDate ?? null,
          specialRequirements: data.specialRequests ?? null,
          emergencyContactName: data.emergencyContactName ?? null,
          emergencyContactPhone: data.emergencyContactPhone ?? null,
          applicationStatus: "submitted",
          status: "Active",
        }).returning();

        // Link participants to this campApplication so admin detail can find them
        if (newCampApp?.id) {
          await db
            .update(applicationParticipants)
            .set({ campApplicationId: newCampApp.id })
            .where(eq(applicationParticipants.applicationId, newApp.id));
        }
      } catch (mirrorErr) {
        console.error("[public/applications] camp_applications mirror failed:", mirrorErr);
      }
    }

    res.status(201).json({
      applicationNumber,
      message: "Application submitted successfully. We will contact you within 2 business days.",
    });

    // Non-blocking: send email notifications with PDF attachment
    sendCampApplicationEmails({
      applicationNumber,
      packageGroupId: data.packageGroupId,
      packageId: data.packageId,
      applicantFirstName: applicantFirstName ?? "",
      applicantLastName:  applicantLastName  ?? "",
      applicantPhone:     applicantPhone     ?? undefined,
      applicantEmail:     applicantEmail,
      preferredStartDate: data.preferredStartDate,
      specialRequests:    data.specialRequests,
      emergencyContactName:  data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      referralAgentCode:  data.referralAgentCode,
      referralSource:     data.referralSource,
      primaryLanguage:    data.primaryLanguage,
      participants: data.participants as any[],
    }).catch(err => console.error("[CampEmail] Notification failed:", err));

    return;
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/public/exchange-rates — public, no auth required
// Returns latest X→AUD rate per currency, formatted for frontend context
router.get("/public/exchange-rates", async (_req, res) => {
  await runWithTenantSchema(CAMP_TENANT, async () => {
  try {
    // Get all rates ordered by effectiveDate desc so we can take latest per currency
    const allRates = await db
      .select()
      .from(exchangeRates)
      .orderBy(desc(exchangeRates.effectiveDate));

    // Build latest rate map: prefer X→AUD rows, fall back to inverse of AUD→X rows
    // latestMap[CCY].rate = how many AUD is 1 unit of CCY
    const latestMap: Record<string, { rate: number; date: string }> = {};
    for (const r of allRates) {
      if (r.toCurrency === "AUD" && !latestMap[r.fromCurrency]) {
        // Direct X→AUD: 1 X = rate AUD
        latestMap[r.fromCurrency] = { rate: parseFloat(r.rate), date: r.effectiveDate };
      } else if (r.fromCurrency === "AUD" && !latestMap[r.toCurrency]) {
        // Inverse AUD→X: 1 AUD = rate X, so 1 X = 1/rate AUD
        const rawRate = parseFloat(r.rate);
        if (rawRate > 0) {
          latestMap[r.toCurrency] = { rate: 1 / rawRate, date: r.effectiveDate };
        }
      }
    }

    // Build response rates object (X→AUD format: rate = how many AUD is 1 X)
    const rates: Record<string, { rate: number; inverse: number }> = {
      AUD: { rate: 1, inverse: 1 },
    };
    let updatedAt = new Date().toISOString().slice(0, 10);
    for (const [ccy, info] of Object.entries(latestMap)) {
      rates[ccy] = { rate: info.rate, inverse: Math.round((1 / info.rate) * 100) / 100 };
      if (info.date > updatedAt) updatedAt = info.date;
    }
    if (Object.keys(latestMap).length > 0) {
      updatedAt = Object.values(latestMap).sort((a, b) => b.date.localeCompare(a.date))[0].date;
    }

    return res.json({ success: true, baseCurrency: "AUD", updatedAt, rates });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "RATES_UNAVAILABLE" });
  }
  });
});

// ─── POST /api/public/chatbot/message — no auth, landing page widget ───────
router.post("/public/chatbot/message", async (req, res) => {
  const { question, sessionId = "public_default" } = req.body as {
    question: string;
    sessionId?: string;
  };
  if (!question?.trim()) return res.status(400).json({ error: "question is required" });

  try {
    await ensureKBPublic();
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const systemPrompt = getSystemPrompt("public");
    const relevantChunks = await retrieveContext(question, 4, "public");
    const contextText = relevantChunks
      .map((c, i) => `[Related Document ${i + 1} — ${c.docTitle} (relevance ${(c.score * 100).toFixed(0)}%)]\n${c.text}`)
      .join("\n\n");

    const augmentedMessage = relevantChunks.length > 0
      ? `[Retrieved Relevant Content]\n${contextText}\n\n[User Question]\n${question}`
      : question;

    if (!pubSessions.has(sessionId)) pubSessions.set(sessionId, []);
    const history = pubSessions.get(sessionId)!;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const contents: Turn[] = [
      ...history.slice(-10),
      { role: "user", parts: [{ text: augmentedMessage }] },
    ];

    const config = systemPrompt ? { systemInstruction: systemPrompt } : undefined;

    const stream = await genAI.models.generateContentStream({
      model: "gemini-2.5-flash",
      config,
      contents,
    });

    let fullReply = "";
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullReply += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    history.push(
      { role: "user", parts: [{ text: question }] },
      { role: "model", parts: [{ text: fullReply }] }
    );

    const sources = [...new Set(relevantChunks.map((c) => c.docTitle))];
    const topScore = relevantChunks[0]?.score;
    res.write(`data: ${JSON.stringify({
      done: true,
      sources,
      chunksUsed: relevantChunks.length,
      topScore: topScore != null ? parseFloat(topScore.toFixed(3)) : null,
      sessionId,
    })}\n\n`);
    res.end();
  } catch (e: any) {
    const raw = String(e?.message ?? "");
    const is429 = e?.status === 429 || raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED");
    const userMsg = is429
      ? "AI response quota exceeded. Please try again in a moment."
      : "Failed to generate AI response.";
    if (is429) console.warn("[public/chatbot/message] Gemini 429 quota exceeded");
    else console.error("[public/chatbot/message]", e);
    if (!res.headersSent) {
      res.status(is429 ? 429 : 500).json({ error: userMsg });
    } else {
      res.write(`data: ${JSON.stringify({ error: userMsg })}\n\n`);
      res.end();
    }
  }
});

// ── GET /api/public/form/:slug ─────────────────────────────────────────────
// Returns form info for any form type (gateway lookup).
// Falls back to cross-schema search when no tenant context is set
// (e.g. when visitor arrives via edubee.co without subdomain auth).
router.get("/public/form/:slug", async (req, res) => {
  try {
    const slug = req.params.slug as string;
    const SELECT_COLS = "id, name, description, form_type AS \"formType\", status, redirect_url AS \"redirectUrl\"";

    // 1️⃣  Try current tenant context (header-based or subdomain-based)
    let form: { id: string; name: string; description: string | null; formType: string; status: string; redirectUrl: string | null } | undefined;
    try {
      const rows = await db
        .select({ id: applicationForms.id, name: applicationForms.name, description: applicationForms.description, formType: applicationForms.formType, status: applicationForms.status, redirectUrl: applicationForms.redirectUrl })
        .from(applicationForms)
        .where(eq(applicationForms.slug, slug))
        .limit(1);
      form = rows[0];
    } catch { /* ignore */ }

    // 2️⃣  No tenant context → search all org subdomain schemas
    if (!form) {
      const orgs = await staticDb
        .select({ subdomain: organisations.subdomain })
        .from(organisations)
        .where(isNotNull(organisations.subdomain));

      for (const org of orgs) {
        if (!org.subdomain) continue;
        try {
          const result = await pool.query<{ id: string; name: string; description: string | null; formType: string; status: string; redirectUrl: string | null }>(
            `SELECT ${SELECT_COLS} FROM "${org.subdomain}".application_forms WHERE slug = $1 LIMIT 1`,
            [slug],
          );
          if (result.rows.length > 0) { form = result.rows[0]; break; }
        } catch { /* schema may not have the table */ }
      }
    }

    // 3️⃣  Fallback: search actual DB schemas (e.g. _system in production)
    if (!form) {
      try {
        const actualSchemas = await listTenantSchemas();
        for (const schema of actualSchemas) {
          try {
            const result = await pool.query<{ id: string; name: string; description: string | null; formType: string; status: string; redirectUrl: string | null }>(
              `SELECT ${SELECT_COLS} FROM "${schema}".application_forms WHERE slug = $1 LIMIT 1`,
              [slug],
            );
            if (result.rows.length > 0) { form = result.rows[0]; break; }
          } catch { /* schema may not have the table */ }
        }
      } catch { /* ignore */ }
    }

    if (!form) return res.status(404).json({ error: "Form not found" });
    if (form.status !== "active") return res.status(403).json({ error: "This form is currently inactive" });

    return res.json(form);
  } catch (err) {
    console.error("[GET /public/form/:slug]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/public/inquiry-form/:slug ─────────────────────────────────────
// Kept for backward compat — delegates to /public/form/:slug with type check
router.get("/public/inquiry-form/:slug", async (req, res) => {
  try {
    const [form] = await db
      .select({ id: applicationForms.id, name: applicationForms.name, description: applicationForms.description, formType: applicationForms.formType, status: applicationForms.status, redirectUrl: applicationForms.redirectUrl })
      .from(applicationForms)
      .where(and(eq(applicationForms.slug, req.params.slug as string), eq(applicationForms.formType, "lead_inquiry")))
      .limit(1);

    if (!form) return res.status(404).json({ error: "Form not found" });
    if (form.status !== "active") return res.status(403).json({ error: "This form is currently inactive" });

    return res.json(form);
  } catch (err) {
    console.error("[GET /public/inquiry-form/:slug]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/public/form/:slug/terms  — fetch terms & conditions for a form ─
router.get("/public/form/:slug/terms", async (req, res) => {
  try {
    const { slug } = req.params as Record<string, string>;
    const lang = (req.query.lang as string) || "en";

    const [form] = await db
      .select({ id: applicationForms.id })
      .from(applicationForms)
      .where(eq(applicationForms.slug, slug))
      .limit(1);

    if (!form) return res.status(404).json({ error: "Form not found" });

    // Try exact language first, then default, then any
    const rows = await db
      .select()
      .from(formTermsContent)
      .where(eq(formTermsContent.formId, form.id));

    if (rows.length === 0) return res.json({ content: null, language: null });

    const exact   = rows.find(r => r.language === lang);
    const def     = rows.find(r => r.isDefault);
    const fallback = rows.find(r => r.language === "en") ?? rows[0];
    const chosen  = exact ?? def ?? fallback;

    return res.json({ content: chosen.content, language: chosen.language });
  } catch (err) {
    console.error("[GET /public/form/:slug/terms]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/public/lead-inquiry ──────────────────────────────────────────
// Accepts a lead inquiry submission and creates a lead in the CRM
router.post("/public/lead-inquiry", async (req, res) => {
  try {
    const {
      formId,
      firstName,
      lastName,
      email,
      phone,
      nationality,
      inquiryType,
      message,
      budget,
      expectedStartDate,
      referralSource,
    } = req.body;

    if (!firstName && !lastName) return res.status(400).json({ error: "Name is required" });
    if (!email && !phone) return res.status(400).json({ error: "Email or phone is required" });

    // Verify the form exists and is active (optional - just validate if formId given)
    if (formId) {
      const [form] = await db
        .select({ id: applicationForms.id, status: applicationForms.status })
        .from(applicationForms)
        .where(and(eq(applicationForms.id, formId), eq(applicationForms.formType, "lead_inquiry")))
        .limit(1);
      if (!form || form.status !== "active") {
        return res.status(400).json({ error: "Invalid or inactive form" });
      }
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const [lead] = await db.insert(leads).values({
      fullName,
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      nationality: nationality || null,
      inquiryType: inquiryType || null,
      notes: message || null,
      source: referralSource || "web_form",
      budget: budget ? String(budget) : null,
      expectedStartDate: expectedStartDate || null,
      status: "new",
    }).returning({ id: leads.id, fullName: leads.fullName, leadRefNumber: leads.leadRefNumber });

    return res.status(201).json({ success: true, leadId: lead.id, fullName: lead.fullName });
  } catch (err) {
    console.error("[POST /public/lead-inquiry]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Public: Check subdomain availability ──────────────────────────────────────
router.get("/public/check-subdomain", async (req, res) => {
  try {
    const subdomain = String(req.query.subdomain as string ?? "").toLowerCase().trim();
    if (!subdomain) return res.status(400).json({ available: false, reason: "Subdomain is required" });
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(subdomain))
      return res.json({ available: false, reason: "Only lowercase letters, numbers and hyphens (3–32 chars)" });
    if (isReservedSubdomain(subdomain))
      return res.json({ available: false, reason: "This subdomain is reserved" });

    const exists = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.subdomain, subdomain))
      .limit(1);

    return res.json({ available: exists.length === 0 });
  } catch (err) {
    console.error("GET /public/check-subdomain", err);
    return res.status(500).json({ available: false, reason: "Server error" });
  }
});

// ── Public: Camp organisation self-onboarding ─────────────────────────────────
router.post("/public/onboard", async (req, res) => {
  try {
    const {
      orgName, subdomain,
      adminFullName, adminEmail, adminPassword,
      phone, country,
    } = req.body as Record<string, string>;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!orgName?.trim()) return res.status(400).json({ error: "Organisation name is required" });
    if (!subdomain?.trim()) return res.status(400).json({ error: "Subdomain is required" });
    if (!adminEmail?.trim()) return res.status(400).json({ error: "Admin email is required" });
    if (!adminPassword || adminPassword.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    const sub = subdomain.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(sub))
      return res.status(400).json({ error: "Invalid subdomain format" });
    if (isReservedSubdomain(sub))
      return res.status(400).json({ error: "This subdomain is reserved" });

    // ── Check subdomain uniqueness ──────────────────────────────────────────
    const subExists = await db
      .select({ id: organisations.id })
      .from(organisations)
      .where(eq(organisations.subdomain, sub))
      .limit(1);
    if (subExists.length) return res.status(409).json({ error: "Subdomain already taken" });

    // ── Check email uniqueness ──────────────────────────────────────────────
    const email = adminEmail.trim().toLowerCase();
    const emailExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (emailExists.length) return res.status(409).json({ error: "An account with this email already exists" });

    // ── Create organisation (trial) ─────────────────────────────────────────
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const [org] = await db
      .insert(organisations)
      .values({
        name:       orgName.trim(),
        subdomain:  sub,
        ownerEmail: email,
        phone:      phone?.trim() || null,
        country:    country?.trim() || null,
        planType:   "starter",
        planStatus: "trial",
        trialEndsAt,
        features:   getDefaultFeatures("starter"),
        status:     "Active",
      })
      .returning();

    // ── Seed default data ───────────────────────────────────────────────────
    try {
      await onboardTenant(org.id);
    } catch (seedErr) {
      await db.update(organisations).set({ status: "Inactive" }).where(eq(organisations.id, org.id));
      console.error("[ONBOARDING FAILED]", org.id, seedErr);
      return res.status(500).json({ error: "Onboarding failed, please try again" });
    }

    // ── Create admin user ───────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const [adminUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        fullName:       adminFullName?.trim() || email.split("@")[0],
        role:           "admin",
        staffRole:      "admin",
        organisationId: org.id,
        status:         "active",
      })
      .returning({ id: users.id, email: users.email, fullName: users.fullName });

    // ── Send welcome email ──────────────────────────────────────────────────
    try {
      await sendCampOnboardWelcomeEmail({
        toEmail:   email,
        adminName: adminUser.fullName,
        orgName:   org.name,
        subdomain: sub,
        loginUrl:  `https://${sub}.edubee.co/login`,
        trialDays: 14,
      });
    } catch (emailErr) {
      console.warn("[ONBOARD EMAIL FAILED]", emailErr);
    }

    return res.status(201).json({
      success:   true,
      orgId:     org.id,
      subdomain: sub,
      loginUrl:  `https://${sub}.edubee.co/login`,
      message:   `Your camp portal is ready at ${sub}.edubee.co`,
    });
  } catch (err) {
    console.error("POST /public/onboard", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Public: Platform Plans (no auth required, for marketing site) ─────────────
router.get("/public/platform-plans", async (_req, res) => {
  try {
    const plans = await staticDb
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.isActive, true))
      .orderBy(asc(platformPlans.sortOrder), asc(platformPlans.priceMonthly));
    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error("GET /public/platform-plans", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
