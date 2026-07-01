import { pgTable, text, integer, date, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Better Auth core tables ────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  role: text("role").default("developer"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  organizationId: text("organization_id"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ─── Organization tables ─────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  industry: text("industry").notNull(),
  size: text("size")
    .$type<"1-10" | "11-50" | "51-200" | "201-500" | "500+">()
    .notNull(),
  ownerId: text("owner_id")
    .references(() => user.id, { onDelete: "restrict" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role")
      .$type<"owner" | "developer" | "team_lead" | "project_manager">()
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("org_member_unique_idx").on(table.organizationId, table.userId)],
);

export const inviteLinks = pgTable("invite_links", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  role: text("role")
    .$type<"developer" | "team_lead" | "project_manager">()
    .notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

// ─── Application tables ─────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
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
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  assignedDeveloperId: text("assigned_developer_id")
    .references(() => user.id)
    .notNull(),
  progress: integer("progress").default(0).notNull(),
  status: text("status")
    .$type<"not_started" | "in_progress" | "review" | "completed" | "blocked">()
    .default("not_started")
    .notNull(),
  deadline: date("deadline").notNull(),
  technicalNotes: text("technical_notes").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blockerLogs = pgTable("blocker_logs", {
  id: text("id").primaryKey(),
  moduleId: text("module_id")
    .references(() => modules.id, { onDelete: "cascade" })
    .notNull(),
  reportedBy: text("reported_by")
    .references(() => user.id)
    .notNull(),
  description: text("description").notNull(),
  type: text("type").$type<"internal_dependency" | "external">().default("external").notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const moduleDependencies = pgTable(
  "module_dependencies",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id")
      .references(() => modules.id, { onDelete: "cascade" })
      .notNull(),
    dependsOnModuleId: text("depends_on_module_id")
      .references(() => modules.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("module_dependency_unique_idx").on(table.moduleId, table.dependsOnModuleId)],
);

export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ one, many }) => ({
  organization: one(organizations, { fields: [user.organizationId], references: [organizations.id] }),
  organizationMembers: many(organizationMembers),
  modules: many(modules),
  blockerLogs: many(blockerLogs),
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(user, { fields: [organizations.ownerId], references: [user.id] }),
  members: many(organizationMembers),
  projects: many(projects),
  activityLogs: many(activityLogs),
  inviteLinks: many(inviteLinks),
}));

export const inviteLinksRelations = relations(inviteLinks, ({ one }) => ({
  organization: one(organizations, { fields: [inviteLinks.organizationId], references: [organizations.id] }),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(user, { fields: [organizationMembers.userId], references: [user.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  modules: many(modules),
  activityLogs: many(activityLogs),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, { fields: [modules.projectId], references: [projects.id] }),
  assignedDeveloper: one(user, { fields: [modules.assignedDeveloperId], references: [user.id] }),
  blockerLogs: many(blockerLogs),
}));

export const blockerLogsRelations = relations(blockerLogs, ({ one }) => ({
  module: one(modules, { fields: [blockerLogs.moduleId], references: [modules.id] }),
  reporter: one(user, { fields: [blockerLogs.reportedBy], references: [user.id] }),
}));

export const moduleDependenciesRelations = relations(moduleDependencies, ({ one }) => ({
  module: one(modules, { fields: [moduleDependencies.moduleId], references: [modules.id] }),
  dependsOn: one(modules, { fields: [moduleDependencies.dependsOnModuleId], references: [modules.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  organization: one(organizations, { fields: [activityLogs.organizationId], references: [organizations.id] }),
  project: one(projects, { fields: [activityLogs.projectId], references: [projects.id] }),
}));
