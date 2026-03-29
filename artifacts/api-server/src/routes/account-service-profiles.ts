import { Router } from "express";
import { db } from "@workspace/db";
import {
  accountServiceCategories,
  accountHomestayProfiles,
  accountPickupProfiles,
  accountCompanyProfiles,
  accountSchoolProfiles,
  accountTourProfiles,
  accountHotelProfiles,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"] as const;

// ============================================================
// ■ SERVICE CATEGORIES (멀티 체크박스)
// ============================================================

router.get(
  "/accounts/:id/service-categories",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const categories = await db
        .select()
        .from(accountServiceCategories)
        .where(eq(accountServiceCategories.accountId, id));
      res.json({ success: true, data: categories });
    } catch (err) {
      console.error("[GET /api/accounts/:id/service-categories]", err);
      res.status(500).json({ success: false, message: "Failed to fetch service categories" });
    }
  }
);

router.post(
  "/accounts/:id/service-categories",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { serviceType, notes } = req.body;
      if (!serviceType) {
        return res.status(400).json({ success: false, message: "serviceType is required" });
      }
      const [created] = await db
        .insert(accountServiceCategories)
        .values({ accountId: id, serviceType, notes })
        .onConflictDoNothing()
        .returning();
      res.status(201).json({ success: true, data: created ?? null });
    } catch (err) {
      console.error("[POST /api/accounts/:id/service-categories]", err);
      res.status(500).json({ success: false, message: "Failed to add service category" });
    }
  }
);

router.delete(
  "/accounts/:id/service-categories/:serviceType",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id, serviceType } = req.params;
      await db
        .delete(accountServiceCategories)
        .where(
          and(
            eq(accountServiceCategories.accountId, id),
            eq(accountServiceCategories.serviceType, serviceType)
          )
        );
      res.json({ success: true, message: "Service category removed" });
    } catch (err) {
      console.error("[DELETE /api/accounts/:id/service-categories/:serviceType]", err);
      res.status(500).json({ success: false, message: "Failed to remove service category" });
    }
  }
);

// ============================================================
// ■ HOMESTAY PROFILES
// ============================================================

router.get(
  "/accounts/:id/profiles/homestay",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const profiles = await db
        .select()
        .from(accountHomestayProfiles)
        .where(
          and(
            eq(accountHomestayProfiles.accountId, id),
            eq(accountHomestayProfiles.isActive, true)
          )
        );
      res.json({ success: true, data: profiles });
    } catch (err) {
      console.error("[GET /api/accounts/:id/profiles/homestay]", err);
      res.status(500).json({ success: false, message: "Failed to fetch homestay profiles" });
    }
  }
);

router.post(
  "/accounts/:id/profiles/homestay",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [created] = await db
        .insert(accountHomestayProfiles)
        .values({ ...req.body, accountId: id })
        .returning();
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error("[POST /api/accounts/:id/profiles/homestay]", err);
      res.status(500).json({ success: false, message: "Failed to create homestay profile" });
    }
  }
);

router.put(
  "/accounts/:id/profiles/homestay/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      const [updated] = await db
        .update(accountHomestayProfiles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(accountHomestayProfiles.id, profileId))
        .returning();
      if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT /api/accounts/:id/profiles/homestay/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to update homestay profile" });
    }
  }
);

router.delete(
  "/accounts/:id/profiles/homestay/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      await db
        .update(accountHomestayProfiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(accountHomestayProfiles.id, profileId));
      res.json({ success: true, message: "Homestay profile deactivated" });
    } catch (err) {
      console.error("[DELETE /api/accounts/:id/profiles/homestay/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to deactivate homestay profile" });
    }
  }
);

// ============================================================
// ■ PICKUP PROFILES
// ============================================================

router.get(
  "/accounts/:id/profiles/pickup",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const profiles = await db
        .select()
        .from(accountPickupProfiles)
        .where(
          and(
            eq(accountPickupProfiles.accountId, id),
            eq(accountPickupProfiles.isActive, true)
          )
        );
      res.json({ success: true, data: profiles });
    } catch (err) {
      console.error("[GET /api/accounts/:id/profiles/pickup]", err);
      res.status(500).json({ success: false, message: "Failed to fetch pickup profiles" });
    }
  }
);

router.post(
  "/accounts/:id/profiles/pickup",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [created] = await db
        .insert(accountPickupProfiles)
        .values({ ...req.body, accountId: id })
        .returning();
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error("[POST /api/accounts/:id/profiles/pickup]", err);
      res.status(500).json({ success: false, message: "Failed to create pickup profile" });
    }
  }
);

