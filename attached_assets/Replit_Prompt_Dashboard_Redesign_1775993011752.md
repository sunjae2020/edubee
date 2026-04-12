# Replit Prompt — Edubee CRM Dashboard Redesign
# Task: Rebuild the main Dashboard page into a 4-tab layout (Overview / Operation / Sales / Finance)

---

## ⚠️ MANDATORY PRE-WORK — READ BEFORE WRITING A SINGLE LINE OF CODE

Before touching any file, you MUST complete all steps below in order:

1. Read every file listed in the "Files to Read First" section completely
2. Identify the exact current structure of the dashboard page and its data sources
3. List every file you plan to create or modify, and describe each change
4. Do NOT write any code until the analysis is complete

---

## Files to Read First

```
/client/src/pages/Dashboard.tsx          (or DashboardPage.tsx — find the actual filename)
/client/src/App.tsx                       (routing structure)
/client/src/components/                   (scan for any existing dashboard widgets)
/server/src/routes/                       (scan all route files — find dashboard-related endpoints)
/db/schema.ts                             (read fully — never guess field names)
```

After reading, confirm:
- What API endpoints currently supply dashboard data?
- What TypeScript interfaces / types are already defined for dashboard data?
- What component names and file paths are currently used?
- What imports would conflict with new code?

---

## Objective

Redesign the existing dashboard page by replacing its current flat layout with a **4-tab structure**:

| Tab | Purpose |
|-----|---------|
| **Overview** | Platform-wide KPIs, this month's revenue summary, recent leads, quick actions |
| **Operation** | Tasks, upcoming interviews, visa status tracker, enrollment spots |
| **Sales** | Pipeline funnel, lead acquisition chart, lead sources, quotes, monthly goals |
| **Finance** | Revenue chart, AR/AP summary, commission breakdown, staff incentives, payment schedule |

**All UI text must be in English.**  
**The existing Edubee design system must be followed exactly (see Design Tokens section below).**  
**No existing routes, DB schema, auth logic, or working components may be broken.**

---

## Architecture Plan

### New Files to Create

```
/client/src/pages/Dashboard.tsx                    ← Replace (back up first by reading fully)
/client/src/components/dashboard/DashboardTabs.tsx ← Tab navigation component
/client/src/components/dashboard/OverviewTab.tsx   ← Overview tab content
/client/src/components/dashboard/OperationTab.tsx  ← Operation tab content
/client/src/components/dashboard/SalesTab.tsx      ← Sales tab content
/client/src/components/dashboard/FinanceTab.tsx    ← Finance tab content
/client/src/components/dashboard/KpiCard.tsx       ← Reusable KPI stat card
/client/src/components/dashboard/index.ts          ← Barrel export
```

### Backend — Add ONE new route file (do not modify existing routes)

```
/server/src/routes/dashboard.ts   ← New file: all dashboard API endpoints
```

Register it in the existing router index file — **add only, never remove existing registrations**.

---

## Backend API Specification

Create `/server/src/routes/dashboard.ts` with the following endpoints.  
All queries must use Drizzle ORM. Read `/db/schema.ts` fully before writing any query.  
Use `eq`, `and`, `gte`, `lte`, `count`, `sum`, `desc` from `drizzle-orm`.

### GET /api/dashboard/overview

Returns top-level counts for the Overview tab.

```typescript
// Response shape
interface DashboardOverviewResponse {
  totalLeads: number;
  activeLeads: number;
  totalApplications: number;         // count of leads with status in application stages
  pendingApplications: number;
  totalContracts: number;
  activeContracts: number;
  totalUsers: number;
  activeUsers: number;
  // This month KPI (current calendar month)
  kpi: {
    periodStart: string;             // "YYYY-MM-DD"
    periodEnd: string;
    netRevenue: number;              // arCollected - apPaid
    arCollected: number;
    arScheduled: number;
    apPaid: number;
    totalIncentive: number;
    incentiveStaffCount: number;
  };
  // 5 most recent leads
  recentLeads: Array<{
    id: string;
    name: string;                    // contact full name
    status: string;
    source: string | null;
    createdAt: string;
  }>;
}
```

