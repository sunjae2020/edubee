# 🐝 Edubee CRM — Master Design System & Development Prompt
**Version:** 2.0.0 | **Last Updated:** 2026-03-24
**Stack:** React + TypeScript + Vite · Node.js + Express + Drizzle ORM + PostgreSQL
**Platform:** Replit (MVP/Beta) → Multi-tenant SaaS (roadmap)

---

> ⚠️ **MANDATORY RULE — Read Before Every Task**
> All UI work in this project must strictly follow this design system.
> No exceptions regardless of other instructions. When in conflict,
> this document takes precedence over everything else.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Pre-Work Safety Protocol](#2-pre-work-safety-protocol)
3. [Color System — Light Theme](#3-color-system--light-theme)
4. [Color System — Dark Theme](#4-color-system--dark-theme)
5. [CSS Variable Reference](#5-css-variable-reference)
6. [Typography](#6-typography)
7. [Spacing System](#7-spacing-system)
8. [Border Radius](#8-border-radius)
9. [Shadows](#9-shadows)
10. [Component Specs — Buttons](#10-component-specs--buttons)
11. [Component Specs — Inputs & Forms](#11-component-specs--inputs--forms)
12. [Component Specs — Cards](#12-component-specs--cards)
13. [Component Specs — Status Badges](#13-component-specs--status-badges)
14. [Component Specs — Data Tables](#14-component-specs--data-tables)
15. [Component Specs — KPI / Stat Cards](#15-component-specs--kpi--stat-cards)
16. [Layout Structure](#16-layout-structure)
17. [Sidebar Navigation](#17-sidebar-navigation)
18. [Top Navigation Bar](#18-top-navigation-bar)
19. [Theme Switcher (Dark Mode)](#19-theme-switcher-dark-mode)
20. [Page Patterns](#20-page-patterns)
21. [Motion & Animation](#21-motion--animation)
22. [Icon Library](#22-icon-library)
23. [Responsive Breakpoints](#23-responsive-breakpoints)
24. [Quick Reference Cheatsheet](#24-quick-reference-cheatsheet)
25. [Forbidden Patterns](#25-forbidden-patterns)
26. [Post-Change Verification](#26-post-change-verification)
27. [Completion Report Format](#27-completion-report-format)

---

## 1. Project Overview

| Item | Detail |
|------|--------|
| Product | Edubee CRM — Study Abroad Agency Management Platform (SaaS) |
| Brand | Warm, trustworthy, modern. Clean whitespace, soft rounded elements, single-accent palette |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui + custom CSS variables |
| Backend | Node.js + Express + Drizzle ORM + PostgreSQL |
| Platform | Replit (current) → full SaaS (roadmap) |
| Core Principle | **Never break existing working code.** |

---

## 2. Pre-Work Safety Protocol

Before modifying any file, always perform these steps in order:

1. Read all relevant files in full
2. Identify exactly what the problem is
3. Report the list of files to be changed and what will change
4. **Do not modify anything until the user explicitly says "go ahead"**
   _(Exception: if the user says "do it now", proceed immediately)_

**Must follow during changes:**
- Fix only what was identified in the analysis
- Modify one file at a time, then check for TypeScript errors
- Never touch code that is already working correctly
- Design with SaaS scalability in mind (multi-tenant, plan-based permissions)

**Absolutely forbidden:**
- Deleting or renaming DB columns
- Modifying files unrelated to the current task
- Changing auth/permission code without explicit instruction
- Guessing field names without reading the schema first
- Mass-editing multiple files simultaneously

---

## 3. Color System — Light Theme

> **STRICT RULE:** Do not introduce any colors outside this palette.
> Orange is the only brand accent color. No blue, purple, or green accents.

### Brand Orange (Immutable — same in both light and dark)

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#F5821F` | CTA buttons, links, active states, highlights |
| Primary Dark | `#D96A0A` | Hover state on orange elements |
| Primary Light | `#FEF0E3` | Tag backgrounds, selected states, subtle highlights |
| Primary Active | `#C25E08` | Pressed / active button state |
| Focus Ring | `rgba(245,130,31,0.15)` | 3px focus ring on inputs and buttons |

### Neutral Scale

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| Neutral 50 | `#FAFAF9` | Page BG | App background, sidebar background |
| Neutral 100 | `#F4F3F1` | Muted BG | Card backgrounds, hover states, skeleton |
| Neutral 200 | `#E8E6E2` | Border | All dividers, input borders, card borders |
| Neutral 400 | `#A8A29E` | Placeholder | Placeholder text, disabled states, muted icons |
| Neutral 600 | `#57534E` | Secondary Text | Labels, secondary content, nav items |
| Neutral 900 | `#1C1917` | Primary Text | Headings, main body content |

### Surface Colors

| Role | Value |
|------|-------|
| Page background | `#FAFAF9` |
| Card / Modal / Input | `#FFFFFF` |
| App shell / Sidebar | `#FAFAF9` |

### State Colors (shared across light and dark)

| State | Background | Text | Border | Usage |
|-------|-----------|------|--------|-------|
| Success | `#DCFCE7` | `#16A34A` | — | Active, Confirmed, Approved |
| Warning | `#FEF9C3` | `#CA8A04` | — | Pending, In Review, Submitted |
| Danger | `#FEF2F2` | `#DC2626` | `#FECACA` | Rejected, Cancelled, Error |
| In Progress | `#FEF0E3` | `#F5821F` | — | In Progress, Interview Scheduled |
| Draft | `#F4F3F1` | `#57534E` | — | Draft, Inactive, Neutral |

---

## 4. Color System — Dark Theme

> **Design Philosophy:** Warm neutral dark — NOT cold gray.
> Never use `#333333`, `#1f1f1f`, or any cold-gray tones.
> Orange (`#F5821F`) remains identical in dark mode.

### Dark Background Layers

| Token | Hex | Usage |
|-------|-----|-------|
| Page BG | `#0F0E0D` | App-wide background (warm near-black) |
| Surface | `#1A1917` | Cards, modals, top navigation |
| Sidebar | `#161513` | Sidebar (slightly darker than surface) |
| Muted BG | `#242220` | Table headers, inactive backgrounds, inputs |
| Hover BG | `rgba(245,130,31,0.12)` | Orange-tinted hover state |

### Dark Text

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Text | `#F5F0EB` | Main content (warm white) |
| Secondary Text | `#A8A29E` | Labels, secondary content |
| Muted Text | `#57534E` | Placeholders, hints |

### Dark Borders

| Token | Hex | Usage |
|-------|-----|-------|
| Border | `#2E2B28` | Card borders, input borders, dividers |
| Border Subtle | `#242220` | Table row separators |

### Dark State Colors

| State | Background | Text |
|-------|-----------|------|
| Success | `rgba(22,163,74,0.15)` | `#4ADE80` |
| Warning | `rgba(202,138,4,0.15)` | `#FCD34D` |
| Danger | `rgba(220,38,38,0.15)` | `#F87171` |
| In Progress | `rgba(245,130,31,0.15)` | `#F5821F` |
| Draft | `#242220` | `#A8A29E` |

---

## 5. CSS Variable Reference

> **MANDATORY:** All UI code must use CSS variables, never hardcoded hex values.
> Variables are defined in `client/src/styles/themes.css`.

```css
/* Usage examples — CORRECT */
background: var(--color-bg-surface);
color: var(--color-text-primary);
border: 1px solid var(--color-border);
background: var(--color-orange);

/* Usage examples — FORBIDDEN */
background: #FFFFFF;
color: #1C1917;
border: 1px solid #E8E6E2;
background: #F5821F;
```

### Full Variable List

```css
/* ── Backgrounds ── */
--color-bg-page          /* #FAFAF9 / #0F0E0D */
--color-bg-surface       /* #FFFFFF / #1A1917 */
--color-bg-sidebar       /* #FAFAF9 / #161513 */
--color-bg-topbar        /* #FFFFFF / #1A1917 */
--color-bg-muted         /* #F4F3F1 / #242220 */
--color-bg-hover         /* #FEF0E3 / rgba(245,130,31,0.12) */
--color-bg-input         /* #FFFFFF / #242220 */
--color-bg-card          /* #FFFFFF / #1A1917 */

/* ── Text ── */
--color-text-primary     /* #1C1917 / #F5F0EB */
--color-text-secondary   /* #57534E / #A8A29E */
--color-text-muted       /* #A8A29E / #57534E */

/* ── Borders ── */
--color-border           /* #E8E6E2 / #2E2B28 */
--color-border-subtle    /* #F4F3F1 / #242220 */

/* ── Brand Orange (IMMUTABLE — identical in light + dark) ── */
--color-orange           /* #F5821F */
--color-orange-dark      /* #D96A0A */
--color-orange-light     /* #FEF0E3 / rgba(245,130,31,0.12) */
--color-orange-active    /* #C25E08 */
--color-orange-ring      /* rgba(245,130,31,0.15) / rgba(245,130,31,0.20) */

/* ── Navigation ── */
--color-nav-active-bg    /* #FEF0E3 / rgba(245,130,31,0.15) */
--color-nav-active-text  /* #F5821F (same both modes) */

/* ── Table ── */
--color-row-hover        /* rgba(245,130,31,0.04) / rgba(245,130,31,0.06) */

/* ── State Colors ── */
--color-success-bg  --color-success-text
--color-warning-bg  --color-warning-text
--color-danger-bg   --color-danger-text  --color-danger-border

/* ── Shadows ── */
--shadow-card      --shadow-md      --shadow-dropdown      --shadow-xl
```

---

## 6. Typography

**Font Family:** `"Inter"`, system-ui, sans-serif
Import from Google Fonts: weights 400, 500, 600, 700
Apply `font-smoothing: antialiased` globally.

### Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|------------|----------------|-------|
| Display | 32px | 700 | 1.2 | — | Page titles |
| Heading 1 | 24px | 600 | 1.3 | — | Section headers |
| Heading 2 | 18px | 600 | 1.4 | — | Card titles, dialog headers |
| Body | 14px | 400 | 1.6 | — | General content |
| Small | 12px | 400 | 1.5 | — | Captions, meta info |
| Label | 12px | 500 | — | 0.05em | Form labels, tags (UPPERCASE) |

### Heading Pattern (Tailwind)
```
font-semibold tracking-tight text-[var(--color-text-primary)]
```

---

## 7. Spacing System

8pt grid base. Use these values exclusively.

| Token | px | Tailwind | Usage |
|-------|----|---------|-------|
| xs | 4px | `gap-1` | Icon gaps, tight inline spacing |
| sm | 8px | `p-2` | Inner padding for chips/tags |
| md | 12px | `p-3` | Form field internal padding |
| lg | 16px | `p-4` | Card padding, section gaps |
| xl | 24px | `p-6` | Between cards, sidebar items |
| 2xl | 32px | `p-8` | Page section spacing |
| 3xl | 48px | `p-12` | Major section breaks |

**Standard patterns:**
- Card padding: `p-5` (20px)
- Section gap: `space-y-4` / `space-y-6`
- Grid gutter: `gap-4` / `gap-6`

---

## 8. Border Radius

| Element | Radius | Tailwind |
|---------|--------|---------|
| Buttons | 8px | `rounded-lg` |
| Inputs | 8px | `rounded-lg` |
| Cards | 12px | `rounded-xl` |
| Modals | 16px | `rounded-2xl` |
| Chips / Tags | 999px | `rounded-full` |
| Avatars | 50% | `rounded-full` |
| Small elements | 4px | `rounded` |

---

## 9. Shadows

```
shadow-2xs:  0 1px 2px rgba(0,0,0,0.04)
shadow-xs:   0 1px 3px + 1px 2px
shadow-sm:   0 2px 4px                          ← Card default
shadow-md:   0 4px 16px rgba(0,0,0,0.10)
shadow-lg:   0 8px 24px
shadow-xl:   0 16px 40px
```

> In dark mode: increase rgba opacity significantly (0.40–0.70 range).
> Use `var(--shadow-card)`, `var(--shadow-dropdown)`, etc.

---

## 10. Component Specs — Buttons

### Primary Button
```
height:        40px (h-10) default · 32px (h-8) sm · 44px (h-11) lg
padding:       px-5 py-2.5 (default)
background:    var(--color-orange)  →  #F5821F
color:         #FFFFFF
border:        none
border-radius: 8px (rounded-lg)
font:          14px / 600
shadow:        0 4px 12px rgba(245,130,31,0.25)
hover:         background var(--color-orange-dark) + translateY(-1px)
active:        background var(--color-orange-active)
focus:         ring 3px var(--color-orange-ring)
```

### Secondary Button
```
background:    var(--color-orange-light)
color:         var(--color-orange)
border:        1px solid rgba(245,130,31,0.20)
hover:         border-color rgba(245,130,31,0.40)
```

### Outline Button
```
background:    var(--color-bg-surface)
color:         var(--color-text-secondary)
border:        1.5px solid var(--color-border)
hover:         border-color var(--color-text-muted) + background var(--color-bg-page)
```

### Ghost Button
```
background:    transparent
color:         var(--color-text-secondary)
hover:         background var(--color-bg-muted) + color var(--color-text-primary)
```

### Destructive Button
```
background:    var(--color-danger-bg)
color:         var(--color-danger-text)
border:        1.5px solid var(--color-danger-border)
hover:         background #DC2626 + color #FFFFFF
```

---

## 11. Component Specs — Inputs & Forms

### Text Input
```
height:        40px
border:        1.5px solid var(--color-border)
border-radius: 8px
padding:       0 12px
font-size:     14px
color:         var(--color-text-primary)
background:    var(--color-bg-input)
placeholder:   var(--color-text-muted)
focus:         border-color var(--color-orange)
               box-shadow: 0 0 0 3px var(--color-orange-ring)
transition:    border 150ms ease, box-shadow 150ms ease
```

### Select
Same specs as Text Input. Use native select or custom dropdown with same styling.

### Form Label
```
font-size:      12px
font-weight:    500 (medium)
text-transform: uppercase
letter-spacing: 0.05em
color:          var(--color-text-secondary)
margin-bottom:  6px
```

### Field Row Pattern
```tsx
<div className="flex flex-col gap-1.5">
  <label>FIELD LABEL</label>
  <input ... />
  {/* error message if any */}
  <p className="text-xs text-[var(--color-danger-text)]">Error message</p>
</div>
```

---

## 12. Component Specs — Cards

```
background:    var(--color-bg-card)
border:        1px solid var(--color-border)
border-radius: 12px (rounded-xl)
padding:       20px 24px
box-shadow:    var(--shadow-card)
```

**Interactive card (hover):**
```
hover: box-shadow var(--shadow-md) + translateY(-2px)
transition: all 200ms ease
```

**Card sections:**
```
Card Header:   p-5 pb-4 + border-bottom 1px solid var(--color-border)
Card Content:  p-5 pt-0
Card Title:    font-semibold text-lg color var(--color-text-primary)
Card Subtitle: text-sm color var(--color-text-secondary)
```

---

## 13. Component Specs — Status Badges

**Base:**
```
border-radius: 999px (fully rounded)
padding:       3px 10px (py-0.5 px-2.5)
font-size:     12px
font-weight:   500
display:       inline-flex align-items-center
```

| Status Keywords | Background | Text |
|-----------------|-----------|------|
| active · approved · completed · confirmed | `var(--color-success-bg)` | `var(--color-success-text)` |
| pending · in review · new · submitted | `var(--color-warning-bg)` | `var(--color-warning-text)` |
| rejected · cancelled · lost · disputed | `var(--color-danger-bg)` | `var(--color-danger-text)` |
| in progress · interview scheduled | `var(--color-orange-light)` | `var(--color-orange)` |
| draft · inactive · neutral | `var(--color-badge-draft-bg)` | `var(--color-badge-draft-text)` |

**Usage:**
```tsx
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="in_progress" />
```

---

## 14. Component Specs — Data Tables

```
Table header row:
  background:  var(--color-bg-muted)
  font:        12px / 500 / uppercase / letter-spacing 0.05em
  color:       var(--color-text-secondary)
  border-bottom: 1px solid var(--color-border)

Table body row:
  height:      48px
  border-bottom: 1px solid var(--color-border-subtle)
  hover:       background var(--color-row-hover)

Selected row:
  background:  var(--color-orange-light)

Cell — primary:   font-weight 500 color var(--color-text-primary)
Cell — secondary: color var(--color-text-secondary)
```

### List Toolbar Pattern
```
Layout: [Search Input] [Status Filter Pills] [Spacer] [Export Button] [+ Add Button]

Search input:   h-9, pl-9 with Search icon, border var(--color-border)
Filter pill:    rounded-full px-3 py-1.5 text-sm
  default:      background var(--color-bg-muted) color var(--color-text-secondary)
  active:       background var(--color-orange) color #FFFFFF
Add button:     h-9 background var(--color-orange) text-white
Export button:  h-9 variant='outline'
```

### List Pagination Pattern
```
Container:    flex gap-1
Current page: w-8 h-8 rounded-lg background var(--color-orange) text-white
Other pages:  w-8 h-8 rounded-lg border var(--color-border) color var(--color-text-secondary)
Prev/Next:    same as other pages with chevron icons
```

---

## 15. Component Specs — KPI / Stat Cards

```
Layout:      icon-left (40×40) + text-right  OR  number-centered
Container:   Card spec + flex items-center gap-3

Icon container:
  size:         40×40px
  border-radius: 10px
  background:   var(--color-orange-light)
  color:        var(--color-orange)
  icon-size:    w-5 h-5 (20px)

Value:    28px / 700 / color var(--color-text-primary)
Label:    13px / 400 / color var(--color-text-secondary)

Trend indicator:
  font-size:  12px
  up arrow:   color #16A34A
  down arrow: color #DC2626
```

---

## 16. Layout Structure

```
App Shell:
┌─────────────────────────────────────────────────┐
│           Top Navigation Bar (56px)             │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│  Sidebar     │   Main Content Area              │
│  (240px)     │   max-width: 1280px              │
│              │   padding: 32px                  │
│              │   background: var(--color-bg-page)│
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

**Page Header:**
```
Layout:        title + subtitle (left) + action buttons (right)
Title:         Display size (32px/700) color var(--color-text-primary)
Subtitle:      Body size (14px/400) color var(--color-text-secondary)
Margin-bottom: 32px
Border-bottom: 1px solid var(--color-border)
Padding-bottom: 24px
```

**Section spacing:** 32px between major sections
**Grid:** 12-column, 24px gutter

---

## 17. Sidebar Navigation

```
Width:          240px (desktop) · 64px (icon-only collapsed) · hidden (mobile)
Background:     var(--color-bg-sidebar)
Border-right:   1px solid var(--color-border)
Padding:        16px 0

Group Header (category label):
  font:     9–10px / 700 / uppercase / letter-spacing 0.08em
  color:    var(--color-text-muted)
  padding:  0 8px, margin-top 16px margin-bottom 4px

Nav Item (inactive):
  height:       40px
  padding:      0 8px
  border-radius: 8px
  font:         14px / 400
  color:        var(--color-text-secondary)
  icon:         w-4 h-4 color var(--color-text-muted)
  hover:        background var(--color-bg-muted) + color var(--color-text-primary)
  transition:   all 150ms ease

Nav Item (active):
  background:   var(--color-nav-active-bg)
  color:        var(--color-nav-active-text)   /* #F5821F */
  font-weight:  600
  border-left:  2px solid var(--color-orange)
  icon:         color var(--color-orange)
```

---

## 18. Top Navigation Bar

```
Height:          56px
Background:      var(--color-bg-topbar)
Border-bottom:   1px solid var(--color-border)

Left section:
  Logo area:   240px wide, flex items-center gap-2
  Logo mark:   28×28px border-radius 6px background var(--color-orange) text white
  Brand name:  13px/700 color var(--color-text-primary)
  Divider:     1px × 20px background var(--color-border)
  Page title:  18px/600 color var(--color-text-primary)

Right section (flex items-center gap-2):
  [View As selector]  [Theme Switcher]  [Notification bell]  [User avatar]
```

---

## 19. Theme Switcher (Dark Mode)

### TopNav Inline 3-Way Toggle

```
Container:
  display:       flex + border 1px solid var(--color-border)
  border-radius: 8px
  overflow:      hidden
  background:    var(--color-bg-surface)

Each button (Light ☀ / Dark 🌙 / System 🖥):
  size:         34×32px
  icon:         w-4 h-4 (15px), lucide-react (Sun / Moon / Monitor)
  inactive:     background transparent, icon color var(--color-text-muted)
  active:       background var(--color-bg-hover), icon color var(--color-orange)
  hover:        background var(--color-bg-muted)
  tooltip:      text 11px, shown on hover below button

Separator between buttons:
  1px × 20px background var(--color-border)
```

### Theme Context Rules

```
Storage:   localStorage key 'edubee-theme'
DOM apply: document.documentElement.setAttribute('data-theme', resolved)
API save:  PATCH /api/users/me/theme { theme_preference: 'light'|'dark'|'auto' }
Restore:   On login, call setTheme(user.theme_preference) from auth callback

'auto' mode:
  Reads window.matchMedia('(prefers-color-scheme: dark)')
  Adds event listener for OS changes
  Removes listener on unmount (prevent memory leaks)
```

### Available Theme Values

| Value | Behavior |
|-------|----------|
| `light` | Always light mode |
| `dark` | Always dark (warm neutral, `#0F0E0D` base) |
| `auto` | Follows OS preference, updates in real-time |

---

## 20. Page Patterns

### Detail Page (View/Edit)

```
Tabs:
  Container:       border-bottom 1px solid var(--color-border)
  Tab item:        padding 10px 16px, font 13px/500, color var(--color-text-secondary)
  Active tab:      color var(--color-orange) + border-bottom 2px solid var(--color-orange)
  Hover:           color var(--color-text-primary)

Section Header (within tab content):
  Layout:          flex items-center + hr line to right
  font:            11px / 600 / uppercase / letter-spacing 0.06em
  color:           var(--color-text-muted)

Field Label:       12px / regular / color var(--color-text-muted)
Field Value:       14px / 500 / color var(--color-text-primary)
```

### List Page (Index)

```
Page header:     Title + record count + right-aligned action buttons
Toolbar:         Search + filter pills + export + add (see section 14)
Table:           Standard data table spec (see section 14)
Pagination:      Standard pagination spec (see section 14)
Empty state:     Centered illustration + heading + CTA button
```

### Settings Page

```
Layout:
  Left panel: settings sidebar (200px) with nav groups
  Right panel: content area with tab navigation at top

Tab container:    full-width, border-bottom, same tab styling as detail page
Section card:     Card spec + section-icon (28×28px, background var(--color-orange-light))
Toggle switches:  38×22px, active background var(--color-orange), thumb transitions
Save bar:         fixed bottom, background var(--color-bg-surface), border-top
```

---

## 21. Motion & Animation

```
Transition default: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
Color transitions:  background 200ms, border 200ms, color 150ms, box-shadow 200ms

Page entry:     fade-in 300ms + translateY(8px → 0)
Modal open:     scale(0.97 → 1) + opacity(0 → 1), 200ms
Modal close:    scale(1 → 0.97) + opacity(1 → 0), 150ms
Dropdown open:  translateY(-4px → 0) + opacity(0 → 1), 150ms
Theme switch:   background + border + color — all 200ms (set globally on *)

Skeleton loading:
  Shimmer animation
  from: background var(--color-bg-muted)
  to:   background var(--color-border)
  duration: 1.5s ease-in-out infinite alternate

Button hover:   translateY(-1px), 150ms
Card hover:     translateY(-2px) + shadow change, 200ms

Exempt from transitions (set transition: none):
  img, svg, video, canvas — prevents flash on theme switch
```

---

## 22. Icon Library

**Library:** `lucide-react` — always and exclusively
**Stroke width:** 1.5 (default) · 2.0 (emphasis) · 2.2 (active states)
**Color:** inherit from context — never hardcode icon colors separately

| Size | px | Tailwind | Usage |
|------|----|---------|-------|
| Small | 14px | `w-3.5 h-3.5` | Dense UI, captions |
| Default | 16px | `w-4 h-4` | Standard usage |
| Medium | 20px | `w-5 h-5` | KPI cards, emphasis |
| Large | 24px | `w-6 h-6` | Empty states |

### Icon Reference by Category

```
Dashboard:    LayoutDashboard
CRM:          Users, Building2, Target, FileText, FileCheck, Ticket
Sales:        ClipboardList, FolderOpen
Services:     Briefcase, Shield, Wrench, Hotel, Car, Map, CalendarCheck
              Layers, Package, ListChecks, GraduationCap
Finance:      Receipt, CreditCard, ArrowLeftRight, BookMarked, RefreshCw, BookOpen
Admin:        UserCog, Lock, Grid2x2, FileSearch, UserSearch, Settings
Actions:      Plus, Search, Download, ChevronRight, ChevronDown
              Edit2, Trash2, Copy, ExternalLink, MoreHorizontal
Theme:        Sun, Moon, Monitor
Notifications: Bell
```

---

## 23. Responsive Breakpoints

| Breakpoint | Width | Sidebar | Layout |
|------------|-------|---------|--------|
| Mobile | < 768px | Hidden (drawer on demand) | Single column |
| Tablet | 768–1024px | Icon-only (64px) | Condensed |
| Desktop | > 1024px | Full (240px) | Full layout |

**Portal differentiation:** All user roles use the same single-color system.
Role differences are handled by labels and badges only — never by changing the accent color.

---

## 24. Quick Reference Cheatsheet

```
Page background:       bg-[var(--color-bg-page)]
Card/Panel:            bg-[var(--color-bg-card)] rounded-xl
                       border border-[var(--color-border)] shadow-sm
Section divider:       border-t border-[var(--color-border)]

Primary text:          text-[var(--color-text-primary)] text-sm
Secondary text:        text-[var(--color-text-secondary)] text-sm
Hint/Placeholder:      text-[var(--color-text-muted)] text-xs

Primary action button: bg-[var(--color-orange)] hover:bg-[var(--color-orange-dark)]
                       text-white rounded-lg
Secondary button:      bg-[var(--color-orange-light)] text-[var(--color-orange)]
                       border border-[var(--color-orange)]/20
Outline button:        border border-[var(--color-border)]
                       hover:bg-[var(--color-bg-muted)]

Orange emphasis text:  text-[var(--color-orange)] font-semibold
Link:                  text-[var(--color-orange)] hover:underline

Active tab/filter:     text-[var(--color-orange)]
                       border-b-2 border-[var(--color-orange)]
Active badge:          bg-[var(--color-orange)] text-white rounded-full
                       px-2.5 py-0.5 text-xs

Table row hover:       hover:bg-[var(--color-row-hover)]
Focus ring:            ring-3 ring-[var(--color-orange-ring)]
                       border-[var(--color-orange)]

Nav item active:       bg-[var(--color-nav-active-bg)]
                       text-[var(--color-orange)] font-semibold
                       border-l-2 border-[var(--color-orange)]
```

---

## 25. Forbidden Patterns

The following are strictly prohibited in all new and modified code:

```
❌ Hardcoded hex colors:        color: #F5821F;  →  use var(--color-orange)
❌ Hardcoded bg colors:         background: #FFFFFF  →  use var(--color-bg-surface)
❌ Hardcoded border colors:     border: 1px solid #E8E6E2  →  use var(--color-border)
❌ Cold dark grays:             #333333, #1f1f1f, #2d2d2d, gray-800 etc.
❌ Gradient backgrounds:        background: linear-gradient(...)
❌ Non-orange brand colors:     blue, purple, or green as accent/CTA
❌ Non-lucide icons:            FontAwesome, HeroIcons, Material Icons, emojis
❌ Inline dark mode hacks:      className="dark:bg-gray-800"  (use CSS variables instead)
❌ New color introductions:     any color not in this design system
❌ Tailwind color utilities:    bg-orange-500, text-gray-900 etc. (use CSS vars)
❌ Breaking existing code:      never modify working components without analysis
❌ Deleting DB columns:         always ADD columns, never delete or rename
❌ Mass file edits:             always one file at a time
```

---

## 26. Post-Change Verification

After every change, verify in this order:

```
1. TypeScript check
   npx tsc --noEmit
   → Must return 0 errors

2. Server startup
   → No import errors, no runtime errors

3. Database check (if schema changed)
   SELECT * FROM [changed_table] ORDER BY created_on DESC LIMIT 3;
   → Confirm data saved correctly with correct column names

4. API endpoint check (if routes changed)
   → Confirm expected fields and values are returned
   → Confirm HTTP status codes are correct

5. UI visual check
   → Light mode: verify all colors match design system
   → Dark mode: verify warm dark tones, no cold grays
   → Orange (#F5821F) unchanged in both modes
   → All borders, text, backgrounds use CSS variables
```

---

## 27. Completion Report Format

Every completed task must be reported in this exact format:

```
✅ Modified files:  [list with paths]
✅ New files:       [list with paths, if any]
✅ Changes made:    [description per file]
✅ Verification:    tsc: [result] / server: [result] / DB: [result] / API: [result]
⚠️  Next steps:     [if applicable]
```

---

## APPENDIX A — Replit Environment Rules

| # | Rule | Detail |
|---|------|--------|
| R-1 | Environment variables | Store in Replit Secrets tab only. Never hardcode in source. |
| R-2 | Port config | Use `PORT = process.env.PORT \|\| 3000`. Never specify a fixed port. |
| R-3 | DB connection | Supabase/Neon: use port 6543 (pooler). |
| R-4 | PDF generation | `@react-pdf/renderer` via `child_process` worker. Never use Puppeteer. |
| R-5 | ZIP files | Use `adm-zip` (Replit compatible). Not `archiver`. |
| R-6 | Migration errors | `npx drizzle-kit push --force` |
| R-7 | SMTP email | Free plan blocks port 587. Use Resend.com or SendGrid API instead. |
| R-8 | Email failures | Never block main workflow on email failure. Always use `try/catch`. |
| R-9 | Seed data | Use upsert (idempotent). Re-running must not create duplicates. |
| R-10 | Context window | Split long prompts by section. Never send everything in one message. |
| R-11 | File paths | Use relative paths or `path.resolve(__dirname)`. No absolute paths. |
| R-12 | GitHub backup | Commit after every major milestone. Always `.gitignore` the `.env` file. |
| R-13 | TypeScript errors | If errors occur: "Fix all TypeScript errors in the files just created" |
| R-14 | Timezone | Add `pkgs.tzdata` to `replit.nix`. Set `TZ=UTC` at top of `server/index.ts`. |
| R-15 | Required secrets | `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `JWT_SECRET` · `DATABASE_URL` |

---

## APPENDIX B — Project File Map

| Category | Path |
|----------|------|
| DB Schema | `/db/schema.ts` |
| Backend Routes | `/server/src/routes/` |
| Frontend Pages | `/client/src/pages/` |
| Shared Components | `/client/src/components/` |
| Context Providers | `/client/src/context/` |
| Theme CSS Variables | `/client/src/styles/themes.css` |
| Environment Variables | `.env` |

---

## APPENDIX C — Theme File Locations

| File | Purpose |
|------|---------|
| `client/src/styles/themes.css` | CSS variable definitions (light + dark) |
| `client/src/context/ThemeContext.tsx` | Global theme state, `useTheme()` hook |
| `client/src/components/layout/ThemeSwitcher.tsx` | TopNav 3-way toggle + modal |
| `server/src/routes/theme.ts` | `PATCH /api/users/me/theme` endpoint |
| `db/schema.ts` | `users.theme_preference` column (`'light'`\|`'dark'`\|`'auto'`) |

---

*© Edubee CRM · Design System v2.0.0 · 2026-03-24*
*This document is the single source of truth for all UI development in this project.*
