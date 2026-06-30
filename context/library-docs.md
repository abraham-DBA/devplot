# Library Docs

Project-specific usage patterns for third-party libraries used in DevFlow. Always consult the official documentation of Next.js, Better Auth, and Drizzle ORM before starting any implementation.

---

## 1. Drizzle ORM (PostgreSQL)

We use Drizzle ORM with the `node-postgres` driver (`pg`) for SQL query construction and database operations.

### Schema definition

Define all database tables, columns, relations, and type helpers inside `lib/schema.ts`. There is no separate `profiles` table — Better Auth owns the `user` table directly, and custom fields (`role`, `onboardingCompleted`, `organizationId`) are added via `additionalFields` in `lib/auth.ts` (see section 2 below), then declared here so Drizzle knows about them:

```typescript
// lib/schema.ts
import { pgTable, text, integer, date, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Better Auth core table — custom fields declared here must match additionalFields in lib/auth.ts
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  role: text("role").default("developer"), // "owner" | "developer" | "team_lead" | "project_manager"
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  organizationId: text("organization_id"), // nullable until onboarding completes
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// One row per tenant/workspace
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  industry: text("industry").notNull(),
  size: text("size").$type<"1-10" | "11-50" | "51-200" | "201-500" | "500+">().notNull(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "restrict" }).notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Join table — unique index prevents a user joining the same org twice
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
    role: text("role").$type<"owner" | "developer" | "team_lead" | "project_manager">().notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("org_member_unique_idx").on(table.organizationId, table.userId)],
);

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  priority: text("priority").$type<"low" | "medium" | "high" | "critical">().default("medium").notNull(),
  progress: integer("progress").default(0).notNull(),
  health: text("health").$type<"on_track" | "at_risk" | "high_risk">().default("on_track").notNull(),
  teamMembers: jsonb("team_members").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  assignedDeveloperId: text("assigned_developer_id").references(() => user.id).notNull(),
  progress: integer("progress").default(0).notNull(),
  status: text("status").$type<"not_started" | "in_progress" | "review" | "completed" | "blocked">().default("not_started").notNull(),
  deadline: date("deadline").notNull(),
  technicalNotes: text("technical_notes").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blockerLogs = pgTable("blocker_logs", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  reportedBy: text("reported_by").references(() => user.id).notNull(),
  description: text("description").notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Org-scoped query pattern** — every query against `projects`, `modules` (via project join), `blockerLogs` (via module→project join), or `activityLogs` must filter by the session's `organizationId`:

```typescript
import { and, eq } from "drizzle-orm";

const orgId = session.user.organizationId;
if (!orgId) redirect("/onboarding");

const orgProjects = await db
  .select()
  .from(projects)
  .where(eq(projects.organizationId, orgId));
```

### Client connection setup

```typescript
// lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
```

### Queries, Inserts, and Updates

```typescript
// Example: Find project with query API
import { eq } from "drizzle-orm";
import { projects, modules } from "./schema";

const project = await db.query.projects.findFirst({
  where: eq(projects.id, projectId),
});

// Example: Select modules of a project
const projectModules = await db
  .select()
  .from(modules)
  .where(eq(modules.projectId, projectId));

// Example: Insert module
const [newModule] = await db
  .insert(modules)
  .values({
    id: moduleId,
    projectId,
    name,
    description,
    assignedDeveloperId: devId,
    progress: 0,
    status: "not_started",
    deadline,
  })
  .returning();

// Example: Update module progress
await db
  .update(modules)
  .set({ progress, status })
  .where(eq(modules.id, moduleId));
