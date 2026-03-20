# Edubee Camp Platform

## Overview

Edubee Camp is a comprehensive multi-operator educational camp marketplace platform. It connects educational agencies, camp coordinators, partner institutes, and parent clients to manage student enrollments end-to-end.

## Key Features Added (Dual Currency Display)
- **API**: `GET /api/public/exchange-rates` — returns latest X→AUD rates per currency (no auth required)
- **Context**: `DisplayCurrencyContext` (`src/context/DisplayCurrencyContext.tsx`) — `convertPrice()`, `formatReference()`, localStorage persistence, browser lang detection
- **Components**:
  - `CurrencySelector` (`src/components/public/currency-selector.tsx`) — dropdown with flag + currency code (default + mobile variants)
  - `DualPriceDisplay` (`src/components/public/dual-price-display.tsx`) — local price (orange, bold) + reference price (italic, muted) when currencies differ
- **Landing Navbar**: CurrencySelector added next to LanguageSwitcher (desktop + mobile menu)
- **Program Card**: `DualPriceDisplay` replaces static `displayFormatted` text
- **Program Detail Drawer**: Package table rows use `DualPriceDisplay`; orange PriceInfoBox shown when currencies differ
- **Application Modal**: Step 1 shows price summary card with `DualPriceDisplay` + billing warning; Step 4 review shows package price
- **i18n**: `currency.*` keys added to all 4 locale files (en/ko/ja/th)

## Key Features Added (Program Reports Module)
- **DB**: `program_reports` (with `deletedAt`), `report_sections` tables — fully deployed
- **Service**: `autoPopulateSections(contractId)` — pulls data from institute_mgt, hotel_mgt, pickup_mgt, tour_mgt, application_participants; returns 6 section objects
- **API Routes** (all under `/api/reports`, `authenticate` middleware applied):
  - `GET /` — role-scoped list (SA/admin=all, CC=own contracts, EA/parent=published only)
  - `POST /` — create with auto-populated 6 sections; 409 if duplicate per contract
  - `GET /:id` — full detail with sections; draft → 403 for EA/parent
  - `PUT /:id` — update title/notes; 400 if published (unpublish first)
  - `PATCH /:id/publish` — publish + send notifications to agent & client
  - `PATCH /:id/unpublish` — admin+ only; sets back to draft
  - `DELETE /:id` — super_admin only; soft-delete via `deletedAt`
  - `PATCH /:id/sections/:sectionId` — update any field of a section (freeform JSONB content)
  - `POST /:id/sections` — add custom section only (sectionType='custom')
  - `DELETE /:id/sections/:sectionId` — delete custom sections only; rejects default section types
  - `PATCH /:id/sections/reorder` — atomic reorder via transaction; body `{ orderedIds: string[] }`
  - `POST /:id/sync` — re-populate unedited sections; skips manually-edited ones
  - `GET /:id/pdf` — scoped like GET /:id; returns PDF binary
- **Frontend** (`/admin/reports`): separate `GET /api/reports/:id` fetch on section detail open (fixes empty sections bug)
- **Seed Data**: "John Smith — Leadership Camp Report", published, contract CNT-2501-1003, 6 sections with academic schedule + summary
- **Visual Assets**: `EdubeeLogo`, `ReportSymbol` (15 symbols), `SectionHeader`, `ReportStatusBadge` components in `shared/`
- **PDF utility**: `PdfLogo.tsx` in `api-server/src/utils/` using `@react-pdf/renderer`

## Key Features Added (Tasks/CS System)
- **DB**: `tasks`, `task_attachments`, `task_comments` tables in `lib/db/src/schema/reports.ts`
- **API**: `/api/public/tasks` (no auth), `/api/tasks` CRUD with role-scoped access
- **Admin Page**: `/admin/services/tasks` — List + Kanban view, detail drawer with comments thread
- **Landing Page**: Contact Us section (above footer) → submits to `POST /api/public/tasks`, shows TSK-YYYY-XXXX confirmation
- **Sidebar**: "Tasks / CS" (Ticket icon) added to Services section for all roles

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Routing**: wouter (React router)
- **State**: TanStack Query v5
- **Forms**: react-hook-form + zod
- **Charts**: recharts
- **i18n**: react-i18next (en, ko, ja, th)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (access 8h + refresh 7d) with bcryptjs
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## User Roles & Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| `super_admin` | 100 | Full platform control |
| `admin` | 80 | Platform management, all data |
| `camp_coordinator` | 60 | External partner: registers & operates own camps |
| `education_agent` | 40 | Sales partner: consults clients, submits applications |
| `partner_institute` | 30 | Service partner: provides educational programs |
| `partner_hotel` | 30 | Service partner: provides accommodation |
| `partner_pickup` | 30 | Service partner: provides transportation |
| `partner_tour` | 30 | Service partner: provides tour activities |
| `parent_client` | 20 | End customer: monitors child's program |

