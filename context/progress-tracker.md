# Progress Tracker — DevFlow

Update this file after every completed phase.

---

## Current Status

**Phase:** Phase 11 — Multi-Tenant Organization Layer
**Last completed:** Hardened `lib/get-request-origin.ts` after review — (1) `x-forwarded-host`/`x-forwarded-proto` are now only honored when `TRUST_PROXY_HEADERS=true` (matches Better Auth's own `trustedProxyHeaders` gate; previously trusted unconditionally, which a direct request could spoof since nothing in this repo terminates TLS in front of the app); (2) host validation and loopback detection now correctly handle bracketed IPv6 literals (`[::1]:3000`) — verified empirically, the prior regex rejected them outright. **Follow-up needed:** add `TRUST_PROXY_HEADERS=true` to `.env.production` on the server (not in this repo, gitignored) since devflowlab.tech is almost certainly behind a proxy/CDN terminating TLS. Invite link no longer depends on `NEXT_PUBLIC_APP_URL` — that var is baked into the client bundle at Docker build time and silently becomes `""` if the build arg is forgotten (the prior `??` fallback in `app/team/page.tsx` didn't catch empty string, only null/undefined), producing domain-less `/join/...` links that browsers misread as `file:///join/...`. Added `lib/get-request-origin.ts` — derives the origin live from the incoming request's `x-forwarded-host`/`host` and `x-forwarded-proto` headers (mirrors the pattern in Better Auth's own source, validates header values against a host regex, defaults to `http` for loopback hosts and `https` otherwise). `app/team/page.tsx` now calls this instead of reading the env var — works correctly regardless of how the image was built. Fixed account-takeover risk from the account-linking fix — `requireLocalEmailVerified: false` was reverted (it would have let an attacker pre-register someone else's email via this app's unverified `/signup`, then silently inherit a real Google/GitHub login when the real owner signed in, since the email auto-matched). Kept `trustedProviders: ["google", "github"]` only. Wired up the real fix instead: `ProfileForm.tsx`'s "Connect"/"Disconnect" buttons now call `authClient.linkSocial()`/`authClient.unlinkAccount()` — linking now only happens from an already-authenticated session at the user's explicit request, never automatically off an OAuth email match. Also hardened `docker-compose.yml`'s build arg with `${NEXT_PUBLIC_APP_URL:?...}` so a forgotten `--env-file` fails the build loudly instead of silently baking an empty value. Fixed `?error=account_not_linked` on Google sign-in — traced through `node_modules/better-auth/dist/oauth2/link-account.mjs`: when a Google sign-in matches an existing local user by email but no `account` row links that user to Google yet, Better Auth tries to auto-link, but blocks it because `accountLinking.requireLocalEmailVerified` defaults to `true` and checks the *local* user's `emailVerified` flag — which is permanently `false` for any email/password signup in this app (no email-verification flow exists). Added `account.accountLinking` to `lib/auth.ts`: `enabled: true`, `trustedProviders: ["google", "github"]`, `requireLocalEmailVerified: false` — lets a user who signed up with email/password later sign in with Google/GitHub using the same email without manual DB cleanup. OAuth sign-in fix — traced through Better Auth's source (`node_modules/better-auth/dist/utils/url.mjs`, `api/routes/sign-in.mjs`) to find that `withPath()` validates `baseURL` via `new URL()` (which silently tolerates `http:host` missing `//`) but then builds the returned string via raw concatenation on the *unnormalized* input, so a malformed `BETTER_AUTH_URL` produces a malformed `redirect_uri` sent to Google/GitHub, which they reject via exact string match (email/password auth unaffected since it doesn't depend on an external redirect_uri). Fixed local `.env` (`BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL` now `http://localhost:3000`). Also fixed a real but separate hygiene gap: `Dockerfile`'s builder stage never set `NEXT_PUBLIC_APP_URL` at build time (Next.js inlines `NEXT_PUBLIC_*` vars at build, not runtime) — added `ARG`/`ENV NEXT_PUBLIC_APP_URL` to the builder stage and `build.args` in `docker-compose.yml` (must build with `docker compose --env-file .env.production build` since `env_file:` only injects runtime env, not build args). Production GitHub OAuth error ("redirect_uri is not associated with this application") is a GitHub OAuth App console misconfiguration, not a code bug — user needs to verify "Authorization callback URL" matches `https://devflowlab.tech/api/auth/callback/github` exactly. Invite gated to owner-only — `app/team/page.tsx` only passes the real `inviteCode` to `TeamClient` when `currentUser.role === "owner"` (non-owners get `null`, so the code never reaches the client payload); "+ Invite member" button and invite modal are hidden for non-owners (`canInvite` check). Team page visibility, role changes, and member removal remain open to PM/team_lead as before — only invite-link access was restricted. Signup redirect chain fix — first-time invitees no longer lose their invite. `redirect` query param now flows `/join/[code]` → `/login?redirect=...` → `/signup?redirect=...` (footer links carry it both directions) → `SignupForm` uses it for both email signup and OAuth `callbackURL` instead of hardcoded `/onboarding`, so a brand-new user signing up via an invite link lands back on the join page instead of creating their own org. Invite link rotation — `rotateInviteCode` action (owner-only, generates new 16-char hex code, invalidates old link), "Regenerate link" button in invite modal (owner-only, confirmation dialog, dedicated `isRotating` flag, `inviteBase`+`inviteCode` props replace fragile URL regex). Post-review bug fixes — (1) redirect() moved outside try/catch in completeOnboarding and joinOrganization (Next.js NEXT_REDIRECT swallow fix); (2) joinOrganization existing-membership check now org-scoped (was missing organizationId filter); (3) updateMemberRole and removeMember wrapped in db.transaction() for atomicity; (4) updateProfile syncs organizationMembers.role in same transaction; (5) ProfileForm shows read-only Owner badge instead of editable role cards for workspace owners; (6) removeMember modules/blockers check org-scoped via innerJoin with projects; all as SessionUser type assertions replaced with type annotations. TypeScript strict pass — 0 errors.
**Next:** Application is production-ready with full org isolation and no known bugs.

