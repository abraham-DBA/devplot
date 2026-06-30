# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### Profile Page

File: `app/profile/page.tsx`, `components/profile/ProfileForm.tsx`
Last updated: 2026-06-28

| Property | Class |
| --- | --- |
| Page header h1 | `text-[32px] font-bold leading-tight text-foreground` |
| Card wrapper | `rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Section label | `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Avatar circle | `flex size-14 items-center justify-center rounded-full bg-foreground font-bold text-card text-lg` |
| Input field | `h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary` |
| Role card — selected | `rounded-xl border border-foreground bg-muted p-4` |
| Role card — unselected | `rounded-xl border border-border bg-card p-4 hover:bg-background` |
| Connected account row | `flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3` |
| Provider icon | `flex size-9 items-center justify-center rounded-lg bg-foreground text-card` |
| Save button | `rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-card hover:bg-brand-primary disabled:opacity-40` |
| Cancel button | `rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-40` |
| Module sidebar card | `rounded-xl border border-border bg-card p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |

---

### Landing Page

File: `app/page.tsx`
Last updated: 2026-06-28

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-background`, `bg-card`, `bg-foreground` |
| Border           | `border border-border`, `border-b border-border` |
| Border radius    | `rounded-lg`, `rounded-xl`, `rounded-md`, `rounded-full` |
| Text - primary   | `text-foreground`, `text-card` |
| Text - secondary | `text-muted-foreground`, `text-brand-secondary` |
| Spacing          | `px-4 sm:px-6 lg:px-24`, `py-20 lg:py-24`, `p-8`, `gap-3`, `gap-6`, `gap-8`, `gap-10` |
| Hover state      | `hover:text-foreground`, `hover:bg-brand-primary`, `hover:bg-background` |
| Shadow           | `shadow-sm` |
| Accent usage     | `bg-warning`, `text-destructive`, `bg-brand-secondary`, `border-brand-secondary` |

**Pattern notes:**
Landing surfaces use full-width bands with centered `max-w-[1440px]` inner containers. Primary CTAs use `bg-foreground text-card rounded-lg shadow-sm`; secondary CTAs use `border border-border bg-card text-foreground`. Preview and feature panels use white card surfaces with token borders and `rounded-xl` clipping. Mobile landing navigation uses a second `border-t border-border` row instead of hiding section links. Eyebrow labels use uppercase styling with no letter-spacing utility.

### Auth Split Screen

File: `components/auth/AuthShell.tsx`
Last updated: 2026-06-28

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card`, `bg-foreground` |
| Border           | `border border-border` |
| Border radius    | `rounded-lg` |
| Text - primary   | `text-foreground`, `text-card` |
| Text - secondary | `text-muted-foreground`, `text-brand-secondary` |
| Spacing          | `px-6 py-8`, `lg:px-[72px] lg:py-[72px]`, `py-12`, `lg:pt-20`, `gap-3`, `gap-7`, `mt-10` |
| Hover state      | `hover:bg-brand-primary` |
| Shadow           | none |
| Accent usage     | `bg-foreground`, `bg-card`, `text-brand-secondary`, `focus:border-brand-primary`, `focus:ring-brand-primary` |

**Pattern notes:**
Auth screens use a full-height two-column split on desktop: dark testimonial/brand panel on the left and white form panel on the right. The right form column is top-aligned with `py-12 lg:pt-20` rather than vertically centered, matching the reference screenshots. The shared shell keeps `/login` and `/signup` aligned. Form controls are large (`h-14` inputs, `h-[60px]` submit, `h-[62px]` OAuth buttons), use token borders, and keep labels in uppercase monospace styling without letter-spacing utilities. Mobile stacks the dark panel above the form with reduced horizontal padding.

---

### Dashboard — Navbar

File: `components/dashboard/Navbar.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Height | `h-16` |
| Background | `bg-card` |
| Border | `border-b border-border` |
| Active nav link | `bg-background font-semibold text-brand-primary rounded-md px-3 py-1.5` |
| Inactive nav link | `font-medium text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5` |
| Avatar | `size-8 rounded-full bg-foreground text-card text-[11px] font-bold` |
| Mobile hamburger | `size-8 rounded-md text-muted-foreground md:hidden` — toggles a `border-t` drawer |

---

### Dashboard — StatCard

File: `components/dashboard/StatCard.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Container | `rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Label | `font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Value | `text-[32px] font-semibold leading-10 text-brand-primary` |
| Sub | `text-xs text-muted-foreground` |
| Trend success | `text-success text-xs font-medium` |
| Trend destructive | `text-destructive text-xs font-medium` |

---

### Dashboard — BlockerBanner

File: `components/dashboard/BlockerBanner.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Container | `rounded-xl border border-destructive/20 bg-destructive-light px-6 py-4` |
| Count label | `text-sm font-semibold text-destructive` |
| Dot | `size-2 rounded-full bg-destructive` |
| Blocker text | `text-sm text-foreground` — actor bold, description muted |

---

### Dashboard — ProjectCard

