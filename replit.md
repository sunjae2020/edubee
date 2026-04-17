# Edubee Platform — Multi-tenant CRM + Marketing Site

## Overview

Edubee is a multi-tenant SaaS CRM platform for international education agencies. It consists of four apps: **edubee-website** (marketing site, www.edubee.co), **edubee-admin** (CRM, crm.edubee.co), **edubee-camp** (camp management, camp.edubee.co), and **edubee-portal** (stakeholder portal `/portal/`), backed by a shared Express + PostgreSQL API server.

## Portal (edubee-portal) — `/portal/`
Single unified portal for all external stakeholders, with role-based views:
- **Phase 1 – Agent** (`portalRole: consultant`): Dashboard, Consultations (leads), Quotes, Contracts, Services, Finance (commissions), Documents, Community
- **Phase 2 – Partner** (`portalRole: hotel|pickup|institute|tour`): Dashboard, Consultations, Bookings, Contracts, Services, Finance, Documents, Community
- **Phase 3 – Student** (`portalRole: student`): Dashboard, Consultations, Quotes, Contracts, Programs (services), Finance, Documents, Community

### Portal Authentication
- All external users login at `/portal/login` — role-based routing after auth
- Tenant scoping: `getTenantSlug()` extracts subdomain from hostname → sends `X-Organisation-Id` header → portal accounts scoped to that org
- Accounts stored in `public.accounts` (not tenant schema) → always query via `staticDb`
- `org.accounts.organisation_id` determines which tenant the portal user belongs to
- Dev credentials: `Portal123!` for all portal accounts (see dev_seed.sql)

### Portal Dev Accounts (myagency)
| Email | Role | Account |
|-------|------|---------|
| `agent@testagency.com` | consultant | Test Agent Co |
| `partner@bradyhotel.com` | hotel | Brady Hotel HQ |
| `partner@browns.com.au` | institute | BROWNS English Language School |
| `student@example.com` | student | Ji Young CHOI |

### Portal API Routes (`/api/portal/*`)
All routes in `artifacts/api-server/src/routes/portal.ts`, guarded by `authenticatePortal` middleware:
- Common: `/me`, `/profile` (PUT), `/change-password` (POST)
- Agent: `/dashboard/summary`, `/students`, `/students/:id`, `/leads`, `/leads/:id`, `/quotes`, `/quotes/:id`, `/commissions`, `/agent/contracts`, `/agent/services`
- Partner: `/partner/summary`, `/partner/bookings`, `/partner/bookings/:id`, `/partner/contracts`
- Student: `/student/summary`, `/student/quotes`, `/student/quotes/:id`, `/student/programs`, `/student/programs/:id`, `/student/consultations/:quoteId`, `/student/documents`
- Shared: `/community` (GET/POST), `/community/:id` (GET/DELETE), `/community/:id/comments` (POST)
- Documents: `/documents/:id/view`, `/documents/:id/download`

## Multi-tenancy Architecture (Phase 2 — Activated)
- `users` table has `organisation_id` FK linking each user to their tenant org
- Login JWT (`generateStaffTokens`) includes `organisationId` payload
- CRM (`use-auth.tsx`) reads `organisationId` from JWT via `parseJwt()` and sends `X-Organisation-Id` header on ALL API requests
- Impersonation (`admin_impersonate_org_id` in sessionStorage) overrides personal org for super-admin
- `tenantResolver` middleware: 1st X-Organisation-Id header → 2nd subdomain → 3rd MVP fallback (first Active org) → 4th passthrough
- New registrations via `/api/auth/register` create an `organisations` record with auto-generated subdomain
- Super admin (no orgId): relies on MVP fallback or impersonation

## Website ↔ API Connection (Activated)
- `LoginPage.tsx`: calls `POST /api/auth/login`, stores JWT in localStorage, redirects to `/admin/dashboard`
- `RegisterPage.tsx`: calls `POST /api/auth/register` — creates org + user; redirects to login after success
- `PricingPage.tsx`: fetches from `GET /api/public/platform-plans` (no auth), falls back to static plans
- `GET /api/public/platform-plans`: new public endpoint in `public.ts` (no auth required)

## User Preferences

- I prefer simple language and clear explanations.
- I like an iterative development approach with regular updates.
- Please ask for confirmation before making any major architectural changes or deleting significant portions of code.
- Ensure that all frontend components adhere to the specified design guidelines, especially regarding the primary color and flag rules.
- When implementing new features, prioritize modularity and reusability of components.
- All database changes should be thoroughly reviewed and tested to prevent data loss or corruption.
- I expect detailed explanations for complex technical decisions.

## System Architecture

The Edubee Camp platform is built as a monorepo utilizing pnpm workspaces. It consists of an Express.js API server and a React.js frontend.

