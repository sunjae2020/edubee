import { db, users, packageGroups } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Package templates per country code — used for new groups
const PKG_TEMPLATES: Record<string, { name: string; duration: number; priceAud: string; priceKrw: string; priceJpy: string; priceThb: string; priceSgd: string; priceGbp: string }[]> = {
  TH: [
    { name: "2-Week Intensive",    duration: 14, priceAud: "3200.00", priceKrw: "2976000", priceJpy: "480000", priceThb: "117000.00", priceSgd: "4350.00", priceGbp: "2080.00" },
    { name: "4-Week Full Immersion", duration: 28, priceAud: "5800.00", priceKrw: "5394000", priceJpy: "870000", priceThb: "212000.00", priceSgd: "7890.00", priceGbp: "3770.00" },
  ],
  JP: [
    { name: "2-Week Cultural",     duration: 14, priceAud: "4200.00", priceKrw: "3906000", priceJpy: "380000", priceThb: "154000.00", priceSgd: "5710.00", priceGbp: "2730.00" },
    { name: "4-Week Intensive",    duration: 28, priceAud: "7500.00", priceKrw: "6975000", priceJpy: "570000", priceThb: "275000.00", priceSgd: "10200.00", priceGbp: "4875.00" },
    { name: "6-Week Language Pro", duration: 42, priceAud: "10200.00", priceKrw: "9486000", priceJpy: "780000", priceThb: "374000.00", priceSgd: "13870.00", priceGbp: "6630.00" },
  ],
  GB: [
    { name: "2-Week Academic",            duration: 14, priceAud: "4900.00", priceKrw: "4557000", priceJpy: "499000", priceThb: "179750.00", priceSgd: "6666.00", priceGbp: "3200.00" },
    { name: "4-Week IELTS Prep",          duration: 28, priceAud: "8800.00", priceKrw: "8184000", priceJpy: "897000", priceThb: "322800.00", priceSgd: "11970.00", priceGbp: "5720.00" },
    { name: "6-Week University Pathway",  duration: 42, priceAud: "12500.00", priceKrw: "11625000", priceJpy: "1274000", priceThb: "458750.00", priceSgd: "17000.00", priceGbp: "8125.00" },
    { name: "8-Week Full Semester",       duration: 56, priceAud: "15800.00", priceKrw: "14694000", priceJpy: "1610000", priceThb: "579650.00", priceSgd: "21490.00", priceGbp: "10270.00" },
  ],
  AU: [
    { name: "2-Week English Intensive", duration: 14, priceAud: "2850.00", priceKrw: "2650500", priceJpy: "290000", priceThb: "104475.00", priceSgd: "3877.00", priceGbp: "1852.00" },
    { name: "4-Week Language & Culture",duration: 28, priceAud: "5100.00", priceKrw: "4743000", priceJpy: "520000", priceThb: "187170.00", priceSgd: "6936.00", priceGbp: "3315.00" },
    { name: "6-Week Full Program",      duration: 42, priceAud: "7200.00", priceKrw: "6696000", priceJpy: "734000", priceThb: "264240.00", priceSgd: "9792.00", priceGbp: "4680.00" },
  ],
  IE: [
    { name: "2-Week Homestay",          duration: 14, priceAud: "3500.00", priceKrw: "3255000", priceJpy: "357000", priceThb: "128450.00", priceSgd: "4760.00", priceGbp: "2275.00" },
  ],
  SG: [
    { name: "2-Week Business English",  duration: 14, priceAud: "4700.00", priceKrw: "4371000", priceJpy: "479000", priceThb: "172450.00", priceSgd: "6100.00", priceGbp: "3055.00" },
  ],
};