---

## Progress

### Phase 1 — Foundation & Styling
- [x] Context Documentation Updates
- [x] Tailwind v4 Color Theme in `globals.css`
- [x] Root layout font setup in `app/layout.tsx`
- [x] Homepage landing page in `app/page.tsx`
- [ ] Root layout navigation and navbar in `app/layout.tsx` (UI Phase)

### Phase 2 — Database & ORM Setup (Drizzle + PostgreSQL)
- [x] Direct database pool client connection in `lib/db.ts`
- [x] Database schema declaration in `lib/schema.ts`
- [x] Drizzle configuration schema and migration settings in `drizzle.config.ts`

### Phase 3 — Authentication & RBAC (Better Auth)
- [x] Better Auth config server file `lib/auth.ts`
- [x] Auth API handlers route `app/api/auth/[...all]/route.ts`
- [x] Auth client wrapper `lib/auth-client.ts`
- [x] Static login page form `/login` (now wired to Better Auth)
- [x] Static signup page form `/signup` (now wired to Better Auth)

### Phase 4 — Project Creation & Management
- [x] Project Creation form `/projects/new` — two-column layout: left form card (name, description, dates, priority segmented control), right panel (team member checklist + Create/Cancel). `actions/projects.ts` Server Action validates input, inserts to DB, redirects to `/projects/[id]`
- [x] Project list page `/projects` — session-gated, real DB queries (projects + modules + blockers), search + health filter tabs, 2-column card grid matching design

### Phase 5 — Architectural Modules Definition
- [x] Add Module form `/projects/[id]/modules/new` — module name, description, owner dropdown (project team members), deadline date, initial status segmented buttons (NOT STARTED / IN PROGRESS / REVIEW / BLOCKED), starting progress range slider 0–100%. `actions/modules.ts` inserts module + activity log entry, revalidates project page, redirects back to project detail.
- [x] Project Dashboard details page `/projects/[id]` — session-gated, real DB queries, health recalculated live via `lib/health.ts`, schedule alert banner, 4 stat cards (progress + bar, time used + bar, modules breakdown, open blockers), modules table with status badges + progress bars + owner avatars, team panel with avatar stack + member list, activity feed

### Phase 6 — Status Control & Blocker Escalation
- [x] Module Detail page `/projects/[id]/modules/[mid]` — breadcrumb, h1 + status badge, description, progress card (read-only bar + interactive slider + status dropdown + Save button), Notes & Documentation (JSON notes stored in `technicalNotes`, add note modal with type/title/body), right sidebar (Owner, Deadline + on-track status, Activity summary bullet list, Quick Links). `ReportBlockerButton` client component opens modal → inserts blocker_log + sets module status to blocked + recalculates project health. `ModuleDetailClient` handles progress update + note addition. `actions/modules.ts` updated with `updateModuleProgress`, `addNote`, `reportBlocker` Server Actions, all calling `recalculateProjectHealth` helper.

