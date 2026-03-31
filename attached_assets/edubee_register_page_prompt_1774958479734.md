# Edubee CRM — Register Page Build Prompt
# Version: 1.1 | Language: English Only | Date: 2026-03-31
# ============================================================
# HOW TO USE:
# 1. Copy everything below the dashed line
# 2. Paste into Replit AI Agent chat
# 3. Wait for analysis report
# 4. Type "Go ahead" to start implementation
# ============================================================

---

## [STEP 0] Pre-Work Analysis — READ FILES BEFORE ANY CHANGES

Read the following files in order. Do NOT write any code until this is complete.

1. /client/src/pages/Login.tsx
   → Check layout structure, component name, import paths

2. /client/src/App.tsx (or router file)
   → Check current routing structure, BrowserRouter / Route pattern

3. /db/schema.ts
   → Confirm exact column names for: users, organisations, accounts tables
   → Specifically confirm: users.password_hash, accounts.account_type, accounts.owner_id

4. /server/src/routes/ — list ALL files in this directory
   → Identify the auth route file name

5. /server/src/index.ts or /server/src/app.ts
   → Check Express middleware and route registration pattern

6. /client/src/assets/ or /public/ — list ALL files
   → Find the Edubee logo file (look for: edubee-logo, logo, bee logo — any .png .svg .webp file)

7. package.json (root or server/)
   → Check if bcrypt or bcryptjs is installed

After analysis, report to me in this format:
---
[Analysis Report]
- Login page file: (path)
- Router file: (path)
- Auth route file: (path)
- Logo file path: (exact path found)
- schema.ts users columns: (list)
- schema.ts accounts columns: (list)
- bcrypt installed: (yes/no — which package)
- Files to CREATE: (list)
- Files to MODIFY: (list)
---

DO NOT modify any file until I reply "Go ahead".

==========================================================

## [STEP 1] Objective

Build a new account registration page accessible from the Login page.

Route: /register

Scope:
- NEW file: /client/src/pages/Register.tsx
- NEW API endpoints: GET /api/auth/check-email, POST /api/auth/register
- MINIMAL modifications to existing files:
  - App.tsx → add /register route only
  - Login.tsx → add "Create Account" link (1 line only)

==========================================================

## [STEP 2] LOGO INSTRUCTIONS — IMPORTANT

**Find the Edubee logo file from the analysis in Step 0.**

Logo usage rules:
- Use the EXISTING logo file found in /client/src/assets/ or /public/
- Import it properly: import edubeeLogo from '@/assets/[filename]' or use the public path
- Display it in the LEFT brand panel (white version if available, otherwise use the original)
- Size: height 48px, width auto, object-fit contain
- If a white/light version exists (e.g. logo-white.png, logo-light.svg), prefer that for the orange background panel
- If only one logo exists, apply CSS filter: brightness(0) invert(1) to make it white on the orange panel

DO NOT use emoji 🐝 as the logo. Use the actual image file.

==========================================================

## [STEP 3] Registration Flow — 3-Step Wizard

Step indicator at the top:

  ● Step 1          ──────  ○ Step 2  ──────  ○ Step 3
  Organisation Info       Account Type       Service Plan

