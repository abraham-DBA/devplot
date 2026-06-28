# Library Docs

Project-specific usage patterns for third-party libraries used in DevFlow. Always consult the official documentation of Next.js, Better Auth, and Drizzle ORM before starting any implementation.

---

## 1. Drizzle ORM (PostgreSQL)

We use Drizzle ORM with the `node-postgres` driver (`pg`) for SQL query construction and database operations.

### Schema definition

Define all database tables, columns, relations, and type helpers inside `lib/schema.ts`:

```typescript
// lib/schema.ts
import { pgTable, text, integer, date, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // references Better Auth user
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").$type<"developer" | "team_lead" | "project_manager">().default("developer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  priority: text("priority").$type<"low" | "medium" | "high">().default("medium").notNull(),
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
  assignedDeveloperId: text("assigned_developer_id").references(() => profiles.id).notNull(),
  progress: integer("progress").default(0).notNull(),
  status: text("status").$type<"not_started" | "in_progress" | "review" | "completed" | "blocked">().default("not_started").notNull(),
  deadline: date("deadline").notNull(),
  technicalNotes: text("technical_notes").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blockerLogs = pgTable("blocker_logs", {
  id: text("id").primaryKey(),
  moduleId: text("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  reportedBy: text("reported_by").references(() => profiles.id).notNull(),
  description: text("description").notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
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
  // Custom user fields
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "developer",
      },
    },
  },
});
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

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
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