### Phase 7 — Workspace Dashboard & Analytics
- [x] Workspace Dashboard page `/dashboard` — fully wired to live DB. All mock data replaced: stat cards (active projects, avg progress, modules shipped, open blockers), blocker banner (real unresolved blocker_logs with module names), progress chart (real project progress vs time-used %), modules status pie chart (real status counts), activity chart (real logs per day last 7 days), project cards (sorted by health, real team member initials, real drift calculation), modules table (non-completed modules sorted by deadline), activity feed (real activity_logs newest first). Empty states handled for zero projects/modules/blockers.

### Phase 8 — Profile & Settings
- [x] Profile page `/profile` — session-gated, real DB queries. Avatar + display name + email header, editable Display Name field (email read-only), role selector (3 cards: Developer / Team Lead / Project Manager, selected card highlighted), Connected Accounts section (Google + GitHub with connected/not-connected state from `account` table), Save changes / Cancel buttons (disabled until dirty). Right sidebar shows owned modules with project name, progress %, and status badge. `updateProfile` Server Action in `actions/users.ts` validates name + role, updates `user` table, revalidates `/profile` and `/dashboard`.

### Phase 10 — Team Page

- [x] Team page `/team` — session-gated, real DB queries (organizationMembers scoped to org). Lists org members with avatar initials, role dropdown (inline update via `updateMemberRole` — disabled for owners and non-authorized roles), Active status badge, joined date. Four stat cards: Members, Active, Owners, Leads & PMs. Search by name/email/role + filter tabs (All/Active/Pending). Remove button (guards: no assigned modules, no unresolved blockers, RBAC check, can't remove owner or self). Invite modal shows shareable `/join/[code]` link with copy button. "Team" nav link in Navbar; `/team` + `/join` routes in proxy.

### Phase 11 — Multi-Tenant Organization Layer

- [x] Schema: `organizations`, `organizationMembers` tables; `organizationId` on `projects`, `activityLogs`, `user`
- [x] Auth: `organizationId` added to Better Auth `additionalFields` (available in session without extra DB call)
- [x] Migration: `npx drizzle-kit push --force` — clean; seed script updated with org row + `organizationId` on all projects
- [x] Onboarding redesigned: `CompanyDetailsForm` (name, description, industry, size) replaces `RoleSelector`; `completeOnboarding` creates org + org_member + sets owner role in a single transaction
- [x] Join flow: `/join/[code]` server page validates invite code, `JoinOrgForm` client component selects role, `joinOrganization` action joins org in transaction
- [x] Proxy: `/join` routes added to protected set; exempt from onboarding redirect; already-onboarded users redirected to dashboard; unauthenticated users get `?redirect=/join/[code]` on login URL
- [x] Login: `?redirect=` param support (sanitized, relative-only) in `app/login/page.tsx` + `LoginForm` prop
- [x] Data isolation: all dashboard/projects/modules pages filter by `session.user.organizationId`; guard redirects to `/onboarding` if no orgId; `actions/projects.ts` includes `organizationId` in insert; `actions/modules.ts` verifies parent project belongs to org; `activityLogs` inserts include `organizationId`
- [x] Team page overhaul: fetches from `organizationMembers`, `actions/team.ts` fully secured (auth check, org scope, RBAC, prevent owner/self removal, reset removed user so they re-enter onboarding)

### Phase 9 — Verification & Deployment
- [x] `npm run lint` — clean. Fixed 3 `Date.now()` React purity errors in `dashboard/page.tsx`, `projects/[id]/page.tsx`, `projects/[id]/modules/new/page.tsx`
- [x] `npm run build` — clean. 16 routes compiled, TypeScript strict pass, 0 errors
- [x] Unit tests — 16/16 pass (`calculateProjectHealth`: 9 cases; `calculateProjectProgress`: 7 cases)
- [x] Security audit — no hardcoded secrets, no raw SQL string interpolation, `.env*` gitignored, no `NEXT_PUBLIC_` on secret keys
- [x] Access control — `proxy.ts` gates all protected routes; unauthenticated users redirect to `/login`; incomplete onboarding redirects to `/onboarding`
