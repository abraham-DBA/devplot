import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ── IDs ──────────────────────────────────────────────────────────────────────

const ORG_ID = "org-devflow-seed-001";

const PROJECT = {
  atlas:     "proj-atlas-001",
  loop:      "proj-loop-001",
  northstar: "proj-northstar-001",
  harbor:    "proj-harbor-001",
};

const MODULE = {
  // Atlas modules
  auth_sso:     "mod-auth-sso-001",
  billing:      "mod-billing-001",
  reporting:    "mod-reporting-001",
  webhooks:     "mod-webhooks-001",
  // Loop modules
  app_shell:    "mod-app-shell-001",
  usage_dash:   "mod-usage-dash-001",
  invoices:     "mod-invoices-001",
  // Northstar modules
  account_srch: "mod-account-srch-001",
  impersonation:"mod-impersonation-001",
  // Harbor — no modules yet
};

// Placeholder user IDs — seeded as fake users so avatars render.
// In production these come from Better Auth signups.
const USER = {
  abraham: "user-abraham-001",
  maya:    "user-maya-001",
  daniel:  "user-daniel-001",
  priya:   "user-priya-001",
  lukas:   "user-lukas-001",
  sade:    "user-sade-001",
};

async function seed() {
  console.log("Seeding database…");

  // ── Users (workspace members) ───────────────────────────────────────────
  // Insert only if they don't already exist (Better Auth may have created them)
  for (const [key, id] of Object.entries(USER)) {
    const names: Record<string, { name: string; email: string; role: string }> = {
      abraham: { name: "Abraham Okonkwo", email: "abraham.okonkwo@devflow.app", role: "team_lead" },
      maya:    { name: "Maya Chen",       email: "maya.chen@devflow.app",        role: "developer" },
      daniel:  { name: "Daniel Rivera",   email: "daniel.rivera@devflow.app",    role: "developer" },
      priya:   { name: "Priya Natarajan", email: "priya.natarajan@devflow.app",  role: "project_manager" },
      lukas:   { name: "Lukas Berg",      email: "lukas.berg@devflow.app",       role: "developer" },
      sade:    { name: "Sade Adewale",    email: "sade.adewale@devflow.app",     role: "developer" },
    };
    const u = names[key];
    await db
      .insert(schema.user)
      .values({
        id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        role: u.role,
        onboardingCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  // ── Organization ────────────────────────────────────────────────────────
  await db
    .insert(schema.organizations)
    .values({
      id: ORG_ID,
      name: "DevFlow Demo Co.",
      description: "Seed organization for development and demos.",
      industry: "Technology",
      size: "11-50",
      ownerId: USER.abraham,
      inviteCode: "seed-invite-001",
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  // ── Projects ────────────────────────────────────────────────────────────
  await db
    .insert(schema.projects)
    .values([
      {
        id: PROJECT.atlas,
        organizationId: ORG_ID,
        name: "Atlas Payments Platform",
        description:
          "Multi-currency merchant payments stack with reconciliation, refunds, and dispute workflows.",
        startDate: "2026-04-12",
        endDate: "2026-08-20",
        priority: "critical",
        progress: 58,
        health: "at_risk",
        teamMembers: [USER.abraham, USER.maya, USER.daniel, USER.priya, USER.lukas],
        createdAt: new Date("2026-04-12"),
      },
      {
        id: PROJECT.loop,
        organizationId: ORG_ID,
        name: "Loop Customer Portal",
        description:
          "Self-serve customer portal with usage dashboards, invoices, and team management.",
        startDate: "2026-05-01",
        endDate: "2026-09-15",
        priority: "high",
        progress: 41,
        health: "on_track",
        teamMembers: [USER.abraham, USER.maya, USER.sade],
        createdAt: new Date("2026-05-01"),
      },
      {
        id: PROJECT.northstar,
        organizationId: ORG_ID,
        name: "Northstar Admin Console",
        description:
          "Internal admin tool for support agents — account search, impersonation, audit trail.",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        priority: "medium",
        progress: 47,
        health: "high_risk",
        teamMembers: [USER.daniel, USER.priya, USER.lukas],
        createdAt: new Date("2026-04-01"),
      },
      {
        id: PROJECT.harbor,
        organizationId: ORG_ID,
        name: "Harbor Mobile SDK",
        description: "iOS + Android client SDK for embedding Atlas payment flows.",
        startDate: "2026-06-01",
        endDate: "2026-10-30",
        priority: "low",
        progress: 18,
        health: "on_track",
        teamMembers: [USER.maya, USER.sade],
        createdAt: new Date("2026-06-01"),
      },
    ])
    .onConflictDoNothing();

  // ── Modules ─────────────────────────────────────────────────────────────
  await db
    .insert(schema.modules)
    .values([
      // Atlas
      {
        id: MODULE.auth_sso,
        projectId: PROJECT.atlas,
        name: "Authentication & SSO",
        description: "OAuth2 + SAML SSO with role-based session handling.",
        assignedDeveloperId: USER.maya,
        progress: 92,
        status: "review",
        deadline: "2026-07-02",
        technicalNotes: "",
        createdAt: new Date("2026-05-01"),
      },
      {
        id: MODULE.billing,
        projectId: PROJECT.atlas,
        name: "Billing Engine",
        description: "Subscriptions, proration, invoices, and tax calculation pipeline.",
        assignedDeveloperId: USER.daniel,
        progress: 64,
        status: "in_progress",
        deadline: "2026-07-18",
        technicalNotes: "",
        createdAt: new Date("2026-05-10"),
      },
      {
        id: MODULE.reporting,
        projectId: PROJECT.atlas,
        name: "Reporting & Analytics",
        description: "Cohort, MRR, and dispute analytics with CSV export.",
        assignedDeveloperId: USER.lukas,
        progress: 25,
        status: "blocked",
        deadline: "2026-07-30",
        technicalNotes: "",
        createdAt: new Date("2026-05-15"),
      },
      {
        id: MODULE.webhooks,
        projectId: PROJECT.atlas,
        name: "Webhooks & Integrations",
        description: "Signed webhook delivery with retry + DLQ.",
        assignedDeveloperId: USER.sade,
        progress: 48,
        status: "in_progress",
        deadline: "2026-08-04",
        technicalNotes: "",
        createdAt: new Date("2026-05-20"),
      },
      // Loop
      {
        id: MODULE.app_shell,
        projectId: PROJECT.loop,
        name: "App Shell & Auth",
        description: "Next.js shell with Better Auth integration and RBAC guard.",
        assignedDeveloperId: USER.maya,
        progress: 80,
        status: "in_progress",
        deadline: "2026-07-10",
        technicalNotes: "",
        createdAt: new Date("2026-05-05"),
      },
      {
        id: MODULE.usage_dash,
        projectId: PROJECT.loop,
        name: "Usage Dashboard",
        description: "Real-time usage charts with plan limits and overage alerts.",
        assignedDeveloperId: USER.sade,
        progress: 30,
        status: "in_progress",
        deadline: "2026-08-01",
        technicalNotes: "",
        createdAt: new Date("2026-05-10"),
      },
      {
        id: MODULE.invoices,
        projectId: PROJECT.loop,
        name: "Invoice History",
        description: "PDF invoice download, status filters, and payment retry.",
        assignedDeveloperId: USER.maya,
        progress: 10,
        status: "not_started",
        deadline: "2026-09-01",
        technicalNotes: "",
        createdAt: new Date("2026-05-15"),
      },
      // Northstar
      {
        id: MODULE.account_srch,
        projectId: PROJECT.northstar,
        name: "Account Search",
        description: "Fuzzy search across users, emails, and billing IDs.",
        assignedDeveloperId: USER.daniel,
        progress: 70,
        status: "in_progress",
        deadline: "2026-06-28",
        technicalNotes: "",
        createdAt: new Date("2026-04-05"),
      },
      {
        id: MODULE.impersonation,
        projectId: PROJECT.northstar,
        name: "Impersonation Flow",
        description: "Secure agent impersonation with audit log and time-limited tokens.",
        assignedDeveloperId: USER.lukas,
        progress: 20,
        status: "blocked",
        deadline: "2026-06-25",
        technicalNotes: "",
        createdAt: new Date("2026-04-10"),
      },
    ])
    .onConflictDoNothing();

  // ── Blocker logs ─────────────────────────────────────────────────────────
  await db
    .insert(schema.blockerLogs)
    .values([
      {
        id: "blocker-reporting-001",
        moduleId: MODULE.reporting,
        reportedBy: USER.lukas,
        description:
          "Waiting on event schema lock from Billing team — cannot finalize aggregation jobs.",
        resolved: false,
        createdAt: new Date("2026-06-25"),
      },
      {
        id: "blocker-impersonation-001",
        moduleId: MODULE.impersonation,
        reportedBy: USER.lukas,
        description: "Security review pending sign-off from compliance.",
        resolved: false,
        createdAt: new Date("2026-06-23"),
      },
    ])
    .onConflictDoNothing();

  // ── Activity logs ─────────────────────────────────────────────────────────
  await db
    .insert(schema.activityLogs)
    .values([
      {
        id: "act-001",
        projectId: PROJECT.atlas,
        message: "Lukas Berg flagged blocker on Reporting & Analytics",
        createdAt: new Date(Date.now() - 17 * 3600 * 1000),
      },
      {
        id: "act-002",
        projectId: PROJECT.atlas,
        message: "Maya Chen moved to Review: Authentication & SSO",
        createdAt: new Date(Date.now() - 20 * 3600 * 1000),
      },
      {
        id: "act-003",
        projectId: PROJECT.atlas,
        message: "Daniel Rivera updated progress to 64% on Billing Engine",
        createdAt: new Date(Date.now() - 24 * 3600 * 1000),
      },
      {
        id: "act-004",
        projectId: PROJECT.atlas,
        message: "Sade Adewale added technical note to Webhooks & Integrations",
        createdAt: new Date(Date.now() - 28 * 3600 * 1000),
      },
      {
        id: "act-005",
        projectId: PROJECT.atlas,
        message: "Priya Natarajan created module Webhooks & Integrations",
        createdAt: new Date(Date.now() - 72 * 3600 * 1000),
      },
      {
        id: "act-006",
        projectId: PROJECT.loop,
        message: "Sade Adewale started work on Usage Dashboard",
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      },
      {
        id: "act-007",
        projectId: PROJECT.loop,
        message: "Maya Chen updated progress to 80% on App Shell & Auth",
        createdAt: new Date(Date.now() - 21 * 3600 * 1000),
      },
      {
        id: "act-008",
        projectId: PROJECT.northstar,
        message: "Lukas Berg flagged blocker on Impersonation Flow",
        createdAt: new Date(Date.now() - 60 * 3600 * 1000),
      },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
