# Edubee Camp Platform

## Overview

Edubee Camp is a multi-operator educational camp marketplace platform designed to connect educational agencies, camp coordinators, partner institutes, and parent clients. Its primary purpose is to streamline the end-to-end management of student enrollments for various educational camps. The platform aims to provide a comprehensive solution for camp management, sales, finance, and communication, enhancing efficiency for all stakeholders in the educational camp ecosystem.

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
-   **User Roles**: Granular user role hierarchy (`super_admin`, `admin`, `camp_coordinator`, `education_agent`, `partner_institute`, `partner_hotel`, `partner_pickup`, `partner_tour`, `parent_client`) with adaptive access control.
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

## Recent Changes (2026-03-25)

- **Edit/Add Buttons on Service Detail Pages** (StudyAbroad, Accommodation, Internship, VisaService):
  - All 4 detail pages now have an **"Edit Details" / "Edit Host" / "Edit Profile" button** in the main page header.
  - **StudyAbroadDetailPage**: Added `EditSADetailsModal` (edits status, COE number/expiry, departure date, orientation, staff, notes). Overview tab Student & Contract cards have inline "Edit" buttons. Schools tab already has "Add School" + row edit icons.
  - **AccommodationDetailPage**: Extracted inline host tab to `HostTab` component with full edit form (host name, contact, address, distance, accommodation type, room type, meal, partner cost). Billing tab has "Edit Rates" button → navigates to Details tab.
  - **InternshipDetailPage**: `StudentProfileTab` now has inline edit mode (English level, hours/week, preferred industry as comma-list) + "Add Experience" button to add work experience entries. Header has "Edit Profile" button.
  - **VisaServiceDetailPage**: Timeline tab has "Edit Dates" button → switches to Overview tab. Bill tab has "Edit Fees" button → switches to Overview tab. Header has "Edit Details" button.

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