**Frontend Architecture:**
- **Frameworks**: React 18 with Vite, TypeScript, Tailwind CSS, and shadcn/ui for UI components.
- **Routing**: `wouter` for client-side navigation.
- **State Management**: `TanStack Query v5` for data fetching and caching.
- **Form Handling**: `react-hook-form` combined with `zod` for validation.
- **Internationalization**: `react-i18next` supporting English, Korean, Japanese, and Thai.
- **Layout**: Custom `MainLayout` with a role-adaptive `AppSidebar` and a `Header` component that includes a "View as" role switcher for impersonation.
- **Shared Components**: `DetailPageLayout`, `useDetailEdit` hook, `list-toolbar`, and `list-pagination` for consistent UI/UX across admin pages.
- **Design System**: Primary accent color is `#F08301` (orange). English language displays the Australian flag (🇦🇺).

**Backend Architecture:**
- **API Framework**: Express 5.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: JWT-based (access token 8h, refresh token 7d) using `bcryptjs` for password hashing.
- **Validation**: `Zod` and `drizzle-zod`.
- **API Codegen**: `Orval` for generating API client code from OpenAPI specifications.
- **Deployment**: Replit's environment with integrated PostgreSQL and object storage.

**Key Features & Technical Implementations:**

-   **AI Chatbot**:
    -   Integrated AI Chatbot using Replit Gemini (gemini-2.5-flash).
    -   Knowledge base stored in `chat_documents` table with PostgreSQL full-text search (`to_tsvector`) for RAG context retrieval.
    -   API endpoints for chat messaging (SSE streaming), document management (list, add, delete, Google Doc import).
    -   Admin UI (`ChatbotAdminPage.tsx`) for chat interaction and knowledge base management.
-   **Object Storage & File Uploads**:
    -   Replit GCS object storage sidecar returns "no allowed resources" (sidecar 401 error) — both presigned URL signing and direct GCS client writes are blocked at the Replit account level.
    -   **Product Image Gallery** (`ProductImageGallery.tsx`): images are compressed client-side (≤300 KB, 900 px max edge) and stored as Base64 data URIs in `products.product_images` JSONB column. No external storage dependency. Express JSON body limit is 10 MB to accommodate multiple images.
    -   `ThumbnailUploader.tsx` component for other drag-and-drop image uploads with progress (uses object-storage route).
    -   API endpoints exist for `/api/storage/uploads/direct` and `/api/storage/objects/*` (object proxy), but GCS writes are currently unavailable.
-   **Dual Currency Display**:
    -   API endpoint (`/api/public/exchange-rates`) for fetching real-time currency exchange rates.
    -   `DisplayCurrencyContext` for price conversion and formatting, leveraging browser language detection and localStorage.
    -   `CurrencySelector` and `DualPriceDisplay` components for presenting prices in local and reference currencies across the platform (landing page, program cards, application modals).
-   **Program Reports Module**:
    -   Database tables (`program_reports`, `report_sections`) for storing and managing program reports.
    -   Automated section population from various management modules (`institute_mgt`, `hotel_mgt`, etc.).
    -   Comprehensive API for CRUD operations, publishing/unpublishing, section reordering, and PDF generation (`@react-pdf/renderer`).
    -   Role-scoped access control for report viewing and management.
-   **Tasks/Customer Service System**:
    -   Dedicated database tables (`tasks`, `task_attachments`, `task_comments`).
    -   Public API for contact form submissions and authenticated API for CRUD operations with role-scoped access.
    -   Admin page (`/admin/services/tasks`) featuring List and Kanban views with a detail drawer for comments.
-   **User Roles**: Internal staff-only role hierarchy (`super_admin`[100], `admin`[80], `finance`[70], `admission`[65], `team_manager`[60], `consultant`[50], `camp_coordinator`[40]) with adaptive sidebar and access control. External partners/clients are managed via Account portal system (not User roles).
-   **Package Group Extended Fields**: `packageGroups` now includes `inclusionsEn`/`inclusionsKo` (포함내역), `exclusionsEn`/`exclusionsKo` (비포함 내역), `durationText` (기간), `startDate`, `endDate`.
-   **Package Capacity Fields**: `packages` table includes `maxAdults` (어른 인원), `maxStudents` (학생 인원) alongside `maxParticipants`.
-   **Per-Package Products**: New `package_products` table links individual packages to products (with `isOptional`, `quantity`, `unitPrice`). API routes at `/api/packages/:id/products` (GET/POST/PATCH/DELETE). UI in Package dialog when editing.
-   **Tax Invoice Auto-Generation**: Automated commission tax invoice system for AP school remittances.
    -   **New DB tables**: `tax_invoices` (full invoice record), `organisations` (agency ABN/bank info).
    -   **New DB columns**: `contract_products` (remittance_method, commission_ar_status, gst_amount, is_gst_free), `accounts` (bank_account_type).
    -   **NET remittance flow**: On `ap_status → paid` with `remittance_method = 'net'`, tax invoice is auto-generated and emailed to school. GST calculated if domestic (AUD) account; GST-free if overseas (FX).
    -   **GROSS remittance flow**: On `ap_status → paid` with `remittance_method = 'gross'`, commission transferred to AR (DR 1300 / CR 3100), tax invoice created as draft. Scheduler fires notification to consultant on `course_start_date`.
    -   **PDF service**: `taxInvoicePdfService.ts` uses `@react-pdf/renderer` with `React.createElement` pattern (no JSX).
    -   **Backend service**: `taxInvoiceService.ts` — `generateTaxInvoice()`, `buildInvoiceRef()`, `sendTaxInvoiceByEmail()`.
    -   **Scheduler**: `taxInvoiceScheduler.ts` — runs daily at 9AM, notifies consultant for GROSS invoices past course start date.
    -   **API routes**: `GET /api/tax-invoices`, `GET /api/tax-invoices/by-contract-product/:cpId`, `GET /api/tax-invoices/:id/pdf`, `POST /api/tax-invoices/:id/send`, `POST /api/tax-invoices/:id/mark-paid`.
    -   **Frontend**: `TaxInvoiceListPage` at `/admin/accounting/tax-invoices` with type/status filters, KPI cards, PDF download, email resend, mark-paid actions. `TaxInvoiceBadge` component shows invoice status on contract product lines.

