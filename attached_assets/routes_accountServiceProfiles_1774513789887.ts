// ============================================================
// 🐝  Edubee CRM — Account Service Profiles API Routes
// ============================================================
// 위치  : /server/src/routes/accountServiceProfiles.ts
// 버전  : v1.1
// 작성일: 2026-03-26
//
// 엔드포인트 목록:
//   GET    /api/accounts/:id/service-categories
//   POST   /api/accounts/:id/service-categories
//   DELETE /api/accounts/:id/service-categories/:serviceType
//
//   GET    /api/accounts/:id/profiles/homestay
//   POST   /api/accounts/:id/profiles/homestay
//   PUT    /api/accounts/:id/profiles/homestay/:profileId
//   DELETE /api/accounts/:id/profiles/homestay/:profileId
//
//   GET    /api/accounts/:id/profiles/pickup
//   POST   /api/accounts/:id/profiles/pickup
//   PUT    /api/accounts/:id/profiles/pickup/:profileId
//   DELETE /api/accounts/:id/profiles/pickup/:profileId
//
//   GET    /api/accounts/:id/profiles/company
//   POST   /api/accounts/:id/profiles/company
//   PUT    /api/accounts/:id/profiles/company/:profileId
//
//   GET    /api/accounts/:id/profiles/school
//   POST   /api/accounts/:id/profiles/school
//   PUT    /api/accounts/:id/profiles/school/:profileId
//
//   GET    /api/accounts/:id/profiles/tour
//   POST   /api/accounts/:id/profiles/tour
//   PUT    /api/accounts/:id/profiles/tour/:profileId
//   DELETE /api/accounts/:id/profiles/tour/:profileId
//
//   GET    /api/accounts/:id/service-profile-summary  ← Pre-fill 통합 소스
// ============================================================

import { Router, Request, Response } from "express";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import {
  accountServiceCategories,
  accountHomestayProfiles,
  accountPickupProfiles,
  accountCompanyProfiles,
  accountSchoolProfiles,
  accountTourProfiles,
} from "../../db/schema";

const router = Router();

// ============================================================
// ■ SERVICE CATEGORIES (멀티 체크박스)
// ============================================================

/**
 * GET /api/accounts/:id/service-categories
 * Account의 모든 서비스 카테고리 조회
 */
router.get("/:id/service-categories", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const categories = await db
      .select()
      .from(accountServiceCategories)
      .where(eq(accountServiceCategories.accountId, id));

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("[GET service-categories]", error);
    res.status(500).json({ success: false, message: "Failed to fetch service categories" });
  }
});

/**
 * POST /api/accounts/:id/service-categories
 * 서비스 카테고리 추가
 * Body: { serviceType: string, notes?: string }
 */
router.post("/:id/service-categories", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceType, notes } = req.body;

    if (!serviceType) {
      return res.status(400).json({ success: false, message: "serviceType is required" });
    }

    const [created] = await db
      .insert(accountServiceCategories)
      .values({ accountId: id, serviceType, notes })
      .onConflictDoNothing()  // 중복 시 무시 (UNIQUE 제약)
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("[POST service-categories]", error);
    res.status(500).json({ success: false, message: "Failed to add service category" });
  }
});

/**
 * DELETE /api/accounts/:id/service-categories/:serviceType
 * 서비스 카테고리 삭제
 */
router.delete("/:id/service-categories/:serviceType", async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("[DELETE service-categories]", error);
    res.status(500).json({ success: false, message: "Failed to remove service category" });
  }
});

// ============================================================
// ■ HOMESTAY PROFILES
// ============================================================

/**
 * GET /api/accounts/:id/profiles/homestay
 * 홈스테이 프로필 목록 조회 (is_active=true 기본)
 */
router.get("/:id/profiles/homestay", async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("[GET homestay profiles]", error);
    res.status(500).json({ success: false, message: "Failed to fetch homestay profiles" });
  }
});

/**
 * POST /api/accounts/:id/profiles/homestay
 * 홈스테이 프로필 신규 추가
 */
router.post("/:id/profiles/homestay", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const [created] = await db
      .insert(accountHomestayProfiles)
      .values({ ...body, accountId: id })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("[POST homestay profiles]", error);
    res.status(500).json({ success: false, message: "Failed to create homestay profile" });
  }
});

/**
 * PUT /api/accounts/:id/profiles/homestay/:profileId
 * 홈스테이 프로필 수정
 */
router.put("/:id/profiles/homestay/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const body = req.body;

    const [updated] = await db
      .update(accountHomestayProfiles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(accountHomestayProfiles.id, profileId))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PUT homestay profiles]", error);
    res.status(500).json({ success: false, message: "Failed to update homestay profile" });
  }
});

/**
 * DELETE /api/accounts/:id/profiles/homestay/:profileId
 * 홈스테이 프로필 비활성화 (Soft Delete)
 */
router.delete("/:id/profiles/homestay/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;

    await db
      .update(accountHomestayProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(accountHomestayProfiles.id, profileId));

    res.json({ success: true, message: "Homestay profile deactivated" });
  } catch (error) {
    console.error("[DELETE homestay profiles]", error);
    res.status(500).json({ success: false, message: "Failed to deactivate homestay profile" });
  }
});

// ============================================================
// ■ PICKUP PROFILES
// ============================================================

router.get("/:id/profiles/pickup", async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("[GET pickup profiles]", error);
    res.status(500).json({ success: false, message: "Failed to fetch pickup profiles" });
  }
});