router.put(
  "/accounts/:id/profiles/pickup/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      const [updated] = await db
        .update(accountPickupProfiles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(accountPickupProfiles.id, profileId))
        .returning();
      if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT /api/accounts/:id/profiles/pickup/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to update pickup profile" });
    }
  }
);

router.delete(
  "/accounts/:id/profiles/pickup/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      await db
        .update(accountPickupProfiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(accountPickupProfiles.id, profileId));
      res.json({ success: true, message: "Pickup profile deactivated" });
    } catch (err) {
      console.error("[DELETE /api/accounts/:id/profiles/pickup/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to deactivate pickup profile" });
    }
  }
);

// ============================================================
// ■ COMPANY PROFILES (인턴십 호스트 컴퍼니 — 1:1)
// ============================================================

router.get(
  "/accounts/:id/profiles/company",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [profile] = await db
        .select()
        .from(accountCompanyProfiles)
        .where(eq(accountCompanyProfiles.accountId, id));
      res.json({ success: true, data: profile ?? null });
    } catch (err) {
      console.error("[GET /api/accounts/:id/profiles/company]", err);
      res.status(500).json({ success: false, message: "Failed to fetch company profile" });
    }
  }
);

router.post(
  "/accounts/:id/profiles/company",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [created] = await db
        .insert(accountCompanyProfiles)
        .values({ ...req.body, accountId: id })
        .onConflictDoNothing()
        .returning();
      res.status(201).json({ success: true, data: created ?? null });
    } catch (err) {
      console.error("[POST /api/accounts/:id/profiles/company]", err);
      res.status(500).json({ success: false, message: "Failed to create company profile" });
    }
  }
);

router.put(
  "/accounts/:id/profiles/company/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      const [updated] = await db
        .update(accountCompanyProfiles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(accountCompanyProfiles.id, profileId))
        .returning();
      if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT /api/accounts/:id/profiles/company/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to update company profile" });
    }
  }
);

// ============================================================
// ■ SCHOOL PROFILES (1:1)
// ============================================================

router.get(
  "/accounts/:id/profiles/school",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [profile] = await db
        .select()
        .from(accountSchoolProfiles)
        .where(eq(accountSchoolProfiles.accountId, id));
      res.json({ success: true, data: profile ?? null });
    } catch (err) {
      console.error("[GET /api/accounts/:id/profiles/school]", err);
      res.status(500).json({ success: false, message: "Failed to fetch school profile" });
    }
  }
);

router.post(
  "/accounts/:id/profiles/school",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [created] = await db
        .insert(accountSchoolProfiles)
        .values({ ...req.body, accountId: id })
        .onConflictDoNothing()
        .returning();
      res.status(201).json({ success: true, data: created ?? null });
    } catch (err) {
      console.error("[POST /api/accounts/:id/profiles/school]", err);
      res.status(500).json({ success: false, message: "Failed to create school profile" });
    }
  }
);

router.put(
  "/accounts/:id/profiles/school/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      const [updated] = await db
        .update(accountSchoolProfiles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(accountSchoolProfiles.id, profileId))
        .returning();
      if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT /api/accounts/:id/profiles/school/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to update school profile" });
    }
  }
);

// ============================================================
// ■ TOUR PROFILES
// ============================================================

router.get(
  "/accounts/:id/profiles/tour",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const profiles = await db
        .select()
        .from(accountTourProfiles)
        .where(
          and(
            eq(accountTourProfiles.accountId, id),
            eq(accountTourProfiles.isActive, true)
          )
        );
      res.json({ success: true, data: profiles });
    } catch (err) {
      console.error("[GET /api/accounts/:id/profiles/tour]", err);
      res.status(500).json({ success: false, message: "Failed to fetch tour profiles" });
    }
  }
);

router.post(
  "/accounts/:id/profiles/tour",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const [created] = await db
        .insert(accountTourProfiles)
        .values({ ...req.body, accountId: id })
        .returning();
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error("[POST /api/accounts/:id/profiles/tour]", err);
      res.status(500).json({ success: false, message: "Failed to create tour profile" });
    }
  }
);

router.put(
  "/accounts/:id/profiles/tour/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      const [updated] = await db
        .update(accountTourProfiles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(accountTourProfiles.id, profileId))
        .returning();
      if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT /api/accounts/:id/profiles/tour/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to update tour profile" });
    }
  }
);

