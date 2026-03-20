import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@workspace/db";
import { chatDocuments } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// Initialize Gemini with user's API key
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(apiKey);
}

// ─── GET /api/chatbot/status ───────────────────────────────────────────────
router.get("/chatbot/status", authenticate, async (_req, res) => {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(chatDocuments);
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({ ok: hasKey, documentCount: count, model: "gemini-2.5-flash", keyConfigured: hasKey });
  } catch {
    res.status(500).json({ error: "Status check failed" });
  }
});

// ─── GET /api/chatbot/docs ─────────────────────────────────────────────────
router.get("/chatbot/docs", authenticate, requireRole(...ADMIN_ROLES), async (_req, res) => {
  try {
    const docs = await db.select({
      id: chatDocuments.id,
      title: chatDocuments.title,
      source: chatDocuments.source,
      sourceType: chatDocuments.sourceType,
      createdAt: chatDocuments.createdAt,
      preview: sql<string>`left(${chatDocuments.content}, 200)`,
    }).from(chatDocuments).orderBy(desc(chatDocuments.createdAt));
    res.json(docs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// ─── POST /api/chatbot/docs ────────────────────────────────────────────────
router.post("/chatbot/docs", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { title, content, source, sourceType = "manual" } = req.body as {
      title: string; content: string; source?: string; sourceType?: string;
    };
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required" });
    }
    const [doc] = await db.insert(chatDocuments).values({ title, content, source, sourceType }).returning();
    return res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to add document" });
  }
});

// ─── DELETE /api/chatbot/docs/:id ─────────────────────────────────────────
router.delete("/chatbot/docs/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.delete(chatDocuments).where(eq(chatDocuments.id, req.params.id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ─── POST /api/chatbot/docs/google ────────────────────────────────────────
router.post("/chatbot/docs/google", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  const { url } = req.body as { url: string };
  if (!url) return res.status(400).json({ error: "url is required" });

  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    return res.status(503).json({
      error: "GOOGLE_SERVICE_ACCOUNT_JSON is not configured. Please add the Google Service Account secret.",
    });
  }

  try {
    const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (!docIdMatch) return res.status(400).json({ error: "Invalid Google Docs URL" });
    const docId = docIdMatch[1];

    const { google } = await import("googleapis");
    const credentials = JSON.parse(saJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/documents.readonly", "https://www.googleapis.com/auth/drive.readonly"],
    });
    const docs = google.docs({ version: "v1", auth });
    const docRes = await docs.documents.get({ documentId: docId });
    const docData = docRes.data;

    const title = docData.title ?? "Untitled Document";
    let content = "";
    for (const el of docData.body?.content ?? []) {
      if (el.paragraph) {
        for (const elem of el.paragraph.elements ?? []) {
          if (elem.textRun?.content) content += elem.textRun.content;
        }
      }
    }
    content = content.trim();
    if (!content) return res.status(400).json({ error: "Document appears to be empty" });

    const [doc] = await db.insert(chatDocuments).values({
      title, content, source: url, sourceType: "google_doc",
    }).returning();
    return res.status(201).json(doc);
  } catch (e: any) {
    console.error("[chatbot/google]", e);
    if (e?.status === 403) return res.status(403).json({ error: "Access denied. Share the document with the service account email." });
    if (e?.status === 404) return res.status(404).json({ error: "Document not found." });
    return res.status(500).json({ error: e?.message ?? "Failed to fetch Google Doc" });
  }
});

// ─── POST /api/chatbot/message ─────────────────────────────────────────────
router.post("/chatbot/message", authenticate, async (req, res) => {
  const { question, history = [] } = req.body as {
    question: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  if (!question?.trim()) return res.status(400).json({ error: "question is required" });

  try {
    const genAI = getGenAI();

    // 1. Search knowledge base with PostgreSQL full-text search
    const searchTerms = question.trim().split(/\s+/).filter(w => w.length > 1).join(" | ");
    let contextDocs: { title: string; content: string }[] = [];
    try {
      contextDocs = await db.select({
        title: chatDocuments.title,
        content: sql<string>`left(${chatDocuments.content}, 2000)`,
      })
        .from(chatDocuments)
        .where(sql`to_tsvector('simple', ${chatDocuments.content} || ' ' || ${chatDocuments.title}) @@ to_tsquery('simple', ${searchTerms})`)
        .limit(4);
    } catch {
      contextDocs = await db.select({
        title: chatDocuments.title,
        content: sql<string>`left(${chatDocuments.content}, 1000)`,
      }).from(chatDocuments).limit(4);
    }

    // 2. Build system prompt
    const systemPrompt = contextDocs.length > 0
      ? `당신은 Edubee Camp의 도움을 주는 AI 어시스턴트입니다. 아래의 내부 문서를 바탕으로 질문에 답변하세요. 문서에 없는 내용은 추측하지 말고 "해당 정보를 찾을 수 없습니다"라고 답하세요.

【내부 문서】
${contextDocs.map((d, i) => `--- [${i + 1}] ${d.title} ---\n${d.content}`).join("\n\n")}

위 문서를 참고하여 한국어로 친절하게 답변하세요.`
      : `당신은 Edubee Camp의 도움을 주는 AI 어시스턴트입니다. 등록된 지식 베이스 문서가 아직 없습니다. 일반적인 질문에 대해 친절하게 답변하세요. 답변은 한국어로 해주세요.`;

    // 3. Build conversation history for Gemini
    const chatHistory = history.map(m => ({
      role: (m.role === "assistant" ? "model" : "user") as "model" | "user",
      parts: [{ text: m.content }],
    }));

    // 4. Stream response via SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const allContents = [
      { role: "user" as const, parts: [{ text: systemPrompt }] },
      { role: "model" as const, parts: [{ text: "네, 내부 문서를 바탕으로 답변 드리겠습니다." }] },
      ...chatHistory,
      { role: "user" as const, parts: [{ text: question }] },
    ];

    const streamResult = await model.generateContentStream({ contents: allContents });

    const sources = contextDocs.map(d => d.title);

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
    res.end();
  } catch (e: any) {
    console.error("[chatbot/message]", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e?.message ?? "AI 응답 생성에 실패했습니다." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI 응답 생성에 실패했습니다." })}\n\n`);
      res.end();
    }
  }
});

export default router;
