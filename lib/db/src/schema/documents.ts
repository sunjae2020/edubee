import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  date,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { applicationParticipants } from "./applications";

export const documentCategories = pgTable("document_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryCode: varchar("category_code", { length: 100 }).unique(),
  categoryNameEn: varchar("category_name_en", { length: 255 }),
  categoryNameKo: varchar("category_name_ko", { length: 255 }),
  categoryNameJa: varchar("category_name_ja", { length: 255 }),
  categoryNameTh: varchar("category_name_th", { length: 255 }),
  categoryGroup: varchar("category_group", { length: 50 }),
  icon: varchar("icon", { length: 50 }),
  isRequired: boolean("is_required").default(false),
  sortOrder: integer("sort_order").default(0),
  allowExtraUpload: boolean("allow_extra_upload").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentExtraCategories = pgTable("document_extra_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceType: varchar("reference_type", { length: 20 }).notNull(),
  referenceId: uuid("reference_id").notNull(),
  categoryName: varchar("category_name", { length: 255 }).notNull(),
  categoryGroup: varchar("category_group", { length: 50 }).default("other"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceType: varchar("reference_type", { length: 20 }).notNull(),
  referenceId: uuid("reference_id").notNull(),
  categoryId: uuid("category_id").references(() => documentCategories.id),
  extraCategoryId: uuid("extra_category_id").references(() => documentExtraCategories.id),
  serviceType: varchar("service_type", { length: 20 }),
  serviceId: uuid("service_id"),
  participantId: uuid("participant_id").references(
    () => applicationParticipants.id
  ),
  documentName: varchar("document_name", { length: 255 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }),
  filePath: varchar("file_path", { length: 1000 }).notNull(),
  fileSizeBytes: integer("file_size_bytes"),
  fileType: varchar("file_type", { length: 100 }),
  fileExtension: varchar("file_extension", { length: 20 }),
  version: integer("version").default(1),
  isLatestVersion: boolean("is_latest_version").default(true),
  previousVersionId: uuid("previous_version_id"),
  status: varchar("status", { length: 50 }).default("pending_review"),
  expiryDate: date("expiry_date"),
  rejectionReason: text("rejection_reason"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const defaultDocPermissions = pgTable(
  "default_doc_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryGroup: varchar("category_group", { length: 50 }).notNull(),
    role: varchar("role", { length: 50 }).notNull(),
    canView: boolean("can_view").default(false),
    canDownload: boolean("can_download").default(false),
    canUploadExtra: boolean("can_upload_extra").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.categoryGroup, t.role)]
);

export const documentPermissions = pgTable(
  "document_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").references(() => documents.id),
    role: varchar("role", { length: 50 }).notNull(),
    canView: boolean("can_view").default(false),
    canDownload: boolean("can_download").default(false),
    canDelete: boolean("can_delete").default(false),
    canUploadExtra: boolean("can_upload_extra").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.documentId, t.role)]
);

export const documentAccessLogs = pgTable("document_access_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: varchar("user_agent", { length: 500 }),
  accessedAt: timestamp("accessed_at").defaultNow(),
});

export type DocumentCategory = typeof documentCategories.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentExtraCategory = typeof documentExtraCategories.$inferSelect;