## Dark Mode System (2026-03-24)

**Architecture**: CSS custom properties (`--e-*` variables) defined in `index.css` on `:root` (light) and `.dark` (dark). The `ThemeProvider` (`use-theme.tsx`) adds/removes the `dark` class on `document.documentElement` and persists to `localStorage("edubee-theme")`. Moon/Sun toggle button in `header.tsx`.

**Design Tokens**:
- Light: bg-page `#FAFAF9`, bg-surface `#FFFFFF`, bg-sidebar `#FAFAF9`, border `#E8E6E2`, text-1 `#1C1917`, text-2 `#57534E`, text-3 `#A8A29E`
- Dark: bg-page `#0F0E0D`, bg-surface `#1A1917`, bg-sidebar `#161513`, border `#2E2B28`, text-1 `#F5F0EB`, text-2 `#A8A29E`, text-3 `#57534E`

**Updated Files**:
- `index.css` — CSS variable definitions + global Tailwind class overrides (`.dark .bg-white`, `.dark .text-[#1C1917]`, etc.)
- `main-layout.tsx` — Page bg, loading screen
- `app-sidebar.tsx` — Aside bg/border, category headers, SidebarNavItem (Tailwind dark: variants), user footer
- `header.tsx` — Topbar bg/border, notification panel, avatar dropdown, bell/menu buttons
- `login.tsx` — Page bg, card bg, form labels, demo account buttons, divider
- `product-detail.tsx` — All shared components (FL, TextInput, SearchSelect, AsyncSearchSelect, Section, Btn, RadioYesNo, ToggleSwitch, page header, admin info, sticky bottom bar)

## Recent Changes (2026-03-26)

- **SystemInfoSection on All 26 Detail Pages**: Reusable `SystemInfoSection` component (`src/components/shared/SystemInfoSection.tsx`) added to every admin detail page app-wide. Shows Owner (UUID input-style box), Created On, and Modified On. Applied to: hotel-detail, tour-detail, institute-detail (service), pickup-detail, settlement-detail, camp-application-detail, camp-tour-detail, camp-institute-detail, application-detail, user-detail, package-detail, product-group-detail, product-type-detail, product-detail, package-group-detail, camp-contract-detail, crm/ContactDetailPage, crm/LeadDetailPage, crm/AccountDetailPage, crm/ContractDetailPage, services/StudyAbroadDetailPage, services/AccommodationDetailPage, services/GuardianDetailPage, services/InternshipDetailPage, services/OtherServiceDetailPage, services/VisaServiceDetailPage.
  - Owner field mapping per entity: camp-application/application → `agentId`; CRM Account/Lead → `ownerId`; CRM Contact → `createdBy`; service pages → `clientId ?? null`; user-detail → `userRec.id`; package/product/group pages → `null`.
  - Timestamp field exceptions: `product-group-detail` and `product-type-detail` use `createdOn`/`modifiedOn`; account page uses `createdOn`/`modifiedOn`.
- **Camp Applications Table Columns**: Removed "Application #"; added "Package" (after Client) and "Created Date" (after Start Date) columns. API enriched with LEFT JOIN on packages table for `packageName`. Column span updated to 7, min-w to 960px.

## Recent Changes (2026-03-26)

- **Name Split — First Name / Last Name 분리**:
  - DB: `camp_applications` 테이블에 `applicant_first_name`, `applicant_last_name` 컬럼 추가 (raw SQL ALTER TABLE).
  - DB: `application_participants` 테이블에 `first_name`, `last_name` 컬럼 추가.
  - Drizzle Schema: `lib/db/src/schema/camp.ts`, `lib/db/src/schema/applications.ts` 업데이트.
  - API `camp-applications.ts` PUT: `applicantFirstName`/`applicantLastName` ALLOWED_FIELDS 추가; 저장 시 `applicantName` 자동 계산 (`firstName LASTNAME`).
  - API `applications.ts` participants POST/PATCH: `firstName`/`lastName` 수락; `fullName` 자동 계산.
  - Admin Detail Page (`camp-application-detail.tsx`): "Applicant Name" 단일 필드 → "First Name" + "Last Name" 두 개 EditableField. Subtitle도 분리된 필드 기반으로 표시.
  - Admin Application Form (`application-form.tsx`): 기존 firstName/lastName state → payload에 `applicantFirstName`/`applicantLastName` 추가 전송.
  - Participant Dialogs (`ParticipantDialogs.tsx`): "Full Name" 단일 입력 → "First Name *" + "Last Name *" 두 컬럼으로 분리.
  - Landing Page Modal (`application-modal.tsx`): PrimaryStudent/Adult/Child 타입에서 `fullName` → `firstName` + `lastName`; Step 2 UI, 유효성 검사, 제출 payload, 리뷰 화면 모두 업데이트.
  - i18n: 4개 언어(en/ko/ja/th) `apply.firstName`, `apply.lastName` 키 추가.
  - 표시 포뮬러: `{firstName} {LASTNAME.toUpperCase()}` (예: "Ji-won KIM").

