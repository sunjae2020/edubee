import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const SYS_PROMPT = `You are an expert data extractor for educational camp programs.
Analyze a camp program URL and extract ALL information into a precise JSON object.

RULES:
1. Return ONLY raw JSON — no markdown, no backticks, no explanation
2. Detect source language. ALWAYS write nameEn and descriptionEn in English (translate if needed)
3. Leave nameKo, nameJa, nameTh as empty string "" — they will be translated separately
4. Duration format: "14 nights 15 days" (always English)
5. Inclusions: array of strings listing what is included (flights, meals, accommodation, etc.)
6. Exclusions: array of strings listing what is NOT included
7. Extract ALL package tiers with multi-currency pricing
8. For pricing: if only one currency listed, approximate others (1USD=1.55AUD, 1GBP=2AUD, 1000KRW=1.1AUD)
9. Enrollment spots: extract grade/age groups with capacities. Infer if not stated.
10. startDate and endDate: ISO format YYYY-MM-DD. If only season mentioned, use approximate dates.

Required JSON structure:
{
  "detectedLang": "en",
  "nameEn": "Program name in English",
  "nameKo": "", "nameJa": "", "nameTh": "",
  "descriptionEn": "2-3 sentence description in English",
  "location": "City, Country",
  "countryCode": "AU",
  "minAge": 12,
  "maxAge": 17,
  "startDate": "2025-07-01",
  "endDate": "2025-08-31",
  "durationText": "14 nights 15 days",
  "inclusions": ["International flights", "Airport transfers", "Accommodation", "Meals"],
  "exclusions": ["Personal expenses", "Travel insurance", "Visa fees"],
  "packages": [
    {
      "name": "Package A",
      "durationDays": 15,
      "maxParticipants": 20,
      "priceAud": 3200, "priceUsd": 2100, "priceKrw": 2800000,
      "priceJpy": 320000, "priceThb": 75000, "pricePhp": 120000,
      "priceSgd": 2800, "priceGbp": 1600
    }
  ],
  "enrollmentSpots": [
    { "gradeLabel": "Grade 7", "totalSpots": 15 },
    { "gradeLabel": "Grade 8", "totalSpots": 15 }
  ],
  "interviewRequired": false,
  "interviewFormat": "online",
  "interviewDuration": 30,
  "interviewNotes": "",
  "confidence": {
    "name": "high", "description": "high", "packages": "medium",
    "pricing": "medium", "location": "high", "dates": "medium", "enrollment": "low"
  }
}`;

function parseJson(raw: string) {
  let s = raw.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

router.post("/ai/extract-program", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url?.trim()) return res.status(400).json({ error: "URL is required" });

    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      config: { systemInstruction: SYS_PROMPT },
      contents: `Analyze this camp program URL and extract ALL data including packages, pricing in all currencies, inclusions, exclusions, enrollment spots, and dates.\nURL: ${url}`,
    });

    const raw = response.text ?? "";
    const data = parseJson(raw);
    return res.json({ data });
  } catch (err: any) {
    console.error("[AI extract-program]", err.message);
    return res.status(500).json({ error: err.message ?? "AI extraction failed" });
  }
});

router.post("/ai/translate", authenticate, requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const { nameEn, descriptionEn, targetLang } = req.body as { nameEn?: string; descriptionEn?: string; targetLang?: string };
    if (!targetLang) return res.status(400).json({ error: "targetLang required" });

    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

    const langNames: Record<string, string> = { ko: "Korean", ja: "Japanese", th: "Thai" };
    const ln = langNames[targetLang] ?? targetLang;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      config: { systemInstruction: `Translate educational program content to ${ln}. Return ONLY {"name":"...","description":"..."} raw JSON, no markdown.` },
      contents: `Translate to ${ln}. Return ONLY raw JSON.\n{"name":"${(nameEn ?? "").replace(/"/g, "'")}","description":"${(descriptionEn ?? "").replace(/"/g, "'")}"}`,
    });

    const raw = response.text ?? "";
    const data = parseJson(raw);
    return res.json({ data });
  } catch (err: any) {
    console.error("[AI translate]", err.message);
    return res.status(500).json({ error: err.message ?? "Translation failed" });
  }
});

export default router;