## Seed Credentials (all use password: `password123`)

- Super Admin: `superadmin@edubee.com`
- Admin: `admin@edubee.com` / `ops@edubee.com`
- Camp Coordinator: `coordinator@edubee.com` / `coord1@edubee.com`
- Education Agent: `agent@edubee.com`
- Parent Client: `parent@example.com` / `parent1@gmail.com`
- Partner Institute: `institute@example.com`
- Partner Hotel: `hotel@example.com`
- Partner Pickup: `driver@pickup.com`
- Partner Tour: `guide@tours.com`

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (JWT auth + all routes)
│   └── edubee-camp/        # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts        # users, refreshTokens, pagePermissions
│           ├── packages.ts     # packageGroups, packages, products, enrollmentSpots
│           ├── applications.ts # leads, applications, participants, interviews
│           ├── contracts.ts    # contracts, instituteMgt, hotelMgt, pickupMgt, tourMgt
│           ├── documents.ts    # documentCategories, documents, permissions
│           ├── finance.ts      # exchangeRates, banking, invoices, transactions, receipts
│           └── reports.ts      # programReports, notifications, tasks
├── scripts/
│   └── src/seed.ts         # Database seed script
└── pnpm-workspace.yaml
```

## Frontend Routes

### Public
- `/` — Landing page (programs, hero, CTA)
- `/login` — Admin login with demo role chips + language switcher

### Admin Panel (all under `/admin/`)
- `/admin/dashboard` — Role-adaptive KPIs + quick actions
- `/admin/leads` — Leads CRM (kanban board, 6 status columns, drag-drop)
- `/admin/applications` — Table (row-click → detail); `/admin/applications/:id` — Detail page
- `/admin/contracts` — Table (row-click → detail); `/admin/contracts/:id` — Detail page (tabs: General, Services, Accounting)
- `/admin/package-groups` — Card grid (clickable → detail) + create/edit modal; `/admin/package-groups/:id` — Detail page with tabs: General, Packages (auto-convert toggle), Enrollment Spots, Interview
- `/admin/packages` — Stub
- `/admin/products` — Full table with AUD cost + ≈ KRW + ≈ PHP converted columns; CRUD modal
- `/admin/services/institute` — Table (row-click → detail); `/:id` detail page
- `/admin/services/hotel` — Table (row-click → detail); `/:id` detail page
- `/admin/services/pickup` — Table (row-click → detail); `/:id` detail page
- `/admin/services/tour` — Table (row-click → detail); `/:id` detail page
- `/admin/services/settlement` — Table (row-click → detail); `/:id` detail page (in SERVICES, NOT Accounting)
- `/admin/services/interviews` — Stub
- `/admin/accounting/exchange-rates` — Live preview strip (1 AUD = X rates), rate cards with timestamps, add dialog with real-time preview + descriptive save toast
- `/admin/accounting/client-invoices|agent-invoices|partner-invoices|receipts|transactions` — Stubs
- `/admin/users` — Table (row-click → detail); `/admin/users/:id` — Detail page
- `/admin/my-accounting/settlements|invoices|revenue` — Stubs
- `/admin/reports` — Stub
- `/admin/settings/general|page-access|field-permissions|doc-permissions|impersonation-logs` — Stubs
- `/admin/my-programs` — Stub (parent_client only)

## Admin Panel Architecture

### Layout
- `MainLayout` — Custom flex layout (no Shadcn SidebarProvider)
- `AppSidebar` — Custom dark sidebar (#0F172A), 240px expanded / 64px collapsed
  - Navigation is role-adaptive (built from user's `effectiveRole`)
  - Effective role = viewAsUser.role if impersonating, else user.role
- `Header` — Page title + "View as" role switcher + notification bell + avatar dropdown
  - Impersonation banner shows when ViewAs is active (amber strip)

### Shared Components & Hooks
- `src/components/shared/DetailPageLayout.tsx` — Shared detail page layout with back button, tab nav, edit/save/cancel controls. Sub-exports: `DetailSection`, `DetailRow`, `EditableField`
- `src/hooks/useDetailEdit.ts` — Edit state management hook for detail pages (isEditing, getValue, handleChange, startEdit, cancelEdit, saveEdit)
- `src/components/ui/list-toolbar.tsx` — Search bar + total count + add button + optional status filter + CSV export trigger
- `src/components/ui/list-pagination.tsx` — Paginated nav for list pages

### Hooks
- `use-auth.tsx` — JWT auth context, fetch interceptor injects:
  - `Authorization: Bearer <token>` 
  - `X-View-As-User-Id: <id>` (if impersonating)
  - On 401 → clears token + redirects to /login
  - On login success → redirects to /admin/dashboard
- `use-view-as.tsx` — ViewAs context with sessionStorage persistence (`edubee_view_as`)
  - ROLE_HIERARCHY, ROLE_LABELS, ROLE_EMOJIS exports
  - getViewAsUserId() helper (reads sessionStorage directly for fetch interceptor)

## API Routes

### Auth
- `POST /api/auth/login` — JWT login
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Logout
- `GET  /api/auth/me` — Current user

### Users
- `GET|POST /api/users` — User management
- `GET  /api/users/switchable` — Returns users with lower role hierarchy (for ViewAs switcher). MUST be registered BEFORE /:id route.
- `GET|PUT|DELETE /api/users/:id` — Single user

### Programs
- `GET|POST /api/package-groups` — Package group management
- `GET|POST /api/packages` — Package management
- `GET|POST /api/products` — Product management

### Sales
- `GET|POST /api/leads` — Lead CRM
- `PUT  /api/leads/:id/status` — Update lead status
- `GET|POST /api/applications` — Application management
- `PUT  /api/applications/:id/status` — Update application status
- `POST /api/applications/:id/convert-contract` — Convert approved application to contract (creates contract + seeds instituteMgt/hotelMgt/pickupMgt/tourMgt)
- `GET|POST /api/contracts` — Contract management

### Finance
- `GET|POST /api/invoices` — Invoice management
- `GET|POST /api/transactions` — Transaction log
- `GET|POST /api/exchange-rates` — Exchange rates

### Dashboard & Notifications
- `GET  /api/dashboard/stats` — Dashboard stats (totalLeads, activeLeads, totalApplications, pendingApplications, contractedApplications, totalContracts, activeContracts, totalUsers, activeUsers, recentApplications, recentLeads, applicationsByStatus)
- `GET  /api/notifications` — User notifications
- `PUT  /api/notifications/:id/read` — Mark notification read

### Public (no auth)
- `GET  /api/public/packages` — Active programs with localized names, country-currency prices, spot summaries
- `POST /api/public/applications` — Submit application, auto-generate APP number, decrement spots

## Key Design Rules

- **Primary color**: `#F08301` (hsl 33 99% 47%) orange — all accent elements use this
- **Flag rule**: English always uses 🇦🇺 (Australian flag), NEVER 🇺🇸
- **Country-currency**: AU→A$, PH→₱, SG→S$, TH→฿, KR→₩, JP→¥, GB→£
- **Contract numbers**: `CNT-YYYY-XXXX` format
- **Application numbers**: `APP-YYMMM-XXXX` format
- **Settlement page**: In SERVICES section, NOT Accounting
- **Route order**: `/api/users/switchable` must come BEFORE `/api/users/:id` to avoid shadowing

## Running

```bash
# Install all dependencies
pnpm install

# Push DB schema (dev)
pnpm --filter @workspace/db run push

# Seed database
pnpm --filter @workspace/scripts run seed

# Run codegen (after OpenAPI spec changes)
pnpm --filter @workspace/api-spec run codegen
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Run `pnpm run typecheck` from the root.

## Production Migrations

In development, use `pnpm --filter @workspace/db run push` or `push-force`. Production migrations are handled by Replit when publishing.
