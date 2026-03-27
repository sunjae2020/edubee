import { Router } from "express";
import { db } from "@workspace/db";
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
} from "@workspace/db/schema";
import { eq, and, inArray, sql, desc, isNotNull, asc } from "drizzle-orm";
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

// GET /api/public/packages — no auth
router.get("/public/packages", async (req, res) => {
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

// Participant schema
const participantSchema = z.object({
  participantType: z.enum(["primary_student", "child", "adult"]),
  fullName: z.string().min(1),
  fullNameNative: z.string().optional(),
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
  termsAccepted: z.literal(true),
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
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        status: "pending",
        totalChildren,
        totalAdults,
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

    return res.status(201).json({
      applicationNumber,
      message: "Application submitted successfully. We will contact you within 2 business days.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/public/exchange-rates — public, no auth required
// Returns latest X→AUD rate per currency, formatted for frontend context
router.get("/public/exchange-rates", async (_req, res) => {
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
    const systemPrompt = getSystemPrompt();
    const relevantChunks = await retrieveContext(question, 4);
    const contextText = relevantChunks
      .map((c, i) => `[관련 문서 ${i + 1} — ${c.docTitle} (관련도 ${(c.score * 100).toFixed(0)}%)]\n${c.text}`)
      .join("\n\n");

    const augmentedMessage = relevantChunks.length > 0
      ? `[검색된 관련 내용]\n${contextText}\n\n[사용자 질문]\n${question}`
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
    console.error("[public/chatbot/message]", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e?.message ?? "AI 응답 생성에 실패했습니다." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI 응답 생성에 실패했습니다." })}\n\n`);
      res.end();
    }
  }
});

export default router;
