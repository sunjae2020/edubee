import { Router } from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import { chatDocuments, chatChunks } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  initKnowledgeBase,
  addDocumentToKB,
  removeDocumentFromKB,
  updateDocumentScopeInMemory,
  retrieveContext,
  getSystemPrompt,
  getKnowledgeBaseStatus,
  extractTextFromGoogleDoc,
  type KBScope,
} from "../services/knowledgeBase.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─── Server-side session history store ────────────────────────────────────
type Turn = { role: "user" | "model"; parts: { text: string }[] };
const sessions = new Map<string, Turn[]>();

// ─── Lazy KB initialization ────────────────────────────────────────────────
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
router.get("/chatbot/docs", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { scope } = req.query as { scope?: string };
    const query = db.select({
      id: chatDocuments.id,
      title: chatDocuments.title,
      source: chatDocuments.source,
      sourceType: chatDocuments.sourceType,
      scope: chatDocuments.scope,
      createdAt: chatDocuments.createdAt,
      preview: sql<string>`left(${chatDocuments.content}, 200)`,
      chunkCount: sql<number>`(
        select count(*)::int from chat_chunks where doc_id = chat_documents.id
      )`,
    }).from(chatDocuments).orderBy(desc(chatDocuments.createdAt));

    const docs = await query;
    const filtered = scope && (scope === "internal" || scope === "public")
      ? docs.filter(d => d.scope === scope)
      : docs;

    res.json(filtered);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// ─── POST /api/chatbot/docs ────────────────────────────────────────────────
router.post("/chatbot/docs", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { title, content, source, sourceType = "manual", scope = "internal" } = req.body as {
      title: string; content: string; source?: string; sourceType?: string; scope?: KBScope;
    };
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required" });
    }
    const validScope: KBScope = scope === "public" ? "public" : "internal";

    const [doc] = await db.insert(chatDocuments)
      .values({ title, content, source, sourceType, scope: validScope })
      .returning();

    ensureKB().then(() =>
      addDocumentToKB(doc.id, title, content, source, sourceType, validScope)
        .catch((e) => console.error("[KB] embed error:", e))
    );

    return res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to add document" });
  }
});

// ─── POST /api/chatbot/docs/upload — .txt / .md file upload ───────────────
router.post(
  "/chatbot/docs/upload",
  authenticate,
  requireRole(...ADMIN_ROLES),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "파일이 없습니다." });

    const ext = req.file.originalname.split(".").pop()?.toLowerCase();
    if (!["txt", "md"].includes(ext ?? "")) {
      return res.status(400).json({ error: ".txt 또는 .md 파일만 지원됩니다." });
    }

    try {
      const content = req.file.buffer.toString("utf-8").trim();
      if (!content) return res.status(400).json({ error: "파일 내용이 비어 있습니다." });

      const title: string = (req.body.title as string) || req.file.originalname;
      const rawScope = req.body.scope as string;
      const validScope: KBScope = rawScope === "public" ? "public" : "internal";

      const [doc] = await db.insert(chatDocuments).values({
        title,
        content,
        source: req.file.originalname,
        sourceType: "file",
        scope: validScope,
      }).returning();

      ensureKB().then(() =>
        addDocumentToKB(doc.id, title, content, req.file!.originalname, "file", validScope)
          .catch((e) => console.error("[KB] embed error:", e))
      );

      return res.status(201).json({
        success: true,
        document: { id: doc.id, title: doc.title, source: doc.source, scope: doc.scope },
      });
    } catch (e: any) {
      console.error("[chatbot/upload]", e);
      return res.status(500).json({ error: "파일 처리 실패", detail: e?.message });
    }
  }
);

