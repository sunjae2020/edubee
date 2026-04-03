# Edubee CRM — Platform Plans Page
## Replit Development Prompts

> **Usage Order:**
> Run Prompt 1 first → verify all 4 checks pass → then run Prompt 2.
> Do NOT run Prompt 2 until Prompt 1 is fully verified.

---

---

# PROMPT 1 — DB Schema + Backend API

```
## ANALYSIS FIRST — Do not write any code until you complete all steps below.

### Step 1: Read these files first
- /db/schema.ts  (check existing table patterns, naming conventions, and column types)
- /server/src/routes/ (list all existing route files, check auth middleware pattern)
- /db/migrations/ or check how Drizzle migrations are currently run in this project

Report back: existing table naming style (snake_case?), how drizzle-kit push or migrate
is triggered, and what auth middleware is used on admin routes.

---

### Step 2: After analysis, implement the following — only if I say "proceed"

#### 2a. Add `platform_plans` table to /db/schema.ts

Add the following table (do NOT modify any existing tables):

export const platformPlans = pgTable('platform_plans', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  monthlyPrice: numeric('monthly_price', { precision: 10, scale: 2 }).notNull().default('0'),
  annualPrice: numeric('annual_price', { precision: 10, scale: 2 }).notNull().default('0'),
  maxUsers: integer('max_users').notNull().default(5),
  maxStudents: integer('max_students').notNull().default(100),
  maxBranches: integer('max_branches').notNull().default(1),
  storageGb: integer('storage_gb').notNull().default(10),

  // Feature flags — each maps to a functional module in Edubee CRM
  featureCommission: boolean('feature_commission').notNull().default(false),
  featureVisa: boolean('feature_visa').notNull().default(false),
  featureServiceModules: boolean('feature_service_modules').notNull().default(false),
  // pickup, homestay, internship, settlement
  featureMultiBranch: boolean('feature_multi_branch').notNull().default(false),
  featureAiAssistant: boolean('feature_ai_assistant').notNull().default(false),
  featureAccounting: boolean('feature_accounting').notNull().default(false),
  // full double-entry AR/AP
  featureAvetmiss: boolean('feature_avetmiss').notNull().default(false),
  // Australian VET reporting
  featureApiAccess: boolean('feature_api_access').notNull().default(false),
  featureWhiteLabel: boolean('feature_white_label').notNull().default(false),
  isPopular: boolean('is_popular').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),

  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PlatformPlan = typeof platformPlans.$inferSelect;
export type InsertPlatformPlan = typeof platformPlans.$inferInsert;

Then run: `npx drizzle-kit push`
(or whatever migration command this project uses — check first)

---

#### 2b. Create /server/src/routes/platformPlans.ts

Implement full CRUD REST API:

- GET    /api/platform-plans         — list all plans (sorted by sort_order ASC)
- GET    /api/platform-plans/:id     — get single plan
- POST   /api/platform-plans         — create new plan (SuperAdmin only)
- PUT    /api/platform-plans/:id     — update plan (SuperAdmin only)
- DELETE /api/platform-plans/:id     — soft delete: set is_active = false (SuperAdmin only)

Rules:
- Use the same auth middleware pattern already present in other route files
  — do NOT write a new auth system
- Validate required fields on POST:
    code (unique, lowercase, no spaces), displayName, monthlyPrice, annualPrice
- On PUT, always update updatedAt = new Date()
- Return consistent JSON shape:
    { success: true, data: plan }   on success
    { success: false, error: string } on failure
- No TypeScript errors allowed — infer all types from the Drizzle schema

---

#### 2c. Register the route in the main server entry point

Find the main server file (likely server/src/index.ts or server/index.ts).
Import and register the new router at /api/platform-plans.
Do NOT modify any other existing route registrations.

---

### Step 3: Verification (required before reporting complete)

1. `npx tsc --noEmit` — 0 TypeScript errors
2. Server starts without runtime errors
3. Run: SELECT * FROM platform_plans LIMIT 3; — table exists and is accessible
4. Test: GET /api/platform-plans → returns { success: true, data: [] }

Report results in this format:
✅ Modified files: [list]
✅ Changes: [description]
✅ Verification: [tsc / server / DB / API results]
⚠️  Next step: [if any]
```

---

---

# PROMPT 2 — Frontend: Platform Plans Page

