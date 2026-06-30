# Code Standards

Implementation rules and conventions for the entire DevFlow project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line. Always review Next.js, Better Auth, and Drizzle ORM documentation before coding.
- **Read context files first** — never assume, always verify against architecture.md and project-overview.md.
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful.
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete.
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions.
- **One thing at a time** — complete one feature fully before touching the next.
- **Failures are expected** — wrap database transactions and auth queries in try/catch, log failures, never let one failure crash everything.

---

## TypeScript

- Strict mode enabled in tsconfig.json — no exceptions.
- Never use `any` — use `unknown` and narrow the type.
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why.
- All function parameters and return types must be explicitly typed.
- Use `type` for object shapes and unions — use `interface` only for extendable component props.
- All async functions must have proper error handling — never let promises float unhandled.
- Use `const` by default — only use `let` when reassignment is necessary.

---

## Next.js 16 Conventions

- App Router only — no Pages Router.
- React 19 — use React 19 APIs throughout.
- All components are Server Components by default.
- Only add `"use client"` when the component requires client interactivity:
  - useState or useReducer
  - useEffect
  - Browser APIs (e.g. localStorage)
  - Event listeners
  - Client-side auth triggers (using `authClient`)
- Never add `"use client"` to layout files unless absolutely required.
- Database access and session verification must happen in Server Components, Server Actions, or Route Handlers — never query the database directly in Client Components.
- Route handlers live in `app/api/` — never put business logic directly in route handlers.
- Server Actions live in `actions/` — never define Server Actions inline in components.
- Caching is uncached by default — all dynamic code runs at request time.
- Always read Next.js documentation before implementing any Next.js specific feature — APIs may differ from training data.

---

## File and Folder Naming

- Folders: kebab-case — `projects-list`, `module-details`
- Component files: PascalCase — `StatsBar.tsx`, `RecentActivity.tsx`
- Utility files: camelCase — `db.ts`, `auth.ts`, `auth-client.ts`, `schema.ts`
- Type files: camelCase — `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase — `projects.ts`, `modules.ts`
- One component per file — never export multiple components from one file.
- Index files only in `components/ui/` — never barrel export from other folders.

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { StatsCard } from "@/components/dashboard/StatsCard";

// 3. Type definitions
type Props = {
  projectId: string;
  projectName: string;
};

// 4. Component
export function ComponentName({ projectId, projectName }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports.
- Props type defined directly above the component — not in a separate types file unless shared.
- No inline styles — all styling via Tailwind classes using CSS variables from ui-tokens.md.

---

## API Route Handlers

```typescript
// app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { projects } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // validate body
    
    // insert project using Drizzle
    const [result] = await db
      .insert(projects)
      .values({
        id: body.id,
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        priority: body.priority,
      })
      .returning();
      
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/projects]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch.
- Every route handler validates the request body and user authorization session before processing.
- Errors are logged with the route path as prefix: `[api/projects]`.
- Always return `{ success: boolean, data?: T, error?: string }`.

---

## Server Actions

```typescript
// actions/modules.ts

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { modules } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function updateProgress(moduleId: string, progress: number, status: "not_started" | "in_progress" | "review" | "completed" | "blocked") {
  try {
    // validate input
    await db
      .update(modules)
      .set({ progress, status })
      .where(eq(modules.id, moduleId));
      
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("[actions/modules]", error);
    return { success: false, error: "Failed to update module progress" };
  }
}
```

- Every Server Action has a try/catch.
- Every Server Action returns `{ success: boolean, error?: string }`.
- Always call `revalidatePath` after mutations that affect page data.
- Never throw from Server Actions — always return the error block.

---

## Error Handling

- Never use empty catch blocks — always log or handle.
- Console errors always include context prefix: `[component/function name]`.
- User-facing errors must be human readable — never expose raw DB connection details or internals.
- API route errors return `status: 500` with generic message — never expose internals.

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key, URL, or secret anywhere in the codebase.