router.delete(
  "/accounts/:id/profiles/tour/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { profileId } = req.params;
      await db
        .update(accountTourProfiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(accountTourProfiles.id, profileId));
      res.json({ success: true, message: "Tour profile deactivated" });
    } catch (err) {
      console.error("[DELETE /api/accounts/:id/profiles/tour/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to deactivate tour profile" });
    }
  }
);

// ============================================================
// ■ SERVICE PROFILE SUMMARY — Pre-fill 통합 소스
// ============================================================

// ============================================================
// ■ HOTEL PROFILES
// ============================================================

router.get(
  "/accounts/:id/profiles/hotel",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await db
        .select()
        .from(accountHotelProfiles)
        .where(eq(accountHotelProfiles.accountId, id));
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("[GET /api/accounts/:id/profiles/hotel]", err);
      res.status(500).json({ success: false, message: "Failed to fetch hotel profiles" });
    }
  }
);

router.post(
  "/accounts/:id/profiles/hotel",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amenities, ...rest } = req.body;
      const [created] = await db
        .insert(accountHotelProfiles)
        .values({
          accountId: id,
          ...rest,
          ...(amenities !== undefined ? { amenities } : {}),
        })
        .returning();
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error("[POST /api/accounts/:id/profiles/hotel]", err);
      res.status(500).json({ success: false, message: "Failed to create hotel profile" });
    }
  }
);

router.put(
  "/accounts/:id/profiles/hotel/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id, profileId } = req.params;
      const { amenities, ...rest } = req.body;
      const [updated] = await db
        .update(accountHotelProfiles)
        .set({
          ...rest,
          ...(amenities !== undefined ? { amenities } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accountHotelProfiles.id, profileId),
            eq(accountHotelProfiles.accountId, id)
          )
        )
        .returning();
      if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("[PUT /api/accounts/:id/profiles/hotel/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to update hotel profile" });
    }
  }
);

router.delete(
  "/accounts/:id/profiles/hotel/:profileId",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id, profileId } = req.params;
      await db
        .update(accountHotelProfiles)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(accountHotelProfiles.id, profileId),
            eq(accountHotelProfiles.accountId, id)
          )
        );
      res.json({ success: true });
    } catch (err) {
      console.error("[DELETE /api/accounts/:id/profiles/hotel/:profileId]", err);
      res.status(500).json({ success: false, message: "Failed to deactivate hotel profile" });
    }
  }
);

router.get(
  "/accounts/:id/service-profile-summary",
  authenticate,
  requireRole(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { id } = req.params;

      const [
        serviceCategories,
        homestayProfiles,
        pickupProfiles,
        companyProfileRows,
        schoolProfileRows,
        tourProfiles,
        hotelProfiles,
      ] = await Promise.all([
        db.select().from(accountServiceCategories)
          .where(eq(accountServiceCategories.accountId, id)),

        db.select().from(accountHomestayProfiles)
          .where(
            and(
              eq(accountHomestayProfiles.accountId, id),
              eq(accountHomestayProfiles.isActive, true)
            )
          ),

        db.select().from(accountPickupProfiles)
          .where(
            and(
              eq(accountPickupProfiles.accountId, id),
              eq(accountPickupProfiles.isActive, true)
            )
          ),

        db.select().from(accountCompanyProfiles)
          .where(eq(accountCompanyProfiles.accountId, id)),

        db.select().from(accountSchoolProfiles)
          .where(eq(accountSchoolProfiles.accountId, id)),

        db.select().from(accountTourProfiles)
          .where(
            and(
              eq(accountTourProfiles.accountId, id),
              eq(accountTourProfiles.isActive, true)
            )
          ),

        db.select().from(accountHotelProfiles)
          .where(
            and(
              eq(accountHotelProfiles.accountId, id),
              eq(accountHotelProfiles.isActive, true)
            )
          ),
      ]);

      res.json({
        success: true,
        data: {
          serviceCategories,
          homestayProfiles,
          pickupProfiles,
          companyProfile: companyProfileRows[0] ?? null,
          schoolProfile: schoolProfileRows[0] ?? null,
          tourProfiles,
          hotelProfiles,
        },
      });
    } catch (err) {
      console.error("[GET /api/accounts/:id/service-profile-summary]", err);
      res.status(500).json({ success: false, message: "Failed to fetch service profile summary" });
    }
  }
);

export default router;