```
## ANALYSIS FIRST — Do not write any code until you complete all steps below.

### Step 1: Read these files first
- /client/src/pages/ — list all existing page files to understand routing pattern
- /client/src/components/ — check if a reusable Toggle/Switch component already exists
- Check how React Router routes are registered (likely App.tsx or router.tsx)
- Check if there is an existing admin layout or SuperAdmin guard component

Report back: routing file location, admin layout component name (if any),
and whether a Toggle switch component already exists.

---

### Step 2: After analysis, implement the following — only if I say "proceed"

#### Target UI: Platform Plans management page
Inline form panel (NOT a modal) with orange border — matches the provided screenshot.

---

#### 2a. Create /client/src/pages/admin/PlatformPlans.tsx

The page has two sections:
1. A list of existing plans (card grid)
2. A create/edit inline form panel

---

### DESIGN SYSTEM — strictly follow every rule below

Color palette:
  Primary accent:   #F5821F  (orange — buttons, active borders, focus rings)
  Accent dark:      #D96A0A  (hover/pressed)
  Accent light:     #FEF0E3  (tint — selected states, popular badge bg)
  Page background:  #FAFAF9
  Card background:  #FFFFFF
  Border default:   1.5px solid #E8E6E2
  Border active:    1.5px solid #F5821F
  Text primary:     #1C1917
  Text secondary:   #57534E
  Text placeholder: #A8A29E
  Divider:          #E8E6E2

Typography (Inter font):
  Page title:    24px / 600
  Card title:    16px / 600
  Form label:    12px / 500 / uppercase / letter-spacing 0.05em / color #57534E
  Body:          14px / 400
  Small/caption: 12px / 400

Inputs:
  height: 40px
  border: 1.5px solid #E8E6E2
  border-radius: 8px
  padding: 0 12px
  font-size: 14px
  focus: border-color #F5821F, box-shadow 0 0 0 3px rgba(245,130,31,0.15)

Buttons:
  Primary:   bg #F5821F, color #FFFFFF, border-radius 8px, padding 10px 20px,
             font 14px/600, hover bg #D96A0A + translateY(-1px)
  Secondary: bg #FFFFFF, border 1.5px #E8E6E2, color #1C1917,
             hover border #A8A29E, bg #FAFAF9
  Danger ghost: color #DC2626, bg transparent, hover bg #FEF2F2

Cards:
  background: #FFFFFF
  border: 1px solid #E8E6E2
  border-radius: 12px
  padding: 20px 24px
  box-shadow: 0 1px 3px rgba(0,0,0,0.06)

Active form card (the New/Edit Plan panel):
  border: 1.5px solid #F5821F   ← orange border as shown in screenshot

Icons: Lucide React, stroke-width 1.5, size 16px

---

### PAGE HEADER

Title:    "Platform Plans"
Subtitle: "Manage SaaS subscription plans available to tenants"
Action:   "+ Add New Plan" button (primary orange, top-right)
          — clicking opens the New Plan form panel, scrolls into view

---

### NEW PLAN / EDIT PLAN FORM PANEL

Inline card (not a modal). Appears below the header when "+ Add New Plan" is clicked,
or when "Edit" is clicked on a plan card.

Card header: "New Plan" or "Edit Plan" (16px / 600)

Form fields layout — 2-column grid, gap 16px:

  Row 1: CODE (left)  |  DISPLAY NAME (right)
    CODE input:
      - Placeholder: "e.g. starter"
      - Auto-convert to lowercase, strip spaces on change
      - Helper text below: "Lowercase letters, numbers, and hyphens only"
    DISPLAY NAME input:
      - Placeholder: "e.g. Starter"

  Row 2: MONTHLY PRICE (USD) (left)  |  ANNUAL PRICE (USD) (right)
    Both: number inputs, min 0, step 0.01, placeholder "0.00"

  Row 3: MAX USERS (left)  |  MAX STUDENTS (right)
    Both: number inputs, min 1

  Row 4: MAX BRANCHES (left)  |  STORAGE (GB) (right)
    Both: number inputs, min 1

FEATURES section:
  Section label: "FEATURES" (12px / 500 / uppercase / #57534E)
  margin-top: 24px, margin-bottom: 12px

  Feature toggle rows (each row: height 36px, display flex, align-items center, gap 12px):
  - [Toggle] Commission Auto-Calculation
  - [Toggle] Visa Management Module
  - [Toggle] Service Modules  (Pickup · Homestay · Internship · Settlement)
  - [Toggle] Multi-Branch Support
  - [Toggle] AI Assistant
  - [Toggle] Full Accounting Module (AR/AP)
  - [Toggle] AVETMISS Reporting  (Australian VET)
  - [Toggle] API Access
  - [Toggle] White-label & Custom Branding
  ────────────────── (divider line)
  - [Toggle] Mark as Popular   ← visually separated, below divider

Toggle switch implementation (plain CSS + checkbox — NO third-party library):
  Track:  width 36px, height 20px, border-radius 10px
  OFF:    background #E8E6E2
  ON:     background #F5821F
  Knob:   16px white circle, absolute positioned, transition transform 200ms
  The entire toggle row label is clickable (htmlFor on label)

Form action buttons (bottom, left-aligned, gap 8px):
  - "✓ Create Plan" / "✓ Save Changes"  (primary orange)
  - "× Cancel"                           (secondary)
  Cancel: collapse the form, reset all fields to empty/default

Form validation (inline, show error below the field):
  - code: required, must match /^[a-z0-9-]+$/
  - displayName: required
  - monthlyPrice: required, must be >= 0
  - annualPrice: required, must be >= 0
  - maxUsers, maxStudents, maxBranches, storageGb: required, must be >= 1

---

### PLAN CARDS LIST

Layout: CSS grid, repeat(auto-fill, minmax(280px, 1fr)), gap 16px
Show below the form panel (or fill the page when form is closed)

Each card:
  Header row:
    - Plan name (16px / 600) + CODE badge
      CODE badge: 12px, bg #F4F3F1, color #57534E, border-radius 999px, padding 2px 8px
    - "Most Popular" badge (if isPopular):
        bg #FEF0E3, color #F5821F, 12px / 500, border-radius 999px, padding 2px 10px

  Pricing row:
    - "$X / mo" (22px / 700 / #1C1917)
    - "$X / yr annual" (12px / #57534E)

  Limits row (12px / #57534E, gap 12px):
    👤 {maxUsers} users  ·  🎓 {maxStudents} students  ·  🏢 {maxBranches} branches

  Feature chips (only show ENABLED features):
    Pill style: bg #F4F3F1, color #57534E, 11px, border-radius 999px, padding 2px 8px
    Short labels: "Commission" | "Visa" | "Services" | "Multi-Branch" |
                  "AI" | "Accounting" | "AVETMISS" | "API" | "White-label"
    Wrap with gap 4px

  Card footer (border-top 1px #F4F3F1, padding-top 12px, margin-top 12px):
    - "Edit" button (ghost, Lucide Pencil icon, 12px)
    - "Deactivate" button (danger ghost, Lucide Trash2 icon, 12px)
    Both buttons right-aligned

Empty state (no plans):
  Centered within the content area
  Icon: Lucide LayoutGrid (40px, color #A8A29E)
  Heading: "No plans configured yet"  (16px / 600)
  Body:    "Create your first SaaS plan to get started"  (14px / #57534E)
  Button:  "+ Add New Plan"  (primary orange, centered)

---

#### 2b. API integration

Use fetch (or the existing API client pattern in this project — check before writing):

TypeScript type (define locally or import from shared types if they exist):

type PlatformPlan = {
  id: number;
  code: string;
  displayName: string;
  monthlyPrice: string;
  annualPrice: string;
  maxUsers: number;
  maxStudents: number;
  maxBranches: number;
  storageGb: number;
  featureCommission: boolean;
  featureVisa: boolean;
  featureServiceModules: boolean;
  featureMultiBranch: boolean;
  featureAiAssistant: boolean;
  featureAccounting: boolean;
  featureAvetmiss: boolean;
  featureApiAccess: boolean;
  featureWhiteLabel: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
};

Behaviour:
- On mount:       GET /api/platform-plans → populate card list
                  Show skeleton loader (shimmer: #F4F3F1 → #E8E6E2) while loading
- On create:      POST /api/platform-plans → on success, prepend card to list, close form
- On edit click:  Pre-fill all form fields with plan data, scroll form into view
- On save edit:   PUT /api/platform-plans/:id → on success, update card in list, close form
- On deactivate:  Show inline confirm: "Deactivate this plan?" [Confirm] [Cancel]
                  DELETE /api/platform-plans/:id → on success, remove card from list
- On any error:   Show red error banner below the form:
                  bg #FEF2F2, border 1px #FECACA, color #DC2626, border-radius 8px, padding 10px 14px
- While submitting: disable both form buttons, show spinner inside primary button

---

#### 2c. Register the route

Add the page to the router file.
Use the existing admin/SuperAdmin guard pattern — do NOT create a new auth guard.
Suggested path: /admin/platform-plans

Add a navigation link in the sidebar under the admin section (if an admin sidebar section exists).
Label: "Platform Plans", icon: Lucide CreditCard

---

### Step 3: Verification

1. `npx tsc --noEmit` — 0 TypeScript errors
2. Page renders at /admin/platform-plans without console errors
3. Create Plan: fill all fields + toggle Commission + AI on → click "Create Plan"
   → POST succeeds → new card appears in list without page refresh
4. Edit Plan: click Edit on the new card → form pre-fills → change displayName → Save
   → card title updates immediately
5. Deactivate: click Deactivate → confirm → card disappears from list
6. Cancel: open form → fill some fields → click Cancel → form closes, fields reset

Report results in this format:
✅ Modified files: [list]
✅ Changes: [description]
✅ Verification: [tsc / render / create / edit / deactivate / cancel results]
⚠️  Next step: [if any]
```

---

## Quick Reference — Feature Flag Mapping

| Toggle Label | DB Column | Unlocked from Plan |
|---|---|---|
| Commission Auto-Calculation | feature_commission | Starter |
| Visa Management Module | feature_visa | Starter |
| Service Modules (Pickup etc.) | feature_service_modules | Starter |
| Multi-Branch Support | feature_multi_branch | Growth |
| AI Assistant | feature_ai_assistant | Growth |
| Full Accounting Module (AR/AP) | feature_accounting | Starter |
| AVETMISS Reporting | feature_avetmiss | Growth |
| API Access | feature_api_access | Enterprise |
| White-label & Custom Branding | feature_white_label | Enterprise |
| Mark as Popular | is_popular | (admin flag, any plan) |

---

*Edubee CRM — Platform Plans Dev Prompts v1.0*
*Stack: React + TypeScript + Vite / Node.js + Express + Drizzle ORM + PostgreSQL*
