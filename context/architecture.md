# Architecture — DevFlow

## Stack

| Layer | Tool | Purpose |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Full stack framework |
| Database | PostgreSQL + Drizzle ORM | Database and object relational mapper |
| Auth | Better Auth | Session, OAuth, and Role-based authentication, multi-tenant org scoping |
| Styling | Tailwind CSS v4 + shadcn/ui | Premium layout design |
| Language | TypeScript strict | Type safety |
| Charts | Recharts | Dashboard metrics |
| Deployment | Docker (multi-stage) + docker-compose | Standalone Next.js output, non-root runtime user |

---

## Folder Structure

```
/
├── Dockerfile                          → 3-stage build (deps/builder/runner); NEXT_PUBLIC_* vars
│                                          must be passed as build ARGs (baked at build time, not runtime)
├── docker-compose.yml                  → builds with NEXT_PUBLIC_APP_URL build arg, runs with
│                                          --env-file .env.production for runtime secrets
├── app/
│   ├── layout.tsx                      → Root layout (Navbar, Providers)
│   ├── page.tsx                        → Homepage (workflow overview)
│   ├── login/page.tsx                  → Login (email + Google/GitHub OAuth), ?redirect= param
│   ├── signup/page.tsx                 → Signup (email + Google/GitHub OAuth), ?redirect= param
│   ├── onboarding/page.tsx             → Create organization (becomes owner)
│   ├── join/[code]/page.tsx            → Invite link landing — validates code, lets new member pick role + join
│   ├── dashboard/page.tsx              → Org-scoped workspace overview
│   ├── profile/page.tsx                → Profile, role (read-only for owner), Connected Accounts
│   ├── team/page.tsx                   → Org member roster, roles, invite link (owner-only)
│   ├── projects/
│   │   ├── page.tsx                    → Org-scoped project list
│   │   ├── new/page.tsx                → Create project form
│   │   └── [id]/
│   │       ├── page.tsx                → Project details dashboard
│   │       └── modules/
│   │           ├── new/page.tsx        → Add module form
│   │           └── [mid]/page.tsx      → Module details & blocker logs
│   └── api/auth/[...all]/route.ts      → Better Auth handler (toNextJsHandler)
├── actions/                            → Server Actions ("use server"), one file per domain
│   ├── users.ts                        → completeOnboarding, joinOrganization, updateProfile
│   ├── team.ts                         → updateMemberRole, removeMember, rotateInviteCode
│   ├── projects.ts                     → createProject
│   └── modules.ts                      → module CRUD, progress/status updates, blocker reporting
├── components/
│   ├── ui/                             → shadcn primitives (button, alert-dialog, select, slider)
│   ├── auth/                           → LoginForm, SignupForm, AuthShell (shared split-screen layout)
│   ├── onboarding/                     → CompanyDetailsForm, JoinOrgForm
│   ├── team/                           → TeamClient (roster, invite modal, remove-member AlertDialog)
│   ├── profile/                        → ProfileForm (role, Connect/Disconnect accounts)
│   ├── dashboard/                      → Navbar + dashboard sub-components
│   ├── projects/                       → Project list/detail sub-components
│   └── modules/                        → Module detail sub-components
├── lib/
│   ├── auth.ts                         → Better Auth server config (Drizzle adapter, socialProviders,
│   │                                      accountLinking, additionalFields: role/onboardingCompleted/organizationId)
│   ├── auth-client.ts                  → Better Auth React client (baseURL falls back to window.location.origin)
│   ├── auth-types.ts                   → Inferred session/user types from auth.$Infer (no DB import)
│   ├── db.ts                           → Drizzle + pg Pool client
│   ├── schema.ts                       → All table definitions + relations
│   ├── health.ts                       → Pure functions: calculateProjectHealth, calculateProjectProgress
│   ├── sanitize-redirect.ts            → Shared open-redirect guard for ?redirect= params
│   ├── get-request-origin.ts           → Derives public origin from request headers (not NEXT_PUBLIC_APP_URL —
│   │                                      see Deployment Notes); honors x-forwarded-* only if TRUST_PROXY_HEADERS=true
│   └── utils.ts                        → cn() and other generic helpers
└── scripts/
    └── seed.ts                         → Dev seed data (org + users + projects + modules)
```

---

## Database Schema (Postgres, via Drizzle)

Better Auth owns `user`, `session`, `account`, `verification`. Custom fields are added to `user` via `additionalFields` in `lib/auth.ts`, not as a separate `profiles` table.

### `user` (Better Auth + custom fields)

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key |
| name | text | |
| email | text | Unique |
| emailVerified | boolean | No verification flow exists — always `false` for email/password signups |
| image | text | nullable |
| role | text | `owner` \| `developer` \| `team_lead` \| `project_manager`, default `developer` |
| onboardingCompleted | boolean | default `false` — gates access via `proxy.ts` until org created/joined |
| organizationId | text | nullable — set once onboarding completes |
| createdAt / updatedAt | timestamp | |

`session`, `account`, `verification` follow standard Better Auth shapes (not hand-rolled).

### `organizations`

