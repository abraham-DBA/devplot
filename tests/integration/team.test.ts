import { describe, it, expect, afterEach } from "vitest";
import { updateMemberRole, removeMember, rotateInviteCode } from "@/actions/team";
import { resolveBlocker } from "@/actions/modules";
import { setMockUser, type MockUser } from "./setup";
import {
  createTestOrg,
  createTestMember,
  createTestProject,
  createTestModule,
  createTestBlocker,
  cleanupTestOrg,
} from "./fixtures";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/schema";
import { eq } from "drizzle-orm";

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

describe("actions/team — updateMemberRole", () => {
  let cleanup: { orgId: string; userIds: string[] } | null = null;

  afterEach(async () => {
    setMockUser(null);
    if (cleanup) await cleanupTestOrg(cleanup.orgId, cleanup.userIds);
    cleanup = null;
  });

  it("a developer cannot change another member's role", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const developer = await createTestMember(orgId, "developer");
    const target = await createTestMember(orgId, "developer");
    cleanup = { orgId, userIds: [ownerId, developer, target] };

    setMockUser(asUser(developer, "developer", orgId));
    const result = await updateMemberRole(target, "team_lead");
    expect(result.success).toBe(false);
    expect(result.error).toBe("You don't have permission to change roles.");
  });

  it("an owner CAN change a developer's role, and it syncs to organizationMembers and user", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const target = await createTestMember(orgId, "developer");
    cleanup = { orgId, userIds: [ownerId, target] };

    setMockUser(asUser(ownerId, "owner", orgId));
    const result = await updateMemberRole(target, "team_lead");
    expect(result.success).toBe(true);

    const [member] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, target));
    expect(member.role).toBe("team_lead");
  });

  it("cannot change a target user's role across orgs (org-scope check)", async () => {
    const orgA = await createTestOrg();
    const orgB = await createTestOrg();
    const targetInOrgB = await createTestMember(orgB.orgId, "developer");
    cleanup = { orgId: orgA.orgId, userIds: [orgA.ownerId] };

    setMockUser(asUser(orgA.ownerId, "owner", orgA.orgId));
    const result = await updateMemberRole(targetInOrgB, "team_lead");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Member not found in your organization.");

    await cleanupTestOrg(orgB.orgId, [orgB.ownerId, targetInOrgB]);
  });

  it("the owner's role can never be changed, even by themself", async () => {
    const { orgId, ownerId } = await createTestOrg();
    cleanup = { orgId, userIds: [ownerId] };

    setMockUser(asUser(ownerId, "owner", orgId));
    const result = await updateMemberRole(ownerId, "developer");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Owner role cannot be changed.");
  });
});

describe("actions/team — removeMember", () => {
  let cleanup: { orgId: string; userIds: string[] } | null = null;

  afterEach(async () => {
    setMockUser(null);
    if (cleanup) await cleanupTestOrg(cleanup.orgId, cleanup.userIds);
    cleanup = null;
  });

  it("a developer cannot remove another member", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const developer = await createTestMember(orgId, "developer");
    const target = await createTestMember(orgId, "developer");
    cleanup = { orgId, userIds: [ownerId, developer, target] };

    setMockUser(asUser(developer, "developer", orgId));
    const result = await removeMember(target);
    expect(result.success).toBe(false);
    expect(result.error).toBe("You don't have permission to remove members.");
  });

  it("the owner cannot be removed", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const projectManager = await createTestMember(orgId, "project_manager");
    cleanup = { orgId, userIds: [ownerId, projectManager] };

    setMockUser(asUser(projectManager, "project_manager", orgId));
    const result = await removeMember(ownerId);
    expect(result.success).toBe(false);
    expect(result.error).toBe("The workspace owner cannot be removed.");
  });

  it("cannot remove yourself (self-check fires before the owner-role check)", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const projectManager = await createTestMember(orgId, "project_manager");
    cleanup = { orgId, userIds: [ownerId, projectManager] };

    setMockUser(asUser(projectManager, "project_manager", orgId));
    const result = await removeMember(projectManager);
    expect(result.success).toBe(false);
    expect(result.error).toBe("You cannot remove yourself.");
  });

  it("regression: a member with an unresolved blocker cannot be removed, but CAN be removed once it's resolved", async () => {
    // This is the exact bug this session's review fixed — before resolveBlocker
    // existed, removeMember's unresolved-blocker guard made removal permanently
    // impossible for anyone who had ever reported a blocker.
    //
    // Module is assigned to the owner (not `developer`) so the assigned-modules
    // check doesn't also trip — this isolates the unresolved-blockers check,
    // since removeMember checks assigned modules before unresolved blockers.
    const { orgId, ownerId } = await createTestOrg();
    const developer = await createTestMember(orgId, "developer");
    const projectId = await createTestProject(orgId);
    const moduleId = await createTestModule(projectId, ownerId);
    const blockerId = await createTestBlocker(moduleId, developer);
    cleanup = { orgId, userIds: [ownerId, developer] };

    setMockUser(asUser(ownerId, "owner", orgId));
    const blockedResult = await removeMember(developer);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.error).toBe("Cannot remove a member with unresolved blockers. Resolve their blockers first.");

    const resolveResult = await resolveBlocker(blockerId);
    expect(resolveResult.success).toBe(true);

    const removeResult = await removeMember(developer);
    expect(removeResult.success).toBe(true);

    const remainingMembership = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, developer));
    expect(remainingMembership.length).toBe(0);
  });

  it("a member with an assigned module cannot be removed", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const developer = await createTestMember(orgId, "developer");
    const projectId = await createTestProject(orgId);
    await createTestModule(projectId, developer);
    cleanup = { orgId, userIds: [ownerId, developer] };

    setMockUser(asUser(ownerId, "owner", orgId));
    const result = await removeMember(developer);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot remove a member with assigned modules. Reassign their modules first.");
  });
});

describe("actions/team — rotateInviteCode", () => {
  let cleanup: { orgId: string; userIds: string[] } | null = null;

  afterEach(async () => {
    setMockUser(null);
    if (cleanup) await cleanupTestOrg(cleanup.orgId, cleanup.userIds);
    cleanup = null;
  });

  it("only the owner can regenerate the invite link", async () => {
    const { orgId, ownerId } = await createTestOrg();
    const projectManager = await createTestMember(orgId, "project_manager");
    cleanup = { orgId, userIds: [ownerId, projectManager] };

    setMockUser(asUser(projectManager, "project_manager", orgId));
    const result = await rotateInviteCode();
    expect(result.success).toBe(false);
    expect(result.error).toBe("Only the workspace owner can regenerate the invite link.");
  });

  it("the owner rotating it actually changes the stored invite code", async () => {
    const { orgId, ownerId } = await createTestOrg();
    cleanup = { orgId, userIds: [ownerId] };

    const [before] = await db.select({ inviteCode: organizations.inviteCode }).from(organizations).where(eq(organizations.id, orgId));

    setMockUser(asUser(ownerId, "owner", orgId));
    const result = await rotateInviteCode();
    expect(result.success).toBe(true);
    expect(result.newCode).toBeTruthy();

    const [after] = await db.select({ inviteCode: organizations.inviteCode }).from(organizations).where(eq(organizations.id, orgId));
    expect(after.inviteCode).not.toBe(before.inviteCode);
    expect(after.inviteCode).toBe(result.newCode);
  });
});
