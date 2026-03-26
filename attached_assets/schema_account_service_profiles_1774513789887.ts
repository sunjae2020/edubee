// ============================================================
// 🐝  Edubee CRM — Account Service Profiles
// Drizzle ORM Schema Definitions
// ============================================================
// 버전  : v1.1
// 작성일: 2026-03-26
// 위치  : /db/schema.ts 하단에 추가
//
// 신규 테이블 (6개):
//   1. accountServiceCategories  — 멀티 서비스 카테고리 태그
//   2. accountHomestayProfiles   — 홈스테이 파트너 상세 프로필
//   3. accountPickupProfiles     — 픽업/드라이버/차량 프로필
//   4. accountCompanyProfiles    — 인턴십 호스트 컴퍼니 프로필
//   5. accountSchoolProfiles     — 학교 추가 프로필
//   6. accountTourProfiles       — 투어 컴퍼니 투어 상품 프로필
// ============================================================

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
  integer,
  decimal,
  date,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────
// 기존 테이블 참조 (schema.ts에 이미 정의된 것 가정)
// 실제 파일에서는 이 import 블록 대신 기존 정의를 직접 참조
// ──────────────────────────────────────────────────────────────
// import { accounts } from "./schema";  ← 기존 파일 참조

// ============================================================
// SERVICE TYPE ENUM (공통 상수)
// ============================================================
export const SERVICE_TYPES = [
  "homestay",
  "dormitory",
  "pickup",
  "tour_provider",
  "internship_host",
  "school",
  "camp_institute",
  "guardian",
  "translation",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// ============================================================
// TABLE 1: account_service_categories
// Account 멀티 서비스 카테고리 — 하나의 Account가
// 여러 서비스 유형을 제공할 수 있는 태그 테이블 (멀티 체크박스)
// ============================================================
export const accountServiceCategories = pgTable(
  "account_service_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK → accounts
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // SERVICE_TYPES enum 값
    serviceType: varchar("service_type", { length: 50 }).notNull(),

    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // 동일 Account + service_type 중복 방지
    uniqueAccountServiceType: unique().on(table.accountId, table.serviceType),

    // 성능 인덱스
    idxAccountId: index("idx_acct_svc_cat_account").on(table.accountId),
    idxServiceType: index("idx_acct_svc_cat_type").on(table.serviceType),
  })
);

// Relations
export const accountServiceCategoriesRelations = relations(
  accountServiceCategories,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountServiceCategories.accountId],
      references: [accounts.id],
    }),
  })
);

// Infer Types
export type AccountServiceCategory = typeof accountServiceCategories.$inferSelect;
export type NewAccountServiceCategory = typeof accountServiceCategories.$inferInsert;

// ============================================================
// TABLE 2: account_homestay_profiles
// 홈스테이 파트너(Account) 방/숙소 단위 상세 프로필
// 1 Account : N 프로필 (방 여러 개 가능)
// → accommodation_mgt Pre-fill 소스
// ============================================================
export const accountHomestayProfiles = pgTable(
  "account_homestay_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK → accounts
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // 방 정보
    // 예: "Single Room" | "Twin Room" | "Single Ensuite" | "Studio" | "Granny Flat"
    roomType: varchar("room_type", { length: 100 }),

    // 예: "House" | "Shared Apartment" | "Townhouse" | "Granny Flat" | "Unit"
    accommodationType: varchar("accommodation_type", { length: 100 }),

    // "no" | "breakfast" | "half_board" | "full_board"
    mealIncluded: varchar("meal_included", { length: 50 }),

    // 요금 (Pre-fill 기본값)
    weeklyRate: decimal("weekly_rate", { precision: 10, scale: 2 }),         // AR
    partnerWeeklyCost: decimal("partner_weekly_cost", { precision: 10, scale: 2 }), // AP (선택)

    // 위치/접근성
    // 예: "15 min by train" | "10 min walk"
    distanceToSchool: varchar("distance_to_school", { length: 200 }),

    // 수용 정보
    maxStudents: integer("max_students").default(1),
    availableFrom: date("available_from"),

    // 호스트 정보 (Pre-fill → accommodation_mgt.host_*)
    hostName: varchar("host_name", { length: 255 }),
    hostContact: varchar("host_contact", { length: 100 }),
    propertyAddress: text("property_address"),

    // 편의시설 JSONB
    // 예: { "wifi": true, "parking": false, "laundry": true, "pets": false }
    amenities: jsonb("amenities"),

    houseRules: text("house_rules"),

    // 가용성 상태
    isCurrentlyOccupied: boolean("is_currently_occupied").notNull().default(false),
    currentStudentCount: integer("current_student_count").notNull().default(0),

    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idxAccountId: index("idx_homestay_profile_account").on(table.accountId),
    idxAvailability: index("idx_homestay_profile_available").on(
      table.isCurrentlyOccupied,
      table.isActive
    ),
  })
);