router.post("/:id/profiles/pickup", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [created] = await db
      .insert(accountPickupProfiles)
      .values({ ...req.body, accountId: id })
      .returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("[POST pickup profiles]", error);
    res.status(500).json({ success: false, message: "Failed to create pickup profile" });
  }
});

router.put("/:id/profiles/pickup/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const [updated] = await db
      .update(accountPickupProfiles)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountPickupProfiles.id, profileId))
      .returning();
    if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PUT pickup profiles]", error);
    res.status(500).json({ success: false, message: "Failed to update pickup profile" });
  }
});

router.delete("/:id/profiles/pickup/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    await db
      .update(accountPickupProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(accountPickupProfiles.id, profileId));
    res.json({ success: true, message: "Pickup profile deactivated" });
  } catch (error) {
    console.error("[DELETE pickup profiles]", error);
    res.status(500).json({ success: false, message: "Failed to deactivate pickup profile" });
  }
});

// ============================================================
// ■ COMPANY PROFILES (인턴십 호스트 컴퍼니)
// ============================================================

router.get("/:id/profiles/company", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [profile] = await db
      .select()
      .from(accountCompanyProfiles)
      .where(eq(accountCompanyProfiles.accountId, id));
    res.json({ success: true, data: profile ?? null });
  } catch (error) {
    console.error("[GET company profile]", error);
    res.status(500).json({ success: false, message: "Failed to fetch company profile" });
  }
});

router.post("/:id/profiles/company", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [created] = await db
      .insert(accountCompanyProfiles)
      .values({ ...req.body, accountId: id })
      .onConflictDoNothing()
      .returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("[POST company profile]", error);
    res.status(500).json({ success: false, message: "Failed to create company profile" });
  }
});

router.put("/:id/profiles/company/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const [updated] = await db
      .update(accountCompanyProfiles)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountCompanyProfiles.id, profileId))
      .returning();
    if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PUT company profile]", error);
    res.status(500).json({ success: false, message: "Failed to update company profile" });
  }
});

// ============================================================
// ■ SCHOOL PROFILES
// ============================================================

router.get("/:id/profiles/school", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [profile] = await db
      .select()
      .from(accountSchoolProfiles)
      .where(eq(accountSchoolProfiles.accountId, id));
    res.json({ success: true, data: profile ?? null });
  } catch (error) {
    console.error("[GET school profile]", error);
    res.status(500).json({ success: false, message: "Failed to fetch school profile" });
  }
});

router.post("/:id/profiles/school", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [created] = await db
      .insert(accountSchoolProfiles)
      .values({ ...req.body, accountId: id })
      .onConflictDoNothing()
      .returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("[POST school profile]", error);
    res.status(500).json({ success: false, message: "Failed to create school profile" });
  }
});

router.put("/:id/profiles/school/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const [updated] = await db
      .update(accountSchoolProfiles)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountSchoolProfiles.id, profileId))
      .returning();
    if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PUT school profile]", error);
    res.status(500).json({ success: false, message: "Failed to update school profile" });
  }
});

// ============================================================
// ■ TOUR PROFILES
// ============================================================

router.get("/:id/profiles/tour", async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("[GET tour profiles]", error);
    res.status(500).json({ success: false, message: "Failed to fetch tour profiles" });
  }
});

router.post("/:id/profiles/tour", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [created] = await db
      .insert(accountTourProfiles)
      .values({ ...req.body, accountId: id })
      .returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("[POST tour profiles]", error);
    res.status(500).json({ success: false, message: "Failed to create tour profile" });
  }
});

router.put("/:id/profiles/tour/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const [updated] = await db
      .update(accountTourProfiles)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountTourProfiles.id, profileId))
      .returning();
    if (!updated) return res.status(404).json({ success: false, message: "Profile not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PUT tour profiles]", error);
    res.status(500).json({ success: false, message: "Failed to update tour profile" });
  }
});

router.delete("/:id/profiles/tour/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    await db
      .update(accountTourProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(accountTourProfiles.id, profileId));
    res.json({ success: true, message: "Tour profile deactivated" });
  } catch (error) {
    console.error("[DELETE tour profiles]", error);
    res.status(500).json({ success: false, message: "Failed to deactivate tour profile" });
  }
});

// ============================================================
// ■ SERVICE PROFILE SUMMARY — Pre-fill 통합 소스
// ============================================================

/**
 * GET /api/accounts/:id/service-profile-summary
 * 계약 생성 시 Pre-fill을 위한 통합 프로필 조회
 * → _mgt 폼에서 Provider Account 선택 후 호출
 *
 * Response:
 * {
 *   serviceCategories: [...],
 *   homestayProfiles:  [...],
 *   pickupProfiles:    [...],
 *   companyProfile:    {...} | null,
 *   schoolProfile:     {...} | null,
 *   tourProfiles:      [...],
 * }
 */
router.get("/:id/service-profile-summary", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [
      serviceCategories,
      homestayProfiles,
      pickupProfiles,
      companyProfileRows,
      schoolProfileRows,
      tourProfiles,
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
      },
    });
  } catch (error) {
    console.error("[GET service-profile-summary]", error);
    res.status(500).json({ success: false, message: "Failed to fetch service profile summary" });
  }
});

export default router;

// ============================================================
// ■ 메인 라우터 등록 (server/src/index.ts 또는 app.ts에 추가)
// ============================================================
// import accountServiceProfilesRouter from "./routes/accountServiceProfiles";
// app.use("/api/accounts", accountServiceProfilesRouter);