- **Account Service Profiles Migration (v1.1)**: 6개 신규 테이블 추가 (`lib/db/src/schema/account-service-profiles.ts`).
  - `account_service_categories`: Account별 멀티 서비스 카테고리 태그 (UNIQUE account_id+service_type).
  - `account_homestay_profiles`: 홈스테이 방/숙소 상세 프로필 (1:N). `accommodation_mgt` Pre-fill 소스.
  - `account_pickup_profiles`: 픽업 드라이버/차량 상세 프로필 (1:N). `pickup_mgt` Pre-fill 소스.
  - `account_company_profiles`: 인턴십 호스트 컴퍼니 프로필 (1:1, UNIQUE account_id). `internship_mgt` Pre-fill 소스.
  - `account_school_profiles`: 학교 행정 추가 프로필 (1:1, UNIQUE account_id). CRICOS, 커미션, 코스 목록.
  - `account_tour_profiles`: 투어 상품 단위 프로필 (1:N). `camp_tour_mgt` Pre-fill 소스.
  - 총 누적 테이블: 58개. 기존 테이블 컬럼 변경 없음 (하위 호환 100%).
- **Camp Application Pipeline 버그 수정**:
  - `crm-quotes.ts` convert-to-contract: `hotel` 타입 상품 → `accommodation_mgt` 활성화 (fallthrough 추가).
  - `crm-quotes.ts` convert-to-contract: quote에 `campApplicationId`가 있을 경우 `camp_applications.contract_id` 업데이트 + `application_status = 'confirmed'` (raw SQL, 순환 import 회피).
  - `camp-applications.ts` convert-to-quote: 중복 호출 방어 로직 순서 수정 (quoteId 존재 시 409, 상태 오류 시 400).

## Recent Changes (2026-03-25)

- **Visa Services Module**: New full-featured service module at `/admin/services/visa`.
  - DB table: `visa_services_mgt` (fields: visaType, country, applicationDate, appointmentDate, submissionDate, decisionDate, visaNumber, startDate/endDate, status, serviceFee, apCost, notes).
  - 7 statuses: pending, applied, in_review, approved, rejected, expired, cancelled.
  - Detail page has 6 tabs: Overview, Timeline (visual visa milestone tracker), Documents, Bill, Payments, Notes.
  - API routes: `GET/POST /api/services/visa`, `GET/PATCH /api/services/visa/:id`.
  - Sidebar icon: `Stamp` (lucide-react), added after "Other Services" in Services section.
- **Mobile Responsiveness**: Tab bars across all service detail pages, AccountDetail, LeadDetail, ContactDetail, ArApTracker, PaymentsPage given `overflow-x-auto`. PaymentsPage and JE tables given `min-w-[700px]`/`min-w-[800px]`. ContractDetailPage and ArTimeline table containers changed from `overflow-hidden` → `overflow-x-auto`.

## Recent Changes (2026-03-24)

- **Camp Contract Services Tab**: `camp-contract-detail.tsx` Services tab replaced with clickable institute/tour card layout → dedicated detail pages. Added `AddInstituteModal` / `AddTourModal`; removed old 4-dialog components.
- **Navigation Reorder**: App sidebar category order updated: Camp → Services → Products → Finance.
- **Pickup Redesign**: `pickup.tsx` uses `ListToolbar`/`ListPagination`/clickable rows + Today's Pickups banner; `pickup-detail.tsx` fixed field names, statuses, 4-tab layout.
- **Bug Fix — Contract Number Generation**: `genContractNumber()` introduced in `crm-quotes.ts` to replace `CT-{accountName}-{date}` format. New format: `CT-YYYYMMDD-XXXXX` (max 18 chars, unique). Fixes both duplicate key and varchar(50) overflow errors.
- **10-Case E2E CRM Test**: Full end-to-end workflow created for 10 students (5 general CRM + 5 camp CRM). Each case covers: Contact → Lead → Consultation → Quote → Contract → Services → AR Payment → AP Payment → Journal Entries. Total: 10 contacts, 10 leads, 10 quotes, 10 contracts, 15 service records, 25 payment headers, 25 journal entries automatically generated.

## Recent Changes (2026-03-27)