Query guidance (read schema first, adapt field names exactly):
- `leads` table: count all, count where `status NOT IN ('closed_won','closed_lost','cancelled')`
- `contracts` table: count all, count where `status = 'active'`
- `users` table: count all, count where `is_active = true`
- For KPI: query `transactions` or `credits`/`debits` tables for current month totals
- For `recentLeads`: JOIN `leads` with `contacts` on `contact_id`, ORDER BY `created_at DESC`, LIMIT 5

### GET /api/dashboard/operation

Returns operational data for the Operation tab.

```typescript
interface DashboardOperationResponse {
  tasksDueCount: number;
  tasksOverdueCount: number;
  interviewsThisWeek: number;
  visaPendingCount: number;
  visaUrgentCount: number;
  enrollmentTotal: number;
  enrollmentAvailable: number;
  // Visa breakdown
  visaStages: Array<{
    stage: string;
    count: number;
  }>;
  // 5 upcoming tasks (due soonest)
  pendingTasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    assignedTo: string | null;
    priority: string | null;
    status: string;
  }>;
  // 3 upcoming interviews
  upcomingInterviews: Array<{
    id: string;
    contactName: string;
    initials: string;
    schoolName: string | null;
    interviewType: string | null;
    scheduledAt: string;
  }>;
  // Recent activity (5 items — lead_activities or tasks updated recently)
  recentActivity: Array<{
    id: string;
    type: 'lead' | 'task' | 'visa' | 'document';
    description: string;
    createdAt: string;
  }>;
}
```

### GET /api/dashboard/sales

Returns sales pipeline data.

```typescript
interface DashboardSalesResponse {
  pipeline: {
    new: number;
    inProgress: number;
    qualified: number;
    contracted: number;
    total: number;
  };
  // Monthly lead counts — last 6 months
  monthlyLeads: Array<{
    month: string;    // "Jan", "Feb" etc.
    year: number;
    count: number;
  }>;
  // Lead source breakdown
  leadSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  // 5 most recent quotes
  recentQuotes: Array<{
    id: string;
    quoteNumber: string;
    contactName: string;
    schoolName: string | null;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  // Monthly goals (current month)
  goals: {
    newLeadsTarget: number;
    newLeadsActual: number;
    applicationsTarget: number;
    applicationsActual: number;
    contractsTarget: number;
    contractsActual: number;
  };
  totalQuoteValue: number;
}
```

### GET /api/dashboard/finance

Returns financial summary data.

```typescript
interface DashboardFinanceResponse {
  // Current month
  netRevenue: number;
  arCollected: number;
  arScheduled: number;
  apPaid: number;
  apScheduled: number;
  totalIncentive: number;
  // Monthly revenue — last 6 months
  monthlyRevenue: Array<{
    month: string;
    year: number;
    ar: number;
    ap: number;
  }>;
  // AR/AP summary
  arSummary: {
    total: number;
    outstanding: number;
    overdueCount: number;
    invoiceCount: number;
  };
  apSummary: {
    total: number;
    overdue: number;
    urgentCount: number;
    payableCount: number;
  };
  // Commission breakdown (max 10 items)
  commissions: Array<{
    id: string;
    schoolName: string;
    studentName: string;
    expectedAmount: number;
    status: string;
  }>;
  totalExpectedCommission: number;
  // Staff incentives
  staffIncentives: Array<{
    staffId: string;
    staffName: string;
    amount: number;
    period: string;
  }>;
  // Upcoming payments (max 5)
  upcomingPayments: Array<{
    id: string;
    description: string;
    dueDate: string;
    amount: number;
    urgency: 'high' | 'medium' | 'low';
  }>;
}
```

**Error handling rule:** Every endpoint must be wrapped in try/catch. On error, return `{ error: 'Internal server error' }` with status 500. Never crash the server.

