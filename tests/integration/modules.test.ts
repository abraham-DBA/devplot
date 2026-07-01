import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  updateModuleProgress,
  addNote,
  reportBlocker,
  resolveBlocker,
  approveModule,
  requestChanges,
} from "@/actions/modules";
import { setMockUser, type MockUser } from "./setup";
import {
  createTestOrg,
  createTestMember,
  createTestProject,
  createTestModule,
  createTestBlocker,
  getModuleStatus,
  getModuleDetails,
  getModuleUpdatedAt,
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
    const result = await reportBlocker(moduleA, "blocked on something", "external");
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

  it("approveModule rejects a module ID from a different org", async () => {
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await approveModule(moduleA);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Module not found.");
  });

  it("requestChanges rejects a module ID from a different org", async () => {
    setMockUser(asUser(orgB.ownerId, "owner", orgB.orgId));
    const result = await requestChanges(moduleA, "needs work");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Module not found.");
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

  it("updateModuleProgress sets updatedAt to a recent timestamp on success", async () => {
    const before = Date.now();
    setMockUser(asUser(assignee, "developer", org.orgId));
    await updateModuleProgress(mod, 50, "in_progress");
    const updatedAt = await getModuleUpdatedAt(mod);
    expect(updatedAt).toBeTruthy();
    expect(new Date(updatedAt!).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("updateModuleProgress does NOT update updatedAt on a rejected call (RBAC failure)", async () => {
    // Seed a backdated updatedAt by creating the module with an old timestamp
    const staleMod = await createTestModule(project, assignee, "in_progress", {
      updatedAt: new Date("2026-01-01"),
    });
    setMockUser(asUser(otherDeveloper, "developer", org.orgId));
    const result = await updateModuleProgress(staleMod, 50, "in_progress");
    expect(result.success).toBe(false);
    const updatedAt = await getModuleUpdatedAt(staleMod);
    // updatedAt should still be close to the seeded old date, not bumped to now
    expect(new Date(updatedAt!).getFullYear()).toBe(2026);
    expect(new Date(updatedAt!).getMonth()).toBe(0); // January
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
    const result = await reportBlocker(mod, "waiting on something", "internal_dependency");
    expect(result.success).toBe(true);
    expect(await getModuleStatus(mod)).toBe("blocked");
  });

  it("reportBlocker rejects an invalid type value", async () => {
    setMockUser(asUser(assignee, "developer", org.orgId));
    // @ts-expect-error — deliberately passing a value outside the BlockerType union
    const result = await reportBlocker(mod, "waiting on something", "vendor_delay");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid blocker type.");
    expect(await getModuleStatus(mod)).not.toBe("blocked"); // rejected before any mutation
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

describe("actions/modules — review/approval workflow", () => {
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
    mod = await createTestModule(project, assignee, "review");
  });

  afterEach(async () => {
    setMockUser(null);
    await cleanupTestOrg(org.orgId, [org.ownerId, assignee, otherDeveloper, teamLead]);
  });

  it("approveModule rejects when the module isn't in review", async () => {
    const inProgressMod = await createTestModule(project, assignee, "in_progress");
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await approveModule(inProgressMod);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Module must be in review before it can be approved.");
  });

  it("approveModule rejects a non-privileged user", async () => {
    setMockUser(asUser(otherDeveloper, "developer", org.orgId));
    const result = await approveModule(mod);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Only a lead/PM/owner who isn't the assignee can review this module.");
  });

  it("approveModule rejects self-approval, even though the assignee also holds a privileged role", async () => {
    // Promote the assignee to team_lead at the org-membership level by just
    // using their ID with a privileged role in the mock session — simulates
    // the small-team edge case where one person is both.
    setMockUser(asUser(assignee, "team_lead", org.orgId));
    const result = await approveModule(mod);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Only a lead/PM/owner who isn't the assignee can review this module.");
  });

  it("approveModule rejects when the module has an unresolved blocker", async () => {
    await createTestBlocker(mod, assignee);
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await approveModule(mod);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot approve a module with unresolved blockers. Resolve them first.");
  });

  it("approveModule succeeds: review -> completed, progress forced to 100", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await approveModule(mod);
    expect(result.success).toBe(true);

    const details = await getModuleDetails(mod);
    expect(details?.status).toBe("completed");
    expect(details?.progress).toBe(100);
  });

  it("a completed module is locked — updateModuleProgress rejects further edits, even from a lead", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const approveResult = await approveModule(mod);
    expect(approveResult.success).toBe(true);

    const editResult = await updateModuleProgress(mod, 80, "in_progress");
    expect(editResult.success).toBe(false);
    expect(editResult.error).toBe("This module is completed and locked from further edits.");

    const details = await getModuleDetails(mod);
    expect(details?.status).toBe("completed");
    expect(details?.progress).toBe(100);
  });

  it("requestChanges rejects an empty comment", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await requestChanges(mod, "   ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Please explain what needs to change.");
  });

  it("requestChanges rejects a non-privileged user", async () => {
    setMockUser(asUser(otherDeveloper, "developer", org.orgId));
    const result = await requestChanges(mod, "needs more tests");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Only a lead/PM/owner who isn't the assignee can review this module.");
  });

  it("requestChanges succeeds: review -> in_progress, appends a review-type note", async () => {
    setMockUser(asUser(teamLead, "team_lead", org.orgId));
    const result = await requestChanges(mod, "Error handling on the refund path is missing.");
    expect(result.success).toBe(true);

    const details = await getModuleDetails(mod);
    expect(details?.status).toBe("in_progress");

    const notes = JSON.parse(details?.technicalNotes ?? "[]");
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("review");
    expect(notes[0].title).toBe("Changes requested");
    expect(notes[0].body).toBe("Error handling on the refund path is missing.");
  });
});