// Relations
export const accountHomestayProfilesRelations = relations(
  accountHomestayProfiles,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountHomestayProfiles.accountId],
      references: [accounts.id],
    }),
  })
);

// Infer Types
export type AccountHomestayProfile = typeof accountHomestayProfiles.$inferSelect;
export type NewAccountHomestayProfile = typeof accountHomestayProfiles.$inferInsert;

// ============================================================
// TABLE 3: account_pickup_profiles
// 픽업 서비스 파트너(Account) 드라이버/차량 단위 프로필
// 1 Account : N 프로필 (차량 여러 대 가능)
// → pickup_mgt Pre-fill 소스
// ============================================================
export const accountPickupProfiles = pgTable(
  "account_pickup_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK → accounts
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // 드라이버 정보 (Pre-fill → pickup_mgt.driver_*)
    driverName: varchar("driver_name", { length: 255 }),
    driverContact: varchar("driver_contact", { length: 100 }),
    driverLicenseNo: varchar("driver_license_no", { length: 100 }), // 컴플라이언스용, 선택

    // 차량 정보 (Pre-fill → pickup_mgt.vehicle_info 조합)
    vehicleMake: varchar("vehicle_make", { length: 100 }),   // 예: Toyota
    vehicleModel: varchar("vehicle_model", { length: 100 }),  // 예: HiAce
    vehicleColor: varchar("vehicle_color", { length: 50 }),   // 예: White
    plateNumber: varchar("plate_number", { length: 50 }),     // 예: EDU 001
    vehicleYear: integer("vehicle_year"),
    capacity: integer("capacity"),                             // 최대 탑승 인원

    // 서비스 범위
    // 예: "Sydney Metro" | "All NSW" | "SYD / MEL"
    serviceArea: varchar("service_area", { length: 255 }),

    // 서비스 가능 공항 JSONB 배열
    // 예: ["SYD", "MEL", "BNE"]
    serviceAirports: jsonb("service_airports"),

    // 요금 (Pre-fill 기본값 — AP)
    baseRate: decimal("base_rate", { precision: 10, scale: 2 }),      // 기본 픽업 원가
    nightRate: decimal("night_rate", { precision: 10, scale: 2 }),    // 야간 할증 (선택)
    extraStopRate: decimal("extra_stop_rate", { precision: 10, scale: 2 }), // 추가 경유지 (선택)

    isAvailable: boolean("is_available").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idxAccountId: index("idx_pickup_profile_account").on(table.accountId),
  })
);

// Relations
export const accountPickupProfilesRelations = relations(
  accountPickupProfiles,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountPickupProfiles.accountId],
      references: [accounts.id],
    }),
  })
);

// Infer Types
export type AccountPickupProfile = typeof accountPickupProfiles.$inferSelect;
export type NewAccountPickupProfile = typeof accountPickupProfiles.$inferInsert;

// ============================================================
// TABLE 4: account_company_profiles
// 인턴십 호스트 컴퍼니(Account) 회사 + 포지션 목록 프로필
// 1 Account : 1 프로필 (포지션은 JSONB 배열로 복수 관리)
// → internship_mgt Pre-fill 소스
// ============================================================

// available_positions JSONB 내부 타입
export type AvailablePosition = {
  title: string;
  type: "internship" | "casual" | "part_time" | "full_time";
  hourly_rate: number;
  hours_per_week: number;
  available_from?: string; // ISO date string
  is_active: boolean;
  notes?: string;
};

export const accountCompanyProfiles = pgTable(
  "account_company_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK → accounts (UNIQUE: 회사 1개 = 프로필 1개)
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // 회사 정보
    // 예: "Hospitality" | "IT / Software" | "Marketing" | "Finance"
    industry: varchar("industry", { length: 100 }),

    // "1-10" | "11-50" | "51-200" | "201-500" | "500+"
    companySize: varchar("company_size", { length: 50 }),

    // 호주 사업자 번호 (accounts.abn과 별도 관리 가능)
    abn: varchar("abn", { length: 50 }),

    // 파트너십 담당자
    contactPerson: varchar("contact_person", { length: 255 }),
    contactTitle: varchar("contact_title", { length: 100 }),  // HR Manager | Director | Owner
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 100 }),

    // 포지션 목록 JSONB
    // 구조: AvailablePosition[]
    availablePositions: jsonb("available_positions").$type<AvailablePosition[]>(),

    // 수수료 설정 (Pre-fill → internship_mgt.placement_fee_type)
    // "flat_fee" | "percentage_of_salary" | "none"
    placementFeeType: varchar("placement_fee_type", { length: 50 }),
    placementFee: decimal("placement_fee", { precision: 10, scale: 2 }),

    // 온보딩 요건
    requiresPoliceCheck: boolean("requires_police_check").notNull().default(false),
    requiresWwcc: boolean("requires_wwcc").notNull().default(false), // Working With Children Check
    dressCode: varchar("dress_code", { length: 100 }),

    workAddress: text("work_address"),

    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idxAccountId: index("idx_company_profile_account").on(table.accountId),
    idxIndustry: index("idx_company_profile_industry").on(table.industry),
  })
);