**If a table or field does not exist yet** in the schema, return a sensible default (0 for numbers, [] for arrays) and add a TODO comment. Do NOT create new DB tables or columns.

---

## Frontend Specification

### Design Tokens (STRICT — do not deviate)

```typescript
// Colors — use these exact values in Tailwind className or inline style
const tokens = {
  orange:        '#F5821F',
  orangeDark:    '#D96A0A',
  orangeLight:   '#FEF0E3',
  bg:            '#FAFAF9',
  card:          '#FFFFFF',
  border:        '#E8E6E2',
  neutral100:    '#F4F3F1',
  neutral400:    '#A8A29E',
  neutral600:    '#57534E',
  neutral900:    '#1C1917',
  success:       '#16A34A',
  successBg:     '#DCFCE7',
  warning:       '#CA8A04',
  warningBg:     '#FEF9C3',
  danger:        '#DC2626',
  dangerBg:      '#FEF2F2',
};

// Border radius
// cards: 12px  |  buttons: 8px  |  badges: 999px  |  icons: 10px

// Typography (Inter font — already loaded)
// Display: 22px/700  |  H1: 18px/600  |  Body: 14px/400  |  Small: 12px/400  |  Label: 11px/500/uppercase

// Card shadow: 0 1px 3px rgba(0,0,0,0.06)
// Card hover: 0 4px 16px rgba(0,0,0,0.10) + translateY(-2px)
// Transition: all 200ms cubic-bezier(0.4,0,0.2,1)
```

### KpiCard Component

```tsx
// /client/src/components/dashboard/KpiCard.tsx

interface KpiCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subLabel?: string;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral' | 'warning' | 'danger';
  accentLeft?: string;    // e.g. '#F5821F' for left border accent
  iconBg?: string;        // defaults to '#FEF0E3'
  iconColor?: string;     // defaults to '#F5821F'
  progressValue?: number; // 0-100, renders a progress bar if provided
  progressColor?: string;
}
```

Style rules for KpiCard:
- Background: `#FFFFFF`, border: `1px solid #E8E6E2`, border-radius: `12px`, padding: `18px 20px`
- Icon container: `40x40px`, border-radius: `10px`
- Value: `28px / font-weight 700 / color #1C1917`
- Label: `13px / color #57534E`
- Sub-label: `11px / color #A8A29E`
- Trend up: color `#16A34A` | Trend neutral: `#A8A29E` | Trend warning: `#CA8A04` | Trend danger: `#DC2626`
- Hover: `box-shadow: 0 4px 16px rgba(0,0,0,0.10)` + `transform: translateY(-2px)` (200ms transition)
- If `accentLeft` provided: `border-left: 3px solid {accentLeft}`

### DashboardTabs Component

```tsx
// /client/src/components/dashboard/DashboardTabs.tsx

type TabId = 'overview' | 'operation' | 'sales' | 'finance';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview',   label: 'Overview'  },
  { id: 'operation',  label: 'Operation' },
  { id: 'sales',      label: 'Sales'     },
  { id: 'finance',    label: 'Finance'   },
];
```

Tab nav style:
- Container: `background #FFFFFF`, `border: 1px solid #E8E6E2`, `border-radius: 10px`, `padding: 4px`, `display: inline-flex`, `gap: 3px`
- Inactive tab: `padding: 7px 18px`, `border-radius: 7px`, `font-size: 13px`, `color: #57534E`, cursor pointer
- Active tab: `background: #FEF0E3`, `color: #F5821F`, `font-weight: 600`
- Hover: `background: #F4F3F1`, `color: #1C1917`

Tab state: Use `useState<TabId>('overview')`. Also sync with URL search param `?tab=overview` using `useSearchParams` so the page survives browser refresh and supports deep-linking.

### Page Header