```

**Rules:**
- Always export schema definitions from `lib/schema.ts` and initialize the client once in `lib/db.ts`.
- Use Drizzle's `.returning()` method to return the row that was created or mutated.
- Ensure type safety of schemas by typing priority/status using the Drizzle `$type` method.

---

## 2. Better Auth

Better Auth provides role-based and session-based authentication in Next.js. We configure it to use the Drizzle adapter to synchronize sessions with our database.

### Server configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema, // Enables Better Auth to map user/session tables
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      // requireLocalEmailVerified stays at its DEFAULT (true). This app has no
      // email-verification flow, so disabling it would let anyone sign up with
      // an unverified email/password account using someone else's email and
      // have it silently auto-link the next time that person uses Google/
      // GitHub — granting the original password access to their account.
      // Linking only ever happens via the explicit, already-authenticated
      // linkSocial() flow below — never automatically on a bare email match.
    },
  },
  // Custom user fields — must also be declared as real columns on the `user`
  // table in lib/schema.ts (see section 1 above)
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "developer",
      },
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
      },
      organizationId: {
        type: "string",
        required: false,
      },
    },
  },
});
```

### Linking and unlinking accounts (client)

Never rely on Better Auth auto-linking a new OAuth provider onto an existing account by email match alone — that requires either a real email-verification flow or it becomes an account-takeover vector (see the `accountLinking` comment above). Instead, link explicitly from an already-authenticated session:

```tsx
"use client";
import { authClient } from "@/lib/auth-client";

// Connect — redirects through the OAuth flow, returns to callbackURL once linked
async function handleConnect(provider: "google" | "github") {
  await authClient.linkSocial({ provider, callbackURL: "/profile" });
}

// Disconnect — Better Auth refuses to unlink the user's last remaining auth method
async function handleDisconnect(provider: "google" | "github") {
  const { error } = await authClient.unlinkAccount({ providerId: provider });
  if (error) {
    // surface error.message — e.g. "cannot unlink last account"
  }
}
```

### API handler route

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";

export const { GET, POST } = auth.handler;
```

### Server session retrieval (App Router)

To check the user session and RBAC role inside Server Components or Route Handlers:

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function checkSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session || !session.user) {
    return null;
  }
  
  return {
    user: session.user,
    session: session.session,
  };
}
```

### Client configuration

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

// NEXT_PUBLIC_APP_URL is baked in at build time and can be wrong/empty if a
// Docker build forgets the build arg — window.location.origin is always
// correct at runtime in the browser, so it's the fallback, not a hardcoded URL.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : undefined),
});
```

### Client usage in components

```tsx
"use client";

import { authClient } from "@/lib/auth-client";

export function ProfileWidget() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not signed in</div>;

  return (
    <div>
      <p>Logged in as: {session.user.name}</p>
      <p>Role: {session.user.role}</p>
      <button onClick={() => authClient.signOut()}>Sign Out</button>
    </div>
  );
}
```

---

## 3. Recharts

Recharts is used for dashboard reporting charts. Always make sure to declare charts in Client Components (`"use client"`) to prevent hydration warnings or compilation bugs in Next.js Server Components.

### Example Chart Setup

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { name: "Acme Project", progress: 40, timeline: 60 },
  { name: "DevFlow", progress: 75, timeline: 30 },
];

export default function PerformanceChart() {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
          <YAxis stroke="var(--color-muted-foreground)" />
          <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }} />
          <Legend />
          <Bar dataKey="progress" fill="var(--color-success)" name="Project Progress" />
          <Bar dataKey="timeline" fill="var(--color-brand-secondary)" name="Time Used" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 4. Next.js `headers()` — Deriving the Request Origin (Server Components)

`NEXT_PUBLIC_*` env vars are inlined into the client bundle at **build time**. Any link generated in a **Server Component** that needs the app's public origin (e.g. the team invite link) should not depend on that env var — a forgotten Docker build arg silently bakes it in as `""`, producing domain-less links. Server Components run per-request and already have `headers()` available, so derive the origin live instead:

```typescript
// lib/get-request-origin.ts
import { getRequestOrigin } from "@/lib/get-request-origin";

export default async function SomePage() {
  const origin = await getRequestOrigin(); // "https://devflowlab.tech" or "http://localhost:3000"
  const shareableLink = `${origin}/join/${code}`;
  // ...
}
```

`x-forwarded-host`/`x-forwarded-proto` are only honored when `TRUST_PROXY_HEADERS=true` is set (production, behind a reverse proxy/CDN) — otherwise they're attacker-settable on a direct request and are ignored in favor of the raw `Host` header, matching Better Auth's own `trustedProxyHeaders` gate.
