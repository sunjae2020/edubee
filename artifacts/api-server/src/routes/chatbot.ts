import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import { chatDocuments } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  initKnowledgeBase,
  addDocumentToKB,
  removeDocumentFromKB,
  retrieveContext,
  getSystemPrompt,
  getKnowledgeBaseStatus,
  extractTextFromGoogleDoc,
} from "../services/knowledgeBase.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

// Initialize knowledge base on first request (lazy init)
let kbReady = false;
async function ensureKB() {
  if (!kbReady) {
    kbReady = true;
    await initKnowledgeBase();
  }
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey });
}

// ─── GET /api/chatbot/status ───────────────────────────────────────────────
router.get("/chatbot/status", authenticate, async (_req, res) => {
  try {
    await ensureKB();
    const status = getKnowledgeBaseStatus();
    res.json({
      ok: !!process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
      embeddingModel: "gemini-embedding-001",
      keyConfigured: !!process.env.GEMINI_API_KEY,
      ...status,
    });
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

    const [doc] = await db.insert(chatDocuments)
      .values({ title, content, source, sourceType })
      .returning();

    // Generate embeddings in background (don't block response)
    ensureKB().then(() =>
      addDocumentToKB(doc.id, title, content, source, sourceType)
        .catch((e) => console.error("[KB] embed error:", e))
    );

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
    await ensureKB();
    await removeDocumentFromKB(req.params.id);
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
      scopes: [
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
    const docs = google.docs({ version: "v1", auth });
    const docRes = await docs.documents.get({ documentId: docId });
    const docData = docRes.data;

    const title = docData.title ?? "Untitled Document";
    // Use enhanced extractor that handles tables too
    const content = extractTextFromGoogleDoc(docData);
    if (!content) return res.status(400).json({ error: "Document appears to be empty" });

    const [doc] = await db.insert(chatDocuments).values({
      title, content, source: url, sourceType: "google_doc",
    }).returning();

    // Generate embeddings in background
    ensureKB().then(() =>
      addDocumentToKB(doc.id, title, content, url, "google_doc")
        .catch((e) => console.error("[KB] embed error:", e))
    );

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
    await ensureKB();
    const genAI = getGenAI();

    // 1. Semantic retrieval via cosine similarity on embeddings
    const contextChunks = await retrieveContext(question, 4);

    // 2. Build prompt — use strict system prompt when KB has docs
    const systemPrompt = getSystemPrompt();
    let promptToUse: string;

    if (systemPrompt && contextChunks.length > 0) {
      // Include the most relevant chunks highlighted
      const chunkContext = contextChunks
        .map((c, i) => `--- [${i + 1}] ${c.docTitle} (관련도: ${(c.score * 100).toFixed(0)}%) ---\n${c.text}`)
        .join("\n\n");

      promptToUse = `${systemPrompt}

## 이 질문에 가장 관련 있는 섹션
${chunkContext}`;
    } else if (systemPrompt) {
      promptToUse = systemPrompt;
    } else {
      promptToUse = `당신은 Edubee Camp의 AI 어시스턴트입니다. 등록된 지식 베이스가 아직 없습니다. 일반적인 질문에 친절하게 답변하되, 플랫폼 내부 정보는 알 수 없다고 안내해주세요. 사용자와 같은 언어로 답변하세요.`;
    }

    // 3. Build conversation history
    const chatHistory = history.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "model" | "user",
      parts: [{ text: m.content }],
    }));

    // 4. Stream SSE response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const allContents = [
      { role: "user" as const, parts: [{ text: promptToUse }] },
      { role: "model" as const, parts: [{ text: "네, 내부 문서를 바탕으로 답변 드리겠습니다." }] },
      ...chatHistory,
      { role: "user" as const, parts: [{ text: question }] },
    ];

    const stream = await genAI.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: allContents,
    });
    const sources = [...new Set(contextChunks.map((c) => c.docTitle))];

    for await (const chunk of stream) {
      const text = chunk.text;
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
