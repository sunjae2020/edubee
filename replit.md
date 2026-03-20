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
-   **Object Storage & Thumbnail Upload**:
    -   Utilizes Replit GCS object storage for file uploads.
    -   API endpoints for requesting upload URLs and retrieving objects.
    -   `ThumbnailUploader.tsx` component for drag-and-drop image uploads with progress.
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