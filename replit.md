# Edubee Camp Platform

## Overview

Edubee Camp is a comprehensive multi-operator educational camp marketplace platform. It connects educational agencies, camp coordinators, partner institutes, and parent clients to manage student enrollments end-to-end.

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

## User Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full platform control |
| `admin` | Platform management, all data |
| `camp_coordinator` | External partner: registers & operates own camps |
| `education_agent` | Sales partner: consults clients, submits applications |
| `partner_institute` | Service partner: provides educational programs |
| `partner_hotel` | Service partner: provides accommodation |
| `partner_pickup` | Service partner: provides transportation |
| `partner_tour` | Service partner: provides tour activities |
| `parent_client` | End customer: monitors child's program |

## Seed Credentials (all use password: `password123`)

- Super Admin: `superadmin@edubee.com`
- Admin: `admin@edubee.com`
- Camp Coordinator: `coordinator@edubee.com`
- Education Agent: `agent@edubee.com`
- Parent Client: `parent@example.com`
- Partner Institute: `institute@example.com`

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
│           ├── contracts.ts    # contracts, instituteMgt, hotelMgt, pickupMgt, tourMgt, settlementMgt
│           ├── documents.ts    # documentCategories, documents, permissions
│           ├── finance.ts      # exchangeRates, banking, invoices, transactions, receipts
│           └── reports.ts      # programReports, notifications, tasks
├── scripts/
│   └── src/seed.ts         # Database seed script
└── pnpm-workspace.yaml
```

## API Routes

- `POST /api/auth/login` — JWT login
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Logout
- `GET  /api/auth/me` — Current user
- `GET|POST /api/users` — User management
- `GET|POST /api/package-groups` — Package group management
- `GET|POST /api/packages` — Package management
- `GET|POST /api/products` — Product management
- `GET|POST /api/leads` — Lead CRM
- `GET|POST /api/applications` — Application management
- `PUT  /api/applications/:id/status` — Update application status
- `GET|POST /api/contracts` — Contract management
- `GET|POST /api/invoices` — Invoice management
- `GET|POST /api/transactions` — Transaction log
- `GET|POST /api/exchange-rates` — Exchange rates
- `GET  /api/dashboard/stats` — Dashboard statistics
- `GET  /api/notifications` — User notifications
- `PUT  /api/notifications/:id/read` — Mark notification read

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
