# Memory — Dashboard Page + Review Fixes

Last updated: 2026-06-28

## What was built

### Dashboard (Phase 7 — complete)

- Created `app/dashboard/page.tsx` — Server Component, session-gated, static mock data, assembles all dashboard components
- Created `components/dashboard/Navbar.tsx` — desktop nav (hidden md:flex, true center), mobile hamburger + collapsible drawer, active link highlighting via `usePathname`
- Created `components/dashboard/StatCard.tsx` — 4-stat grid, value colors `text-brand-primary` or `text-destructive` when trendColor="destructive" with no trend string
- Created `components/dashboard/BlockerBanner.tsx` — hidden when empty, two-column blocker list, `bg-destructive-light border-destructive/20`
- Created `components/dashboard/ProgressChart.tsx` — Recharts BarChart, two bars (progress vs timeUsed), empty state when data is empty
- Created `components/dashboard/ModulesStatusChart.tsx` — Recharts PieChart donut, legend uses token classes (`text-warning`, `text-success`, etc.) not inline style; colors keyed by `StatusKey` enum, empty state when all counts are 0
- Created `components/dashboard/ActivityChart.tsx` — Recharts AreaChart with gradient fill, empty state when data is empty
- Created `components/dashboard/ProjectCard.tsx` — health badge, progress bar, team avatar stack, blocker badge, links to `/projects/${id}`
- Created `components/dashboard/ModulesTable.tsx` — `overflow-x-auto`, `<Link>` (not `<a>`) for "See all modules", `bg-muted` for not_started progress bar
- Created `components/dashboard/ActivityFeed.tsx` — colored dots, actor+target bold, project+timestamp muted

### Review fixes applied (10 issues, all resolved)

1. `ModulesStatusChart` legend colors → token classes, not inline `style`
2. `ModulesTable` "See all modules" → `<Link>` from `next/link`
3. `not_started` progress bar → `bg-muted` (was `bg-muted-foreground`)
4. `StatCard` "Open Blockers" value → `text-destructive` when `trendColor="destructive"` and no `trend` prop
5. Navbar → `hidden md:flex` on desktop nav, hamburger + drawer for mobile
6. `ModulesStatusChart` statuses shape → `{ key, label, count }` — no color strings from page
7. `user.role` nullability → confirmed safe via `?? "developer"` fallback
8. Greeting → computed from `new Date().getHours()` (morning/afternoon/evening)
9. Charts → empty state messages when data arrays are empty
10. Issues 6 & 10 (mock data, mock IDs) → Phase 8 deferred

### Earlier this session (from prior compaction)

- Added `onboardingCompleted` boolean to `lib/schema.ts`, `lib/auth.ts`
- Created `lib/auth-types.ts` — `SessionUser` type from `auth.$Infer.Session.user`
- Created `proxy.ts` at project root — route protection + onboarding enforcement
- Created `actions/users.ts` — `completeOnboarding(role)` Server Action
- Created `app/onboarding/page.tsx` + `components/onboarding/RoleSelector.tsx`
- Updated `components/auth/SignupForm.tsx` — redirects to `/onboarding`
- Created `lib/health.ts` — pure health algorithm functions
- Created `vitest.config.ts`, `tests/unit/health.test.ts` (16 tests, all passing), `playwright.config.ts`, `tests/e2e/auth.spec.ts`

## Decisions made

- `ModulesStatusChart` accepts `{ key: StatusKey, label, count }` — color is derived internally from a `statusFill` map using CSS var strings for Recharts SVG, and `statusTextClass` map using Tailwind token classes for the legend. Never pass color strings from the page.
- Recharts SVG elements (fill, stroke) must receive `"var(--color-*)"` strings — they render to SVG and don't process Tailwind classes. Legend text uses token classes instead.
- `StatCard` value color convention: `text-brand-primary` by default; `text-destructive` when `trendColor="destructive"` and no `trend` string is provided (value carries the signal).
- Navbar is a Client Component (`"use client"`) because it needs `usePathname` for active link state and `useState` for mobile drawer toggle.
- All dashboard data is static mock data for Phase 7 — will be replaced with real DB queries in Phase 8.
- `onboardingCompleted` boolean is the detection signal for new vs returning users — `role` alone cannot distinguish them since it defaults to `"developer"`.
- `proxy.ts` imports `auth` directly — acceptable because Next.js 16 proxy runs in Node.js runtime, not edge.
- `redirect()` in Server Actions must be called outside try/catch (Next.js throws internally).

## Problems solved

- Navbar centering: logo adjacent to nav links — fixed with `flex flex-1 justify-start` / center nav / `flex flex-1 justify-end` pattern (three-column flex).
- `ModulesStatusChart` inline style bypassing token system — refactored to use `StatusKey` enum with two internal maps (one for SVG fill strings, one for Tailwind text classes).
- `ModulesTable` using `<a>` causing full page reload — replaced with `<Link>`.
- `bg-muted-foreground` used as background class — corrected to `bg-muted`.
- Charts showing blank white boxes for new users — all three charts now render an empty state message.

## Current state

- Phase 7 (Dashboard) complete and reviewed — all issues fixed
- Phase 3 (Auth/Onboarding) complete and reviewed
- Test suite in place: 16 unit tests passing, Playwright E2E config ready
- Migration `0002_slim_puma.sql` (adds `onboarding_completed` column) — user confirmed it was applied
- `/dashboard` is live (dynamic route, session-gated)
- `/onboarding` is live (dynamic route, session-gated)
- All mock data on dashboard is static — not wired to DB yet (Phase 8 concern)

## Next session starts with

**Phase 4 — Project Creation & Management:**

1. Read `context/architecture.md` and `context/build-plan.md` Phase 4 before writing any code
2. Check `lib/schema.ts` for the existing `projects` table schema
3. Create `actions/projects.ts` — `createProject` Server Action (validates input, inserts to DB, redirects to `/projects/[id]`)
4. Build `app/projects/new/page.tsx` — project creation form (name, description, start date, end date, priority)
5. Build `app/projects/page.tsx` — project list, queries real DB, calculates health via `lib/health.ts`
6. Build `app/projects/[id]/page.tsx` — project detail page (Phase 5, but may start here)

## Open questions

- E2E tests for the full onboarding flow (signup → onboarding → role select → dashboard) not yet written — now unblocked since `/dashboard` exists
- `BETTER_AUTH_URL` must be updated to production URL before deployment
- `lib/health.ts` functions defined but not yet wired into any page — will be used in Phase 4/5 when project health is calculated from real module data
- Dashboard mock data (projects, modules, activity) needs real DB queries in Phase 8