// Relations
export const accountCompanyProfilesRelations = relations(
  accountCompanyProfiles,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountCompanyProfiles.accountId],
      references: [accounts.id],
    }),
  })
);

// Infer Types
export type AccountCompanyProfile = typeof accountCompanyProfiles.$inferSelect;
export type NewAccountCompanyProfile = typeof accountCompanyProfiles.$inferInsert;

// ============================================================
// TABLE 5: account_school_profiles
// 학교(Account) 행정 + 커미션 관련 추가 프로필
// 1 Account : 1 프로필
// → study_abroad_mgt, agent_commission_configs 참조 소스
// ============================================================

// available_courses JSONB 내부 타입
export type AvailableCourse = {
  name: string;
  code?: string;
  level?: string;
  duration_weeks_min: number;
  duration_weeks_max: number;
  tuition_per_week_aud: number;
  is_active: boolean;
};

export const accountSchoolProfiles = pgTable(
  "account_school_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK → accounts (UNIQUE: 학교 1개 = 프로필 1개)
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // 호주 학교 등록 정보
    cricosCode: varchar("cricos_code", { length: 50 }),  // CRICOS Provider Code
    rtoCode: varchar("rto_code", { length: 50 }),         // Registered Training Organisation Code

    // "University" | "TAFE" | "English Language School" | "High School" | "Primary School" | "Other"
    institutionType: varchar("institution_type", { length: 50 }),

    // 입학 담당자
    enrolmentOfficer: varchar("enrolment_officer", { length: 255 }),
    enrolmentEmail: varchar("enrolment_email", { length: 255 }),
    enrolmentPhone: varchar("enrolment_phone", { length: 100 }),

    // 운영 정보
    // 입학 가능 월 JSONB 배열. 예: [1, 3, 7, 10]
    intakeMonths: jsonb("intake_months").$type<number[]>(),

    // "Term" | "Semester" | "Trimester" | "Year-round"
    academicCalendar: varchar("academic_calendar", { length: 50 }),

    // 커미션 설정 (agent_commission_configs 미설정 시 기본값)
    // 예: 0.1500 = 15%
    defaultCommissionRate: decimal("default_commission_rate", { precision: 8, scale: 4 }),

    // "gross" | "net" | "first_term" | "full_year_first_term"
    commissionBasis: varchar("commission_basis", { length: 30 }),

    // 코스 목록 JSONB
    // 구조: AvailableCourse[]
    availableCourses: jsonb("available_courses").$type<AvailableCourse[]>(),

    // 비자 후원 여부
    canSponsorStudentVisa: boolean("can_sponsor_student_visa").notNull().default(true),
    oshcRequired: boolean("oshc_required").notNull().default(true), // Overseas Student Health Cover

    emergencyContact: varchar("emergency_contact", { length: 100 }),

    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idxAccountId: index("idx_school_profile_account").on(table.accountId),
    idxCricosCode: index("idx_school_profile_cricos").on(table.cricosCode),
    idxInstitutionType: index("idx_school_profile_type").on(table.institutionType),
  })
);

// Relations
export const accountSchoolProfilesRelations = relations(
  accountSchoolProfiles,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountSchoolProfiles.accountId],
      references: [accounts.id],
    }),
  })
);

// Infer Types
export type AccountSchoolProfile = typeof accountSchoolProfiles.$inferSelect;
export type NewAccountSchoolProfile = typeof accountSchoolProfiles.$inferInsert;

