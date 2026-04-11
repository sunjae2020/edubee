import { db, users } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

  } catch (err) {
    console.error("[SeedUsers] Error during seed:", err);
  }
}
