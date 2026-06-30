# Build Plan — DevFlow

This build plan outlines the phases to build the DevFlow application, starting from the design configuration to the database schema, Better Auth backend integration, and finally the responsive UI templates.

---

## Phase 1 — Foundation & Styling
* Configure design token color variables in `app/globals.css` using Tailwind v4.
* Set up global page width parameters, header height structures, and default card styles.
* Set up root `app/layout.tsx` importing the Inter font variable.

---

## Phase 2 — Database & ORM Setup (Drizzle + PostgreSQL)
* Set up database connection in `lib/db.ts` utilizing `pg` connection pool.
* Create schemas in `lib/schema.ts` for all database tables:
  * `profiles` (User metadata & workspace roles)
  * `projects` (Timeline, priority, progress, health)
  * `modules` (Scope ownership, status, target deadline, technical documentation)
  * `blocker_logs` (Logs of active development blockages)
  * `activity_logs` (Workspace chronological feed events)
* Configure `drizzle.config.ts` for migrations management.
* Run initial schema migrations using Drizzle Kit to create tables in the local PostgreSQL instance.

---

## Phase 3 — Authentication & RBAC (Better Auth)
* Initialize Better Auth configuration in `lib/auth.ts` with `drizzleAdapter` targeting PostgreSQL tables.
* Map custom user attributes to define role profiles (`developer`, `team_lead`, `project_manager`).
* Create API Route Handler `app/api/auth/[...all]/route.ts`.
* Setup the client-side provider client in `lib/auth-client.ts`.
* Build the Sign-in and Sign-up UI page at `/login` with forms for email login and OAuth buttons.

---

## Phase 4 — Project Creation & Management
* Build Project Creation form page at `/projects/new`.
* Implement Server Action `actions/projects.ts` to insert new projects into the PostgreSQL database.
* Build the Projects List page `/projects` which queries projects from the database, calculating completion percentages and priority tags.
* Map the active workspace navbar in `components/Navbar.tsx`.

---

## Phase 5 — Architectural Modules Definition
* Create Add Module form page at `/projects/[id]/modules/new`.
* Implement Server Action `actions/modules.ts` to write modules to the database and assign developer ownership.
* Build the Project Dashboard details page `/projects/[id]`:
  * Query the parent project record and active modules list.
  * Recalculate average progress and timeline health status using the schedule performance algorithm.
  * Render timeline health alert banners if marked as delayed or blocked.
  * Display the project team roster and project activity feeds.

---

## Phase 6 — Status Control & Blocker Escalation
* Build the Module Detail page `/projects/[id]/modules/[mid]`:
  * Query the module details, owner info, and logged blockers.
  * Implement interactive progress slider (0-100%) and status picker.
  * Save updates to the database using Server Actions and recalculate project health.
  * Build a Blocker escalation form to add items to `blocker_logs` and set module status to `blocked`.
  * Create a Rich Text editor textarea to save technical and schema notes directly to the database.

---

## Phase 7 — Workspace Dashboard & Analytics
* Build the main workspace Dashboard page `/dashboard`:
  * Fetch overall database metrics (Active projects count, module velocity, red flag count).
  * Display a prominent active blocker alert board with actions to resolve them directly.
  * Render a comparative Bar Chart using Recharts showing Project Completion Progress vs Time Elapsed.
  * Fetch and list the global chronological activity log feed.

---

## Phase 8 — Profile & Settings
* Build the Profile page `/profile`: avatar, editable display name, role selector (3 cards — read-only badge instead for the `owner` role), Connected Accounts section.
* Implement `updateProfile` Server Action in `actions/users.ts` — validates name + role, blocks role changes for owners, keeps `organizationMembers.role` in sync with `user.role`.
* Wire Connected Accounts to `authClient.linkSocial()` / `authClient.unlinkAccount()` so Google/GitHub can be connected or disconnected from an already-authenticated session — never automatically off an OAuth email match.

---

## Phase 9 — Verification, Security, & Deployment
* **Static Analysis and Linters:** Run static analyzers and linters (`npm run lint` / ESLint) to catch stylistic anomalies, structural mistakes, or Next.js deprecation notices.
* **AI-Assisted Testing (TDD):** For core logic blocks (e.g. parent project health metrics, role authorizations), write failing tests first. Confirm they fail on stubbed code before implementing the solution to verify test fidelity.
* **Security Threat Audits:** Audit the finalized code against threat models. Avoid raw SQL query blocks (use Drizzle query helpers) and verify that no credentials or secrets are committed.
* **Access Control Verification:** Test role permissions (Developer, Team Lead, Project Manager, Owner) to verify they enforce correct database write rules.
* **Production Compilation Check:** Execute `npm run build` to verify Next.js bundle output and strict type safety.

---

## Phase 10 — Team Page
* Build the Team page `/team`: org member roster fetched from `organizationMembers`, stat cards (members/active/owners/leads & PMs), search + filter tabs.
* Role dropdown (disabled for owners/self, hidden for unauthorized roles) calling `updateMemberRole` in `actions/team.ts`.
* Remove-member flow using a shadcn `AlertDialog` confirmation (replacing the native `confirm()`), guarded against removing the owner, self, or a member with assigned modules/unresolved blockers.
* Invite modal showing the shareable `/join/[code]` link with copy + owner-only "Regenerate link" (`rotateInviteCode` action) — invite code is only ever sent to the client when the requester is the owner, not just hidden by CSS.

---

## Phase 11 — Multi-Tenant Organization Layer
* Schema: `organizations` + `organizationMembers` tables; `organizationId` added to `user`, `projects`, `activityLogs`.
* Onboarding (`/onboarding`) redesigned around `CompanyDetailsForm` — first user creates an organization and becomes its `owner` in a single transaction.
* Invite flow (`/join/[code]` + `JoinOrgForm`) — new members validate the invite code, pick a role, and join via `joinOrganization` in a transaction.
* `?redirect=` param threaded through `/login` ↔ `/signup` ↔ `/join/[code]` so a first-time invitee who needs to sign up doesn't lose their invite mid-flow.
* `proxy.ts` updated: `/join` routes are protected but exempt from the onboarding redirect; already-onboarded users hitting `/join` bounce to `/dashboard`.
* Data isolation retrofitted across every existing page/action — all `projects`/`modules`/`activityLogs` queries scoped by `organizationId`.
* `lib/get-request-origin.ts` added so org-scoped links (the invite link) derive their origin from the live request instead of the build-time-baked `NEXT_PUBLIC_APP_URL`.