| Variable | Used In | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | lib/db.ts | PostgreSQL database connection string |
| `BETTER_AUTH_SECRET` | lib/auth.ts | Better Auth security cryptographic key |
| `BETTER_AUTH_URL` | lib/auth.ts (read internally by Better Auth) | Server-side base URL — drives OAuth `redirect_uri` construction. Must include `://` (a missing `//` after the scheme silently passes Better Auth's own URL validation but still produces a malformed `redirect_uri` — see `context/library-docs.md` §2 history) |
| `NEXT_PUBLIC_APP_URL` | lib/auth-client.ts | Client application base URL — **baked in at Docker build time**, not read at runtime. Falls back to `window.location.origin` if unset/empty |
| `TRUST_PROXY_HEADERS` | lib/get-request-origin.ts | Set to `"true"` only when a reverse proxy/CDN terminates TLS in front of the app — gates whether `x-forwarded-host`/`x-forwarded-proto` are honored for server-rendered links (e.g. the team invite link) |
| `GOOGLE_CLIENT_ID` | lib/auth.ts | OAuth keys |
| `GOOGLE_CLIENT_SECRET` | lib/auth.ts | OAuth keys |
| `GITHUB_CLIENT_ID` | lib/auth.ts | OAuth keys |
| `GITHUB_CLIENT_SECRET` | lib/auth.ts | OAuth keys |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys like `DATABASE_URL` or `BETTER_AUTH_SECRET`. For server-only values that a Server Component needs at request time (not build time), prefer deriving from the live request (see `lib/get-request-origin.ts`) over a `NEXT_PUBLIC_*` env var where possible.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:
1. Does Next.js or Radix already provide this functionality?
2. Is there a simpler native solution?

Approved dependencies for this project:
- `pg` (node-postgres) — direct database adapter
- `drizzle-orm` — Drizzle ORM mapping
- `drizzle-kit` — Drizzle migration runner (dev dependency)
- `better-auth` — auth framework
- `recharts` — dashboard visualization
- `lucide-react` — icons
- `tailwindcss` — styling
- `radix-ui` — unstyled primitives underlying shadcn/ui components (`components/ui/`)
- `class-variance-authority` — variant styling for shadcn/ui components (e.g. Button's `variant`/`size`)
- `clsx`, `tailwind-merge` — class-merging helpers (`lib/utils.ts`'s `cn()`)
- `shadcn` — CLI used to scaffold `components/ui/` primitives (not a runtime dependency of the app itself)
- `tw-animate-css` — Tailwind v4 animation utilities used by shadcn/ui components
- `sonner` — toast notifications
- `vitest` — unit test runner (dev dependency)
- `@vitejs/plugin-react` — vitest React support (dev dependency)
- `@vitest/coverage-v8` — vitest coverage reporter (dev dependency)
- `playwright` — E2E test runner (dev dependency)

Note: `zod` is a transitive dependency of `better-auth` only — it is not a direct project dependency and is not used in application code. Do not import it without first adding it here and to `package.json` directly.

Do not install any other packages without updating this list first.

---

## Integration Tests (`tests/integration/`)

Server Actions in `actions/*.ts` call real `db`/`auth` directly, so testing RBAC, org-isolation, and multi-step lifecycles (e.g. blocker report → resolve) means actually exercising them — not mocking Drizzle's chainable query builder. `tests/integration/` runs the real Server Actions against the real dev Postgres instance (same `DATABASE_URL` as `npm run dev`).

- `tests/integration/setup.ts` (loaded via `vitest.config.ts`'s `setupFiles`) mocks only the three Next.js-runtime-only pieces that don't work outside a real request context: `@/lib/auth`'s `getSession()` (controlled per-test via `setMockUser()`), `next/headers`, and `next/cache`. `next/navigation`'s `redirect()` is mocked to throw `MockRedirectError` instead of doing a real redirect — use `await expect(action(...)).rejects.toThrow(MockRedirectError)` to assert an action reached its success path when that action redirects on success (e.g. `createProject`, `createModule`).
- `tests/integration/fixtures.ts` provides `createTestOrg`, `createTestMember`, `createTestProject`, `createTestModule`, `createTestBlocker` (all real DB inserts, IDs prefixed `test-`) and `cleanupTestOrg(orgId, userIds)`. **Always pass every user ID created in the test to `cleanupTestOrg`'s second argument** — deleting the org cascades away `organizationMembers`/`projects`/`modules`/`blockerLogs`/`activityLogs`, but `user` rows are never referenced by the org and must be deleted explicitly or they leak into the database permanently across test runs.
- Before writing an assertion that depends on which validation check fires first in a multi-check action (e.g. `removeMember` checks assigned-modules before unresolved-blockers), read the action's actual check order — don't assume.

---

## AI-Assisted Testing & TDD Workflow

To maintain absolute correctness and spec alignment, follow this testing workflow:

1. **AI-Generated Tests as a Starting Point:** For any non-trivial function (e.g., project health math recalculation, session checks), ask the AI to generate unit tests and identify edge cases (e.g., empty rosters, negative timelines, boundary conditions).
2. **Test-Driven Development (TDD) Loop:**
   - Create failing test structures first.
   - Intentionally break or stub the implementation to verify that the tests fail as expected.
   - Implement the function logic until all tests pass. This ensures the implementation matches constraints exactly and prevents AI logic drift.

---

## Static Analysis & Linters

Every block of AI-suggested code must run through static analysis:

1. **Integrated Linters:** Run `eslint` (`npm run lint` or local extensions) to catch style inconsistencies, floating promises, unused variables, and Next.js deprecated API warnings.
2. **Type Checking:** Run `tsc --noEmit` before proposing files for review to ensure strict TypeScript types compile cleanly.

---

## Security & Threat Modeling Standards

Maintain database and authentication security with these practices:

1. **SQL Injection Prevention:** Never use raw SQL string concatenation. Always write queries using Drizzle ORM's built-in query helpers or parameterize query blocks.
2. **Better Auth Security:**
   - Always verify headers and session tokens on the server context.
   - Enforce server-side role validation (RBAC) before resolving database mutations.
3. **Secret Verification:** Perform self-reviews on diffs to ensure no passwords, API keys, or database URLs are hardcoded in source code or documentation. Always store keys in `.env.local` variables.
4. **Safe Defaults:** Tables and schema columns should define safe defaults (e.g., default progress `0`, status `not_started`, and role `developer`).

