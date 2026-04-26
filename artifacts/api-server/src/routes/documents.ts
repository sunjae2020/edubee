import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import {
  documents,
  documentCategories,
  documentExtraCategories,
  documentPermissions,
  defaultDocPermissions,
  documentAccessLogs,
} from "@workspace/db/schema";
import {
  applications,
  contracts,
  pickupMgt,
  tourMgt,
  users,
} from "@workspace/db/schema";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { logger } from "../lib/logger.js";
import { eq, and, or, isNull, isNotNull, inArray, asc, desc, SQL, lte } from "drizzle-orm";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const ALLOWED_MIMETYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  // Text
  "text/plain",
  "text/csv",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif",
  ".txt", ".csv",
]);

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMETYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${ext}). Allowed: PDF, Word, Excel, PowerPoint, images, CSV, TXT.`));
    }
  },
});

const GROUP_LABELS: Record<string, string> = {
  personal: "Personal Documents",
  school: "School & Program Documents",
  financial: "Financial Documents",
  travel: "Travel Documents",
  contract: "Contract Documents",
  internal: "Internal Documents",
  other: "Additional Documents",
};

const GROUP_ORDER = ["personal", "school", "financial", "travel", "contract", "internal", "other"];

// ─── Document Category constants ─────────────────────────────────────────────
export const STUDENT_DOC_CATEGORIES = [
  "PASSPORT", "PHOTO_ID", "ACADEMIC", "ENGLISH_TEST", "FINANCIAL",
  "VISA_DOC", "COE", "OFFER_LETTER", "INSURANCE",
] as const;

export const CONSULTATION_DOC_CATEGORIES = [
  "CONSULTATION", "QUOTATION", "CONTRACT_DOC", "CORRESPONDENCE", "SCHOOL_INFO", "OTHER",
] as const;

export const ALL_DOC_CATEGORIES = [...STUDENT_DOC_CATEGORIES, ...CONSULTATION_DOC_CATEGORIES] as const;
export type DocCategory = typeof ALL_DOC_CATEGORIES[number];

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  PASSPORT:      "여권 (Passport)",
  PHOTO_ID:      "사진 / 신분증 (Photo ID)",
  ACADEMIC:      "성적 / 졸업증명서 (Academic)",
  ENGLISH_TEST:  "IELTS / TOEFL / PTE",
  FINANCIAL:     "은행잔고 / 재정보증 (Financial)",
  VISA_DOC:      "비자 서류 (Visa)",
  COE:           "Confirmation of Enrolment (COE)",
  OFFER_LETTER:  "LOO / Offer Letter",
  INSURANCE:     "유학생 보험 (Insurance)",
  CONSULTATION:  "상담신청서 (Consultation)",
  QUOTATION:     "견적서 (Quotation)",
  CONTRACT_DOC:  "계약서 (Contract Doc)",
  CORRESPONDENCE: "이메일 / 메모 / 공문",
  SCHOOL_INFO:   "학교 브로셔 / 안내자료",
  OTHER:         "기타 (Other)",
};

// Categories that require expiry date input
const EXPIRY_REQUIRED_CATS = ["PASSPORT", "FINANCIAL", "ENGLISH_TEST", "VISA_DOC"] as const;
// Categories that support submitted_to
const SUBMITTED_TO_CATS = ["VISA_DOC", "COE", "OFFER_LETTER"] as const;

async function getPermissionsForRole(role: string, group: string): Promise<{ canView: boolean; canDownload: boolean; canUploadExtra: boolean }> {
  const [perm] = await db
    .select()
    .from(defaultDocPermissions)
    .where(and(eq(defaultDocPermissions.categoryGroup, group), eq(defaultDocPermissions.role, role)))
    .limit(1);
  return {
    canView: perm?.canView ?? false,
    canDownload: perm?.canDownload ?? false,
    canUploadExtra: perm?.canUploadExtra ?? false,
  };
}

/**
 * Sprint 3-01: 문서 접근 검증 미들웨어
 * - 테넌트 격리: 같은 테넌트 스키마의 문서만 접근 (DB 레벨에서도 격리됨)
 * - portal_student: 본인 contact_id 문서만 접근
 * - 미들웨어 통과 후 req.document에 doc 객체 저장
 */
async function verifyDocumentAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as Record<string, string>;
    const requestingUser = req.user!;

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
      .limit(1);

    if (!doc) {
      res.status(404).json({ success: false, code: "NOT_FOUND", message: "Document not found" });
      return;
    }

    // 테넌트 격리: DB 스키마가 이미 테넌트별로 분리되어 있으므로
    // 쿼리 결과가 이미 현재 테넌트의 문서임을 보장 (방어 심층화).

    // portal_student: referenceType='contact' 문서는 본인 referenceId만 접근 가능
    // (포털 유저는 authenticatePortal에서 contactId가 req.user에 주입됨)
    if (
      requestingUser.role === "portal_student" &&
      doc.referenceType === "contact" &&
      doc.referenceId !== (requestingUser as any).contactId
    ) {
      logger.warn(
        { userId: requestingUser.id, docRefId: doc.referenceId, userContactId: (requestingUser as any).contactId },
        "portal_student cross-contact document access blocked",
      );
      res.status(403).json({ success: false, code: "FORBIDDEN", message: "You can only access your own documents" });
      return;
    }

    (req as any).document = doc;
    next();
  } catch (err) {
    next(err);
  }
}

async function canViewDocument(role: string, doc: any): Promise<boolean> {
  const overrideRow = await db
    .select()
    .from(documentPermissions)
    .where(and(eq(documentPermissions.documentId, doc.id), eq(documentPermissions.role, role)))
    .limit(1);
  if (overrideRow.length > 0) return overrideRow[0].canView ?? false;

  const group = doc.extraCategoryGroup ?? doc.categoryGroup ?? "other";
  const defaultPerm = await db
    .select()
    .from(defaultDocPermissions)
    .where(and(eq(defaultDocPermissions.categoryGroup, group), eq(defaultDocPermissions.role, role)))
    .limit(1);
  return defaultPerm[0]?.canView ?? false;
}

async function enrichDocuments(rawDocs: any[], role: string): Promise<any[]> {
  if (rawDocs.length === 0) return [];

  const categoryIds = [...new Set(rawDocs.map(d => d.categoryId).filter(Boolean))] as string[];
  const extraCategoryIds = [...new Set(rawDocs.map(d => d.extraCategoryId).filter(Boolean))] as string[];

  const categories = categoryIds.length > 0
    ? await db.select().from(documentCategories).where(inArray(documentCategories.id, categoryIds))
    : [];
  const extraCategories = extraCategoryIds.length > 0
    ? await db.select().from(documentExtraCategories).where(inArray(documentExtraCategories.id, extraCategoryIds))
    : [];

  const catMap = new Map(categories.map(c => [c.id, c]));
  const extraCatMap = new Map(extraCategories.map(c => [c.id, c]));

  const uploaderIds = [...new Set(rawDocs.map(d => d.uploadedBy).filter(Boolean))] as string[];
  const uploaders = uploaderIds.length > 0
    ? await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, uploaderIds))
    : [];
  const uploaderMap = new Map(uploaders.map(u => [u.id, u.fullName]));

  const result = [];
  for (const doc of rawDocs) {
    const isExtra = !!doc.extraCategoryId;
    const cat = doc.categoryId ? catMap.get(doc.categoryId) : null;
    const extraCat = doc.extraCategoryId ? extraCatMap.get(doc.extraCategoryId) : null;

    const group = isExtra ? (extraCat?.categoryGroup ?? "other") : (cat?.categoryGroup ?? "other");

    const overrideRow = await db
      .select()
      .from(documentPermissions)
      .where(and(eq(documentPermissions.documentId, doc.id), eq(documentPermissions.role, role)))
      .limit(1);

    let canView = false, canDownload = false, canDelete = false;
    if (overrideRow.length > 0) {
      canView = overrideRow[0].canView ?? false;
      canDownload = overrideRow[0].canDownload ?? false;
      canDelete = overrideRow[0].canDelete ?? false;
    } else {
      const defPerm = await db
        .select()
        .from(defaultDocPermissions)
        .where(and(eq(defaultDocPermissions.categoryGroup, group), eq(defaultDocPermissions.role, role)))
        .limit(1);
      canView = defPerm[0]?.canView ?? false;
      canDownload = defPerm[0]?.canDownload ?? false;
    }

    if (!canView && !["super_admin", "admin"].includes(role)) continue;

    result.push({
      ...doc,
      isExtraCategory: isExtra,
      extraCategoryName: extraCat?.categoryName ?? null,
      categoryGroup: group,
      categoryCode: cat?.categoryCode ?? null,
      categoryNameEn: cat?.categoryNameEn ?? (isExtra ? extraCat?.categoryName : null),
      serviceType: doc.serviceType ?? null,
      uploadedByName: doc.uploadedBy ? (uploaderMap.get(doc.uploadedBy) ?? null) : null,
      permissions: { canView, canDownload, canDelete },
      documentCategory: doc.documentCategory ?? null,
      isSubmitted: doc.isSubmitted ?? false,
      submittedTo: doc.submittedTo ?? null,
    });
  }
  return result;
}

router.use(authenticate);

// POST /api/documents — upload
router.post("/documents", upload.single("file"), async (req, res) => {
  try {
    const role = req.user!.role;
    const {
      referenceType,
      referenceId,
      categoryId,
      participantId,
      documentName,
      status,
      expiryDate,
      notes,
      isExtraCategory,
      extraCategoryName,
      serviceType,
      serviceId,
      documentCategory,
      isSubmitted,
      submittedTo,
    } = req.body;

    if (!req.file) return res.status(400).json({ error: "File is required" });
    if (!referenceType || !referenceId) return res.status(400).json({ error: "referenceType and referenceId are required" });

    const isExtra = isExtraCategory === "true" || isExtraCategory === true;

    let extraCatId: string | null = null;

    if (isExtra) {
      if (!extraCategoryName || extraCategoryName.trim().length === 0) {
        return res.status(400).json({ error: "extraCategoryName is required for extra category uploads" });
      }
      const extraPerm = await getPermissionsForRole(role, "other");
      if (!extraPerm.canUploadExtra && !["super_admin", "admin"].includes(role)) {
        return res.status(403).json({ error: "Not permitted to upload extra category documents" });
      }
      const [extraCat] = await db.insert(documentExtraCategories).values({
        referenceType,
        referenceId,
        categoryName: extraCategoryName.trim().slice(0, 255),
        categoryGroup: "other",
        createdBy: req.user!.id,
      }).returning();
      extraCatId = extraCat.id;
    }

    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const [doc] = await db.insert(documents).values({
      referenceType,
      referenceId,
      categoryId: isExtra ? null : (categoryId ?? null),
      extraCategoryId: extraCatId,
      serviceType: serviceType ?? null,
      serviceId: serviceId ?? null,
      participantId: participantId ?? null,
      documentName: documentName ?? req.file.originalname,
      originalFilename: req.file.originalname,
      filePath: req.file.path,
      fileSizeBytes: req.file.size,
      fileType: req.file.mimetype,
      fileExtension: ext,
      status: status ?? "pending_review",
      expiryDate: expiryDate ?? null,
      notes: notes ?? null,
      uploadedBy: req.user!.id,
      documentCategory: documentCategory ?? null,
      isSubmitted: isSubmitted === "true" || isSubmitted === true ? true : false,
      submittedTo: submittedTo ?? null,
    }).returning();

    return res.status(201).json(doc);
  } catch (err) {
    console.error("Document upload error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/list
router.get("/documents/list", async (req, res) => {
  try {
    const role = req.user!.role;
    const { referenceType, referenceId, group, serviceType, serviceId, includeExtra } = req.query as Record<string, string>;

    if (!referenceType || !referenceId) return res.status(400).json({ error: "referenceType and referenceId are required" });

    const conditions: SQL[] = [
      eq(documents.referenceType, referenceType),
      eq(documents.referenceId, referenceId),
      isNull(documents.deletedAt),
    ];

    if (serviceType) conditions.push(eq(documents.serviceType, serviceType));
    if (serviceId) conditions.push(eq(documents.serviceId, serviceId));
    if (includeExtra === "false") conditions.push(isNull(documents.extraCategoryId));

    const rawDocs = await db.select().from(documents).where(and(...conditions)).orderBy(documents.createdAt);
    const enriched = await enrichDocuments(rawDocs, role);

    let filtered = enriched;
    if (group) filtered = enriched.filter(d => d.categoryGroup === group);

    return res.json({ data: filtered });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/permissions-check
router.get("/documents/permissions-check", async (req, res) => {
  try {
    const role = req.user!.role;
    const { categoryGroup } = req.query as Record<string, string>;

    const group = categoryGroup ?? "other";
    const perm = await getPermissionsForRole(role, group);

    const categoriesInGroup = await db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.categoryGroup, group))
      .orderBy(documentCategories.sortOrder);

    return res.json({
      canUpload: perm.canView,
      canView: perm.canView,
      canDownload: perm.canDownload,
      canUploadExtra: perm.canUploadExtra,
      availableCategories: perm.canView ? categoriesInGroup : [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/expiring
router.get("/documents/expiring", async (req, res) => {
  try {
    const { days = "30" } = req.query as Record<string, string>;
    const daysNum = Math.max(1, Math.min(365, parseInt(days) || 30));

    // Compute the target date in JS to avoid SQL injection risk
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysNum);
    const targetDateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const rawDocs = await db
      .select({
        id: documents.id,
        documentName: documents.documentName,
        documentCategory: documents.documentCategory,
        expiryDate: documents.expiryDate,
        referenceType: documents.referenceType,
        referenceId: documents.referenceId,
      })
      .from(documents)
      .where(
        and(
          isNull(documents.deletedAt),
          isNotNull(documents.expiryDate),
          lte(documents.expiryDate, targetDateStr)
        )
      )
      .orderBy(documents.expiryDate);

    return res.json({ data: rawDocs, days: daysNum });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/categories — return the category list for the frontend
router.get("/documents/categories", async (req, res) => {
  const { group } = req.query as Record<string, string>;
  const cats = group === "student"
    ? STUDENT_DOC_CATEGORIES.map(c => ({ code: c, label: DOC_CATEGORY_LABELS[c], group: "student" }))
    : group === "consultation"
    ? CONSULTATION_DOC_CATEGORIES.map(c => ({ code: c, label: DOC_CATEGORY_LABELS[c], group: "consultation" }))
    : ALL_DOC_CATEGORIES.map(c => ({
        code: c,
        label: DOC_CATEGORY_LABELS[c],
        group: (STUDENT_DOC_CATEGORIES as readonly string[]).includes(c) ? "student" : "consultation",
      }));
  return res.json({ data: cats });
});

// GET /api/documents/by-entity
router.get("/documents/by-entity", async (req, res) => {
  try {
    const role = req.user!.role;
    const { entityType, entityId, group: tabGroup } = req.query as Record<string, string>;

    if (!entityType || !entityId) return res.status(400).json({ error: "entityType and entityId are required" });

    let rawDocs: any[] = [];
    const SERVICE_TYPES = ["pickup_mgt", "tour_mgt"];

    if (entityType === "application" || entityType === "contract" || entityType === "camp_application") {
      const conds: SQL[] = [
        eq(documents.referenceType, entityType),
        eq(documents.referenceId, entityId),
        isNull(documents.deletedAt),
      ];
      rawDocs = await db.select().from(documents).where(and(...conds)).orderBy(documents.createdAt);
    } else if (SERVICE_TYPES.includes(entityType)) {
      const tableMap: Record<string, any> = {
        pickup_mgt: pickupMgt,
        tour_mgt: tourMgt,
      };
      const svcTable = tableMap[entityType];
      const [svcRow] = await db.select().from(svcTable).where(eq(svcTable.id, entityId)).limit(1);
      if (!svcRow) return res.status(404).json({ error: "Service record not found" });

      const contractId = svcRow.contractId;
      const serviceShortType = entityType.replace("_mgt", "");
      rawDocs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.referenceType, "contract"),
            eq(documents.referenceId, contractId),
            isNull(documents.deletedAt),
            or(
              eq(documents.serviceType, serviceShortType),
              isNull(documents.serviceType)
            )
          )
        )
        .orderBy(documents.createdAt);
    } else if (entityType === "user") {
      if (!["super_admin", "admin"].includes(role)) {
        return res.status(403).json({ error: "Not permitted" });
      }
      const appRows = await db
        .select({ id: applications.id })
        .from(applications)
        .where(or(
          eq(applications.clientId, entityId),
          eq(applications.agentId, entityId)
        ));

      const contractRows = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(or(
          eq(contracts.campProviderId, entityId)
        ));

      const appIds = appRows.map(a => a.id);
      const contractIds = contractRows.map(c => c.id);

      const docConds: SQL[] = [isNull(documents.deletedAt)];
      const refConds: SQL[] = [];

      if (appIds.length > 0) {
        refConds.push(and(eq(documents.referenceType, "application"), inArray(documents.referenceId, appIds))!);
      }
      if (contractIds.length > 0) {
        refConds.push(and(eq(documents.referenceType, "contract"), inArray(documents.referenceId, contractIds))!);
      }

      if (refConds.length === 0) {
        return res.json([]);
      }

      rawDocs = await db
        .select()
        .from(documents)
        .where(and(...docConds, or(...refConds)))
        .orderBy(documents.createdAt);
    } else {
      return res.status(400).json({ error: "Invalid entityType" });
    }

    let enriched = await enrichDocuments(rawDocs, role);

    // Filter by tabGroup if provided (student / consultation)
    if (tabGroup === "student") {
      enriched = enriched.filter(d =>
        d.documentCategory && (STUDENT_DOC_CATEGORIES as readonly string[]).includes(d.documentCategory)
      );
    } else if (tabGroup === "consultation") {
      enriched = enriched.filter(d =>
        !d.documentCategory || (CONSULTATION_DOC_CATEGORIES as readonly string[]).includes(d.documentCategory)
      );
    }

    const grouped: Record<string, any[]> = {};
    for (const group of GROUP_ORDER) grouped[group] = [];

    for (const doc of enriched) {
      const grp = doc.categoryGroup ?? "other";
      if (!grouped[grp]) grouped[grp] = [];
      grouped[grp].push(doc);
    }

    const allGroups = await db.select({ group: defaultDocPermissions.categoryGroup }).from(defaultDocPermissions).where(and(eq(defaultDocPermissions.role, role), eq(defaultDocPermissions.canView, true)));
    const viewableGroups = new Set(allGroups.map(g => g.group));

    const result = GROUP_ORDER
      .filter(g => viewableGroups.has(g) || grouped[g]?.length > 0)
      .map(g => ({
        group: g,
        groupLabel: GROUP_LABELS[g] ?? g,
        documents: grouped[g] ?? [],
      }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/:id/view
// verifyDocumentAccess: 테넌트 격리 + portal_student 본인 문서 체크 (S3-01)
router.get("/documents/:id/view", verifyDocumentAccess, async (req, res) => {
  try {
    const role = req.user!.role;
    const doc = (req as any).document;

    const canView = await canViewDocument(role, doc);
    if (!canView && !["super_admin", "admin"].includes(role)) {
      return res.status(403).json({ success: false, code: "FORBIDDEN", message: "Forbidden" });
    }

    await db.insert(documentAccessLogs).values({
      documentId: doc.id,
      userId: req.user!.id,
      action: "view",
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
    }).catch(() => {});

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, code: "NOT_FOUND", message: "File not found on server" });
    }
    return res.sendFile(path.resolve(doc.filePath));
  } catch (err) {
    return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal Server Error" });
  }
});

// GET /api/documents/:id/download
// verifyDocumentAccess: 테넌트 격리 + portal_student 본인 문서 체크 (S3-01)
router.get("/documents/:id/download", verifyDocumentAccess, async (req, res) => {
  try {
    const role = req.user!.role;
    const doc = (req as any).document;

    const canView = await canViewDocument(role, doc);
    if (!canView && !["super_admin", "admin"].includes(role)) {
      return res.status(403).json({ success: false, code: "FORBIDDEN", message: "Forbidden" });
    }

    await db.insert(documentAccessLogs).values({
      documentId: doc.id,
      userId: req.user!.id,
      action: "download",
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
    }).catch(() => {});

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, code: "NOT_FOUND", message: "File not found on server" });
    }
    return res.download(path.resolve(doc.filePath), doc.originalFilename ?? doc.documentName);
  } catch (err) {
    return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Internal Server Error" });
  }
});

// PATCH /api/documents/:id/status
router.patch("/documents/:id/status", requireRole("super_admin", "admin", "camp_coordinator"), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const [doc] = await db
      .update(documents)
      .set({ status, rejectionReason: rejectionReason ?? null, reviewedBy: req.user!.id, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, req.params.id as string))
      .returning();
    if (!doc) return res.status(404).json({ error: "Not Found" });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/documents/:id
router.delete("/documents/:id", requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const [doc] = await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, req.params.id as string))
      .returning();
    if (!doc) return res.status(404).json({ error: "Not Found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/all — central management (SA/AD only)
router.get("/documents/all", requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const { entityType, categoryGroup, status: statusFilter, search, page = "1", limit = "50", sortBy = "createdAt", sortDir = "desc" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conds: SQL[] = [isNull(documents.deletedAt)];
    if (entityType) conds.push(eq(documents.referenceType, entityType));
    if (statusFilter) conds.push(eq(documents.status, statusFilter));

    const rawDocs = await db
      .select()
      .from(documents)
      .where(and(...conds))
      .orderBy(sortDir === "asc" ? asc(documents.createdAt) : desc(documents.createdAt))
      .limit(limitNum)
      .offset(offset);

    const enriched = await enrichDocuments(rawDocs, "super_admin");

    let filtered = enriched;
    if (categoryGroup) filtered = enriched.filter(d => d.categoryGroup === categoryGroup);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(d => d.documentName?.toLowerCase().includes(s) || d.originalFilename?.toLowerCase().includes(s));
    }

    return res.json({ data: filtered, meta: { page: pageNum, limit: limitNum } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/:id/access-log
router.get("/documents/:id/access-log", requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const logs = await db
      .select()
      .from(documentAccessLogs)
      .where(eq(documentAccessLogs.documentId, req.params.id as string))
      .orderBy(documentAccessLogs.accessedAt);
    return res.json({ data: logs });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/categories — list all categories
router.get("/documents/categories", async (req, res) => {
  try {
    const cats = await db.select().from(documentCategories).orderBy(documentCategories.categoryGroup, documentCategories.sortOrder);
    return res.json({ data: cats });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/documents/default-permissions — for settings page
router.get("/documents/default-permissions", requireRole("super_admin"), async (req, res) => {
  try {
    const perms = await db.select().from(defaultDocPermissions).orderBy(defaultDocPermissions.categoryGroup, defaultDocPermissions.role);
    const cats = await db.select().from(documentCategories).orderBy(documentCategories.categoryGroup, documentCategories.sortOrder);
    return res.json({ data: perms, categories: cats });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/documents/default-permissions — save settings
router.put("/documents/default-permissions", requireRole("super_admin"), async (req, res) => {
  try {
    const { permissions, categorySettings } = req.body;

    for (const perm of permissions) {
      await db
        .update(defaultDocPermissions)
        .set({
          canView: perm.canView,
          canDownload: perm.canDownload,
          canUploadExtra: perm.canUploadExtra ?? false,
        })
        .where(and(eq(defaultDocPermissions.categoryGroup, perm.categoryGroup), eq(defaultDocPermissions.role, perm.role)));
    }

    if (categorySettings) {
      for (const cat of categorySettings) {
        await db
          .update(documentCategories)
          .set({ allowExtraUpload: cat.allowExtraUpload })
          .where(eq(documentCategories.id, cat.id));
      }
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ─── DELETE /api/documents/bulk  (super_admin 영구 삭제) ─────────────────────
router.delete("/documents/bulk", authenticate, async (req, res) => {
  if ((req.user as any)?.role !== "super_admin") return res.status(403).json({ error: "Forbidden" });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    await db.delete(documents).where(inArray(documents.id, ids));
    return res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("[DELETE /api/documents/bulk]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
