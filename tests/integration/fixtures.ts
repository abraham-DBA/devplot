import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { organizations, organizationMembers, user, projects, modules, blockerLogs, moduleDependencies } from "@/lib/schema";
import { eq } from "drizzle-orm";

const TEST_PREFIX = "test-";

type MemberRole = "owner" | "developer" | "team_lead" | "project_manager";
type ModuleStatus = "not_started" | "in_progress" | "review" | "blocked" | "completed";

async function insertUser(orgId: string | null, role: MemberRole) {
  const id = TEST_PREFIX + randomUUID();
  await db.insert(user).values({
    id,
    name: `Test ${role} ${id.slice(0, 8)}`,
    email: `${id}@test.local`,
    emailVerified: true,
    role,
    onboardingCompleted: true,
    organizationId: orgId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

// Creates an org with its owner. Returns IDs needed to build out the rest of
// a test scenario and to clean everything up afterward.
export async function createTestOrg() {
  const orgId = TEST_PREFIX + randomUUID();
  const ownerId = await insertUser(orgId, "owner");

  await db.insert(organizations).values({
    id: orgId,
    name: "Test Org",
    description: "Integration test fixture org",
    industry: "Technology",
    size: "1-10",
    ownerId,
    createdAt: new Date(),
  });

  await db.insert(organizationMembers).values({
    id: randomUUID(),
    organizationId: orgId,
    userId: ownerId,
    role: "owner",
    joinedAt: new Date(),
  });

  return { orgId, ownerId };
}

// Creates a member user already joined to the given org.
export async function createTestMember(orgId: string, role: MemberRole) {
  const userId = await insertUser(orgId, role);
  await db.insert(organizationMembers).values({
    id: randomUUID(),
    organizationId: orgId,
    userId,
    role,
    joinedAt: new Date(),
  });
  return userId;
}

export async function createTestProject(orgId: string) {
  const id = TEST_PREFIX + randomUUID();
  await db.insert(projects).values({
    id,
    organizationId: orgId,
    name: "Test Project",
    description: "Integration test fixture project",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    priority: "medium",
    progress: 0,
    health: "on_track",
    teamMembers: [],
    createdAt: new Date(),
  });
  return id;
}

export async function createTestModule(
  projectId: string,
  assignedDeveloperId: string,
  status: ModuleStatus = "not_started",
  options?: { deadline?: string; progress?: number; updatedAt?: Date },
) {
  const id = TEST_PREFIX + randomUUID();
  await db.insert(modules).values({
    id,
    projectId,
    name: "Test Module",
    description: "Integration test fixture module",
    assignedDeveloperId,
    progress: options?.progress ?? 0,
    status,
    deadline: options?.deadline ?? "2026-12-31",
    technicalNotes: "",
    createdAt: new Date(),
    // Explicitly pass updatedAt only when a test needs a backdated value
    // (e.g. to simulate a stale module). When omitted, the DB DEFAULT now()
    // supplies the current timestamp automatically, so no value is needed
    // for the general "just create a module" case.
    ...(options?.updatedAt ? { updatedAt: options.updatedAt } : {}),
  });
  return id;
}

export async function createTestBlocker(moduleId: string, reportedBy: string, resolved = false) {
  const id = TEST_PREFIX + randomUUID();
  await db.insert(blockerLogs).values({
    id,
    moduleId,
    reportedBy,
    description: "Integration test fixture blocker",
    resolved,
    createdAt: new Date(),
  });
  return id;
}

export async function createTestDependency(moduleId: string, dependsOnModuleId: string) {
  const id = TEST_PREFIX + randomUUID();
  await db.insert(moduleDependencies).values({
    id,
    moduleId,
    dependsOnModuleId,
    createdAt: new Date(),
  });
  return id;
}

export async function getProjectHealth(projectId: string) {
  const [project] = await db.select({ health: projects.health }).from(projects).where(eq(projects.id, projectId));
  return project?.health;
}

export async function getModuleUpdatedAt(moduleId: string) {
  const [mod] = await db.select({ updatedAt: modules.updatedAt }).from(modules).where(eq(modules.id, moduleId));
  return mod?.updatedAt;
}

export async function getModuleStatus(moduleId: string) {
  const [mod] = await db.select({ status: modules.status }).from(modules).where(eq(modules.id, moduleId));
  return mod?.status;
}

export async function getModuleDetails(moduleId: string) {
  const [mod] = await db
    .select({ status: modules.status, progress: modules.progress, technicalNotes: modules.technicalNotes })
    .from(modules)
    .where(eq(modules.id, moduleId));
  return mod;
}

export async function getBlockerResolved(blockerId: string) {
  const [blocker] = await db
    .select({ resolved: blockerLogs.resolved })
    .from(blockerLogs)
    .where(eq(blockerLogs.id, blockerId));
  return blocker?.resolved;
}

// Deletes the org — FK cascades clean up organizationMembers, projects,
// modules, blockerLogs, and activityLogs automatically. User rows aren't
// referenced by anything once that cascade completes, so they're deleted
// directly afterward.
export async function cleanupTestOrg(orgId: string, userIds: string[]) {
  await db.delete(organizations).where(eq(organizations.id, orgId));
  for (const id of userIds) {
    await db.delete(user).where(eq(user.id, id));
  }
}