```tsx
// Top of Dashboard.tsx — always visible regardless of active tab
<div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 20 }}>
  <div>
    <h1 style={{ fontSize:18, fontWeight:700, color:'#1C1917' }}>
      Good {getTimeOfDay()}, {currentUser?.firstName} 👋
    </h1>
    <p style={{ fontSize:12, color:'#57534E', marginTop:2 }}>
      Full platform overview — {currentOrg?.name ?? 'Edubee Admin'}
    </p>
  </div>
  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
    <span style={{ fontSize:12, background:'#FFFFFF', border:'1px solid #E8E6E2', borderRadius:7, padding:'5px 12px', color:'#57534E' }}>
      {currentMonthLabel}   {/* e.g. "Apr 2026" */}
    </span>
    <button
      onClick={() => navigate('/crm/leads/new')}
      style={{ fontSize:12, background:'#F5821F', borderRadius:7, padding:'5px 14px', color:'#FFFFFF', fontWeight:600, border:'none', cursor:'pointer' }}
    >
      + New Lead
    </button>
  </div>
</div>
```

`getTimeOfDay()` helper: returns `"morning"` (5–11), `"afternoon"` (12–17), `"evening"` (18–23), `"night"` (0–4).

### Overview Tab Layout

```
[KpiCard: Total Leads]  [KpiCard: Applications]  [KpiCard: Contracts]  [KpiCard: Users]
   ↑ 4-column grid, gap 16px

[Section Label: "THIS MONTH'S KPI"  +  period badge  +  "View Details →"]
[KpiCard: Net Revenue]  [KpiCard: AR Collected]  [KpiCard: Total Incentive]
   ↑ 3-column grid, each with accentLeft + progress bar

[2-column layout: 1fr + 340px]
  LEFT:  Card — "Recent Leads" table
           columns: Name | Status | Source | Date
           badge colors: New→orange, In Progress→orange, Qualified→green, Closed→gray
  RIGHT: 
    Card — "Quick Actions" (2x2 button grid + primary "New Lead" button)
    Card — "System Status" (Platform Health / Database / Last sync)
```

### Operation Tab Layout

```
[KpiCard: Tasks Due]  [KpiCard: Interviews This Week]  [KpiCard: Visa Pending]  [KpiCard: Enrollment Spots]
   ↑ 4-column grid

[2-column layout: 1fr + 340px]
  LEFT:
    Card — "Pending Tasks"
      Each row: checkbox icon (done = filled orange) | task title | due date + assignee | badge (Urgent/Finance)
    Card — "Upcoming Interviews"
      Each row: avatar initials | name + school/type | date + time (right-aligned in orange)

  RIGHT:
    Card — "Visa Status Tracker"
      5 rows: Doc Collection | Application Submitted | Under Review | Approved | Urgent/Expiring
      Each row: label (left) + count (right) + progress bar
      Colors: first 2 = orange, Under Review = warning, Approved = green, Urgent = danger

    Card — "Enrollment Spots"
      Per school/program: label + progress bar + "X / Y enrolled" sub-text
      Near-capacity: warning color

    Card — "Recent Activity"
      5 items: colored dot (green=doc, orange=lead, yellow=visa) + description + time
```

### Sales Tab Layout

```
[Section: "Sales Pipeline"]
[StageCard: New]  [StageCard: In Progress]  [StageCard: Qualified]  [StageCard: Contracted]
   ↑ 4-column grid, In Progress has top border #F5821F, Contracted has top border #16A34A

Card — "Pipeline Funnel" (horizontal colored bar + legend)
  Segments: New=gray, In Progress=orange, Qualified=warning, Contracted=green

[2-column layout: 1fr + 340px]
  LEFT:
    Card — "Lead Acquisition — Monthly" (vertical bar chart, Chart.js)
      X-axis: last 6 months | Y-axis: count | Bar color: #F5821F | Border-radius: 6px
    Card — "Recent Quotes" table
      columns: Student | School | Value | Status
      Total row at bottom: "Total Quote Value" + sum

  RIGHT:
    Card — "Lead Sources" (doughnut chart, Chart.js)
      Colors: Website=#F5821F, Referral=#D96A0A, Agent=#A8A29E, SNS=#E8E6E2
      Custom HTML legend below chart (no Chart.js built-in legend)
    Card — "Monthly Goals"
      3 rows: New Leads / Applications / Contracts — each with label, "actual / target", progress bar
```

