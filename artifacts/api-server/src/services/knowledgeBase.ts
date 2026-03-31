/**
 * Knowledge Base Service
 * - Gemini text-embedding-004 for semantic vector embeddings
 * - Text chunking with overlap for better retrieval accuracy
 * - Cosine similarity search (no paid vector DB needed)
 * - Embeddings persisted to PostgreSQL, loaded into memory on startup
 * - Google Docs extraction handles paragraphs + tables
 * - Scope: "internal" (admin staff only) | "public" (landing page widget)
 */

import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import { chatDocuments, chatChunks } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────────────────────

export type KBScope = "internal" | "public";

interface DocMeta {
  id: string;
  title: string;
  source?: string;
  sourceType: string;
  scope: KBScope;
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
let cachedInternalPrompt: string | null = null;
let cachedPublicPrompt: string | null = null;
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
    const errMsg = `Embedding API error ${response.status}: ${JSON.stringify(err)}`;
    console.error(`[KB] ${errMsg}`);
    throw Object.assign(new Error(errMsg), { status: response.status });
  }
  const data = await response.json() as { embedding?: { values: number[] } };
  return data.embedding?.values ?? [];
}

// ─── Keyword fallback search (used when embedding quota is exhausted) ───────

function keywordSearch(
  query: string,
  pool: EmbeddingEntry[],
  topK: number
): { text: string; docTitle: string; score: number }[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return [];

  const scored = pool.map((item) => {
    const doc = documents.find((d) => d.id === item.docId);
    const haystack = item.text.toLowerCase();
    let hits = 0;
    for (const w of words) if (haystack.includes(w)) hits++;
    return {
      text: item.text,
      docTitle: doc?.title ?? "Unknown",
      score: hits / words.length,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).filter((s) => s.score > 0);
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

// ─── System prompts ────────────────────────────────────────────────────────

function rebuildSystemPrompts() {
  const internalDocs = documents.filter(d => d.scope === "internal");
  const publicDocs   = documents.filter(d => d.scope === "public");

  // Internal prompt (staff-focused, strict)
  if (internalDocs.length === 0) {
    cachedInternalPrompt = null;
  } else {
    const docContent = internalDocs
      .map((d) => `=== ${d.title} ===\n${d.content}`)
      .join("\n\n---\n\n");

    cachedInternalPrompt = `You are the dedicated internal assistant for Edubee Camp platform, available to staff only.

## Absolute Rules
1. Answer only based on the information in the [Internal Documents] below
2. Never speculate or fill in with external knowledge
3. Do not answer questions about stocks, weather, news, or anything outside the platform
4. Reply in the same language as the question (Korean → Korean, English → English)
5. If you cannot find relevant information, say:
   "I'm sorry, I couldn't find that information in the registered documents. Please contact support@edubee.com."

## Response Style
- Clear and concise answers
- Mention which document the information comes from when relevant
- Use numbered lists for complex information

[Internal Documents]
${docContent}`;
  }

  // Public prompt (customer-facing, friendly)
  if (publicDocs.length === 0) {
    cachedPublicPrompt = null;
  } else {
    const docContent = publicDocs
      .map((d) => `=== ${d.title} ===\n${d.content}`)
      .join("\n\n---\n\n");

    cachedPublicPrompt = `You are a friendly AI assistant for Edubee Camp, helping prospective students and parents learn about our programs.

## Rules
1. Answer only based on the information in the [Public Documents] below
2. Be warm, welcoming, and encouraging
3. Do not answer questions unrelated to Edubee Camp programs
4. Reply in the same language as the question
5. If you cannot find relevant information, say:
   "I don't have that information right now. Please contact our team at support@edubee.com or use the contact form — we'd love to help!"

## Response Style
- Friendly and approachable tone
- Keep answers concise and easy to understand
- Encourage prospective students to apply or get in touch

[Public Documents]
${docContent}`;
  }
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
      scope: (d.scope as KBScope) ?? "internal",
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

    rebuildSystemPrompts();
    console.log(`[KB] Initialized with ${documents.length} docs (${documents.filter(d=>d.scope==="internal").length} internal, ${documents.filter(d=>d.scope==="public").length} public), ${embeddings.length} chunks`);
  } catch (e) {
    console.error("[KB] Init failed:", e);
  }
}

// ─── Document management ───────────────────────────────────────────────────

export async function addDocumentToKB(
  docId: string,
  title: string,
  content: string,
  source?: string,
  sourceType = "manual",
  scope: KBScope = "internal"
) {
  const chunks = chunkText(content);

  await db.delete(chatChunks).where(eq(chatChunks.docId, docId));

  const embeddingEntries: EmbeddingEntry[] = [];
  console.log(`[KB] Generating embeddings for "${title}" (${chunks.length} chunks, scope=${scope})...`);

  let quotaExhausted = false;
  for (const chunk of chunks) {
    const chunkId = `${docId}-${chunk.index}`;
    let embedding: number[] = [];

    if (!quotaExhausted) {
      try {
        embedding = await generateEmbedding(chunk.text);
      } catch (err: any) {
        if (err?.status === 429 || String(err?.message).includes("429") || String(err?.message).includes("RESOURCE_EXHAUSTED")) {
          console.warn("[KB] Embedding quota exceeded — saving chunks without embeddings (keyword search will be used)");
          quotaExhausted = true;
        } else {
          throw err;
        }
      }
    }

    await db.insert(chatChunks).values({
      id: chunkId,
      docId,
      chunkIndex: chunk.index,
      text: chunk.text,
      embedding,
    });

    embeddingEntries.push({ chunkId, docId, text: chunk.text, embedding });
  }

  documents = documents.filter((d) => d.id !== docId);
  documents.unshift({
    id: docId,
    title,
    source,
    sourceType,
    scope,
    content,
    chunkCount: chunks.length,
    lastUpdated: new Date().toISOString(),
  });

  embeddings = embeddings.filter((e) => e.docId !== docId);
  embeddings.push(...embeddingEntries);

  rebuildSystemPrompts();
  console.log(`[KB] Added "${title}" — ${chunks.length} chunks embedded (scope=${scope})`);
}

export async function removeDocumentFromKB(docId: string) {
  documents = documents.filter((d) => d.id !== docId);
  embeddings = embeddings.filter((e) => e.docId !== docId);
  rebuildSystemPrompts();
}

export function updateDocumentScopeInMemory(docId: string, scope: KBScope) {
  const doc = documents.find((d) => d.id === docId);
  if (doc) {
    doc.scope = scope;
    rebuildSystemPrompts();
    console.log(`[KB] Scope updated for "${doc.title}": ${scope}`);
  }
}

// ─── Retrieval ─────────────────────────────────────────────────────────────

export async function retrieveContext(
  query: string,
  topK = 4,
  scope?: KBScope
): Promise<{ text: string; docTitle: string; score: number }[]> {
  if (embeddings.length === 0) return [];

  const scopedDocIds = scope
    ? new Set(documents.filter(d => d.scope === scope).map(d => d.id))
    : null;

  const filteredEmbeddings = scopedDocIds
    ? embeddings.filter(e => scopedDocIds.has(e.docId))
    : embeddings;

  if (filteredEmbeddings.length === 0) return [];

  try {
    const queryEmbedding = await generateEmbedding(query);
    const scored = filteredEmbeddings.map((item) => {
      const doc = documents.find((d) => d.id === item.docId);
      return {
        text: item.text,
        docTitle: doc?.title ?? "Unknown",
        score: cosineSimilarity(queryEmbedding, item.embedding),
      };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).filter((s) => s.score > 0.3);
  } catch (err: any) {
    if (err?.status === 429 || String(err?.message).includes("429") || String(err?.message).includes("RESOURCE_EXHAUSTED")) {
      console.warn("[KB] Embedding quota exceeded — falling back to keyword search");
      return keywordSearch(query, filteredEmbeddings, topK);
    }
    throw err;
  }
}

// ─── Getters ───────────────────────────────────────────────────────────────

export function getSystemPrompt(scope: KBScope = "internal") {
  return scope === "public" ? cachedPublicPrompt : cachedInternalPrompt;
}

export function getKnowledgeBaseStatus(scope?: KBScope) {
  const filteredDocs = scope ? documents.filter(d => d.scope === scope) : documents;
  const filteredEmbeds = scope
    ? embeddings.filter(e => filteredDocs.some(d => d.id === e.docId))
    : embeddings;

  return {
    documentCount: filteredDocs.length,
    totalChunks: filteredEmbeds.length,
    internalCount: documents.filter(d => d.scope === "internal").length,
    publicCount: documents.filter(d => d.scope === "public").length,
    hasSystemPrompt: scope === "public" ? !!cachedPublicPrompt : !!cachedInternalPrompt,
    documents: filteredDocs.map((d) => ({
      id: d.id,
      title: d.title,
      source: d.source,
      sourceType: d.sourceType,
      scope: d.scope,
      chunkCount: d.chunkCount,
      lastUpdated: d.lastUpdated,
    })),
  };
}
