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
Last updated: 2026-06-30

| Property | Class |
| --- | --- |
| Page header h1 | `text-[32px] font-bold leading-tight text-foreground` |
| Card wrapper | `rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Section label | `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Avatar circle | `flex size-14 items-center justify-center rounded-full bg-foreground font-bold text-card text-lg` |
| Input field | `h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary` |
| Role card — selected | `rounded-xl border border-foreground bg-muted p-4` |
| Role card — unselected | `rounded-xl border border-border bg-card p-4 hover:bg-background` |
| Owner role badge (read-only) | `rounded-xl border border-border bg-muted px-4 py-3` — pill: `rounded-full bg-background px-2.5 py-0.5 font-mono text-[10px] uppercase` |
| Connected account row | `flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3` |
| Provider icon | `flex size-9 items-center justify-center rounded-lg bg-foreground text-card` |
| Connect/Disconnect button | `rounded-lg border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50` |
| Save button | `rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-card hover:bg-brand-primary disabled:opacity-40` |
| Cancel button | `rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-40` |
| Module sidebar card | `rounded-xl border border-border bg-card p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |

**Pattern notes:**
`isOwner` prop (from `currentUser.role === "owner"` in the Server Component) swaps the editable role-card grid for a read-only "Owner / Fixed" badge — owners can't change their own role, so `isDirty` only tracks the name field for them. Connected Accounts buttons are wired to `authClient.linkSocial({ provider, callbackURL: "/profile" })` (Connect — full-page OAuth redirect) and `authClient.unlinkAccount({ providerId })` (Disconnect — in-page, `router.refresh()` on success). A per-provider `linkingProvider` state (not the shared form `isPending`) drives the "Connecting…"/"Disconnecting…" label so it doesn't get confused with the Save/Cancel transition.

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
Last updated: 2026-07-04

| Property | Class |
| -------- | ----- |
| Height | `h-16` |
| Background | `bg-card` |
| Border | `border-b border-border` |
| Active nav link | `bg-background font-semibold text-brand-primary rounded-md px-3 py-1.5` |
| Inactive nav link | `font-medium text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5` |
| Avatar | `size-8 rounded-full bg-foreground text-card text-[11px] font-bold` |
| Mobile hamburger | `size-8 rounded-md text-muted-foreground md:hidden` — toggles a `border-t` drawer |
| Bell button | `size-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground` |

`navLinks` is now 5 entries: Dashboard, **My Work** (new), Projects, Team, Profile. Right-side order: role text → `<NotificationBell />` → avatar dropdown.

---

### Dashboard — NotificationBell

File: `components/dashboard/NotificationBell.tsx`
Last updated: 2026-07-04

| Property | Class |
| -------- | ----- |
| Bell trigger button | `size-8 rounded-full text-muted-foreground hover:bg-background hover:text-foreground` |
| Unread badge | `absolute right-0.5 top-0.5 size-4 rounded-full bg-destructive text-[9px] font-bold text-card` |
| Popover container | `absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-card shadow-lg` |
| Popover header | `border-b border-border px-4 py-3` — label: `font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Mark all read button | `text-[11px] font-medium text-brand-primary` |
| Notification row (unread) | `bg-background` — `bg-card` when read |
| Type dot | `size-1.5 rounded-full` — color per type: `bg-destructive` / `bg-brand-primary` / `bg-warning` |
| Message | `text-xs leading-snug text-foreground` (unread) / `text-muted-foreground` (read) |
| Timestamp | `font-mono text-[10px] text-muted-foreground` |
| Action buttons (hover-reveal) | `opacity-0 group-hover:opacity-100` wrapper — icon buttons `rounded p-0.5` |
| Loading skeleton row | `flex items-start gap-3 px-4 py-3` — animated divs: `h-3 animate-pulse rounded bg-border` |
| Empty state icon | `size-8 text-muted-foreground opacity-40` (use `opacity-40` utility, NOT `/40` modifier — hex CSS vars don't support Tailwind v4 opacity modifiers) |

**Pattern notes:**
Fetches on mount (for badge count) and on each open (to refresh). `hasFetched` gates the skeleton — the list or empty state only renders after the first successful fetch, preventing a flash of "You're all caught up" while data loads. Optimistic updates for mark-read and dismiss both revert on server failure. `resourceId` stores the full URL path so rows are wrapped in `<Link>` when present; clicking a linked row marks it read and closes the popover.

---

### Modules — DependencyGraph

File: `components/modules/DependencyGraph.tsx`
Last updated: 2026-07-04

| Property | Class / value |
| -------- | ------------- |
| Outer scroll container | `overflow-auto rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Node button | `rounded-xl border-2 p-3 text-left transition-all hover:shadow-md focus:outline-none` |
| Node border per status | `border-border` / `border-brand-primary` / `border-warning` / `border-success` / `border-destructive` |
| Node bg per status | `bg-card` / `bg-card` / `bg-warning-light` / `bg-success-light` / `bg-destructive-light` |
| Critical path ring | inline `box-shadow: 0 0 0 2px var(--color-warning), 0 1px 3px rgba(0,0,0,0.05)` |
| Node name | `text-[11px] font-semibold leading-tight text-foreground` (truncated) |
| Progress bar track | `h-1 w-full overflow-hidden rounded-full bg-background` |
| Progress bar fill | `h-full rounded-full` + status bar class |
| Node footer label | `font-mono text-[9px] font-semibold text-muted-foreground` |
| Isolated module grid | `grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4` |
| Legend wrapper | `flex flex-wrap items-center gap-x-5 gap-y-2` |
| Edge colors | `var(--color-border)` default · `var(--color-warning)` critical · `var(--color-destructive)` blocked |
| Edge widths | 1.5px default, 2px critical; blocked gets `strokeDasharray="4 3"` |

**Pattern notes:**
Node layer uses absolutely-positioned `<button>` elements over a `pointer-events: none` SVG — SVG handles the edges/arrowheads, buttons handle interaction. Dagre layout computed in `useMemo` (LR, `nodesep: 40, ranksep: 80`, `200×80px` nodes). Three named SVG markers (`dg-arrow-default/critical/blocked`) each reference a `var(--color-*)` CSS variable via `style={{ fill: "..." }}` on the inner `<polygon>` — CSS custom properties cascade into SVG `<defs>` correctly. Isolated modules (no edges at all) render in a simpler grid below the graph rather than being included in the dagre layout. View toggle (List | Graph) is two `<Link>` elements pointing to `?view=graph` — server-side `searchParams` drives `isGraphView`, so the URL is shareable.

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

### Milestones — MilestonesSection / MilestoneCard

File: `components/milestones/MilestonesSection.tsx`
Last updated: 2026-07-04

| Property | Class |
| -------- | ----- |
| Card container | `rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Status badge — upcoming | `bg-background text-muted-foreground border-border` |
| Status badge — at_risk | `bg-warning-light text-warning border-warning/20` |
| Status badge — missed | `bg-destructive-light text-destructive border-destructive/20` |
| Status badge — completed | `bg-success-light text-success border-success/20` |
| Status badge wrapper | `flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide` |
| Progress bar track | `h-1.5 w-full overflow-hidden rounded-full bg-background` |
| Progress bar fill | `h-full rounded-full bg-brand-primary transition-all` |
| Readiness check — done | `size-4 rounded-full border-success bg-success text-card text-[9px] font-bold` |
| Readiness check — pending | `size-4 rounded-full border-border bg-background text-muted-foreground text-[9px] font-bold` |
| Inline create form | `rounded-xl border border-border bg-card p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Section label | `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` |
| Add button | `rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background` |

**Pattern notes:**
List rendered directly from props (no `useState` wrapper) — `router.refresh()` after create/delete re-enters the RSC. Delete uses a two-click inline confirmation (`confirmingDelete` boolean state in `MilestoneCard`) — no `AlertDialog`, matching the project codebase's inline-confirmation convention. Contracts agreed and rollback owner use optimistic updates with revert on error, same `useTransition` + `toast.error` pattern as `MilestonesSection`. Milestone status is computed client-side from live module stats via `getMilestoneStatus()` (derived, not read from `milestones.status` column — column is written server-side by `recalculateMilestoneStatus` for notification triggers only).

---

### Dashboard — BlockerBanner

File: `components/dashboard/BlockerBanner.tsx`
Last updated: 2026-06-30

| Property | Class |
| -------- | ----- |
| Container | `rounded-xl border border-destructive/20 bg-destructive-light px-6 py-4` |
| Count label | `text-sm font-semibold text-destructive` |
| Dot | `size-2 rounded-full bg-destructive` |
| Blocker text | `text-sm text-foreground` — actor bold, description muted |
| Type badge | `rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide` — color from `lib/blocker-types.ts`'s `blockerTypeBadge` |

**Pattern notes:**
Each row is a `<Link>` to the module detail page (`/projects/{projectId}/modules/{moduleId}`), not plain text — added so blockers are reachable/resolvable from the dashboard, not just visible. Type badge (External/Internal Dependency) renders inline next to the module name, reusing the shared mapping from `lib/blocker-types.ts` rather than a local copy.

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
| View details footer | `mt-4 flex items-center justify-between border-t border-border pt-3` — hint: `text-xs text-muted-foreground` · CTA label: `text-xs font-semibold text-brand-primary` |

---

### Dashboard — ModulesTable

File: `components/dashboard/ModulesTable.tsx`
Last updated: 2026-06-30

**Pattern notes:**
Table wrapped in `overflow-x-auto` for mobile. Header cells use `font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`. Status badges use `rounded-md px-2.5 py-1 text-[10px] font-semibold` with token bg/text pairs per status. Progress bars are `h-1.5 w-24 rounded-full`. Urgent deadlines use `text-destructive` (now triggered at ≤3 days left, matching project-overview.md's spec — was 7). Rows are clickable to the module detail page: since `<a>` can't legally wrap a `<tr>`, each `<td>` gets `className="p-0"` and its own full-bleed `<Link className="block px-* py-*">` instead of one Link around the row — same pattern as `components/projects/ModulesList.tsx`'s grid-based rows, adapted for a real `<table>`. Optional `atRisk` prop renders a `size-1.5 rounded-full bg-warning` dot next to the module name — see Modules — ManageDependenciesModal entry below for the full dependency-risk picture.

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

Optional `atRisk` prop on each row renders a `size-1.5 rounded-full bg-warning` dot next to the module name — see Modules — ManageDependenciesModal entry below.

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
Last updated: 2026-06-30

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
| Note badge — review | `border-destructive/20 bg-destructive-light text-destructive` |
| Add note modal | `fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm` / inner `max-w-md rounded-xl border border-border bg-card p-6` |
| Review banner | `rounded-lg border border-border bg-background p-3` |
| Approve button | `rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-card hover:bg-brand-primary disabled:opacity-60` |
| Request changes button | `rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50` |
| Request changes modal | same shape as Add note modal, destructive accent: `border-destructive/20`, submit button `bg-destructive` |

**Pattern notes:**
Progress slider uses `accent-foreground` for the thumb color (Tailwind 4 no-config approach). Notes stored as JSON array in `technicalNotes` text column — each entry has `{ id, type, title, body, createdAt }`. `isDirty` computed from initial vs current progress/status — Save button only activates when there are unsaved changes.

**"Completed" is not in `STATUS_OPTIONS`** — it's only reachable via the Approve action, not pickable from the dropdown, including for leads/PM/owner (otherwise the review gate would be cosmetic). A conditional `<SelectItem value="completed">` is injected only when the module's *current* status is already `"completed"`, purely so an already-completed module doesn't render a blank/unmatched Select value — it's not a way to manually re-select Completed from another state. The Approve/Request Changes banner renders only when `savedStatus === "review" && canReview` (gated on the saved baseline, not the dirty in-flight `status`, so it doesn't flicker while someone fiddles with the dropdown pre-save). `canReview` excludes the assignee even if they also hold a privileged role — computed identically on the server (`app/projects/[id]/modules/[mid]/page.tsx`) and mirrored by `actions/modules.ts`'s `getReviewEligibility`, kept textually in sync to avoid client/server drift. `"review"`-type notes are created only by `requestChanges` — `NOTE_TYPES` (the manual "+ Add note" selector) deliberately excludes it.

---

### Modules — BlockerList

File: `components/modules/BlockerList.tsx`
Last updated: 2026-06-30

| Property | Class |
| -------- | ----- |
| Card | `rounded-xl border border-destructive/20 bg-destructive-light p-5` |
| Type badge | `rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide` — color from `lib/blocker-types.ts`'s `blockerTypeBadge` |
| Resolve button | `rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-50` |

**Pattern notes:**
Renders the module's unresolved blockers (reporter name + date + type badge) with a per-blocker Resolve button, gated by `canResolve` (same assignee/lead/PM/owner eligibility as `ModuleDetailClient`'s `canEdit`). Resolving calls `resolveBlocker(blockerId)` then `router.refresh()`. Returns `null` when there are no open blockers — no empty-state card. Rendered as a sibling below `ModuleDetailClient` in `app/projects/[id]/modules/[mid]/page.tsx`, both wrapped in one `<div>` so they share the left grid cell.

---

### Modules — ReportBlockerButton

File: `components/modules/ReportBlockerButton.tsx`
Last updated: 2026-06-30

| Property | Class |
| -------- | ----- |
| Trigger button | `rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive-light` |
| Modal | `fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm` / inner `max-w-md rounded-xl border border-destructive/20 bg-card p-6` |
| Type toggle (selected) | `rounded-lg border border-foreground bg-foreground px-3 py-1.5 text-xs font-semibold text-card` |
| Type toggle (unselected) | `rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background` |
| Submit button | `flex-1 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-card hover:opacity-90` |

**Pattern notes:**
Isolated `"use client"` component — lets the page Server Component render most of the sidebar statically. Type toggle is a 2-button `grid-cols-2` group (External / Internal Dependency, default "External") copying `ModuleDetailClient.tsx`'s `AddNoteModal`/`NOTE_TYPES` button-group pattern exactly, just two options instead of four — values/labels come from `lib/blocker-types.ts`'s `BLOCKER_TYPES`. On submit: inserts `blocker_log` (with `type`), sets `module.status = "blocked"`, recalculates project health, revalidates three paths.

---

### Modules — ManageDependenciesModal

File: `components/modules/ManageDependenciesModal.tsx`
Last updated: 2026-06-30

| Property | Class |
| -------- | ----- |
| Trigger button | `rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-background` |
| Modal | `fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm` / inner `max-w-md rounded-xl border border-border bg-card p-6` (neutral border, not `border-destructive/20` like ReportBlockerButton's modal — this isn't a "something's wrong" action) |
| Toggle (selected) | `rounded-lg border border-foreground bg-foreground px-3 py-1.5 text-xs font-semibold text-card` |
| Toggle (unselected) | `rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background` |

**Pattern notes:**
Rendered next to `ReportBlockerButton` in the module detail page header, gated by `canManageDependencies` (`owner`/`team_lead`/`project_manager` only — no assignee carve-out, since declaring a dependency is an architecture decision, not day-to-day execution; mirrors `actions/modules.ts`'s `DEPENDENCY_MANAGER_ROLES` exactly). Lists sibling modules in the project as toggle buttons; each toggle calls `addDependency`/`removeDependency` directly (one Server Action call per click, not a batch save) then `router.refresh()`. Returns `null` when the project has no other modules to depend on. The module detail page's right sidebar also gained a "Dependencies" card (between Deadline and Activity Summary, same `rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` shell as its neighbors) with two sub-lists — "Depends on" and "Depended on by" — each entry a `Link`-wrapped badge (`rounded-md border px-2 py-0.5 text-xs font-medium`); a broken (blocked or overdue) upstream entry uses `border-destructive/20 bg-destructive-light text-destructive`, everything else `border-border bg-background text-foreground`. If the module itself is in the computed at-risk set (`lib/dependency-risk.ts`'s `computeAtRiskModules`), an "Integration risk" badge appears next to the status badge in the page header, reusing `lib/blocker-types.ts`'s warning composition (`border-warning/30 bg-warning-light text-warning`) — no new color token. The project detail page (`app/projects/[id]/page.tsx`) similarly gained a dependency-edge list section between `ScheduleAlert` and the stat cards, shown only when the project has ≥1 edge — one row per edge (`"X depends on Y"`), `border-destructive/20 bg-destructive-light` when the upstream is broken, neutral otherwise. `components/projects/ModulesList.tsx` and `components/dashboard/ModulesTable.tsx` both gained an optional `size-1.5 rounded-full bg-warning` dot next to the module name when `atRisk` is true.

---

### Dashboard — ActivityFeed

File: `components/dashboard/ActivityFeed.tsx`
Last updated: 2026-06-28

**Pattern notes:**
Event rows use `divide-y divide-border`. Each row has a colored `size-2 rounded-full` dot (`bg-success`, `bg-warning`, `bg-muted-foreground`). Actor and target are `font-semibold`. Project + timestamp are `text-xs text-muted-foreground`.

---

### My Work Page

File: `app/my-work/page.tsx`, `components/my-work/MyModulesList.tsx`, `components/my-work/ProgressBumpButtons.tsx`, `components/my-work/TeamPulse.tsx`
Last updated: 2026-06-30

| Property | Class |
| -------- | ----- |
| Page header h1 | `text-[32px] font-bold leading-tight text-foreground` |
| Module row card | `rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]` |
| Status badge | same `statusConfig` bg/text/border map as `ModulesTable.tsx`/`ModulesList.tsx` |
| At-risk dot | `size-1.5 rounded-full bg-warning` — same as the dependency-graph feature's indicator |
| Overdue / Blocked badge | `rounded-md border border-destructive/20 bg-destructive-light px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-destructive` |
| Stale badge | `rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` — neutral tone, not a danger tier (a module can be stale but otherwise on schedule) |
| Bump button | `rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-40` |
| Team Pulse "Updated" badge | `rounded-md border border-success/20 bg-success-light px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-success` |
| Team Pulse "Silent" badge | same neutral composition as the stale badge |
| View module footer | `mt-3 flex items-center justify-end border-t border-border pt-3` — CTA is a real `<Link>` (card `<li>` is not a link): `text-xs font-semibold text-brand-primary hover:underline` with `aria-label="View details for {name}"` to disambiguate from the module name link above |

**Pattern notes:**
A personal, per-user module list — `assignedDeveloperId === currentUser.id`, org-scoped via a join to `projects`. Sorted by an urgency tier (`overdue > blocked > stale > atRisk > rest`, each tier broken by `daysLeft` ascending), computed server-side via `lib/module-status.ts`'s `computeModuleBadges` plus a reuse of `lib/dependency-risk.ts`'s `computeAtRiskModules` for the at-risk dot — not reinvented. `MyModulesList.tsx` deliberately does NOT reuse `ModulesTable.tsx`/`ModulesList.tsx` directly: those wrap each row in one full-bleed `<Link>`, which can't contain the interactive bump buttons this page needs — only the module name/project text is a link here, badges and `ProgressBumpButtons` are link-sibling elements instead. `ProgressBumpButtons.tsx` is its own client component (own `useTransition`) so each row's pending state is independent — a single shared transition at the list level would make every row's buttons appear pending whenever any one of them was clicked. It calls `updateModuleProgress` directly (no new Server Action) and always passes the module's *current* status through unchanged, which is what prevents a bump from ever silently completing a module — the only path to `"completed"` stays `approveModule`. Buttons render `null` entirely when `status === "completed"`, matching the action's own lock. Team Pulse is a role-gated section (`MODULE_LEAD_ROLES`, exported from `lib/roles.ts` — moved out of `actions/modules.ts` after a post-implementation fix, since a `"use server"` file can't export a plain non-function value) below the personal list — not a tab, not a separate route — shown only to leads/PM/owner, computed from `lib/module-status.ts`'s `computeTeamPulse` (member "updated this week" if ANY assigned module's `updatedAt` falls within 7 days; zero-assigned-module members render separately from "silent" ones, not lumped in).

---

### Team Page

File: `app/team/page.tsx`, `components/team/TeamClient.tsx`
Last updated: 2026-06-30

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
| Remove button | `text-sm font-medium text-destructive hover:opacity-75` |
| Invite button | `rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-card hover:opacity-90` |
| Regenerate link button | `text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-50` |
| Remove-member AlertDialog | shadcn `components/ui/alert-dialog.tsx` — `AlertDialogAction variant="destructive"` |

**Pattern notes:**
Server Component (`app/team/page.tsx`) fetches from `organizationMembers` + `organizations` for the current user's org, derives stats (members, active, owners, leadsAndPMs), derives `inviteBase` from `lib/get-request-origin.ts` (not `NEXT_PUBLIC_APP_URL`), and only includes `initialInviteCode` in the props when `currentUser.role === "owner"` — non-owners get `null`, so the code never reaches the client payload (not just CSS-hidden). Filter tabs are `"all" | "active"` only — there's no "Pending" tab (removed; it could never match anything since invite-link joins grant immediate full membership, no approval step ever produces a pending member). Client Component handles: search filter state, filter tab state, role dropdown (disabled for owners/self, hidden for users without `CAN_CHANGE_ROLES`), remove button (hidden for owners/self, visible only to `CAN_REMOVE_MEMBERS`), the "+ Invite member" button and invite modal (hidden entirely unless `canInvite`), and "Regenerate link" (owner-only, calls `rotateInviteCode`, dedicated `isRotating` flag — not the shared `isPending` — so the label doesn't lie about what's in flight). Role dropdown uses a native `<select>` with `appearance-none` and an overlaid `ChevronDown` icon. Owner rows show a read-only role label instead of a dropdown. Member removal uses a shadcn `AlertDialog` (single dialog instance, driven by a `memberToRemove: { id, name } | null` state) instead of the native `confirm()` — Radix's `AlertDialogAction`/`AlertDialogCancel` both close the dialog automatically on click (they render as `DialogPrimitive.Close`), so the confirm click fires the removal and visually dismisses the dialog in the same tick; the result surfaces afterward via toast.

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
Props: `{ inviteCode: string; orgName: string }`. Three role cards (developer, team_lead, project_manager). Calls `joinOrganization(inviteCode, selectedRole)`. Uses `useTransition`. Same two-column split layout as onboarding. Server page (`app/join/[code]/page.tsx`) validates invite code against DB — shows graceful "Invalid invite link" card if code not found. Unauthenticated users redirected to `/login?redirect=/join/[code]`; already-onboarded users redirected to `/dashboard`. `/login` ↔ `/signup` footer links carry the `?redirect=` param both directions (`lib/sanitize-redirect.ts`) so a first-time invitee who needs to sign up doesn't lose the invite mid-flow.

---

### shadcn/ui Primitives

File: `components/ui/button.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/select.tsx`, `components/ui/slider.tsx`
Last updated: 2026-06-30

Installed via shadcn CLI, built on `radix-ui` + `class-variance-authority`. Use as-is — do not hand-roll a parallel modal/dropdown/slider implementation when one of these covers the need.

| Component | Notes |
| --- | --- |
| `Button` | `variant`: `default` \| `outline` \| `secondary` \| `ghost` \| `destructive` \| `link`. `size`: `default` \| `xs` \| `sm` \| `lg` \| `icon*`. Used directly and as the base for `AlertDialogAction`/`AlertDialogCancel`. |
| `AlertDialog` | Controlled via `open`/`onOpenChange` — see Team Page's remove-member confirmation for the canonical usage (single dialog instance + a `{ id, name } \| null` state, not one dialog per row). `AlertDialogAction`/`Cancel` both auto-close on click (render as `DialogPrimitive.Close`) — don't add manual `setOpen(false)` calls, they're redundant. Outside-click and outside-interaction are blocked by Radix by default; Escape still closes it. |
| `Select` / `Slider` | Used in module progress/status controls — see ModuleDetailClient pattern notes. |