// ─── POST /api/chatbot/docs/sync-all — re-sync all Google Docs ────────────
router.post("/chatbot/docs/sync-all", authenticate, requireRole(...ADMIN_ROLES), async (_req, res) => {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    return res.status(503).json({ error: "GOOGLE_SERVICE_ACCOUNT_JSON is not configured." });
  }

  try {
    const googleDocs = await db.select().from(chatDocuments)
      .where(eq(chatDocuments.sourceType, "google_doc"));

    if (googleDocs.length === 0) {
      return res.json({ synced: 0, results: [] });
    }

    const { google } = await import("googleapis");
    const credentials = JSON.parse(saJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
    const docsApi = google.docs({ version: "v1", auth });

    const results: { title: string; status: string; error?: string }[] = [];

    for (const dbDoc of googleDocs) {
      try {
        const urlMatch = dbDoc.source?.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (!urlMatch) throw new Error("Cannot parse Google Doc ID from source URL");
        const gdocId = urlMatch[1];

        const docRes = await docsApi.documents.get({ documentId: gdocId });
        const freshContent = extractTextFromGoogleDoc(docRes.data);
        if (!freshContent) throw new Error("Document appears to be empty");

        await db.update(chatDocuments)
          .set({ content: freshContent, title: docRes.data.title ?? dbDoc.title })
          .where(eq(chatDocuments.id, dbDoc.id));

        await ensureKB();
        await addDocumentToKB(
          dbDoc.id,
          docRes.data.title ?? dbDoc.title,
          freshContent,
          dbDoc.source ?? undefined,
          "google_doc",
          (dbDoc.scope as KBScope) ?? "internal"
        );

        results.push({ title: dbDoc.title, status: "synced" });
      } catch (e: any) {
        results.push({ title: dbDoc.title, status: "error", error: e?.message });
      }
    }

    return res.json({
      synced: results.filter((r) => r.status === "synced").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (e: any) {
    console.error("[chatbot/sync-all]", e);
    return res.status(500).json({ error: e?.message ?? "Sync failed" });
  }
});

// ─── POST /api/chatbot/docs/google ────────────────────────────────────────
router.post("/chatbot/docs/google", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  const { url, scope } = req.body as { url: string; scope?: KBScope };
  if (!url) return res.status(400).json({ error: "url is required" });

  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    return res.status(503).json({
      error: "GOOGLE_SERVICE_ACCOUNT_JSON is not configured. Please add the Google Service Account secret.",
    });
  }

  const validScope: KBScope = scope === "public" ? "public" : "internal";

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
    const content = extractTextFromGoogleDoc(docData);
    if (!content) return res.status(400).json({ error: "Document appears to be empty" });

    const [doc] = await db.insert(chatDocuments).values({
      title, content, source: url, sourceType: "google_doc", scope: validScope,
    }).returning();

    ensureKB().then(() =>
      addDocumentToKB(doc.id, title, content, url, "google_doc", validScope)
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

// ─── PATCH /api/chatbot/docs/:id/scope — change scope (no re-embedding) ──
router.patch("/chatbot/docs/:id/scope", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { scope } = req.body as { scope: KBScope };
    if (scope !== "internal" && scope !== "public") {
      return res.status(400).json({ error: "scope must be 'internal' or 'public'" });
    }
    const [updated] = await db.update(chatDocuments)
      .set({ scope, updatedAt: new Date() })
      .where(eq(chatDocuments.id, req.params.id))
      .returning({ id: chatDocuments.id, title: chatDocuments.title, scope: chatDocuments.scope });
    if (!updated) return res.status(404).json({ error: "Document not found" });

    // Update in-memory scope without re-embedding (content unchanged)
    updateDocumentScopeInMemory(updated.id, scope);

    return res.json({ success: true, scope });
  } catch (e) {
    console.error("[PATCH /chatbot/docs/:id/scope]", e);
    return res.status(500).json({ error: "Failed to update scope" });
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

// ─── DELETE /api/chatbot/session/:sessionId ────────────────────────────────
router.delete("/chatbot/session/:sessionId", authenticate, (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ cleared: true });
});

// ─── POST /api/chatbot/message — internal staff: all docs ─────────────────
router.post("/chatbot/message", authenticate, async (req, res) => {
  const { question, sessionId = "default" } = req.body as {
    question: string;
    sessionId?: string;
  };
  if (!question?.trim()) return res.status(400).json({ error: "question is required" });

  try {
    await ensureKB();
    const genAI = getGenAI();

    // Staff can access all documents (no scope filter)
    const systemPrompt = getSystemPrompt("internal");
    const relevantChunks = await retrieveContext(question, 4);
    const contextText = relevantChunks
      .map((c, i) => `[Related Document ${i + 1} — ${c.docTitle} (Relevance ${(c.score * 100).toFixed(0)}%)]\n${c.text}`)
      .join("\n\n");

    const augmentedMessage = relevantChunks.length > 0
      ? `[Retrieved Context]\n${contextText}\n\n[User Question]\n${question}`
      : question;

    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    const history = sessions.get(sessionId)!;

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
    console.error("[chatbot/message]", e);
    if (!res.headersSent) {
      res.status(500).json({ error: e?.message ?? "AI response generation failed." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI response generation failed." })}\n\n`);
      res.end();
    }
  }
});

export default router;
