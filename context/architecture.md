# Architecture — DevFlow

## Stack

| Layer | Tool | Purpose |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Full stack framework |
| Database | PostgreSQL + Drizzle ORM | Database and object relational mapper |
| Auth | Better Auth | Session and Role-based authentication |
| Styling | Tailwind CSS v4 + shadcn/ui | Premium layout design |
| Language | TypeScript strict | Type safety |
| Charts | Recharts | Dashboard metrics |

---

## Folder Structure

```
/
├── app/
│   ├── layout.tsx                     → Root layout (Navbar, Providers)
│   ├── page.tsx                       → Homepage (workflow overview)
│   ├── login/
│   │   └── page.tsx                   → Login and Signup page
│   ├── dashboard/
│   │   └── page.tsx                   → Overarching workspace overview
│   ├── profile/
│   │   └── page.tsx                   → User profile & role settings
│   ├── projects/
│   │   ├── page.tsx                   → Project list
│   │   ├── new/
│   │   │   └── page.tsx               → Create project form
│   │   └── [id]/
│   │       ├── page.tsx               → Project details dashboard
│   │       └── modules/
│   │           ├── new/
│   │           │   └── page.tsx       → Add module form
│   │           └── [mid]/
│   │               └── page.tsx       → Module details & blocker logs
├── components/
│   ├── ui/                            → Shadcn components
│   └── dashboard/                     → Specific dashboard sub-components
├── lib/
│   ├── utils.ts                       → Utility helpers
│   ├── health.ts                      → Pure functions: calculateProjectHealth, calculateProjectProgress
│   ├── auth-types.ts                  → Inferred session/user types from auth.$Infer (no DB import)
```

---

## Database Schema (Postgres)

### `profiles`
Represents users and their roles in the workspace.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key, references auth.users |
| email | text | Unique |
| full_name | text | |
| role | text | `developer` \| `team_lead` \| `project_manager` |
| created_at | timestamptz | |

### `projects`
Represents software projects under coordination.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| name | text | |
| description | text | |
| start_date | date | |
| end_date | date | |
| priority | text | `low` \| `medium` \| `high` |
| progress | integer | Recalculated (0-100) from module average |
| health | text | `on_track` \| `at_risk` \| `high_risk` |
| team_members | jsonb | Array of developer/lead IDs or email names |
| created_at | timestamptz | |

### `modules`
Represents components of a project with strict ownership.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| project_id | uuid | References projects.id |
| name | text | E.g. "Authentication" |
| description | text | |
| assigned_developer_id | uuid | References profiles.id (owner) |
| progress | integer | Developer reported (0-100) |
| status | text | `not_started` \| `in_progress` \| `review` \| `completed` \| `blocked` |
| deadline | date | |
| technical_notes | text | Markdown notes / database schema / API info |
| created_at | timestamptz | |

### `blocker_logs`
Records blocker logs filed by developers.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| module_id | uuid | References modules.id |
| reported_by | uuid | References profiles.id |
| description | text | Details of what developer is waiting for |
| resolved | boolean | Defaults to false |
| created_at | timestamptz | |

### `activity_logs`
A chronological event log table.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| project_id | uuid | References projects.id (optional) |
| message | text | Feed display text |
| created_at | timestamptz | |

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
