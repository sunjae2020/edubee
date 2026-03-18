import { db } from "@workspace/db";
import { users, packageGroups, packages, products, leads, applications, notifications } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  // Create users
  await db.insert(users).values([
    { email: "superadmin@edubee.com", passwordHash, role: "super_admin", fullName: "Super Admin", status: "active" },
    { email: "admin@edubee.com", passwordHash, role: "admin", fullName: "Admin User", status: "active" },
    { email: "coordinator@edubee.com", passwordHash, role: "camp_coordinator", fullName: "Camp Coordinator", companyName: "Dream Camp Co.", countryOfOps: "AU", platformCommRate: "10.00", status: "active" },
    { email: "agent@edubee.com", passwordHash, role: "education_agent", fullName: "Education Agent Kim", phone: "+82-10-1234-5678", preferredLang: "ko", status: "active" },
    { email: "parent@example.com", passwordHash, role: "parent_client", fullName: "Parent Client", preferredLang: "ko", status: "active" },
    { email: "institute@example.com", passwordHash, role: "partner_institute", fullName: "Sydney Language School", companyName: "SLS Academy", countryOfOps: "AU", status: "active" },
    { email: "hotel@example.com", passwordHash, role: "partner_hotel", fullName: "Homestay Network AU", companyName: "AusHome Network", countryOfOps: "AU", status: "active" },
  ]).onConflictDoNothing();

  const allUsers = await db.select().from(users);
  const adminUser = allUsers.find(u => u.email === "admin@edubee.com")!;
  const coordinatorUser = allUsers.find(u => u.email === "coordinator@edubee.com")!;
  const agentUser = allUsers.find(u => u.email === "agent@edubee.com")!;
  const parentUser = allUsers.find(u => u.email === "parent@example.com")!;

  // Create package groups
  await db.insert(packageGroups).values([
    {
      campProviderId: coordinatorUser.id,
      nameEn: "Sydney Summer English Camp 2025",
      nameKo: "시드니 여름 영어 캠프 2025",
      nameJa: "シドニー夏の英語キャンプ 2025",
      nameTh: "ค่ายภาษาอังกฤษซิดนีย์ฤดูร้อน 2025",
      descriptionEn: "An immersive English language program in Sydney. Students live with host families, attend local schools, and explore iconic Australian landmarks.",
      descriptionKo: "시드니의 몰입형 영어 프로그램. 학생들은 호스트 패밀리와 생활하며 지역 학교에 다닙니다.",
      location: "Sydney, Australia",
      countryCode: "AU",
      status: "active",
      sortOrder: 1,
    },
    {
      campProviderId: coordinatorUser.id,
      nameEn: "Tokyo Language & Culture Camp",
      nameKo: "도쿄 언어 & 문화 캠프",
      nameJa: "東京語学・文化キャンプ",
      descriptionEn: "Experience Japanese language and culture in Tokyo. Language classes, cultural activities, and guided tours.",
      location: "Tokyo, Japan",
      countryCode: "JP",
      status: "active",
      sortOrder: 2,
    },
    {
      nameEn: "London Academic Program",
      nameKo: "런던 아카데믹 프로그램",
      descriptionEn: "Study at London's finest language school. Language learning with cultural experiences in the UK capital.",
      location: "London, UK",
      countryCode: "GB",
      status: "active",
      sortOrder: 3,
    },
    {
      nameEn: "Singapore STEM Camp",
      nameKo: "싱가포르 STEM 캠프",
      descriptionEn: "Cutting-edge STEM education in Singapore. Robotics, coding, and science with top university partners.",
      location: "Singapore",
      countryCode: "SG",
      status: "draft",
      sortOrder: 4,
    },
  ]).onConflictDoNothing();

  const allGroups = await db.select().from(packageGroups);
  const sydneyGroup = allGroups.find(g => g.countryCode === "AU");
  const tokyoGroup = allGroups.find(g => g.countryCode === "JP");
  const londonGroup = allGroups.find(g => g.countryCode === "GB");

  if (sydneyGroup) {
    await db.insert(packages).values([
      {
        packageGroupId: sydneyGroup.id,
        name: "2-Week Basic",
        durationDays: 14,
        maxParticipants: 20,
        priceAud: "2850.00",
        priceKrw: "2530000",
        priceUsd: "1890.00",
        features: { included: ["Host family accommodation", "20 English lessons/week", "Airport pickup", "City tour", "Weekly excursion"] },
        status: "active",
      },
      {
        packageGroupId: sydneyGroup.id,
        name: "4-Week Standard",
        durationDays: 28,
        maxParticipants: 15,
        priceAud: "5200.00",
        priceKrw: "4620000",
        priceUsd: "3450.00",
        features: { included: ["Host family accommodation", "25 English lessons/week", "Airport pickup", "3 Day trips", "Certificate", "Travel insurance"] },
        status: "active",
      },
    ]).onConflictDoNothing();
  }

  if (tokyoGroup) {
    await db.insert(packages).values([
      {
        packageGroupId: tokyoGroup.id,
        name: "2-Week Cultural",
        durationDays: 14,
        maxParticipants: 15,
        priceJpy: "380000",
        priceKrw: "3650000",
        features: { included: ["Dormitory accommodation", "Japanese lessons daily", "Cultural workshops", "Tokyo tour", "Kimono experience"] },
        status: "active",
      },
    ]).onConflictDoNothing();
  }

  if (londonGroup) {
    await db.insert(packages).values([
      {
        packageGroupId: londonGroup.id,
        name: "3-Week Academic",
        durationDays: 21,
        maxParticipants: 12,
        priceGbp: "3200.00",
        priceKrw: "5420000",
        features: { included: ["Homestay accommodation", "30 lessons/week", "Cambridge certificate", "Theatre visit", "Weekend trips"] },
        status: "active",
      },
    ]).onConflictDoNothing();
  }

  // Create products
  await db.insert(products).values([
    { providerAccountId: adminUser.id, productName: "Host Family Accommodation - AU", productType: "hotel", cost: "800.00", currency: "AUD", status: "active" },
    { providerAccountId: adminUser.id, productName: "English Language School - Sydney", productType: "institute", cost: "1200.00", currency: "AUD", status: "active" },
    { providerAccountId: adminUser.id, productName: "Airport Pickup - Sydney", productType: "pickup", cost: "150.00", currency: "AUD", status: "active" },
    { providerAccountId: adminUser.id, productName: "Sydney City Tour", productType: "tour", cost: "200.00", currency: "AUD", status: "active" },
    { providerAccountId: coordinatorUser.id, productName: "Camp Coordination Fee", productType: "settlement", cost: "250.00", currency: "AUD", status: "active" },
    { providerAccountId: adminUser.id, productName: "Dormitory - Tokyo", productType: "hotel", cost: "180000", currency: "JPY", status: "active" },
    { providerAccountId: adminUser.id, productName: "Japanese Language Institute", productType: "institute", cost: "120000", currency: "JPY", status: "active" },
  ]).onConflictDoNothing();

  // Create leads
  if (sydneyGroup) {
    await db.insert(leads).values([
      { agentId: agentUser.id, fullName: "Kim Ji-won", email: "jiwon.kim@example.com", phone: "+82-10-9876-5432", nationality: "Korean", source: "Instagram", interestedIn: sydneyGroup.id, status: "contacted", notes: "Interested in 4-week program. Intermediate English." },
      { agentId: agentUser.id, fullName: "Park Soo-jin", email: "soojin.park@example.com", nationality: "Korean", source: "Referral", interestedIn: sydneyGroup.id, status: "qualified", notes: "Mother inquired for 2 children, grades 5 and 7." },
      { agentId: agentUser.id, fullName: "Lee Min-ho", email: "minho.lee@example.com", nationality: "Korean", source: "Website", status: "new" },
      { agentId: agentUser.id, fullName: "Tanaka Yuki", email: "tanaka.y@example.com", nationality: "Japanese", source: "Facebook", interestedIn: sydneyGroup.id, status: "converted" },
      { agentId: agentUser.id, fullName: "Somchai Wongsawat", nationality: "Thai", source: "LINE", status: "new" },
    ]).onConflictDoNothing();
  }

  // Create applications
  if (sydneyGroup && tokyoGroup) {
    await db.insert(applications).values([
      { applicationNumber: "APP-2501-1001", agentId: agentUser.id, clientId: parentUser.id, packageGroupId: sydneyGroup.id, preferredStartDate: "2025-07-01", status: "approved", totalChildren: 1, totalAdults: 0, primaryLanguage: "ko", termsAccepted: true, notes: "Eager to improve English. Nut allergy." },
      { applicationNumber: "APP-2501-1002", agentId: agentUser.id, packageGroupId: sydneyGroup.id, preferredStartDate: "2025-08-01", status: "pending", totalChildren: 2, totalAdults: 1, primaryLanguage: "ko", termsAccepted: false },
      { applicationNumber: "APP-2501-1003", agentId: agentUser.id, packageGroupId: tokyoGroup.id, preferredStartDate: "2025-07-15", status: "under_review", totalChildren: 1, totalAdults: 0, primaryLanguage: "ko", termsAccepted: true },
      { applicationNumber: "APP-2501-1004", agentId: agentUser.id, packageGroupId: sydneyGroup.id, preferredStartDate: "2025-09-01", status: "contracted", totalChildren: 1, totalAdults: 0, primaryLanguage: "ja", termsAccepted: true },
      { applicationNumber: "APP-2501-1005", agentId: agentUser.id, packageGroupId: sydneyGroup.id, preferredStartDate: "2025-10-01", status: "rejected", totalChildren: 1, totalAdults: 0, primaryLanguage: "th", termsAccepted: true, notes: "Age requirement not met." },
    ]).onConflictDoNothing();
  }

  // Notifications
  await db.insert(notifications).values([
    { userId: agentUser.id, type: "application_status", title: "Application Approved", message: "Application APP-2501-1001 has been approved. Please proceed with contract preparation.", referenceType: "application", isRead: false },
    { userId: agentUser.id, type: "new_message", title: "New message from coordinator", message: "Please confirm accommodation type for application APP-2501-1001.", isRead: true },
    { userId: agentUser.id, type: "reminder", title: "Document Reminder", message: "APP-2501-1002 is missing passport copies. Please upload before deadline.", isRead: false },
    { userId: adminUser.id, type: "new_application", title: "New Application Received", message: "New application APP-2501-1002 requires review.", isRead: false },
    { userId: adminUser.id, type: "payment", title: "Payment Received", message: "Deposit payment received for contract CON-2501-0042.", isRead: true },
  ]).onConflictDoNothing();

  console.log("✅ Seed completed successfully!");
  console.log("\n📧 Login credentials:");
  console.log("  Super Admin:        superadmin@edubee.com / password123");
  console.log("  Admin:              admin@edubee.com / password123");
  console.log("  Camp Coordinator:   coordinator@edubee.com / password123");
  console.log("  Education Agent:    agent@edubee.com / password123");
  console.log("  Parent Client:      parent@example.com / password123");
  console.log("  Partner Institute:  institute@example.com / password123");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
