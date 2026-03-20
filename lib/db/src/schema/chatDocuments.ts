import { pgTable, varchar, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";

export const chatDocuments = pgTable("chat_documents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  source: varchar("source", { length: 1000 }),
  sourceType: varchar("source_type", { length: 50 }).notNull().default("manual"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatChunks = pgTable("chat_chunks", {
  id: varchar("id", { length: 100 }).primaryKey(),
  docId: varchar("doc_id", { length: 36 }).notNull().references(() => chatDocuments.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  embedding: jsonb("embedding").$type<number[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ChatDocumentSelectSchema = createSelectSchema(chatDocuments);
export const ChatDocumentInsertSchema = createInsertSchema(chatDocuments);
export type ChatDocument = typeof chatDocuments.$inferSelect;
export type NewChatDocument = typeof chatDocuments.$inferInsert;
export type ChatChunk = typeof chatChunks.$inferSelect;