// ============================================================
// TABLE 6: account_tour_profiles
// 투어 컴퍼니(Account) 투어 상품 단위 프로필
// 1 Account : N 프로필 (투어 상품 여러 개 가능)
// → camp_tour_mgt Pre-fill 소스
// ============================================================
export const accountTourProfiles = pgTable(
  "account_tour_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // FK → accounts
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    // 투어 상품 기본 정보 (Pre-fill → camp_tour_mgt.tour_name)
    // 예: "Blue Mountains Day Tour" | "Sydney Harbour Cruise"
    tourName: varchar("tour_name", { length: 255 }).notNull(),

    // Pre-fill → camp_tour_mgt.tour_type
    // "day_tour" | "overnight" | "cultural" | "adventure" | "city" | "nature" | "theme_park" | "wildlife" | "other"
    tourType: varchar("tour_type", { length: 50 }),

    // 예: "Nature" | "City Sightseeing" | "Cultural Heritage" | "Food & Wine" | "Adventure Sports"
    tourCategory: varchar("tour_category", { length: 100 }),

    // 투어 운영 세부
    durationHours: integer("duration_hours"),      // 소요 시간 (시간 단위)
    durationDays: integer("duration_days"),         // 숙박 투어 일 수 (day_tour는 NULL)
    minParticipants: integer("min_participants").default(1),
    // Pre-fill → camp_tour_mgt.max_participants
    maxParticipants: integer("max_participants"),

    // 픽업 정보 (Pre-fill → camp_tour_mgt.pickup_location)
    // 예: "Sydney CBD — Town Hall Station"
    defaultPickupLocation: varchar("default_pickup_location", { length: 255 }),
    pickupAvailable: boolean("pickup_available").notNull().default(false),

    // 운영 일정
    // JSONB 배열. 예: ["Mon", "Wed", "Fri", "Sat", "Sun"]
    operatesOn: jsonb("operates_on").$type<string[]>(),
    departureTime: varchar("departure_time", { length: 50 }), // 예: "08:00 AM"
    returnTime: varchar("return_time", { length: 50 }),        // 예: "06:00 PM"

    // 포함/불포함 사항
    inclusions: text("inclusions"), // 예: "Lunch, National Park Entry Fee, Guide"
    exclusions: text("exclusions"), // 예: "Personal expenses, Travel insurance"

    // 요금 (Pre-fill 기본값 — per person)
    // Pre-fill → camp_tour_mgt.retail_price
    adultRetailPrice: decimal("adult_retail_price", { precision: 10, scale: 2 }), // AR
    childRetailPrice: decimal("child_retail_price", { precision: 10, scale: 2 }), // AR 어린이 (선택)
    // Pre-fill → camp_tour_mgt.partner_cost
    partnerCost: decimal("partner_cost", { precision: 10, scale: 2 }),            // AP

    // 예약 관련
    advanceBookingDays: integer("advance_booking_days"),
    cancellationPolicy: text("cancellation_policy"),
    bookingContact: varchar("booking_contact", { length: 255 }),

    // 언어 지원 JSONB 배열
    // 예: ["English", "Korean", "Chinese", "Japanese"]
    guideLanguages: jsonb("guide_languages").$type<string[]>(),

    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),

    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idxAccountId: index("idx_tour_profile_account").on(table.accountId),
    idxTourType: index("idx_tour_profile_type").on(table.tourType),
  })
);

// Relations
export const accountTourProfilesRelations = relations(
  accountTourProfiles,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountTourProfiles.accountId],
      references: [accounts.id],
    }),
  })
);

// Infer Types
export type AccountTourProfile = typeof accountTourProfiles.$inferSelect;
export type NewAccountTourProfile = typeof accountTourProfiles.$inferInsert;

// ============================================================
// accounts 테이블 Relations 확장 (기존 accountsRelations에 추가)
// ============================================================
// 아래 코드는 기존 schema.ts의 accountsRelations에 병합해야 합니다.
// 기존 accountsRelations 정의를 찾아 아래 항목들을 추가하세요:
//
// export const accountsRelations = relations(accounts, ({ many }) => ({
//   ...기존_항목들,
//
//   // [신규 추가] Account Service Profiles
//   serviceCategories: many(accountServiceCategories),
//   homestayProfiles:  many(accountHomestayProfiles),
//   pickupProfiles:    many(accountPickupProfiles),
//   companyProfile:    many(accountCompanyProfiles),  // 실제 1:1이지만 many로 선언
//   schoolProfile:     many(accountSchoolProfiles),   // 실제 1:1이지만 many로 선언
//   tourProfiles:      many(accountTourProfiles),
// }));

// ============================================================
// ZOD VALIDATION SCHEMAS (선택 — @/lib/validators에 추가)
// ============================================================
// import { z } from "zod";
// import { createInsertSchema, createSelectSchema } from "drizzle-zod";
//
// export const insertAccountServiceCategorySchema =
//   createInsertSchema(accountServiceCategories);
// export const insertAccountHomestayProfileSchema =
//   createInsertSchema(accountHomestayProfiles);
// export const insertAccountPickupProfileSchema =
//   createInsertSchema(accountPickupProfiles);
// export const insertAccountCompanyProfileSchema =
//   createInsertSchema(accountCompanyProfiles);
// export const insertAccountSchoolProfileSchema =
//   createInsertSchema(accountSchoolProfiles);
// export const insertAccountTourProfileSchema =
//   createInsertSchema(accountTourProfiles);
