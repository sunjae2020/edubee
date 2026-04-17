import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { campPhotoFolders, campPhotos } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";
import { ObjectStorageService } from "../lib/objectStorage.js";

const router = Router();
const objectStorageService = new ObjectStorageService();


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"] as const;

// ── Folders ─────────────────────────────────────────────────────────────────

router.get("/camp-photos/folders", authenticate, async (req, res) => {
  try {
    const { packageGroupId } = req.query as Record<string, string>;
    if (!packageGroupId) return res.status(400).json({ error: "packageGroupId required" });

    const folders = await db
      .select()
      .from(campPhotoFolders)
      .where(eq(campPhotoFolders.packageGroupId, packageGroupId))
      .orderBy(asc(campPhotoFolders.sortOrder), asc(campPhotoFolders.createdAt));

    return res.json(folders);
  } catch (err) {
    console.error("[GET /camp-photos/folders]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/camp-photos/folders", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { packageGroupId, name, visibility = "admin_only" } = req.body as {
      packageGroupId: string;
      name: string;
      visibility?: string;
    };
    if (!packageGroupId || !name) return res.status(400).json({ error: "packageGroupId and name required" });

    const [folder] = await db
      .insert(campPhotoFolders)
      .values({ packageGroupId, name, visibility })
      .returning();

    return res.status(201).json(folder);
  } catch (err) {
    console.error("[POST /camp-photos/folders]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/camp-photos/folders/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, visibility } = req.body as { name?: string; visibility?: string };
    const updates: Partial<{ name: string; visibility: string }> = {};
    if (name !== undefined) updates.name = name;
    if (visibility !== undefined) updates.visibility = visibility;

    const [folder] = await db
      .update(campPhotoFolders)
      .set(updates)
      .where(eq(campPhotoFolders.id, req.params.id))
      .returning();

    if (!folder) return res.status(404).json({ error: "Folder not found" });
    return res.json(folder);
  } catch (err) {
    console.error("[PUT /camp-photos/folders/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/camp-photos/folders/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await db.delete(campPhotoFolders).where(eq(campPhotoFolders.id, req.params.id));

    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /camp-photos/folders/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── Photos ───────────────────────────────────────────────────────────────────

router.get("/camp-photos", authenticate, async (req, res) => {
  try {
    const { folderId } = req.query as Record<string, string>;
    if (!folderId) return res.status(400).json({ error: "folderId required" });

    const photos = await db
      .select()
      .from(campPhotos)
      .where(eq(campPhotos.folderId, folderId))
      .orderBy(asc(campPhotos.sortOrder), asc(campPhotos.createdAt));

    return res.json(photos);
  } catch (err) {
    console.error("[GET /camp-photos]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/camp-photos/upload",
  authenticate,
  requireRole(...ADMIN_ROLES),
  upload.array("photos", 50),
  async (req, res) => {
    try {
      const { folderId, packageGroupId } = req.body as { folderId: string; packageGroupId: string };
      if (!folderId || !packageGroupId) return res.status(400).json({ error: "folderId and packageGroupId required" });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No files provided" });

      const uploaded: (typeof campPhotos.$inferSelect)[] = [];

      for (const file of files) {
        const objectPath = await objectStorageService.uploadBuffer(file.buffer, file.mimetype);
        const [photo] = await db
          .insert(campPhotos)
          .values({
            folderId,
            packageGroupId,
            objectPath,
            fileName: file.originalname,
            fileSize: file.size,
            uploadedBy: req.user!.id,
          })
          .returning();
        uploaded.push(photo);
      }

      return res.status(201).json(uploaded);
    } catch (err) {
      console.error("[POST /camp-photos/upload]", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.delete("/camp-photos/:id", authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [photo] = await db
      .delete(campPhotos)
      .where(eq(campPhotos.id, req.params.id))
      .returning();

    if (!photo) return res.status(404).json({ error: "Photo not found" });

    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /camp-photos/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