export async function seedUsersIfEmpty(): Promise<void> {
  try {
    // ── Users ─────────────────────────────────────────────────────────────
    const userResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM users`);
    const userCount = (userResult.rows as { cnt: number }[])[0]?.cnt ?? 0;

    const DEMO_EMAILS = [
      "superadmin@edubee.co",
      "admin@edubee.co",
      "ops@edubee.co",
      "coordinator@edubee.co",
      "coord1@edubee.co",
      "agent@edubee.co",
      "parent@example.com",
      "parent1@gmail.com",
      "institute@example.com",
      "hotel@example.com",
      "driver@pickup.com",
      "guide@tours.com",
    ];

    const hash = await bcrypt.hash("Admin123!", 12);

    if (userCount === 0) {
      console.log("[SeedUsers] No users found — seeding demo accounts...");

      await db.insert(users).values([
        { email: "superadmin@edubee.co",  passwordHash: hash, role: "super_admin",       fullName: "Super Admin",           status: "active" },
        { email: "admin@edubee.co",       passwordHash: hash, role: "admin",             fullName: "Admin User",            status: "active" },
        { email: "ops@edubee.co",         passwordHash: hash, role: "admin",             fullName: "Operations Admin",      status: "active" },
        { email: "coordinator@edubee.co", passwordHash: hash, role: "camp_coordinator",  fullName: "Camp Coordinator",      status: "active", companyName: "Dream Camp Co.", countryOfOps: "AU", platformCommRate: "10.00" },
        { email: "coord1@edubee.co",      passwordHash: hash, role: "camp_coordinator",  fullName: "Camp Coordinator 2",    status: "active" },
        { email: "agent@edubee.co",       passwordHash: hash, role: "consultant",        fullName: "Education Agent Kim",   status: "active", phone: "+82-10-1234-5678", preferredLang: "ko" },
        { email: "parent@example.com",    passwordHash: hash, role: "consultant",        fullName: "Parent Client",         status: "active", preferredLang: "ko" },
        { email: "parent1@gmail.com",     passwordHash: hash, role: "consultant",        fullName: "Parent Client 2",       status: "active" },
        { email: "institute@example.com", passwordHash: hash, role: "consultant",        fullName: "Sydney Language School", status: "active", companyName: "SLS Academy", countryOfOps: "AU" },
        { email: "hotel@example.com",     passwordHash: hash, role: "consultant",        fullName: "Homestay Network AU",   status: "active", companyName: "AusHome Network", countryOfOps: "AU" },
        { email: "driver@pickup.com",     passwordHash: hash, role: "consultant",        fullName: "Pickup Driver",         status: "active" },
        { email: "guide@tours.com",       passwordHash: hash, role: "consultant",        fullName: "Tour Guide",            status: "active" },
      ]).onConflictDoNothing();

      console.log("[SeedUsers] 12 demo users seeded — password: Admin123!");
    } else {
      // 데모 계정의 비밀번호를 항상 Admin123!으로 재설정 (seed SQL 덮어쓰기 방지)
      await db.execute(sql`
        UPDATE users
        SET password_hash = ${hash},
            failed_login_attempts = 0,
            locked_until = NULL,
            status = 'active'
        WHERE email = ANY(ARRAY[${sql.raw(DEMO_EMAILS.map(e => `'${e}'`).join(","))}])
      `);
      console.log(`[SeedUsers] ${userCount} users already exist — demo passwords reset to Admin123!`);
    }

    // ── Package Groups ────────────────────────────────────────────────────
    const pgResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM package_groups`);
    const pgCount = (pgResult.rows as { cnt: number }[])[0]?.cnt ?? 0;

    const [coordinator] = await db.select({ id: users.id }).from(users).where(eq(users.email, "coordinator@edubee.co")).limit(1);
    const coordId = coordinator?.id ?? null;

    if (pgCount === 0) {
      console.log("[SeedUsers] No package groups found — seeding demo programs...");

      await db.execute(sql`
        INSERT INTO package_groups (camp_provider_id, name_en, name_ko, description_en, description_ko, location, country_code, status, sort_order, landing_order, min_age, max_age)
        VALUES
          (${coordId}, 'Bangkok English Immersion 2025', '방콕 영어 몰입 캠프 2025',
           'Full English immersion program in Bangkok with cultural activities and language classes.',
           '방콕에서의 완전 영어 몰입 프로그램. 문화 활동과 언어 수업 포함.',
           'Bangkok, Thailand', 'TH', 'active', 1, 1, 10, 18),
          (${coordId}, 'Tokyo Language & Culture Camp', '도쿄 언어 & 문화 캠프',
           'Experience Japanese language and culture in Tokyo. Language classes, cultural activities, and guided tours of historic sites.',
           '도쿄에서 일본어와 문화를 체험합니다. 언어 수업, 문화 활동, 역사 투어.',
           'Tokyo, Japan', 'JP', 'active', 2, 2, 14, 22),
          (${coordId}, 'London Academic Program', '런던 학문 영어 프로그램',
           'Study at London''s finest language school. Language learning with cultural experiences in the UK capital.',
           '런던 최고의 언어 학교에서 공부합니다. 영국 수도의 문화 체험과 함께하는 언어 학습.',
           'London, UK', 'GB', 'active', 3, 3, 14, 25),
          (${coordId}, 'Melbourne Arts & Language', '멜버른 아트 & 언어 캠프',
           'Combine arts education with English language learning in Melbourne. Creative workshops and language immersion.',
           '멜버른에서 예술 교육과 영어 학습을 결합합니다. 창의적 워크숍과 언어 몰입.',
           'Melbourne, Australia', 'AU', 'active', 4, 4, 12, 20),
          (${coordId}, 'Dublin English Academy', '더블린 영어 아카데미',
           'Learn English in Ireland with homestay accommodation and cultural trips across the Emerald Isle.',
           '아일랜드에서 홈스테이와 문화 여행과 함께 영어를 배웁니다.',
           'Dublin, Ireland', 'IE', 'active', 5, 5, 14, 24),
          (${coordId}, 'Singapore Business English', '싱가포르 비즈니스 영어',
           'Intensive business English program for high school students in Singapore. Finance, tech, and communication skills.',
           '싱가포르 고등학생을 위한 집중 비즈니스 영어 프로그램. 금융, 기술, 커뮤니케이션 스킬.',
           'Singapore', 'SG', 'active', 6, 6, 15, 22)
        ON CONFLICT DO NOTHING
      `);

      console.log("[SeedUsers] 6 demo package groups seeded");
    } else {
      console.log(`[SeedUsers] ${pgCount} package groups already exist — skipping program seed`);
    }

    // ── Packages — seed if none exist; match groups by country_code ────────
    const pkgResult = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM packages`);
    const pkgCount = (pkgResult.rows as { cnt: number }[])[0]?.cnt ?? 0;

    if (pkgCount === 0) {
      console.log("[SeedUsers] No packages found — seeding demo packages...");

      const activeGroups = await db.execute(sql`
        SELECT id, name_en, country_code, landing_order
        FROM package_groups
        WHERE status = 'active' AND landing_order IS NOT NULL
        ORDER BY landing_order
      `);
      const groups = activeGroups.rows as { id: string; name_en: string; country_code: string; landing_order: number }[];

      let totalPkgs = 0;
      for (const group of groups) {
        const templates = PKG_TEMPLATES[group.country_code];
        if (!templates || templates.length === 0) continue;

        for (const t of templates) {
          await db.execute(sql`
            INSERT INTO packages (package_group_id, name, duration_days, price_aud, price_krw, price_jpy, price_thb, price_sgd, price_gbp, status)
            VALUES (${group.id}, ${t.name}, ${t.duration}, ${t.priceAud}, ${t.priceKrw}, ${t.priceJpy}, ${t.priceThb}, ${t.priceSgd}, ${t.priceGbp}, 'active')
            ON CONFLICT DO NOTHING
          `);
          totalPkgs++;
        }
      }
      console.log(`[SeedUsers] ${totalPkgs} demo packages seeded`);
    } else {
      console.log(`[SeedUsers] ${pkgCount} packages already exist — skipping package seed`);
    }

  } catch (err) {
    console.error("[SeedUsers] Error during seed:", err);
  }
}