Step indicator styles:
- Completed step: filled orange circle (#F5821F) + check icon (Lucide Check)
- Current step:   orange border circle + step number
- Upcoming step:  gray border circle (#E8E6E2) + step number
- Connector line: orange for completed segments, gray for upcoming

==========================================================

## [STEP 4] Step 1 — Organisation & Admin User Info

### Left Brand Panel (full height, orange background #F5821F)

Top:
- Edubee logo image (white version, height 48px) — from existing asset file
- Below logo: "Edubee CRM" in white, 18px, font-weight 600

Middle:
- Headline: "All-in-One Platform for Study Abroad Agencies"
  → white, 24px, font-weight 700, line-height 1.3

- Sub-headline: "Manage students, schools, visas, and commissions — all in one place."
  → white, 14px, opacity 0.9

Bottom (feature bullets, white text + check icons):
  ✓ Student & School Management
  ✓ Automated Commission Calculation
  ✓ HQ & Branch Office Integration
  ✓ Visa & Document Tracking

Below bullets:
- Small text: "Trusted by study abroad agencies in Australia, Korea, Japan & Thailand"
  → white, 12px, opacity 0.75

### Right Form Panel (white background)

Page title: "Create Your Free Account"
Subtitle: "Get started with Edubee CRM today — no credit card required."

#### Section: "Agency Information"
Section label style: 12px / 500 / uppercase / letter-spacing 0.05em / color #57534E
Thin divider line below label

| Field Label         | DB Column                     | Required | Input Type                        |
|---------------------|-------------------------------|----------|-----------------------------------|
| Agency Name         | organisations.name            | ✅        | text                              |
| Phone Number        | organisations.phone_number    | ✅        | tel                               |
| Website URL         | organisations.organization_url| ✗        | url, placeholder: https://...     |
| Address             | organisations.address_line_1  | ✗        | text                              |

#### Section: "Your Details" (Admin User)
Section label: same style as above

| Field Label         | DB Column               | Required | Input Type                                |
|---------------------|-------------------------|----------|-------------------------------------------|
| First Name          | users.first_name        | ✅        | text                                      |
| Last Name           | users.last_name         | ✅        | text                                      |
| Work Email          | users.email             | ✅        | email                                     |
| Password            | users.password_hash     | ✅        | password + eye icon toggle (show/hide)    |
| Confirm Password    | (client-side only)      | ✅        | password + eye icon toggle (show/hide)    |

First Name and Last Name: side by side (2-column grid)

Validation on "Next" button click:
- Required fields empty → orange border + red error text (12px, #DC2626) below field
- Invalid email format → "Please enter a valid email address"
- Password < 8 chars → "Password must be at least 8 characters"
- Password mismatch → "Passwords do not match"
- Email duplicate check: call GET /api/auth/check-email?email=xxx when Next is clicked
  If duplicate → stay on Step 1, show error on email field:
  "This email is already registered. Please log in or use a different email."

Bottom of form:
[Next →]  ← Primary button, right-aligned

Center below button:
"Already have an account?  Log in →"  ← Link to /login, 13px, color #F5821F

==========================================================

## [STEP 5] Step 2 — Account Type Selection

Title: "What best describes your organisation?"
Subtitle: "Your account type determines the features and workflows available to you."

### 5 Selection Cards (2-column grid, last card centered)

Each card contains:
- Icon (Lucide, 28px, orange #F5821F)
- Type name (16px, font-weight 600, #1C1917)
- Description (13px, #57534E)

| Card Label              | account_type value | Lucide Icon   | Description                          |
|-------------------------|--------------------|---------------|--------------------------------------|
| Education Agent         | Agent              | Users         | Study abroad agency or sub-agent     |
| School / Institution    | School             | Building2     | School or educational institution    |
| Student                 | Student            | GraduationCap | Individual student account           |
| Provider / Partner      | Provider           | Handshake     | Service provider or business partner |
| Organisation            | Organisation       | Briefcase     | General corporate entity             |

Card styles:
- Default:  white background, 1.5px solid #E8E6E2 border, border-radius 12px, padding 24px
- Hover:    #FAFAF9 background, #A8A29E border, translateY(-2px), subtle box-shadow
- Selected: #FEF0E3 background, 2px solid #F5821F border, orange check circle in top-right corner
- Transition: all 200ms ease

Routing rule for Step 3:
- Agent, Organisation → Step 3 shows both Plan selection AND Service Modules
- Student, School, Provider → Step 3 shows Service Modules ONLY (Plan section hidden)

Bottom buttons:
[← Back]      ← Secondary button, left
[Next →]      ← Primary button, right (disabled if no type selected)

==========================================================

## [STEP 6] Step 3 — Service Plan + Service Modules

### 6-A. Plan Selection (shown ONLY for Agent and Organisation types)

Title: "Choose Your Plan"
Subtitle: "All plans include a free trial. Upgrade or downgrade at any time."

4 plan cards in a row (4-column grid → 2-column tablet → 1-column mobile):

#### LITE Card
- Badge: "FREE" (green #16A34A background, white text)
- Price: $0 / month
- Feature list:
  ✓ Up to 50 students / month
  ✓ 10 MB storage
  ✗ School Database
  ✗ Remote Support
- Button: "Get Started" (Primary, clickable)

#### PLUS Card (default selected)
- Top banner: "MOST POPULAR" (#F5821F background, white, full card width, border-radius 12px 12px 0 0)
- Badge: "BETA FREE" (#FEF0E3 background, #F5821F text)
- Price: ~~$9.90~~ $0 / month (Beta)
  → strikethrough on $9.90, then "Free during Beta" in small orange text
- Feature list:
  ✓ Unlimited students
  ✓ 100 MB storage
  ✗ School Database
  ✗ Remote Support
- Button: "Select Plan" (Primary, clickable)
- Auto-selected on page load (orange border + check)

#### BUSINESS Card
- Badge: "BUSINESS" (#F4F3F1 background, #57534E text)
- Price: $19.90 / month
- Feature list:
  ✓ Unlimited students
  ✓ 500 MB storage
  ✓ School Database
  ✗ Remote Support
- Button: "Coming Soon" (Secondary, disabled)
- Card: opacity 0.65, cursor: not-allowed

#### ENTERPRISE Card
- Badge: "ENTERPRISE" (#F4F3F1 background, #57534E text)
- Price: $39.90 / month
- Feature list:
  ✓ Unlimited students
  ✓ 1 GB storage
  ✓ School Database
  ✓ Remote Support
- Button: "Contact Us" (Secondary, disabled)
- Card: opacity 0.65, cursor: not-allowed

Selected card style: 2px solid #F5821F border + #FEF0E3 background + scale(1.02) + check icon top-right

Note below plans (12px, #57534E, center-aligned):
"All prices are in AUD and exclude GST. LITE and PLUS plans available now. BUSINESS and ENTERPRISE coming soon."

### 6-B. Service Modules (shown for ALL Account Types)

Divider with label: "Additional Service Modules"
Subtitle (14px, #57534E): "Select the services your agency offers. You can add or remove these after sign-up."

6 checkbox cards (3-column grid → 2-column tablet → 1-column mobile):

| Service Name            | service_module value | Lucide Icon   | Description                        |
|-------------------------|---------------------|---------------|------------------------------------|
| Study Abroad Management | study_abroad        | GraduationCap | School applications & visa tracking|
| Airport Pickup          | pickup              | Car           | Arrival pickup coordination        |
| Accommodation           | accommodation       | Home          | Homestay & rental placement        |
| Internship & Employment | internship          | Briefcase     | Job placement & internship         |
| Settlement Service      | settlement          | MapPin        | Arrival orientation & checklist    |
| Guardian Service        | guardian            | Shield        | Student guardian management        |

Checkbox card styles:
- Default:  white background, 1px solid #E8E6E2, border-radius 12px, padding 20px
- Selected: #FEF0E3 background, 2px solid #F5821F border
- Checkbox: top-right corner — unchecked: gray circle, checked: orange fill with white check
- Multiple selection allowed

### 6-C. Registration Summary Box

A summary card displayed below the service modules:
Background: #FAFAF9, border: 1px solid #E8E6E2, border-radius: 12px, padding: 20px

Contents:
- Agency:        [organisation name entered in Step 1]
- Admin User:    [First Name] [Last Name] · [email]
- Account Type:  [selected type — shown as orange badge]
- Plan:          [selected plan — shown as colored badge]
- Services:      [selected module tags in orange pills] or "Basic services only" if none selected

Bottom buttons:
[← Back]                      ← Secondary button, left
[Create Account]              ← Primary button, right, full width

Loading state (while API call in progress):
- Button shows: spinning Loader2 icon + "Creating your account..."
- Button disabled, opacity 0.8

==========================================================

## [STEP 7] Success Screen

After receiving a successful API response, hide the wizard and show:

```
    [Edubee Logo — from existing asset file, height 56px]

    [CheckCircle2 icon — 64px, color #16A34A]

    Account Created Successfully!

    Welcome to Edubee CRM, [First Name]!

    Your agency "[Organisation Name]" has been set up with the [Plan] plan.
    You're all set to start managing your study abroad business.

    [Go to Login]     ← Primary button, min-width 200px → navigates to /login
```

==========================================================

## [STEP 8] API Endpoints

### GET /api/auth/check-email?email=xxx

Response (available):
```json
{ "available": true }
```

Response (duplicate):
```json
{ "available": false, "message": "This email is already registered." }
```

---

### POST /api/auth/register

Request Body:
```json
{
  "organisation": {
    "name": "string",
    "phone_number": "string",
    "organization_url": "string",
    "address_line_1": "string"
  },
  "user": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "password": "string"
  },
  "account": {
    "account_type": "Agent | Student | School | Provider | Organisation",
    "plan": "LITE | PLUS | BUSINESS | ENTERPRISE"
  },
  "service_modules": ["study_abroad", "pickup", "accommodation", "internship", "settlement", "guardian"]
}
```

DB processing order (single transaction):
1. Check users.email uniqueness
2. INSERT into organisations → get organisation_id
3. INSERT into users:
   - role: 'Admin'
   - password_hash: bcrypt.hash(password, 10)
   - accessible_entities: { plan, service_modules, organisation_id }
   - status: 'Active'
4. INSERT into accounts:
   - name: organisation.name
   - account_type: selected type
   - owner_id: new user.id
   - email: user.email
   - phone_number: organisation.phone_number
   - status: 'Active'
5. Commit on all success, rollback on any failure

Success response:
```json
{
  "success": true,
  "message": "Account created successfully.",
  "userId": "uuid",
  "organisationId": "uuid",
  "accountId": "uuid"
}
```

Error responses:
```json
{ "success": false, "error": "EMAIL_ALREADY_EXISTS", "message": "This email is already registered." }
{ "success": false, "error": "VALIDATION_ERROR", "message": "Required fields are missing." }
{ "success": false, "error": "SERVER_ERROR", "message": "An unexpected error occurred. Please try again." }
```

Server-side validation:
- name, first_name, last_name, email, password: required
- Password minimum 8 characters
- Valid email format
- If bcrypt not installed: run npm install bcryptjs @types/bcryptjs

==========================================================

## [STEP 9] Design System — Edubee Brand (STRICT — do not deviate)

### Colors
```
Primary Accent:  #F5821F   (buttons, links, active states, selected borders)
Accent Dark:     #D96A0A   (button hover state)
Accent Light:    #FEF0E3   (selected card backgrounds, tag backgrounds)
Neutral 50:      #FAFAF9   (page background)
Neutral 100:     #F4F3F1   (secondary card background)
Neutral 200:     #E8E6E2   (borders, dividers)
Neutral 400:     #A8A29E   (placeholder text, disabled elements)
Neutral 600:     #57534E   (secondary text, labels)
Neutral 900:     #1C1917   (primary text, headings)
Success:         #16A34A   (active status, success states)
Danger:          #DC2626   (errors, required field indicators)
```
DO NOT introduce gradients, blue, purple, or any color not listed above.

### Typography
Font: Inter (import from Google Fonts — weights 400, 500, 600, 700)
- Page title:     24px / 700
- Section label:  12px / 500 / uppercase / letter-spacing 0.05em
- Body text:      14px / 400 / line-height 1.6
- Error text:     12px / 400 / color #DC2626
- Caption:        12px / 400 / color #57534E

### Border Radius
- Buttons: 8px
- Cards:   12px
- Inputs:  8px
- Tags:    999px (pill)

### Input Fields
```
height:           40px
border:           1.5px solid #E8E6E2
border-radius:    8px
padding:          0 12px
font-size:        14px
color:            #1C1917
background:       #FFFFFF
placeholder:      color #A8A29E
focus:            border-color #F5821F
                  box-shadow: 0 0 0 3px rgba(245,130,31,0.15)
error state:      border-color #DC2626
                  box-shadow: 0 0 0 3px rgba(220,38,38,0.12)
```

### Buttons
Primary:
```
background:   #F5821F
color:        #FFFFFF
border:       none
padding:      10px 20px
font-weight:  600
font-size:    14px
border-radius: 8px
hover:        background #D96A0A, translateY(-1px), box-shadow 0 4px 12px rgba(245,130,31,0.25)
disabled:     opacity 0.65, cursor not-allowed
```

Secondary:
```
background:   #FFFFFF
color:        #1C1917
border:       1.5px solid #E8E6E2
padding:      10px 20px
font-weight:  500
hover:        border-color #A8A29E, background #FAFAF9
```

### Page Layout
```
Full viewport: split layout
Left panel:  40% width, background #F5821F, full height, sticky
Right panel: 60% width, background #FFFFFF, overflow-y: auto, padding: 48px

Mobile (< 768px):
  Single column
  Left panel: reduced to 100px height, horizontal layout (logo + tagline side by side)
  Right panel: full width, padding 24px

Tablet (768–1024px):
  Left panel: 35% width
  Right panel: 65% width, padding 32px
```

### Transitions & Animation
- All interactive elements: transition all 200ms ease
- Card hover: transform translateY(-2px) + enhanced box-shadow
- Step indicator progress: smooth width transition 300ms

==========================================================

## [STEP 10] Login Page Modification (MINIMAL CHANGE ONLY)

In Login.tsx, add ONE link only — location: bottom of the login form, center-aligned.

```tsx
<p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#57534E' }}>
  Don't have an account?{' '}
  <Link to="/register" style={{ color: '#F5821F', fontWeight: 500 }}>
    Start for free →
  </Link>
</p>
```

DO NOT touch any other code in Login.tsx.
DO NOT modify layout, styles, logic, or any other component.

==========================================================

## [STEP 11] App.tsx Route Addition (MINIMAL CHANGE ONLY)

Add ONLY these two lines in the appropriate location:

```tsx
import Register from '@/pages/Register';
// ...
<Route path="/register" element={<Register />} />
```

DO NOT modify any existing routes or other code.

==========================================================

## [STEP 12] Implementation Order

1. Read and analyze all files → Report findings to me
2. Wait for my "Go ahead" reply
3. Add check-email and register endpoints to auth route file
4. Create /client/src/pages/Register.tsx (3-step wizard)
5. Add /register route to App.tsx
6. Add "Start for free" link to Login.tsx
7. Run: npx tsc --noEmit → must show 0 TypeScript errors
8. Restart server → confirm no import or runtime errors
9. DB check → SELECT latest 3 rows from users, organisations, accounts
10. API test → POST /api/auth/register and confirm response
11. Submit completion report

==========================================================

## [COMPLETION REPORT FORMAT]

✅ Files created:   [list]
✅ Files modified:  [list]
✅ Changes made:    [description]
✅ Verification:
   - TypeScript:    [error count]
   - Server start:  [OK / ERROR]
   - DB records:    [query result]
   - API response:  [test result]
   - Logo used:     [exact file path used]
⚠️  Next steps:     [if any]