File: `components/dashboard/ProjectCard.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Container | `rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md` |
| Health badge on_track | `bg-success-light text-success rounded-full px-2.5 py-0.5` |
| Health badge at_risk | `bg-warning-light text-warning rounded-full px-2.5 py-0.5` |
| Health badge high_risk | `bg-destructive-light text-destructive rounded-full px-2.5 py-0.5` |
| Progress bar | `h-1.5 rounded-full` — color matches health |
| Team avatars | `size-7 rounded-full border-2 border-card bg-foreground text-card -space-x-2` |
| Blocker badge | `bg-destructive-light text-destructive rounded-md px-2 py-0.5 text-xs font-semibold` |

---

### Dashboard — ModulesTable

File: `components/dashboard/ModulesTable.tsx`
Last updated: 2026-06-28

**Pattern notes:**
Table wrapped in `overflow-x-auto` for mobile. Header cells use `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`. Status badges use `rounded-md px-2.5 py-1 text-[10px] font-semibold` with token bg/text pairs per status. Progress bars are `h-1.5 w-24 rounded-full`. Urgent deadlines use `text-destructive`.

---

### Projects — Project Detail Page

File: `app/projects/[id]/page.tsx`
Last updated: 2026-06-28

**Pattern notes:**
Server Component — all data fetched server-side (project, modules with owners, active blockers, activity logs, team members). Health recalculated live from `lib/health.ts` using actual start/end dates. Schedule alert banner shown only when `health !== "on_track"`. Stat cards use `text-[32px] font-semibold` value, `h-1.5` progress bars. Two-column layout: `lg:grid-cols-[1fr_320px]` — left modules list, right team + activity. Activity messages rendered as plain text (no dangerouslySetInnerHTML).

### Projects — ScheduleAlert

File: `components/projects/ScheduleAlert.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| at_risk container | `rounded-xl border border-warning/20 bg-warning-light px-6 py-4` |
| high_risk container | `rounded-xl border border-destructive/20 bg-destructive-light px-6 py-4` |
| Label | `font-mono text-[11px] font-semibold uppercase tracking-wide` |

### Projects — ModulesList

File: `components/projects/ModulesList.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Container | `rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Grid columns | `grid-cols-[1fr_120px_160px_48px_72px]` |
| Status badge | `rounded-md border px-2 py-0.5 text-[10px] font-semibold` — token bg/text/border per status |
| Progress bar | `h-1.5 rounded-full` — color matches status |
| Owner avatar | `size-7 rounded-full bg-foreground text-card text-[9px] font-bold` |

---

### Projects — ProjectsClient

File: `components/projects/ProjectsClient.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Search input | `h-10 rounded-lg border border-border bg-card px-3 text-sm focus:border-brand-primary focus:ring-1` |
| Filter tab active | `rounded-lg px-3 py-1.5 text-xs font-semibold bg-foreground text-card` |
| Filter tab inactive | `rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground` |
| Project card | `rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md` |
| Progress bar | `h-2 rounded-full` — color matches health token |
| Team avatars | `size-7 rounded-full border-2 border-card bg-foreground text-card -space-x-2` |

**Pattern notes:**
Client Component wraps search state + filter state. Server Component (`app/projects/page.tsx`) fetches data and passes `ProjectRow[]` + `totalModules` as props. Filter tabs use a `Filter` union type (`"all" | ProjectHealth`). Progress bar height is `h-2` (slightly taller than dashboard cards which use `h-1.5`).

---

### Modules — ModuleDetailClient

File: `components/modules/ModuleDetailClient.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Progress card | `rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Progress label | `font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Progress value | `text-[32px] font-bold leading-none text-foreground` |
| Progress bar track | `h-2 rounded-full bg-background` |
| Progress bar fill | `h-2 rounded-full bg-success transition-all` |
| Save button (active) | `bg-foreground text-card hover:bg-brand-primary` |
| Save button (inactive) | `bg-background text-muted-foreground cursor-not-allowed` |
| Note badge — technical | `border-success/30 bg-success-light text-success` |
| Note badge — implementation | `border-border bg-background text-muted-foreground` |
| Note badge — schema | `border-warning/30 bg-warning-light text-warning` |
| Note badge — api | `border-brand-primary/20 bg-card text-brand-primary` |
| Add note modal | `fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm` / inner `max-w-md rounded-xl border border-border bg-card p-6` |

**Pattern notes:**
Progress slider uses `accent-foreground` for the thumb color (Tailwind 4 no-config approach). Notes stored as JSON array in `technicalNotes` text column — each entry has `{ id, type, title, body, createdAt }`. `isDirty` computed from initial vs current progress/status — Save button only activates when there are unsaved changes.

---

### Modules — ReportBlockerButton

File: `components/modules/ReportBlockerButton.tsx`
Last updated: 2026-06-28

| Property | Class |
| -------- | ----- |
| Trigger button | `rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive-light` |
| Modal | `fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm` / inner `max-w-md rounded-xl border border-destructive/20 bg-card p-6` |
| Submit button | `flex-1 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-card hover:opacity-90` |