### Finance Tab Layout

```
[KpiCard: Net Revenue]  [KpiCard: AR Collected]  [KpiCard: AP Paid]  [KpiCard: Total Incentive]
   ↑ 4-column grid

[2-column layout: 1fr + 340px]
  LEFT:
    Card — "Monthly Revenue Overview" (grouped bar chart, Chart.js)
      AR bars = #F5821F | AP bars = #E8E6E2 | Last 6 months
      Custom legend: AR / AP with color squares (no Chart.js built-in legend)
    Card — "Commission Breakdown" table
      columns: School/Partner | Student | Expected Amount (orange) | Status
      Total row: "Total Expected Commission" + sum

  RIGHT:
    Card — "AR / AP Summary" (2x2 grid)
      Total AR | Outstanding AR (warning color) | Total AP | Overdue AP (danger color)
    Card — "Staff Incentives" 
      If no data: centered empty state with dashed border
      "No incentives calculated yet / Generated once contracts are active"
    Card — "Upcoming Payments"
      Each row: description (left) | due date (right, colored by urgency)
      high urgency = #F5821F | medium = #CA8A04 | low = #57534E
```

### Chart.js Rules

- Load via: `import { Chart, ... } from 'chart.js'` with `Chart.register(...)` — or use `react-chartjs-2` if it's already in package.json (check first)
- If `react-chartjs-2` is NOT installed, use `useRef<HTMLCanvasElement>` + `useEffect` to init Chart.js directly
- Always `destroy()` the chart instance on cleanup: `return () => chart.destroy()`
- Never hardcode colors in Chart.js data — use the design token constants
- Disable Chart.js built-in legend: `plugins: { legend: { display: false } }`
- Always set `responsive: true, maintainAspectRatio: false`
- Wrap canvas in `<div style={{ position:'relative', height:220 }}>`

### Badge Component (inline, no separate file needed)

```tsx
const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    new:           { bg: '#FEF0E3', color: '#F5821F',  label: 'New'         },
    in_progress:   { bg: '#FEF0E3', color: '#F5821F',  label: 'In Progress' },
    qualified:     { bg: '#DCFCE7', color: '#16A34A',  label: 'Qualified'   },
    pending:       { bg: '#FEF9C3', color: '#CA8A04',  label: 'Pending'     },
    cancelled:     { bg: '#FEF2F2', color: '#DC2626',  label: 'Cancelled'   },
    draft:         { bg: '#F4F3F1', color: '#57534E',  label: 'Draft'       },
    active:        { bg: '#DCFCE7', color: '#16A34A',  label: 'Active'      },
    approved:      { bg: '#DCFCE7', color: '#16A34A',  label: 'Approved'    },
    urgent:        { bg: '#FEF9C3', color: '#CA8A04',  label: 'Urgent'      },
  };
  const s = map[status?.toLowerCase()] ?? map['draft'];
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 500,
      padding: '2px 9px', borderRadius: 999,
      background: s.bg, color: s.color
    }}>
      {s.label}
    </span>
  );
};
```

### Data Fetching Pattern

Use React Query (`@tanstack/react-query`) if it's already installed. Otherwise use `useState` + `useEffect` + `fetch`. **Check package.json first.**

```tsx
// React Query pattern (if available)
const { data: overviewData, isLoading } = useQuery({
  queryKey: ['dashboard', 'overview'],
  queryFn: () => fetch('/api/dashboard/overview').then(r => r.json()),
  staleTime: 60_000,   // refresh every 60 seconds
});

// Plain fetch fallback
const [data, setData] = useState<DashboardOverviewResponse | null>(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/dashboard/overview')
    .then(r => r.json())
    .then(setData)
    .finally(() => setLoading(false));
}, []);
```

