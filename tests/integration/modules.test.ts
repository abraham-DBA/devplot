import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { updateModuleProgress, addNote, reportBlocker, resolveBlocker } from "@/actions/modules";
import { setMockUser, type MockUser } from "./setup";
import {
  createTestOrg,
  createTestMember,
  createTestProject,
  createTestModule,
  createTestBlocker,
  getModuleStatus,
  getBlockerResolved,
  cleanupTestOrg,
} from "./fixtures";

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

describe("actions/modules — org scope (IDOR)", () => {
  let orgA: { orgId: string; ownerId: string };
  let orgB: { orgId: string; ownerId: string };
  let projectA: string;
  let moduleA: string;
  let developerA: string;

  beforeEach(async () => {
    orgA = await createTestOrg();
    orgB = await createTestOrg();
    developerA = await createTestMember(orgA.orgId, "developer");
    projectA = await createTestProject(orgA.orgId);
    moduleA = await createTestModule(projectA, developerA);
  });

  afterEach(async () => {
    setMockUser(null);
    await cleanupTestOrg(orgA.orgId, [orgA.ownerId, developerA]);
    await cleanupTestOrg(orgB.orgId, [orgB.ownerId]);
  });

  it("updateModuleProgress rejects a module ID from a different org", async () => {
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await updateModuleProgress(moduleA, 50, "in_progress");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Module not found.");
  });

  it("addNote rejects a module ID from a different org", async () => {
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await addNote(moduleA, { type: "technical", title: "x", body: "y" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Module not found.");
  });

  it("reportBlocker rejects a module ID from a different org", async () => {
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await reportBlocker(moduleA, "blocked on something");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Module not found.");
  });

  it("resolveBlocker rejects a blocker ID from a different org", async () => {
    const blockerId = await createTestBlocker(moduleA, developerA);
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await resolveBlocker(blockerId);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Blocker not found.");
  });

  it("same-org owner CAN update the module (sanity check the scope check isn't overly strict)", async () => {
    setMockUser(asUser(orgA.ownerId, "owner", orgA.orgId));
    const result = await updateModuleProgress(moduleA, 50, "in_progress");
    expect(result.success).toBe(true);
  });
});

describe("actions/modules — RBAC on progress updates", () => {
  let org: { orgId: string; ownerId: string };
  let project: string;
  let mod: string;
  let assignee: string;
  let otherDeveloper: string;
  let teamLead: string;

  beforeEach(async () => {
    org = await createTestOrg();
    assignee = await createTestMember(org.orgId, "developer");
    otherDeveloper = await createTestMember(org.orgId, "developer");
    teamLead = await createTestMember(org.orgId, "team_lead");
    project = await createTestProject(org.orgId);
    mod = await createTestModule(project, assignee);
  });

  afterEach(async () => {
    setMockUser(null);
    await cleanupTestOrg(org.orgId, [org.ownerId, assignee, otherDeveloper, teamLead]);
  });

  it("the assigned developer can update their own module's progress", async () => {
    setMockUser(asUser(assignee, "developer", org.orgId));
    const result = await updateModuleProgress(mod, 40, "in_progress");
    expect(result.success).toBe(true);
  });

  it("a developer who is NOT the assignee cannot update progress", async () => {
    setMockUser(asUser(otherDeveloper, "developer", org.orgId));
    const result = await updateModuleProgress(mod, 40, "in_progress");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Only the assigned developer or a lead/PM/owner");
  });

  it("a team_lead can update progress on a module they're not assigned to", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await updateModuleProgress(mod, 40, "in_progress");
    expect(result.success).toBe(true);
  });
});

describe("actions/modules — blocker lifecycle", () => {
  let org: { orgId: string; ownerId: string };
  let project: string;
  let mod: string;
  let assignee: string;
  let otherDeveloper: string;
  let teamLead: string;

  beforeEach(async () => {
    org = await createTestOrg();
    assignee = await createTestMember(org.orgId, "developer");
    otherDeveloper = await createTestMember(org.orgId, "developer");
    teamLead = await createTestMember(org.orgId, "team_lead");
    project = await createTestProject(org.orgId);
    mod = await createTestModule(project, assignee, "in_progress");
  });

  afterEach(async () => {
    setMockUser(null);
    await cleanupTestOrg(org.orgId, [org.ownerId, assignee, otherDeveloper, teamLead]);
  });

  it("reportBlocker sets module status to blocked", async () => {
    setMockUser(asUser(assignee, "developer", org.orgId));
    const result = await reportBlocker(mod, "waiting on something");
    expect(result.success).toBe(true);
    expect(await getModuleStatus(mod)).toBe("blocked");
  });

  it("a non-assignee, non-lead user cannot resolve a blocker", async () => {
    const blockerId = await createTestBlocker(mod, assignee);

    setMockUser(asUser(otherDeveloper, "developer", org.orgId));
    const result = await resolveBlocker(blockerId);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Only the assigned developer or a lead/PM/owner");
    expect(await getBlockerResolved(blockerId)).toBe(false);
  });

  it("resolving the only open blocker flips status from blocked back to in_progress", async () => {
    // Put the module into "blocked" via the real action a lead would use,
    // then attach one open blocker to it.
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await updateModuleProgress(mod, 20, "blocked");
    const blockerId = await createTestBlocker(mod, assignee);

    setMockUser(asUser(assignee, "developer", org.orgId));
    const result = await resolveBlocker(blockerId);

    expect(result.success).toBe(true);
    expect(await getModuleStatus(mod)).toBe("in_progress");
  });

  it("resolving one of two open blockers does NOT flip status — module stays blocked", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await updateModuleProgress(mod, 20, "blocked");
    const blockerOne = await createTestBlocker(mod, assignee);
    const blockerTwo = await createTestBlocker(mod, assignee);

    setMockUser(asUser(assignee, "developer", org.orgId));
    const result = await resolveBlocker(blockerOne);

    expect(result.success).toBe(true);
    expect(await getBlockerResolved(blockerOne)).toBe(true);
    expect(await getBlockerResolved(blockerTwo)).toBe(false);
    expect(await getModuleStatus(mod)).toBe("blocked"); // blockerTwo is still open

    // Resolving the second (and now last) open blocker flips it.
    const finalResult = await resolveBlocker(blockerTwo);
    expect(finalResult.success).toBe(true);
    expect(await getModuleStatus(mod)).toBe("in_progress");
  });

  it("resolving a blocker does NOT clobber a manually-set status that isn't 'blocked'", async () => {
    // Module status is "in_progress" (from beforeEach) — never actually set
    // to "blocked" — even though a blocker exists against it.
    const blockerId = await createTestBlocker(mod, assignee);

    // A lead independently moves it to "review", unrelated to the blocker flow.
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    await updateModuleProgress(mod, 90, "review");

    setMockUser(asUser(assignee, "developer", org.orgId));
    const result = await resolveBlocker(blockerId);

    expect(result.success).toBe(true);
    expect(await getModuleStatus(mod)).toBe("review"); // untouched, not forced to in_progress
  });
});