**Pattern notes:**
Isolated `"use client"` component — lets the page Server Component render most of the sidebar statically. On submit: inserts `blocker_log`, sets `module.status = "blocked"`, recalculates project health, revalidates three paths.

---

### Dashboard — ActivityFeed

File: `components/dashboard/ActivityFeed.tsx`
Last updated: 2026-06-28

**Pattern notes:**
Event rows use `divide-y divide-border`. Each row has a colored `size-2 rounded-full` dot (`bg-success`, `bg-warning`, `bg-muted-foreground`). Actor and target are `font-semibold`. Project + timestamp are `text-xs text-muted-foreground`.

---

### Team Page

File: `app/team/page.tsx`, `components/team/TeamClient.tsx`
Last updated: 2026-06-29

| Property | Class |
| --- | --- |
| Page eyebrow | `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Page h1 | `text-[32px] font-bold leading-tight text-foreground` |
| Stat card container | `rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Stat value | `text-[32px] font-semibold leading-10 text-brand-primary` |
| Search input | `h-10 w-72 rounded-lg border border-border bg-card px-3 text-sm focus:border-brand-primary focus:ring-1` |
| Filter tab active | `rounded-md px-3 py-1 text-xs font-semibold bg-foreground text-card` |
| Filter tab inactive | `rounded-md px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground` |
| Table header cell | `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Member avatar | `size-9 rounded-full bg-foreground text-card text-[11px] font-bold` |
| Role select | `appearance-none rounded-lg border border-border bg-card px-3 py-1.5 pr-8 text-sm focus:border-brand-primary` |
| Active badge | `rounded-full px-2.5 py-1 text-xs font-medium bg-success-light text-success` |
| Pending badge | `rounded-full px-2.5 py-1 text-xs font-medium bg-warning-light text-warning` |
| Remove button | `text-sm font-medium text-destructive hover:opacity-75` |
| Invite button | `rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-card hover:opacity-90` |

**Pattern notes:**
Server Component (`app/team/page.tsx`) fetches from `organizationMembers` + `organizations` for the current user's org, derives stats (members, active, owners, leadsAndPMs), builds `inviteLink = /join/[inviteCode]`, and passes typed `Member[]` + stats + `inviteLink` + `currentUserRole` to `TeamClient`. Client Component handles: search filter state, filter tab state, role dropdown (disabled for owners/self, hidden for users without `CAN_CHANGE_ROLES`), remove button (hidden for owners/self, visible only to `CAN_REMOVE_MEMBERS`), invite modal showing the shareable link with a "Copy" button (`navigator.clipboard.writeText`). Role dropdown uses a native `<select>` with `appearance-none` and an overlaid `ChevronDown` icon. Owner rows show a read-only role label instead of a dropdown.

---

### Onboarding — CompanyDetailsForm

File: `components/onboarding/CompanyDetailsForm.tsx`
Last updated: 2026-06-29

| Property | Class |
| --- | --- |
| Label | `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Text input / textarea | `h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary` |
| Industry select | same as input + `cursor-pointer appearance-none pr-8` |
| Size button (selected) | `rounded-lg border border-brand-primary bg-brand-primary text-card text-sm font-semibold` |
| Size button (unselected) | `rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:border-brand-secondary` |
| Submit button | `mt-2 h-11 w-full rounded-lg bg-foreground text-sm font-bold text-card hover:bg-brand-primary disabled:opacity-50` |
| Field error | `mt-1 text-xs text-destructive` |

**Pattern notes:**
`"use client"` component. Calls `completeOnboarding({ name, description, industry, size })` server action. Uses `useTransition` for pending state, `useState<Record<string, string>>` for field-level errors. On server error: `toast.error`. On success the action redirects — no client-side redirect needed. Same two-column split layout as Auth screens (dark left brand panel, white right form panel).

---

### Onboarding — JoinOrgForm

File: `components/onboarding/JoinOrgForm.tsx`
Last updated: 2026-06-29

| Property | Class |
| --- | --- |
| Role card (selected) | `border-brand-primary ring-1 ring-brand-primary rounded-xl border bg-card p-5` |
| Role card (unselected) | `border-border hover:border-brand-secondary rounded-xl border bg-card p-5` |
| Role icon (selected) | `border-brand-primary bg-brand-primary text-card size-9 rounded-lg border` |
| Role icon (unselected) | `border-border bg-background text-muted-foreground size-9 rounded-lg border` |
| Submit button | `mt-2 h-11 w-full rounded-lg bg-foreground text-sm font-bold text-card hover:bg-brand-primary disabled:opacity-50` |

**Pattern notes:**
Props: `{ inviteCode: string; orgName: string }`. Three role cards (developer, team_lead, project_manager). Calls `joinOrganization(inviteCode, selectedRole)`. Uses `useTransition`. Same two-column split layout as onboarding. Server page (`app/join/[code]/page.tsx`) validates invite code against DB — shows graceful "Invalid invite link" card if code not found. Unauthenticated users redirected to `/login?redirect=/join/[code]`; already-onboarded users redirected to `/dashboard`.
