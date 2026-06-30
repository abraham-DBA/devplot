import { describe, it, expect, afterEach } from "vitest";
import { createProject } from "@/actions/projects";
import { setMockUser, MockRedirectError, type MockUser } from "./setup";
import { createTestOrg, createTestMember, cleanupTestOrg } from "./fixtures";

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

const validInput = {
  name: "New Project",
  description: "A project",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  priority: "medium" as const,
  teamMembers: [] as string[],
};

describe("actions/projects — createProject RBAC", () => {
  let cleanup: { orgId: string; userIds: string[] } | null = null;

  afterEach(async () => {
    setMockUser(null);
    if (cleanup) await cleanupTestOrg(cleanup.orgId, cleanup.userIds);
    cleanup = null;
  });

  it("a developer cannot create a project", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const developer = await createTestMember(orgId, "developer");
    cleanup = { orgId, userIds: [ownerId, developer] };

    setMockUser(asUser(developer, "developer", orgId));
    const result = await createProject(validInput);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Only owners, team leads, and project managers can create projects.");
  });

  it("a team_lead can pass the RBAC check (gets past role validation)", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const teamLead = await createTestMember(orgId, "team_lead");
    cleanup = { orgId, userIds: [ownerId, teamLead] };

    setMockUser(asUser(teamLead, "team_lead", orgId));
    // Invalid date range so we get a deterministic non-redirecting rejection
    // further down the validation chain, proving the RBAC gate itself passed.
    const result = await createProject({ ...validInput, endDate: "2025-01-01" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("End date must be after start date.");
  });
});

describe("actions/projects — teamMembers validation", () => {
  let cleanup: { orgId: string; userIds: string[] } | null = null;

  afterEach(async () => {
    setMockUser(null);
    if (cleanup) await cleanupTestOrg(cleanup.orgId, cleanup.userIds);
    cleanup = null;
  });

  it("rejects a teamMembers ID that isn't in the org", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const otherOrg = await createTestOrg();
    cleanup = { orgId, userIds: [ownerId] };

    setMockUser(asUser(ownerId, "owner", orgId));
    const result = await createProject({ ...validInput, teamMembers: [otherOrg.ownerId] });
    expect(result.success).toBe(false);
    expect(result.error).toBe("One or more selected team members are not in your organization.");

    await cleanupTestOrg(otherOrg.orgId, [otherOrg.ownerId]);
  });

  it("does not reject when teamMembers IDs all belong to the org — reaches the real success path", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const developer = await createTestMember(orgId, "developer");
    cleanup = { orgId, userIds: [ownerId, developer] };

    setMockUser(asUser(ownerId, "owner", orgId));
    // No further synchronous rejection exists after teamMembers validation —
    // the only way to prove it passed is to let the action run all the way to
    // its insert + redirect() call (mocked to throw instead of doing a real
    // Next.js redirect). The DB insert still really happens first; the
    // created project row is cleaned up via the org's cascade delete.
    await expect(createProject({ ...validInput, teamMembers: [developer] })).rejects.toThrow(MockRedirectError);
  });
});