Loading state: Show skeleton cards (gray shimmer `#F4F3F1 → #E8E6E2` pulse animation) while data loads. Never show a blank white page.

```tsx
// Skeleton pulse
const Skeleton = ({ w = '100%', h = 20 }: { w?: string; h?: number }) => (
  <div style={{
    width: w, height: h, borderRadius: 6,
    background: '#F4F3F1',
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
);
// Add to global CSS or component: @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
```

---

## Progress Bar Sub-Component

```tsx
const ProgressBar = ({
  value,
  color = '#F5821F',
  height = 5
}: { value: number; color?: string; height?: number }) => (
  <div style={{ height, background: '#F4F3F1', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
    <div style={{
      width: `${Math.min(100, Math.max(0, value))}%`,
      height: '100%',
      background: color,
      borderRadius: 999,
      transition: 'width 600ms ease'
    }} />
  </div>
);
```

---

## Safety Rules (Non-Negotiable)

1. **Read `/db/schema.ts` fully** before writing any Drizzle query. Never guess column names.
2. **Read existing `Dashboard.tsx` fully** before replacing it — preserve any props, context usage, or route guard logic.
3. **Do NOT modify** any existing route files except to add one line registering the new `dashboard.ts` router.
4. **Do NOT modify** `/db/schema.ts`, any auth files, or any page other than Dashboard.
5. **Do NOT delete** any existing component, hook, or utility file.
6. **TypeScript**: All new files must be `.tsx` / `.ts`. No `any` types. Define interfaces for all API responses. After writing all files, run `npx tsc --noEmit` and fix every error before reporting done.
7. **One file at a time**: Write each file completely before starting the next.
8. If a DB table referenced in the API spec does not exist in the actual schema, return `0` / `[]` defaults with a `// TODO:` comment. Do NOT create new migrations.

---

## Routing — Tab Deep-linking

In `Dashboard.tsx`, use `useSearchParams` to sync the active tab with the URL:

```tsx
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();
const activeTab = (searchParams.get('tab') as TabId) ?? 'overview';

const handleTabChange = (tab: TabId) => {
  setSearchParams({ tab });
};
```

This means `/dashboard?tab=finance` loads the Finance tab directly — no extra routes needed.

---

## Folder Structure After Completion

```
client/src/
  pages/
    Dashboard.tsx                        ← Rebuilt (4-tab page shell)
  components/
    dashboard/
      index.ts                           ← export * from all
      DashboardTabs.tsx
      KpiCard.tsx
      OverviewTab.tsx
      OperationTab.tsx
      SalesTab.tsx
      FinanceTab.tsx

server/src/
  routes/
    dashboard.ts                         ← NEW (4 GET endpoints)
    index.ts (or router entry)           ← ADD one line: app.use('/api/dashboard', dashboardRouter)
```

---

## Completion Checklist

Before reporting done, verify every item:

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Server starts without import or runtime errors
- [ ] `GET /api/dashboard/overview` returns valid JSON (not 500)
- [ ] `GET /api/dashboard/operation` returns valid JSON
- [ ] `GET /api/dashboard/sales` returns valid JSON
- [ ] `GET /api/dashboard/finance` returns valid JSON
- [ ] Dashboard page loads in browser without white screen
- [ ] All 4 tabs render without console errors
- [ ] Tab URL sync works: manually changing `?tab=finance` in browser shows Finance tab
- [ ] Charts render in Sales and Finance tabs (not blank canvases)
- [ ] Skeleton loading shows while data is fetching
- [ ] No existing pages (Leads, Contacts, Contracts, etc.) are broken
- [ ] All UI text is in English

---

## Report Format on Completion

```
✅ Files Created:    [list]
✅ Files Modified:   [list — only additions described]
✅ tsc result:       0 errors
✅ Server startup:   OK
✅ API endpoints:    [each endpoint → sample response summary]
✅ UI verification:  [each tab → what renders]
⚠️  Known limitations / TODOs: [list any fields that returned 0 because table not yet in schema]
```