- **Always-Editable Inline Edit Pattern** (all detail pages):
  - All detail pages converted to always-editable inline edit mode (Lead Detail pattern).
  - **Pattern**: `isDirty` state + `mark()` setter + `discard()` reset. Discard/Save buttons and amber unsaved banner appear **only when dirty**. No "Edit Mode" toggle.
  - **Converted pages**: pickup-detail, tour-detail, application-detail, camp-application-detail, OtherServiceDetailPage, VisaServiceDetailPage, AccommodationDetailPage (DetailsTab + HostTab), InternshipDetailPage (StudentProfileTab + CompanyMatchTab + ProgressTab), GuardianDetailPage (DetailsTab), ContactDetailPage, AccountDetailPage, StudyAbroadDetailPage (OverviewTab inline — removed `EditSADetailsModal` dialog; SchoolsTab now always-visible status select; VisaTab isDirty).
  - **settlement-detail ChecklistRow**: Removed `editingNote` toggle → textarea always visible when expanded; Save/Cancel shown only when value changed.
  - **ContractDetailPage**: Retains modal dialog pattern (editingContract/editingAccount) — modal dialogs inherently have Cancel so the pattern is consistent.
  - `useDetailEdit` hook updated with `alwaysEdit: true` + `isDirty` support. `DetailPageLayout` accepts `isDirty` prop for unsaved banner.

## External Dependencies

-   **Replit Gemini**: AI integration (`gemini-2.5-flash`) for the chatbot.
-   **Google Cloud Storage (GCS)**: Replit's provisioned object storage for file uploads.
-   **googleapis**: Used for importing Google Docs into the chatbot's knowledge base.
-   **PostgreSQL**: Primary database for all application data.
-   **Drizzle ORM**: TypeScript ORM for interacting with PostgreSQL.
-   **bcryptjs**: For password hashing in authentication.
-   **@react-pdf/renderer**: Used for generating PDF versions of program reports.
-   **TanStack Query v5**: For data fetching and caching in the frontend.
-   **react-hook-form**: For form management in the frontend.
-   **zod**: For schema validation (frontend forms, backend API).
-   **wouter**: Lightweight React router.
-   **react-i18next**: For internationalization.
-   **recharts**: For charting (if used for dashboard KPIs).
-   **shadcn/ui**: UI component library.
## Phase N: Original Name + English Name Fields (March 2026)

### DB Changes
- `application_participants`: Added `english_name VARCHAR(255)`, `camp_application_id UUID REFERENCES camp_applications(id) ON DELETE CASCADE`
- `camp_applications`: Added `applicant_original_name VARCHAR(255)`, `applicant_english_name VARCHAR(255)`
- `study_abroad_mgt`: Added student participant fields (`student_first_name`, `student_last_name`, `student_english_name`, `student_original_name`, `student_date_of_birth`, `student_gender`, `student_nationality`, `student_passport_number`, `student_passport_expiry`, `student_grade`, `student_school_name`)

### Schema Changes
- `applications.ts` `applicationParticipants`: Added `campApplicationId`, `englishName`
- `camp.ts` `campApplications`: Added `applicantOriginalName`, `applicantEnglishName`
- `services.ts` `studyAbroadMgt`: Added all student participant fields

### API Changes
- `camp-applications.ts` GET/:id: Now joins `application_participants` via `campApplicationId` and returns `participants` array
- `camp-applications.ts` PUT: Added `applicantOriginalName`, `applicantEnglishName` to ALLOWED_FIELDS
- `applications.ts` POST participants: Now accepts `campApplicationId` (stores `applicationId=null`), `englishName`
- `applications.ts` PATCH participants: Added `englishName`
- `services-study-abroad.ts` PATCH: Added all student participant fields

### Frontend Changes
- `ParticipantDialogs.tsx`: Renamed "Full Name (Native Script)" → "Original Name (한글이름 등)"; added "English Name (Nick Name)" field; updated both Edit and Add dialog states
- `camp-application-detail.tsx`: Added `Original Name` + `English Name (Nick Name)` editable fields in Overview; fixed participant creation to use `campApplicationId`; added "Original Name" and "English Name" columns to participants table
- `application-modal.tsx`: Added `englishName` to PrimaryStudent type + default + form field + submit payload + review screen; renamed "nativeName" i18n key value to "Original Name"
- `StudyAbroadDetailPage.tsx`: Added SARecord student field types; added "Student Participant" info panel in OverviewTab; extended EditSADetailsModal with full student form (firstName, lastName, originalName, englishName, DOB, gender, nationality, passport, grade, school)

### i18n
- All 4 locales (en/ko/ja/th): `nativeName` value → "Original Name" / locale equivalent; added `englishName` key

## Phase N+1: Finance Pipeline DB & Schema Fixes (March 2026)

### Root Cause Fixed
- Drizzle ORM schema defined columns that did NOT exist in the actual DB, causing all ORM queries on those tables to fail with 500 errors.
- Pattern: schema had `gstAmount: decimal("gst_amount", ...)` but DB only had `tax_amount`.

### DB Column Additions (via direct ALTER TABLE)
- `invoices`: Added `invoice_ref`, `school_account_id`, `student_account_id`, `program_name`, `student_name`, `course_start_date`, `course_end_date`, `is_gst_free`, `pdf_url`, `sent_to_email`, `sent_at`
- `applications`: Added `agent_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL`

