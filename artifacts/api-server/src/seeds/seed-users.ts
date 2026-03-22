import { db, users } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedUsersIfEmpty(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM users`);
    const rows = result.rows as { cnt: number }[];
    const count = rows[0]?.cnt ?? 0;

    if (count > 0) {
      console.log(`[SeedUsers] ${count} users already exist — skipping seed`);
      return;
    }

    console.log("[SeedUsers] No users found — seeding demo accounts...");
    const hash = await bcrypt.hash("Admin123!", 12);

    await db.insert(users).values([
      { email: "superadmin@edubee.com",  passwordHash: hash, role: "super_admin",      fullName: "Super Admin",           status: "active" },
      { email: "admin@edubee.com",       passwordHash: hash, role: "admin",            fullName: "Admin User",            status: "active" },
      { email: "ops@edubee.com",         passwordHash: hash, role: "admin",            fullName: "Operations Admin",      status: "active" },
      { email: "coordinator@edubee.com", passwordHash: hash, role: "camp_coordinator", fullName: "Camp Coordinator",      status: "active", companyName: "Dream Camp Co.", countryOfOps: "AU", platformCommRate: "10.00" },
      { email: "coord1@edubee.com",      passwordHash: hash, role: "camp_coordinator", fullName: "Camp Coordinator 2",   status: "active" },
      { email: "agent@edubee.com",       passwordHash: hash, role: "education_agent",  fullName: "Education Agent Kim",   status: "active", phone: "+82-10-1234-5678", preferredLang: "ko" },
      { email: "parent@example.com",     passwordHash: hash, role: "parent_client",    fullName: "Parent Client",         status: "active", preferredLang: "ko" },
      { email: "parent1@gmail.com",      passwordHash: hash, role: "parent_client",    fullName: "Parent Client 2",       status: "active" },
      { email: "institute@example.com",  passwordHash: hash, role: "partner_institute",fullName: "Sydney Language School",status: "active", companyName: "SLS Academy", countryOfOps: "AU" },
      { email: "hotel@example.com",      passwordHash: hash, role: "partner_hotel",    fullName: "Homestay Network AU",   status: "active", companyName: "AusHome Network", countryOfOps: "AU" },
      { email: "driver@pickup.com",      passwordHash: hash, role: "partner_pickup",   fullName: "Pickup Driver",         status: "active" },
      { email: "guide@tours.com",        passwordHash: hash, role: "partner_tour",     fullName: "Tour Guide",            status: "active" },
    ]).onConflictDoNothing();

    console.log("[SeedUsers] 12 demo users seeded — password: Admin123!");
  } catch (err) {
    console.error("[SeedUsers] Error during user seed:", err);
  }
}
