import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { campPhotoFolders, campPhotos } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const PHOTO_DIR = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, "camp-photos")
  : path.join(process.cwd(), "uploads", "camp-photos");

if (!fs.existsSync(PHOTO_DIR)) fs.mkdirSync(PHOTO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PHOTO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"] as const;

// ── Serve photo file ─────────────────────────────────────────────────────────
// Accepts token from Authorization header OR ?token= query param (needed for <img src>)

const JWT_SECRET = process.env.JWT_SECRET || "edubee-camp-secret-key-change-in-production";

function authenticateFlexible(req: any, res: any, next: any) {
  let token: string | undefined;
  const authHeader = req.headers.authorization as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (typeof req.query.token === "string") {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

router.get("/camp-photos/file/:filename", authenticateFlexible, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(PHOTO_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
  return res.sendFile(path.resolve(filePath));
});

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
    const photos = await db
      .select({ objectPath: campPhotos.objectPath })
      .from(campPhotos)
      .where(eq(campPhotos.folderId, req.params.id));

    await db.delete(campPhotoFolders).where(eq(campPhotoFolders.id, req.params.id));

    for (const p of photos) {
      try {
        const filePath = path.join(PHOTO_DIR, path.basename(p.objectPath));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch { /* ignore individual delete errors */ }
    }

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
      if (!folderId || !packageGroupId) {
        return res.status(400).json({ error: "folderId and packageGroupId required" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No files provided" });

      const inserted = [];
      for (const file of files) {
        const [photo] = await db
          .insert(campPhotos)
          .values({
            folderId,
            packageGroupId,
            objectPath: file.filename,
            fileName: file.originalname,
            fileSize: file.size,
            uploadedBy: req.user!.id,
          })
          .returning();
        inserted.push(photo);
      }

      return res.status(201).json(inserted);
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

    try {
      const filePath = path.join(PHOTO_DIR, path.basename(photo.objectPath));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* ignore */ }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /camp-photos/:id]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
