import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addDependency, removeDependency, updateModuleProgress } from "@/actions/modules";
import { setMockUser, type MockUser } from "./setup";
import {
  createTestOrg,
  createTestMember,
  createTestProject,
  createTestModule,
  getProjectHealth,
  cleanupTestOrg,
} from "./fixtures";
import { db } from "@/lib/db";
import { moduleDependencies } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

function asUser(id: string, role: MockUser["role"], organizationId: string): MockUser {
  return {
    id,
    name: "Test User",
    email: `${id}@test.local`,
    role,
    organizationId,
    onboardingCompleted: true,
  };
}

async function dependencyExists(moduleId: string, dependsOnModuleId: string) {
  const rows = await db
    .select({ id: moduleDependencies.id })
    .from(moduleDependencies)
    .where(and(eq(moduleDependencies.moduleId, moduleId), eq(moduleDependencies.dependsOnModuleId, dependsOnModuleId)));
  return rows.length > 0;
}

describe("actions/modules — addDependency / removeDependency", () => {
  let org: { orgId: string; ownerId: string };
  let project: string;
  let moduleA: string;
  let moduleB: string;
  let moduleC: string;
  let assignee: string;
  let otherDeveloper: string;
  let teamLead: string;

  beforeEach(async () => {
    org = await createTestOrg();
    assignee = await createTestMember(org.orgId, "developer");
    otherDeveloper = await createTestMember(org.orgId, "developer");
    teamLead = await createTestMember(org.orgId, "team_lead");
    project = await createTestProject(org.orgId);
    moduleA = await createTestModule(project, assignee);
    moduleB = await createTestModule(project, assignee);
    moduleC = await createTestModule(project, assignee);
  });

  afterEach(async () => {
    setMockUser(null);
    await cleanupTestOrg(org.orgId, [org.ownerId, assignee, otherDeveloper, teamLead]);
  });

  it("a privileged user can add a dependency", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await addDependency(moduleB, moduleA);
    expect(result.success).toBe(true);
    expect(await dependencyExists(moduleB, moduleA)).toBe(true);
  });

  it("rejects a non-privileged user, even the assignee", async () => {
    setMockUser(asUser(assignee, "developer", org.orgId));
    const result = await addDependency(moduleB, moduleA);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Only owners, team leads, and project managers can manage dependencies.");
  });

  it("a privileged user who is also the assignee can still add a dependency (no assignee carve-out either way)", async () => {
    setMockUser(asUser(assignee, "team_lead", org.orgId));
    const result = await addDependency(moduleB, moduleA);
    expect(result.success).toBe(true);
  });

  it("rejects a module depending on itself", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await addDependency(moduleA, moduleA);
    expect(result.success).toBe(false);
    expect(result.error).toBe("A module cannot depend on itself.");
  });

  it("rejects a duplicate edge", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await addDependency(moduleB, moduleA);
    const result = await addDependency(moduleB, moduleA);
    expect(result.success).toBe(false);
    expect(result.error).toBe("This dependency already exists.");
  });

  it("rejects a direct cycle (A depends on B, B depends on A)", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const first = await addDependency(moduleB, moduleA); // B depends on A
    expect(first.success).toBe(true);

    const cyclic = await addDependency(moduleA, moduleB); // A depends on B — would close the loop
    expect(cyclic.success).toBe(false);
    expect(cyclic.error).toBe("This would create a circular dependency.");
  });

  it("rejects a transitive cycle (A->B->C, then C->A)", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    expect((await addDependency(moduleB, moduleA)).success).toBe(true); // B depends on A
    expect((await addDependency(moduleC, moduleB)).success).toBe(true); // C depends on B

    const cyclic = await addDependency(moduleA, moduleC); // A depends on C — closes A->C->B->A
    expect(cyclic.success).toBe(false);
    expect(cyclic.error).toBe("This would create a circular dependency.");
  });

  it("rejects modules from different projects", async () => {
    const otherProject = await createTestProject(org.orgId);
    const moduleD = await createTestModule(otherProject, assignee);

    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await addDependency(moduleB, moduleD);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Modules must belong to the same project to declare a dependency.");
  });

  it("addDependency rejects a module ID from a different org (IDOR)", async () => {
    const orgB = await createTestOrg();
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await addDependency(moduleB, moduleA);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Module not found.");
    await cleanupTestOrg(orgB.orgId, [orgB.ownerId]);
  });

  it("removeDependency deletes the edge for a privileged user", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await addDependency(moduleB, moduleA);
    const [edge] = await db
      .select({ id: moduleDependencies.id })
      .from(moduleDependencies)
      .where(eq(moduleDependencies.moduleId, moduleB));

    const result = await removeDependency(edge.id);
    expect(result.success).toBe(true);
    expect(await dependencyExists(moduleB, moduleA)).toBe(false);
  });

  it("removeDependency rejects a non-privileged user", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await addDependency(moduleB, moduleA);
    const [edge] = await db
      .select({ id: moduleDependencies.id })
      .from(moduleDependencies)
      .where(eq(moduleDependencies.moduleId, moduleB));

    setMockUser(asUser(otherDeveloper, "developer", org.orgId));
    const result = await removeDependency(edge.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Only owners, team leads, and project managers can manage dependencies.");
  });

  it("removeDependency rejects a dependency ID from a different org (IDOR)", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await addDependency(moduleB, moduleA);
    const [edge] = await db
      .select({ id: moduleDependencies.id })
      .from(moduleDependencies)
      .where(eq(moduleDependencies.moduleId, moduleB));

    const orgB = await createTestOrg();
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await removeDependency(edge.id);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Dependency not found.");
    await cleanupTestOrg(orgB.orgId, [orgB.ownerId]);
  });
});