One row per tenant/workspace.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key |
| name | text | |
| description | text | |
| industry | text | |
| size | text | `1-10` \| `11-50` \| `51-200` \| `201-500` \| `500+` |
| ownerId | text | References `user.id`, `onDelete: restrict` (can't delete owner without transferring) |
| inviteCode | text | Unique, 16-char hex, rotatable by the owner |
| createdAt | timestamp | |

### `organizationMembers`

Join table — one row per (org, user) pair. Unique index on `(organizationId, userId)`.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key |
| organizationId | text | References `organizations.id`, cascade delete |
| userId | text | References `user.id`, cascade delete |
| role | text | `owner` \| `developer` \| `team_lead` \| `project_manager` — source of truth for team page; kept in sync with `user.role` |
| joinedAt | timestamp | |

### `projects`

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key |
| organizationId | text | References `organizations.id`, cascade delete, **not null** — every project belongs to exactly one org |
| name | text | |
| description | text | |
| startDate / endDate | date | |
| priority | text | `low` \| `medium` \| `high` \| `critical` |
| progress | integer | Recalculated (0-100) from module average |
| health | text | `on_track` \| `at_risk` \| `high_risk` |
| teamMembers | jsonb | Array of user IDs |
| createdAt | timestamp | |

### `modules`

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key |
| projectId | text | References `projects.id`, cascade delete |
| name | text | E.g. "Authentication" |
| description | text | |
| assignedDeveloperId | text | References `user.id` (owner) |
| progress | integer | Developer reported (0-100) |
| status | text | `not_started` \| `in_progress` \| `review` \| `completed` \| `blocked` |
| deadline | date | |
| technicalNotes | text | JSON-encoded note array — see ui-registry.md ModuleDetailClient entry |
| createdAt | timestamp | |

### `blockerLogs`

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key |
| moduleId | text | References `modules.id`, cascade delete |
| reportedBy | text | References `user.id` |
| description | text | |
| resolved | boolean | Defaults to `false` |
| createdAt | timestamp | |

### `activityLogs`

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key |
| organizationId | text | References `organizations.id`, cascade delete, nullable |
| projectId | text | References `projects.id`, cascade delete, nullable |
| message | text | Feed display text |
| createdAt | timestamp | |

---

## Multi-Tenancy & Data Isolation

- Every authenticated, onboarded request carries `session.user.organizationId`. Every page/action that touches `projects`, `modules`, `blockerLogs`, `activityLogs`, or `organizationMembers` must filter by it — there is no cross-org query anywhere in the app.
- `proxy.ts` enforces the onboarding gate: authenticated-but-not-onboarded users are redirected to `/onboarding` for all protected routes except `/join/[code]` (which is how they get onboarded via invite instead).
- `organizationMembers.role` is the source of truth for team-page display and permission checks; `user.role` is kept in sync on every role change so the Better Auth session reflects it without an extra query.
- RBAC tiers (ascending trust): `developer` < `team_lead` / `project_manager` < `owner`. Owner role is sticky — never changeable via Profile, never assignable via Team page role dropdowns.
- Account linking (Google/GitHub) only happens via `authClient.linkSocial()` from an already-authenticated session (Profile → Connected Accounts), never automatically off an OAuth email match — see `lib/auth.ts`'s `accountLinking` config comment for why.

---

## Deployment Notes (Docker)

- `NEXT_PUBLIC_*` env vars are inlined into the client bundle at **build time**, not read at runtime. The Dockerfile requires `NEXT_PUBLIC_APP_URL` as a build `ARG`; `docker-compose.yml`'s `build.args` uses `${NEXT_PUBLIC_APP_URL:?...}` so a forgotten `--env-file .env.production` fails the build loudly instead of baking in an empty string.
- Server-only secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, OAuth client secrets) are never baked into the image — provided at container start via `env_file: .env.production`.
- `lib/get-request-origin.ts` exists specifically to avoid depending on `NEXT_PUBLIC_APP_URL` for server-rendered links (e.g. the team invite link) — it derives the origin from the live request instead, so it can't go stale regardless of how the image was built. Set `TRUST_PROXY_HEADERS=true` in `.env.production` if a reverse proxy/CDN terminates TLS in front of the app.

---

## Project Health Algorithm (Schedule Performance)

Project health is recalculated in real time whenever project progress or module progress updates:

$$\text{Time Used (Percent)} = \frac{\text{Current Date} - \text{Start Date}}{\text{End Date} - \text{Start Date}} \times 100$$

- If $\text{Time Used} > \text{Progress} + 20\%$, health is set to `high_risk` (🔴 High Risk).
- If $\text{Time Used} > \text{Progress}$ (but within $20\%$), health is set to `at_risk` (🟡 At Risk).
- Otherwise, health is `on_track` (🟢 On Track).
- If any active module is in state `Blocked`, the project health is flagged as `high_risk` / `blocked` and high alerts are triggered.

---

## Invariants

- Never fetch DB data directly from client-side visual elements; use Server Actions or API routes.
- Component designs must use theme tokens `--color-brand-primary`, `--color-success`, etc.
- No hardcoded inline hex codes for colors.
- Average project progress is defined mathematically as:
  $$\text{Project Progress} = \text{round}\left( \frac{\sum \text{Module Progress}}{\text{Total Modules}} \right)$$
- If a project has 0 modules, its progress defaults to 0% and health defaults to `on_track`.
- Every query against an org-scoped table includes `eq(table.organizationId, orgId)` — no exceptions, even for "read-only" pages.