### Schema Fixes
- `lib/db/src/schema/finance.ts`: Removed `gstAmount: decimal("gst_amount", ...)` (column doesn't exist in DB; `taxAmount` → `tax_amount` already covers it)

### Route Architecture Fixes
- `artifacts/api-server/src/routes/invoices.ts`: Rewritten with full CRUD (GET list with filters/pagination, GET/:id, POST, PUT/:id, DELETE/:id)
- `artifacts/api-server/src/routes/index.ts`: Changed `router.use(invoicesRouter)` → `router.use("/invoices", invoicesRouter)` to prevent `GET /:id` wildcard from catching other routes
- `artifacts/api-server/src/routes/accounting-arap.ts`: Fixed payment-schedule query — removed `contacts` JOIN (uses `contracts.studentName` directly instead of non-existent `contracts.customerContactId`)

### Sample Data
- 20 invoices: 10 client, 5 agent, 5 partner (all with `student_name`, `program_name` populated)
- All 50 payments linked to contractId

### All 24 Key API Endpoints Verified at 200
- `/api/invoices` (+ `?invoiceType=agent/partner/client`)
- `/api/accounting/payments`, `/api/accounting/journal-entries`
- `/api/accounting/ar`, `/api/accounting/ap`, `/api/accounting/ar/summary`
- `/api/accounting/coa`, `/api/accounting/payment-schedule`
- `/api/crm/accounts`, `/api/crm/contacts`, `/api/crm/contracts`
- `/api/contracts`, `/api/transactions`, `/api/receipts`, `/api/exchange-rates`
- `/api/ledger/balance/:userId`, `/api/commissions`
- `/api/applications`, `/api/packages`
- `/api/dashboard/stats`, `/api/dashboard/crm/kpi`

## Team Feature (Implemented)
### New Database Objects
- `teams` table: id, name, description, type, color, team_lead_id (→users), status, created_at, updated_at
- `users.team_id UUID` column added (→teams, ON DELETE SET NULL)

### New API Endpoints (`/api/teams`)
- `GET /api/teams` — list with search/type/status filters + member counts + lead names
- `GET /api/teams/:id` — detail with members array + teamLeadName
- `GET /api/teams/:id/performance` — member count, totalApplications, approvedApplications
- `POST /api/teams` — create team (admin only)
- `PATCH /api/teams/:id` — update team (admin only)
- `DELETE /api/teams/:id` — delete team, unassigns members (admin only)
- `PATCH /api/teams/:id/members` — bulk add/remove members `{ add: string[], remove: string[] }`

### New Frontend Pages
- `/admin/teams` → `TeamsPage.tsx` — filterable list with colour badges, member count, create dialog, delete
- `/admin/teams/:id` → `TeamDetailPage.tsx` — detail + members tab + performance stats + add/remove members dialog

### Updated Pages
- `user-detail.tsx`: Team assignment select in Account section (admin only, links to team API)
- `app-sidebar.tsx`: "Teams" link added to Admin section (Users2 icon)
- `App.tsx`: Team routes registered under AdminRoute guard

## Phase 1 Multi-Tenant Implementation (Completed)

### DB Schema Extensions (`lib/db/src/schema/`)

**`settings.ts`:**
- `organisations` table: 40+ columns — status, subdomain (UNIQUE), custom domain + 4 DNS columns (`dns_status`, `dns_token`, `dns_verified_at`, `ssl_status`), branding, address, bank details, locale, SaaS plan/subscription, feature flags, `onboarded_at`
- `domain_configs` table: per-tenant custom domain DNS/SSL tracking (organisation_id UNIQUE FK, dns_record_type/name/value, dns_verification_token, dns_status, ssl_status, ssl_issued/expires_at, last_checked_at, check_attempts, error_message, status for soft-delete)
- `tenant_invitations` table: email, role, token, status, expiresAt, createdBy
- `tenant_audit_logs` table: orgId, actorId, action, entityType, entityId, before/after JSONB, ip
- `platform_plans` table: 4 plan codes (solo, starter, growth, enterprise); feature flags as individual boolean columns

**`product-catalog.ts`:**
- `product_groups.name` → UNIQUE constraint added
- `tax_rates.name` → UNIQUE constraint added

**`accounting.ts`:**
- `cost_centers` table: code (UNIQUE), name (UNIQUE), description, status — seeded with 4 global entries (GEN, OPS, MKT, FIN)
- `payment_infos` table: name (UNIQUE), paymentMethod, currency, isDefault, status — seeded with 3 entries (Bank Transfer, Credit Card, Cash)

### Backend Middleware & Routes (`artifacts/api-server/src/routes/`)
- `tenantResolver.ts` middleware: globally registered in `routes/index.ts` before auth routes; resolves org from JWT claim, attaches `req.org`
- `superAdminOnly.ts` middleware: guards super admin endpoints
- `tenant-settings.ts`: `/api/settings/company`, `/api/settings/branding`, `/api/settings/domain`, `/api/settings/domain/check`, `/api/settings/plan`, `/api/settings/plans/available`, `/api/settings/users`, `/api/settings/invitations`
- **Reserved Subdomain Util (Fix 17):** `artifacts/api-server/src/utils/reservedSubdomains.ts` — 50개 예약어 목록, `isReservedSubdomain(subdomain)` 함수 export; `POST /domain/check` + `PUT /domain/subdomain` 양쪽 엔드포인트에서 공통 사용; 인라인 RESERVED 배열 제거
- **Branding Upload (Fix 14~15):** `POST /branding/logo` (PNG/JPG/SVG/WEBP, 2MB 제한, Base64 → `organisations.logo_url`), `POST /branding/favicon` (ICO/PNG, 500KB 제한, Base64 → `organisations.favicon_url`); 기존 product image 갤러리와 동일한 Base64→DB 패턴 (Helium PostgreSQL / GCS 차단 환경)
- **Domain API (Fix 8~13):** `PUT /domain/subdomain` (예약어·중복·형식 검사 후 저장), `PUT /domain/custom` (Growth+ 플랜 확인 후 TXT 토큰 생성 + upsert), `GET /domain/dns-instructions` (CNAME+TXT 레코드 안내), `POST /domain/custom/verify` (Node `dns/promises`로 TXT+CNAME 조회 → status 업데이트), `GET /domain/custom/status` (폴링용 상태 반환), `DELETE /domain/custom` (Soft Delete + 조직 도메인 필드 초기화)
- `superadmin.ts`: `/api/superadmin/stats`, `/api/superadmin/tenants` (CRUD), `/api/superadmin/plans` (CRUD), `/api/superadmin/tenants/:id/seed-status`, `/api/superadmin/tenants/:id/re-seed`

### Onboarding Service (`artifacts/api-server/src/services/onboardingService.ts`)
- `onboardTenant(orgId)`: seeds 7 global master tables: taxRates, productGroups, productTypes, chartOfAccounts, teams, costCenters, paymentInfos; marks `onboarded_at`
- `getSeedStatus(orgId)`: returns count/required/ok for all 7 seed tables + `allComplete` flag
- All seed functions use `onConflictDoNothing` where UNIQUE constraints exist; select-guard for others
- Called non-fatally from `POST /superadmin/tenants` (new tenant creation) and `POST /superadmin/tenants/:id/re-seed` (idempotent re-run)

### Frontend Settings Pages (`artifacts/edubee-camp/src/pages/admin/settings/`)
- `company-profile.tsx`: Company name, trading name, ABN, phone, email, website, address, bank info, localisation
- `branding.tsx`: Logo, favicon URL, primary/secondary/accent colour pickers with live preview, custom CSS (collapsible)
- `domain-access.tsx`: Subdomain availability checker + save; Custom domain (locked, Professional plan+)
- `users-teams.tsx`: Invite by email + role, current user list, pending invitations with cancel
- `plan-billing.tsx`: Current plan summary with usage bars, plan comparison cards with features, payment info

### Super Admin Panel (`artifacts/edubee-camp/src/pages/admin/superadmin/`)
- `SuperAdminLayout.tsx`: Dark sidebar layout with red ⚠️ SUPER ADMIN MODE banner; nav: Dashboard / Tenants / SaaS CRM / Plans / Stripe
- `SuperAdminDashboard.tsx`: Platform stats (total/active/trial tenants, users, students), plan distribution chart
- `TenantList.tsx`: Paginated tenant table with search, inline plan change, suspend/activate
- `TenantDetail.tsx`: Full tenant detail + seed-status panel
- `PlatformPlans.tsx`: CRUD for platform plan catalogue
- `StripeSettings.tsx`: API key status, webhook URL copy, plan Price ID editor
- `PlatformCrm.tsx`: SaaS Prospect list with pipeline stats (New/Contacted/Demo/Trial/Converted/Lost), search, status filter
- `PlatformCrmDetail.tsx`: Prospect detail — company info, status picker, notes editor, contacts panel, activity timeline

### Platform CRM Tables (Phase 4)
- `platform_prospects` — SaaS subscription prospect companies (no organisation_id; 13 cols)
- `platform_contacts` — Contacts at prospect companies (8 cols, FK → platform_prospects, CASCADE)
- `platform_activities` — Sales activity log: call/email/demo/meeting/note (10 cols, FK → platform_prospects)
- Schema: `lib/db/src/schema/platform-crm.ts` — exported from index
- API: `artifacts/api-server/src/routes/platform-crm.ts` — all endpoints require `superAdminOnly` middleware
  - `GET /api/platform-crm/stats` — pipeline count by status
  - `GET/POST /api/platform-crm/prospects` — list + create
  - `GET/PATCH/DELETE /api/platform-crm/prospects/:id` — detail (includes contacts + activities), update, delete
  - `POST /api/platform-crm/prospects/:id/contacts` — add contact
  - `PATCH/DELETE /api/platform-crm/contacts/:id` — edit/remove contact
  - `POST /api/platform-crm/prospects/:id/activities` — log activity
  - `DELETE /api/platform-crm/activities/:id` — remove activity

### CRM / SuperAdmin Separation (Audited & Fixed)
- `app-sidebar.tsx`: SuperAdmin links removed from CRM sidebar (role-conditional nav block deleted)
- `SuperAdminGuard.tsx` (`src/components/guards/`): standalone route guard — unauthenticated → `/login`, non-super_admin → `/admin/dashboard`
- `App.tsx`: All `/superadmin/*` routes wrapped with `<SuperAdminGuard>`
- `SuperAdminLayout.tsx`: Auth logic stripped (guard handles it); red warning banner retained
- `routes/index.ts`: `tenantResolver` globally registered between storage and auth routers

### Updated Navigation
- `app-sidebar.tsx`: 5 Settings items (Company Profile, Branding, Domain, Users & Teams, Plan & Billing)
- `App.tsx`: Routes for `/admin/settings/{company,branding,domain,users-teams,plan}` and guarded `/superadmin`, `/superadmin/tenants`, `/superadmin/tenants/:id`, `/superadmin/plans`

---

## Edubee Portal (`artifacts/edubee-portal` at `/portal/`)

Unified stakeholder portal for agents, partners, and students. Single login → role-based redirect.

### Architecture
- **Auth**: Shared `/api/auth/login` returns `userType:"portal"` JWT with `portalRole`, `accountId`, `accountName`
- **JWT Payload**: `{ userType:"portal", accountId, email, portalRole, accountName }`
- **Schema routing**: Portal account identity in PUBLIC schema (`staticDb`); business data in tenant schema (`db`)
- **Tenant resolution**: All `/portal/*` paths use myagency schema via `PLATFORM_SUBDOMAIN=myagency` fallback
- **Portal router**: Registered BEFORE global-middleware routers (settings-lookups, data-manager) to avoid auth interception
- **Middleware**: `authenticatePortal.ts` sets `req.portalUser` (not `req.user`) — separate from staff auth

### Portal Roles (portalRole field in accounts table)
- `consultant` / `agent` → Phase 1: Agent Dashboard (COMPLETE)
- `hotel` / `pickup` / `institute` / `tour` → Phase 2: Partner Dashboard (COMPLETE)
- `student` → Phase 3: Student Dashboard (COMPLETE)

### Login → Role Redirect
- `auth.tsx` `login()` returns `{ mustChangePassword, portalRole }`
- `login.tsx` calls `getHomePath(role)` → `/dashboard` | `/partner/dashboard` | `/student/dashboard`
- `App.tsx` `<RootRedirect />` handles `/` redirect based on `user.portalRole`
- `portal-layout.tsx` renders role-adaptive sidebar nav (AGENT_NAV / PARTNER_NAV / STUDENT_NAV)

### Phase 1 — Agent Dashboard (COMPLETE)
**Pages**: Login, Dashboard (6 stat cards), Students (searchable list), Student Detail (quotes), Commissions (invoice table + summary), Profile (edit + change password)
**API Routes** (`/api/portal/*`): `GET /me`, `GET /dashboard/summary`, `GET /students`, `GET /students/:id`, `GET /commissions`, `GET /quotes`, `PUT /profile`, `POST /change-password`
**Features**: `mustChangePassword` flow (redirects to Profile with amber warning banner after first login)

### Phase 2 — Partner Dashboard (COMPLETE)
**Pages**: `/partner/dashboard` (booking + revenue summary), `/partner/bookings` (booking table with student info + AP payment status), `/partner/profile` (shared Profile page)
**API Routes**: `GET /portal/partner/summary`, `GET /portal/partner/bookings`
**Data source**: `contract_products.providerAccountId` = partner accountId (leftJoin contracts for student info)
**Role guard**: `requirePartnerRole` middleware checks `PARTNER_ROLES = ["institute","hotel","pickup","tour"]`

### Phase 3 — Student Dashboard (COMPLETE)
**Pages**: `/student/dashboard` (quote + program summary), `/student/quotes` (quote list), `/student/programs` (contract list with payment details), `/student/profile`
**API Routes**: `GET /portal/student/summary`, `GET /portal/student/quotes`, `GET /portal/student/programs`
**Data source**: `quotes.studentAccountId` (student quotes), `contracts.accountId` (enrolled programs)
**Role guard**: `requireStudentRole` middleware checks `portalRole === "student"`

### Key Files
- `artifacts/api-server/src/routes/portal.ts` — all portal API routes (Phase 1+2+3)
- `artifacts/api-server/src/middleware/authenticatePortal.ts` — portal JWT middleware
- `artifacts/edubee-portal/src/lib/auth.tsx` — AuthProvider + useAuth hook (login returns portalRole)
- `artifacts/edubee-portal/src/lib/api.ts` — fetch wrapper with Bearer token
- `artifacts/edubee-portal/src/components/portal-layout.tsx` — role-adaptive sidebar (agent/partner/student nav)
- `artifacts/edubee-portal/src/App.tsx` — all routes + RootRedirect for role-based home
- `artifacts/edubee-portal/src/pages/` — login, dashboard, students, student-detail, commissions, profile, partner-dashboard, partner-bookings, student-dashboard, student-quotes, student-programs

### Test Credentials (all use mustChangePassword on first login)
- `agent@testagency.com` / `Agent1234!` — portalRole: consultant → `/dashboard`
- `partner@browns.com.au` / `Partner1234!` — portalRole: institute (BROWNS) → `/partner/dashboard`
- `partner@bradyhotel.com` / `Partner1234!` — portalRole: hotel (Brady Hotel HQ) → `/partner/dashboard`
- `student@example.com` / `Student1234!` — portalRole: student (Ji Young CHOI) → `/student/dashboard`