describe("actions/modules — dependency risk integration with project health", () => {
  let org: { orgId: string; ownerId: string };
  let project: string;
  let assignee: string;
  let teamLead: string;

  beforeEach(async () => {
    org = await createTestOrg();
    assignee = await createTestMember(org.orgId, "developer");
    teamLead = await createTestMember(org.orgId, "team_lead");
    project = await createTestProject(org.orgId);
  });

  afterEach(async () => {
    setMockUser(null);
    await cleanupTestOrg(org.orgId, [org.ownerId, assignee, teamLead]);
  });

  // The project's startDate/endDate (2026-01-01..2026-12-31, fixtures.ts) put
  // "today" roughly halfway through the year, so both modules carry enough
  // progress that the time-based health calc alone would say on_track — any
  // at_risk result here is attributable to the dependency, not the calendar.
  it("addDependency alone (no other mutation) immediately pushes the project to at_risk when linked onto an overdue module", async () => {
    const upstream = await createTestModule(project, assignee, "in_progress", {
      deadline: "2026-01-15", // already past, but never marked "blocked"
      progress: 70,
    });
    const downstream = await createTestModule(project, assignee, "in_progress", {
      deadline: "2026-12-01",
      progress: 70,
    });

    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    expect(await getProjectHealth(project)).toBe("on_track");

    expect((await addDependency(downstream, upstream)).success).toBe(true);
    expect(await getProjectHealth(project)).toBe("at_risk");
  });

  it("removeDependency clears the at_risk health immediately once the edge is gone", async () => {
    const upstream = await createTestModule(project, assignee, "in_progress", {
      deadline: "2026-01-15",
      progress: 70,
    });
    const downstream = await createTestModule(project, assignee, "in_progress", {
      deadline: "2026-12-01",
      progress: 70,
    });

    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await addDependency(downstream, upstream);
    expect(await getProjectHealth(project)).toBe("at_risk");

    const [edge] = await db
      .select({ id: moduleDependencies.id })
      .from(moduleDependencies)
      .where(eq(moduleDependencies.moduleId, downstream));
    expect((await removeDependency(edge.id)).success).toBe(true);

    expect(await getProjectHealth(project)).toBe("on_track");
  });

  it("a module with no dependency on anything broken does not get flagged into at_risk by an unrelated overdue module", async () => {
    await createTestModule(project, assignee, "in_progress", {
      deadline: "2026-01-15",
      progress: 70,
    });
    const independent = await createTestModule(project, assignee, "in_progress", {
      deadline: "2026-12-01",
      progress: 70,
    });
    // No dependency edge between them.

    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await updateModuleProgress(independent, 70, "in_progress");
    expect(result.success).toBe(true);

    // unrelatedOverdue is itself overdue-but-not-blocked, so hasBlockedModule
    // stays false and hasDependencyRisk stays false (no edges at all) —
    // health falls through to the time-based calc, which lands on on_track
    // given matched progress/timeUsed.
    expect(await getProjectHealth(project)).toBe("on_track");
  });
});
