import { db, users, packageGroups } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedUsersIfEmpty(): Promise<void> {
  try {
    // ── Users ─────────────────────────────────────────────────────────────
    const userResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM users`);
    const userCount = (userResult.rows as { cnt: number }[])[0]?.cnt ?? 0;

    if (userCount === 0) {
      console.log("[SeedUsers] No users found — seeding demo accounts...");
      const hash = await bcrypt.hash("Admin123!", 12);

      await db.insert(users).values([
        { email: "superadmin@edubee.com",  passwordHash: hash, role: "super_admin",       fullName: "Super Admin",           status: "active" },
        { email: "admin@edubee.com",       passwordHash: hash, role: "admin",             fullName: "Admin User",            status: "active" },
        { email: "ops@edubee.com",         passwordHash: hash, role: "admin",             fullName: "Operations Admin",      status: "active" },
        { email: "coordinator@edubee.com", passwordHash: hash, role: "camp_coordinator",  fullName: "Camp Coordinator",      status: "active", companyName: "Dream Camp Co.", countryOfOps: "AU", platformCommRate: "10.00" },
        { email: "coord1@edubee.com",      passwordHash: hash, role: "camp_coordinator",  fullName: "Camp Coordinator 2",    status: "active" },
        { email: "agent@edubee.com",       passwordHash: hash, role: "education_agent",   fullName: "Education Agent Kim",   status: "active", phone: "+82-10-1234-5678", preferredLang: "ko" },
        { email: "parent@example.com",     passwordHash: hash, role: "parent_client",     fullName: "Parent Client",         status: "active", preferredLang: "ko" },
        { email: "parent1@gmail.com",      passwordHash: hash, role: "parent_client",     fullName: "Parent Client 2",       status: "active" },
        { email: "institute@example.com",  passwordHash: hash, role: "partner_institute", fullName: "Sydney Language School", status: "active", companyName: "SLS Academy", countryOfOps: "AU" },
        { email: "hotel@example.com",      passwordHash: hash, role: "partner_hotel",     fullName: "Homestay Network AU",   status: "active", companyName: "AusHome Network", countryOfOps: "AU" },
        { email: "driver@pickup.com",      passwordHash: hash, role: "partner_pickup",    fullName: "Pickup Driver",         status: "active" },
        { email: "guide@tours.com",        passwordHash: hash, role: "partner_tour",      fullName: "Tour Guide",            status: "active" },
      ]).onConflictDoNothing();

      console.log("[SeedUsers] 12 demo users seeded — password: Admin123!");
    } else {
      console.log(`[SeedUsers] ${userCount} users already exist — skipping user seed`);
    }

    // ── Package Groups ────────────────────────────────────────────────────
    const pgResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM package_groups`);
    const pgCount = (pgResult.rows as { cnt: number }[])[0]?.cnt ?? 0;

    if (pgCount === 0) {
      console.log("[SeedUsers] No package groups found — seeding demo programs...");

      const [coordinator] = await db.select({ id: users.id }).from(users).where(eq(users.email, "coordinator@edubee.com")).limit(1);
      const coordId = coordinator?.id ?? null;

      await db.insert(packageGroups).values([
        {
          campProviderId: coordId,
          nameEn: "Sydney Summer English Camp 2025",
          nameKo: "시드니 여름 영어 캠프 2025",
          descriptionEn: "An immersive English language program in Sydney. Students live with host families, attend local language schools, and explore iconic Australian landmarks.",
          descriptionKo: "시드니의 몰입형 영어 프로그램. 학생들은 호스트 패밀리와 생활하며 지역 학교에 다닙니다.",
          location: "Sydney, Australia",
          countryCode: "AU",
          status: "active",
          sortOrder: 1,
          landingOrder: 1,
          minAge: 12,
          maxAge: 18,
        },
        {
          campProviderId: coordId,
          nameEn: "Tokyo Language & Culture Camp",
          nameKo: "도쿄 언어 & 문화 캠프",
          descriptionEn: "Experience Japanese language and culture in Tokyo. Language classes, cultural activities, and guided tours of historic sites.",
          descriptionKo: "도쿄에서 일본어와 문화를 체험합니다. 언어 수업, 문화 활동, 역사 투어.",
          location: "Tokyo, Japan",
          countryCode: "JP",
          status: "active",
          sortOrder: 2,
          landingOrder: 2,
          minAge: 14,
          maxAge: 22,
        },
        {
          campProviderId: coordId,
          nameEn: "London Academic English Program",
          nameKo: "런던 학문 영어 프로그램",
          descriptionEn: "Intensive academic English in London. University campus stays, IELTS preparation, and cultural excursions across the UK.",
          descriptionKo: "런던의 집중 학문 영어 프로그램. 대학 캠퍼스 생활, IELTS 준비, 영국 문화 탐방.",
          location: "London, United Kingdom",
          countryCode: "GB",
          status: "active",
          sortOrder: 3,
          landingOrder: 3,
          minAge: 16,
          maxAge: 25,
        },
      ]).onConflictDoNothing();

      console.log("[SeedUsers] 3 demo package groups seeded");
    } else {
      console.log(`[SeedUsers] ${pgCount} package groups already exist — skipping program seed`);
    }
  } catch (err) {
    console.error("[SeedUsers] Error during seed:", err);
  }
}
