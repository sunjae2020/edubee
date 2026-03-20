/**
 * Knowledge Base Service
 * - Gemini text-embedding-004 for semantic vector embeddings
 * - Text chunking with overlap for better retrieval accuracy
 * - Cosine similarity search (no paid vector DB needed)
 * - Embeddings persisted to PostgreSQL, loaded into memory on startup
 * - Google Docs extraction handles paragraphs + tables
 */

import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import { chatDocuments, chatChunks } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DocMeta {
  id: string;
  title: string;
  source?: string;
  sourceType: string;
  content: string;
  chunkCount: number;
  lastUpdated: string;
}

interface EmbeddingEntry {
  chunkId: string;
  docId: string;
  text: string;
  embedding: number[];
}

// ─── In-memory store ───────────────────────────────────────────────────────

let documents: DocMeta[] = [];
let embeddings: EmbeddingEntry[] = [];
let cachedSystemPrompt: string | null = null;
let initialized = false;

// ─── Gemini helper ─────────────────────────────────────────────────────────

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey });
}

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  // gemini-embedding-001 is Google's production embedding model (v1beta endpoint)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Embedding API error ${response.status}: ${JSON.stringify(err)}`);
  }
  const data = await response.json() as { embedding?: { values: number[] } };
  return data.embedding?.values ?? [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Text chunking ─────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize = 800, overlap = 100): { index: number; text: string }[] {
  const chunks: { index: number; text: string }[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize && current.length > 0) {
      chunks.push({ index: chunkIndex++, text: current.trim() });
      const words = current.split(" ");
      current = words.slice(-Math.floor(overlap / 5)).join(" ") + " " + sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current.trim()) {
    chunks.push({ index: chunkIndex, text: current.trim() });
  }
  return chunks;
}

// ─── Google Docs extraction ────────────────────────────────────────────────

export function extractTextFromGoogleDoc(docData: any): string {
  let text = "";
  const body = docData.body?.content ?? [];

  for (const element of body) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements ?? []) {
        if (elem.textRun?.content) text += elem.textRun.content;
      }
    } else if (element.table) {
      for (const row of element.table.tableRows ?? []) {
        for (const cell of row.tableCells ?? []) {
          for (const content of cell.content ?? []) {
            if (content.paragraph) {
              for (const elem of content.paragraph.elements ?? []) {
                if (elem.textRun?.content) text += elem.textRun.content + " ";
              }
            }
          }
        }
        text += "\n";
      }
    }
  }
  return text.trim();
}

// ─── System prompt ─────────────────────────────────────────────────────────

function rebuildSystemPrompt() {
  if (documents.length === 0) {
    cachedSystemPrompt = null;
    return;
  }

  const docContent = documents
    .map((d) => `=== ${d.title} ===\n${d.content}`)
    .join("\n\n---\n\n");

  cachedSystemPrompt = `당신은 Edubee Camp 플랫폼의 전용 내부 도우미입니다.

## 절대적 규칙
1. 반드시 아래 [내부 문서]에 있는 정보만을 기반으로 답변하세요
2. 문서에 없는 내용은 절대 추측하거나 외부 지식으로 보완하지 마세요
3. 주식, 날씨, 뉴스, 플랫폼 외부 정보에 대한 질문에는 답변하지 마세요
4. 한국어로 질문하면 한국어로, 영어로 질문하면 영어로 답변하세요
5. 문서에서 관련 내용을 찾을 수 없으면 반드시 이렇게 말하세요:
   "죄송합니다. 해당 내용은 현재 등록된 문서에서 찾을 수 없습니다. 담당자(support@edubee.com)에게 문의해 주세요."

## 답변 스타일
- 명확하고 간결하게 답변하세요
- 관련 있는 경우 어느 문서의 정보인지 언급하세요
- 복잡한 내용은 번호 목록으로 정리하세요

[내부 문서]
${docContent}`;
}

// ─── Initialization ────────────────────────────────────────────────────────

export async function initKnowledgeBase() {
  if (initialized) return;
  initialized = true;

  try {
    const docs = await db.select().from(chatDocuments).orderBy(desc(chatDocuments.createdAt));
    const chunks = await db.select().from(chatChunks);

    documents = docs.map((d) => ({
      id: d.id,
      title: d.title,
      source: d.source ?? undefined,
      sourceType: d.sourceType,
      content: d.content,
      chunkCount: chunks.filter((c) => c.docId === d.id).length,
      lastUpdated: d.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));

    embeddings = chunks.map((c) => ({
      chunkId: c.id,
      docId: c.docId,
      text: c.text,
      embedding: c.embedding as number[],
    }));

    rebuildSystemPrompt();
    console.log(`[KB] Initialized with ${documents.length} docs, ${embeddings.length} chunks`);
  } catch (e) {
    console.error("[KB] Init failed:", e);
  }
}

// ─── Document management ───────────────────────────────────────────────────

export async function addDocumentToKB(docId: string, title: string, content: string, source?: string, sourceType = "manual") {
  const chunks = chunkText(content);

  // Persist chunks + embeddings to DB
  await db.delete(chatChunks).where(eq(chatChunks.docId, docId));

  const embeddingEntries: EmbeddingEntry[] = [];
  console.log(`[KB] Generating embeddings for "${title}" (${chunks.length} chunks)...`);

  for (const chunk of chunks) {
    const chunkId = `${docId}-${chunk.index}`;
    const embedding = await generateEmbedding(chunk.text);

    await db.insert(chatChunks).values({
      id: chunkId,
      docId,
      chunkIndex: chunk.index,
      text: chunk.text,
      embedding,
    });

    embeddingEntries.push({ chunkId, docId, text: chunk.text, embedding });
  }

  // Update in-memory store
  documents = documents.filter((d) => d.id !== docId);
  documents.unshift({
    id: docId,
    title,
    source,
    sourceType,
    content,
    chunkCount: chunks.length,
    lastUpdated: new Date().toISOString(),
  });

  embeddings = embeddings.filter((e) => e.docId !== docId);
  embeddings.push(...embeddingEntries);

  rebuildSystemPrompt();
  console.log(`[KB] Added "${title}" — ${chunks.length} chunks embedded`);
}

export async function removeDocumentFromKB(docId: string) {
  // DB cascade deletes chunks via FK
  documents = documents.filter((d) => d.id !== docId);
  embeddings = embeddings.filter((e) => e.docId !== docId);
  rebuildSystemPrompt();
}

// ─── Retrieval ─────────────────────────────────────────────────────────────

export async function retrieveContext(query: string, topK = 4): Promise<{ text: string; docTitle: string; score: number }[]> {
  if (embeddings.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);

  const scored = embeddings.map((item) => {
    const doc = documents.find((d) => d.id === item.docId);
    return {
      text: item.text,
      docTitle: doc?.title ?? "Unknown",
      score: cosineSimilarity(queryEmbedding, item.embedding),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter((s) => s.score > 0.3);
}

// ─── Getters ───────────────────────────────────────────────────────────────

export function getSystemPrompt() {
  return cachedSystemPrompt;
}

export function getKnowledgeBaseStatus() {
  return {
    documentCount: documents.length,
    totalChunks: embeddings.length,
    hasSystemPrompt: !!cachedSystemPrompt,
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      source: d.source,
      sourceType: d.sourceType,
      chunkCount: d.chunkCount,
      lastUpdated: d.lastUpdated,
    })),
  };
}
