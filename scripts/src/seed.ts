import { db } from "@workspace/db";
import { users, packageGroups, packages, products, packageGroupProducts, leads, applications, notifications, contracts, invoices, transactions, receipts, accountLedgerEntries, settlementMgt, contractFinanceItems } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
        agentCommissionType: "percentage",
        agentCommissionRate: "10.00",
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
        agentCommissionType: "percentage",
        agentCommissionRate: "10.00",
      },
    ]).onConflictDoNothing();

    // Update commission settings on already-existing packages (idempotent)
    const sydneyPkgs = await db.select().from(packages).where(eq(packages.packageGroupId, sydneyGroup.id));
    for (const pkg of sydneyPkgs) {
      if (!pkg.agentCommissionType) {
        await db.update(packages).set({
          agentCommissionType: "percentage",
          agentCommissionRate: "10.00",
          updatedAt: new Date(),
        }).where(eq(packages.id, pkg.id));
      }
    }
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
        agentCommissionType: "fixed",
        agentCommissionFixed: "180.00",
      },
    ]).onConflictDoNothing();

    // Update existing Tokyo packages
    const tokyoPkgs = await db.select().from(packages).where(eq(packages.packageGroupId, tokyoGroup.id));
    for (const pkg of tokyoPkgs) {
      if (!pkg.agentCommissionType) {
        await db.update(packages).set({
          agentCommissionType: "fixed",
          agentCommissionFixed: "180.00",
          updatedAt: new Date(),
        }).where(eq(packages.id, pkg.id));
      }
    }
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
        agentCommissionType: "fixed",
        agentCommissionFixed: "300.00",
      },
    ]).onConflictDoNothing();

    // Update existing London packages
    const londonPkgs = await db.select().from(packages).where(eq(packages.packageGroupId, londonGroup.id));
    for (const pkg of londonPkgs) {
      if (!pkg.agentCommissionType) {
        await db.update(packages).set({
          agentCommissionType: "fixed",
          agentCommissionFixed: "300.00",
          updatedAt: new Date(),
        }).where(eq(packages.id, pkg.id));
      }
    }
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

  // ── AR Cycle Sample Data ─────────────────────────────────────────────────
  // Helper: insert ledger entry only if no matching (sourceType, sourceId, entryType) exists
  async function insertLedgerIfNotExists(
    sourceType: string,
    sourceId: string,
    entryType: string,
    values: any
  ) {
    const existing = await db.select()
      .from(accountLedgerEntries)
      .where(and(
        eq(accountLedgerEntries.sourceType, sourceType),
        eq(accountLedgerEntries.sourceId, sourceId),
        eq(accountLedgerEntries.entryType, entryType),
      ))
      .limit(1);
    if (existing.length === 0) {
      const [entry] = await db.insert(accountLedgerEntries).values(values).returning();
      return entry;
    }
    return existing[0];
  }

  // Fetch first available contract (created by data manager / previous seed)
  const allContracts = await db.select().from(contracts).limit(1);
  if (allContracts.length > 0) {
    const contract1Id  = allContracts[0].id;
    const parent1Id    = parentUser.id;
    const adminUserId  = adminUser.id;
    const agent1Id     = agentUser.id;

    // Ensure education_agent settlement_mgt record exists for this contract
    let agentSettlementRows = await db.select().from(settlementMgt)
      .where(and(
        eq(settlementMgt.contractId, contract1Id),
        eq(settlementMgt.providerRole, 'education_agent'),
      ))
      .limit(1);
    if (agentSettlementRows.length === 0) {
      agentSettlementRows = await db.insert(settlementMgt).values({
        contractId:    contract1Id,
        providerRole:  'education_agent',
        providerName:  agentUser.fullName ?? 'Education Agent Kim',
        grossAmount:   '2600.00',
        commissionRate: '10.00',
        netAmount:     '260.00',
        currency:      'AUD',
        status:        'pending',
        createdBy:     adminUser.id,
      }).onConflictDoNothing().returning();
    }
    const agentSettlementId = agentSettlementRows[0]?.id;

    // 1. Ensure invoice exists
    let clientInvoice = await db.select().from(invoices)
      .where(eq(invoices.invoiceNumber, 'INV-CLIENT-2026-0001'))
      .limit(1);
    if (clientInvoice.length === 0) {
      clientInvoice = await db.insert(invoices).values({
        invoiceNumber:     'INV-CLIENT-2026-0001',
        contractId:        contract1Id,
        invoiceType:       'client',
        recipientId:       parent1Id,
        totalAmount:       '2600.00',
        currency:          'AUD',
        audEquivalent:     '2600.00',
        exchangeRateToAud: '1.000000',
        status:            'paid',
        issuedAt:          new Date('2026-03-20'),
        dueDate:           '2026-04-03',
        paidAt:            new Date('2026-03-26'),
        createdBy:         adminUserId,
      }).onConflictDoNothing().returning();
    }
    const invoiceId = clientInvoice[0].id;

    // 2. Ledger DEBIT — client owes
    const debitEntry = await insertLedgerIfNotExists(
      'invoice', invoiceId, 'debit',
      {
        accountId:     parent1Id,
        sourceType:    'invoice',
        sourceId:      invoiceId,
        contractId:    contract1Id,
        entryType:     'debit',
        amount:        '2600.00',
        currency:      'AUD',
        audEquivalent: '2600.00',
        status:        'confirmed',
        description:   'Invoice INV-CLIENT-2026-0001 issued',
        entryDate:     '2026-03-20',
        createdBy:     adminUserId,
      }
    );
    await db.update(invoices)
      .set({ ledgerEntryId: debitEntry.id })
      .where(eq(invoices.id, invoiceId));

    // 3. Transaction — payment received
    let paymentTxn = await db.select().from(transactions)
      .where(eq(transactions.bankReference, 'REF-20260325-001'))
      .limit(1);
    if (paymentTxn.length === 0) {
      paymentTxn = await db.insert(transactions).values({
        contractId:      contract1Id,
        invoiceId:       invoiceId,
        transactionType: 'payment_received',
        amount:          '2600.00',
        currency:        'AUD',
        audEquivalent:   '2600.00',
        bankReference:   'REF-20260325-001',
        transactionDate: '2026-03-25',
        createdBy:       adminUserId,
      }).onConflictDoNothing().returning();
    }
    const txnId = paymentTxn[0].id;

    // 4. Ledger CREDIT — payment in
    const creditEntry = await insertLedgerIfNotExists(
      'transaction', txnId, 'credit',
      {
        accountId:     parent1Id,
        sourceType:    'transaction',
        sourceId:      txnId,
        contractId:    contract1Id,
        entryType:     'credit',
        amount:        '2600.00',
        currency:      'AUD',
        audEquivalent: '2600.00',
        status:        'confirmed',
        description:   'Payment received - REF-20260325-001',
        entryDate:     '2026-03-25',
        createdBy:     adminUserId,
      }
    );
    await db.update(transactions)
      .set({ ledgerEntryId: creditEntry.id })
      .where(eq(transactions.id, txnId));

    // 5. Receipt
    let rcpt = await db.select().from(receipts)
      .where(eq(receipts.receiptNumber, 'RCP-2026-0001'))
      .limit(1);
    if (rcpt.length === 0) {
      rcpt = await db.insert(receipts).values({
        receiptNumber:  'RCP-2026-0001',
        invoiceId:      invoiceId,
        payerId:        parent1Id,
        amount:         '2600.00',
        currency:       'AUD',
        audEquivalent:  '2600.00',
        paymentMethod:  'bank_transfer',
        receiptDate:    '2026-03-26',
        status:         'confirmed',
        createdBy:      adminUserId,
      }).onConflictDoNothing().returning();
    }

    // 6. Agent commission ledger entry
    if (agentSettlementId) {
      await insertLedgerIfNotExists(
        'settlement_mgt', agentSettlementId, 'credit',
        {
          accountId:     agent1Id,
          sourceType:    'settlement_mgt',
          sourceId:      agentSettlementId,
          contractId:    contract1Id,
          entryType:     'credit',
          amount:        '260.00',
          currency:      'AUD',
          audEquivalent: '260.00',
          status:        'pending',
          description:   'Agent commission - RCP-2026-0001',
          entryDate:     '2026-03-26',
          createdBy:     adminUserId,
        }
      );
    }

    console.log('✅ AR cycle seed complete');
  } else {
    console.log('⚠️  No contracts found — skipping AR cycle seed');
  }

  // ── PART 1: Products + PackageGroupProducts ───────────────────────────────

  // 유저 UUID 조회 (실제 DB의 이메일 기준)
  const allSeedUsers = await db.select().from(users);
  const adminUser2     = allSeedUsers.find(u => u.email === 'admin@edubee.com');
  const instituteUser  = allSeedUsers.find(u => u.email === 'institute@example.com');
  const hotelUser      = allSeedUsers.find(u => u.email === 'hotel@example.com');
  const driverUser     = allSeedUsers.find(u => u.email === 'driver@pickup.com');
  const tourUser       = allSeedUsers.find(u => u.email === 'guide@tours.com');

  if (adminUser2 && instituteUser && hotelUser && driverUser && tourUser) {
    // ── 3개 신규 Package Group 생성 (없으면) ─────────────────────────────
    await db.insert(packageGroups).values([
      {
        campProviderId: allSeedUsers.find(u => u.email === 'coordinator@edubee.com')?.id,
        nameEn: 'Summer English Camp',
        nameKo: '여름 영어 캠프',
        nameJa: '夏の英語キャンプ',
        nameTh: 'ค่ายภาษาอังกฤษฤดูร้อน',
        descriptionEn: 'Intensive English immersion program in Cebu, Philippines',
        location: 'Cebu, Philippines',
        countryCode: 'PH',
        status: 'active',
        sortOrder: 10,
      },
      {
        campProviderId: allSeedUsers.find(u => u.email === 'coordinator@edubee.com')?.id,
        nameEn: 'Science & Tech Camp',
        nameKo: '과학 & 기술 캠프',
        nameJa: 'サイエンス＆テックキャンプ',
        nameTh: 'ค่ายวิทยาศาสตร์และเทคโนโลยี',
        descriptionEn: 'Hands-on STEM program in Singapore',
        location: 'Singapore',
        countryCode: 'SG',
        status: 'active',
        sortOrder: 11,
      },
      {
        campProviderId: allSeedUsers.find(u => u.email === 'coordinator@edubee.com')?.id,
        nameEn: 'Leadership Camp',
        nameKo: '리더십 캠프',
        nameJa: 'リーダーシップキャンプ',
        nameTh: 'ค่ายผู้นำ',
        descriptionEn: 'Leadership and communication program in Melbourne, Australia',
        location: 'Melbourne, Australia',
        countryCode: 'AU',
        status: 'active',
        sortOrder: 12,
      },
    ]).onConflictDoNothing();

    // ── Products INSERT ──────────────────────────────────────────────────
    const productSeedData = [
      // Institute
      { productName: 'Cebu English Immersion Program',        productType: 'institute', providerAccountId: instituteUser.id, description: 'Intensive English language program in Cebu — grammar, speaking, IELTS prep', cost: '850.00',  currency: 'USD', status: 'active' },
      { productName: 'Singapore STEM Academy Program',         productType: 'institute', providerAccountId: instituteUser.id, description: 'Hands-on science and technology curriculum in Singapore',                    cost: '720.00',  currency: 'SGD', status: 'active' },
      { productName: 'Melbourne Leadership Academy Program',   productType: 'institute', providerAccountId: instituteUser.id, description: 'Leadership skills, communication, and team-building program in Melbourne',  cost: '1100.00', currency: 'AUD', status: 'active' },
      // Hotel
      { productName: 'Cebu Student Guesthouse (Twin Share)',   productType: 'hotel',     providerAccountId: hotelUser.id,      description: 'Safe and comfortable student accommodation near Cebu English campus',     cost: '280.00',  currency: 'USD', status: 'active' },
      { productName: 'Singapore Student Dormitory',            productType: 'hotel',     providerAccountId: hotelUser.id,      description: 'Modern dormitory accommodation near Orchard Road, Singapore',              cost: '420.00',  currency: 'SGD', status: 'active' },
      { productName: 'Melbourne Student Lodge (Standard Room)', productType: 'hotel',    providerAccountId: hotelUser.id,      description: 'Fully serviced student lodge in Melbourne CBD',                           cost: '580.00',  currency: 'AUD', status: 'active' },
      // Pickup
      { productName: 'Mactan Cebu Airport Pickup',              productType: 'pickup',   providerAccountId: driverUser.id,     description: 'Airport to campus transfer — Mactan-Cebu International Airport',          cost: '25.00',   currency: 'USD', status: 'active' },
      { productName: 'Changi Airport Transfer (Singapore)',     productType: 'pickup',   providerAccountId: driverUser.id,     description: 'Airport to dormitory transfer — Changi Airport T1/T2/T3',                 cost: '55.00',   currency: 'SGD', status: 'active' },
      { productName: 'Melbourne Airport Shuttle (Tullamarine)', productType: 'pickup',   providerAccountId: driverUser.id,     description: 'Airport to lodge transfer — Melbourne Airport',                           cost: '75.00',   currency: 'AUD', status: 'active' },
      // Tour
      { productName: 'Cebu Island Discovery Tour',              productType: 'tour',     providerAccountId: tourUser.id,       description: "Magellan's Cross, Oslob whale shark, Kawasan Falls day tour",              cost: '55.00',   currency: 'USD', status: 'active' },
      { productName: 'Singapore City & Sentosa Tour',           productType: 'tour',     providerAccountId: tourUser.id,       description: 'Marina Bay Sands, Gardens by the Bay, Sentosa Island half-day tour',      cost: '120.00',  currency: 'SGD', status: 'active' },
      { productName: 'Melbourne Cultural Experience Tour',      productType: 'tour',     providerAccountId: tourUser.id,       description: 'Great Ocean Road, Eureka Tower, Queen Victoria Market full-day tour',     cost: '150.00',  currency: 'AUD', status: 'active' },
      // Settlement
      { productName: 'Edubee Platform Coordination Fee — PH',  productType: 'settlement', providerAccountId: adminUser2.id,   description: 'Platform management and coordination fee for Philippines programs',      cost: '0.00',    currency: 'USD', status: 'active' },
      { productName: 'Edubee Platform Coordination Fee — SG',  productType: 'settlement', providerAccountId: adminUser2.id,   description: 'Platform management and coordination fee for Singapore programs',        cost: '0.00',    currency: 'SGD', status: 'active' },
      { productName: 'Edubee Platform Coordination Fee — AU',  productType: 'settlement', providerAccountId: adminUser2.id,   description: 'Platform management and coordination fee for Australia programs',        cost: '0.00',    currency: 'AUD', status: 'active' },
    ];

    for (const p of productSeedData) {
      await db.insert(products).values(p).onConflictDoNothing();
    }

    // 이름으로 product UUID 조회 헬퍼
    const findProduct = async (name: string) => {
      const [p] = await db.select().from(products).where(eq(products.productName, name));
      return p;
    };

    // ── PackageGroupProducts INSERT ──────────────────────────────────────
    const allPG = await db.select().from(packageGroups);
    const pgEnglish = allPG.find(g => g.nameEn === 'Summer English Camp');
    const pgStem    = allPG.find(g => g.nameEn === 'Science & Tech Camp');
    const pgLeader  = allPG.find(g => g.nameEn === 'Leadership Camp');

    if (pgEnglish && pgStem && pgLeader) {
      const pgpSeedData = [
        // Summer English Camp (Cebu, PH)
        { pgId: pgEnglish.id, name: 'Cebu English Immersion Program',        qty: 1, price: '850.00'  },
        { pgId: pgEnglish.id, name: 'Cebu Student Guesthouse (Twin Share)',   qty: 1, price: '280.00'  },
        { pgId: pgEnglish.id, name: 'Mactan Cebu Airport Pickup',             qty: 2, price: '25.00'   },
        { pgId: pgEnglish.id, name: 'Cebu Island Discovery Tour',             qty: 1, price: '55.00'   },
        { pgId: pgEnglish.id, name: 'Edubee Platform Coordination Fee — PH',  qty: 1, price: '0.00'    },
        // Science & Tech Camp (Singapore)
        { pgId: pgStem.id,    name: 'Singapore STEM Academy Program',         qty: 1, price: '720.00'  },
        { pgId: pgStem.id,    name: 'Singapore Student Dormitory',            qty: 1, price: '420.00'  },
        { pgId: pgStem.id,    name: 'Changi Airport Transfer (Singapore)',    qty: 2, price: '55.00'   },
        { pgId: pgStem.id,    name: 'Singapore City & Sentosa Tour',          qty: 1, price: '120.00'  },
        { pgId: pgStem.id,    name: 'Edubee Platform Coordination Fee — SG',  qty: 1, price: '0.00'    },
        // Leadership Camp (Melbourne, AU)
        { pgId: pgLeader.id,  name: 'Melbourne Leadership Academy Program',   qty: 1, price: '1100.00' },
        { pgId: pgLeader.id,  name: 'Melbourne Student Lodge (Standard Room)', qty: 1, price: '580.00'  },
        { pgId: pgLeader.id,  name: 'Melbourne Airport Shuttle (Tullamarine)', qty: 2, price: '75.00'   },
        { pgId: pgLeader.id,  name: 'Melbourne Cultural Experience Tour',     qty: 1, price: '150.00'  },
        { pgId: pgLeader.id,  name: 'Edubee Platform Coordination Fee — AU',  qty: 1, price: '0.00'    },
      ];

      let linkedCount = 0;
      for (const item of pgpSeedData) {
        const prod = await findProduct(item.name);
        if (!prod) { console.warn(`  ⚠️  Product not found: ${item.name}`); continue; }
        await db.insert(packageGroupProducts).values({
          packageGroupId: item.pgId,
          productId:      prod.id,
          quantity:       item.qty,
          unitPrice:      item.price,
        }).onConflictDoNothing();
        linkedCount++;
      }
      console.log(`✅ Products seeded: ${productSeedData.length} | PackageGroupProducts linked: ${linkedCount}`);
    } else {
      console.warn('⚠️  One or more target package groups not found — skipping PackageGroupProducts');
    }
  } else {
    console.warn('⚠️  Required partner users not found — skipping Products seed');
  }

  // ── Finance Auto-Generate for existing seeded contracts ──────────────────
  const allFreshContracts = await db.select().from(contracts).limit(5);
  let financeGenCount = 0;
  for (const contract of allFreshContracts) {
    // Check if finance items already exist
    const existing = await db.select().from(contractFinanceItems)
      .where(and(eq(contractFinanceItems.contractId, contract.id), eq(contractFinanceItems.isDeleted, false)));
    if (existing.length > 0) continue; // idempotent

    const totalFee = parseFloat(contract.totalAmount ?? "0");
    if (totalFee <= 0) continue;

    const currency = contract.currency ?? "AUD";

    // Simple client invoice
    await db.insert(contractFinanceItems).values([
      {
        contractId: contract.id,
        itemType: "receivable",
        itemCategory: "client_invoice",
        costCenter: "RC-CAMP",
        label: "Client Invoice",
        estimatedAmount: String(totalFee.toFixed(2)),
        currency,
        status: "pending",
        isAutoGenerated: true,
      },
    ]).onConflictDoNothing();
    financeGenCount++;
  }
  if (financeGenCount > 0) {
    console.log(`✅ Finance items auto-generated for ${financeGenCount} contract(s)`);
  }

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
