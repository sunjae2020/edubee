import { Router } from "express";
import { db } from "@workspace/db";
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
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { z } from "zod/v4";

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
      .where(eq(packageGroups.status, "active"))
      .orderBy(packageGroups.sortOrder);

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

    // Build latest rate map: only X→AUD rows, pick most recent per fromCurrency
    const latestMap: Record<string, { rate: number; date: string }> = {};
    for (const r of allRates) {
      if (r.toCurrency === "AUD" && !latestMap[r.fromCurrency]) {
        latestMap[r.fromCurrency] = { rate: parseFloat(r.rate), date: r.effectiveDate };
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

export default router;
