"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { user, modules, projects, blockerLogs, organizationMembers, organizations } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomBytes } from "crypto";

type MemberRole = "developer" | "team_lead" | "project_manager";

const VALID_ROLES: MemberRole[] = ["developer", "team_lead", "project_manager"];
const CAN_CHANGE_ROLES = ["owner", "project_manager", "team_lead"];
const CAN_REMOVE_MEMBERS = ["owner", "project_manager"];

// ── rotateInviteCode ──────────────────────────────────────────────────────────

export async function rotateInviteCode(): Promise<{
  success: boolean;
  newCode?: string;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (session.user.role !== "owner")
      return { success: false, error: "Only the workspace owner can regenerate the invite link." };

    const orgId = session.user.organizationId;
    if (!orgId) return { success: false, error: "No organization found." };

    const newCode = randomBytes(8).toString("hex");

    await db
      .update(organizations)
      .set({ inviteCode: newCode })
      .where(eq(organizations.id, orgId));

    revalidatePath("/team");
    return { success: true, newCode };
  } catch (error) {
    console.error("[actions/team] rotateInviteCode", error);
    return { success: false, error: "Failed to regenerate invite link." };
  }
}

// ── updateMemberRole ──────────────────────────────────────────────────────────

export async function updateMemberRole(
  targetUserId: string,
  role: MemberRole,
): Promise<{ success: boolean; error?: string }> {
  if (!VALID_ROLES.includes(role)) return { success: false, error: "Invalid role." };

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!CAN_CHANGE_ROLES.includes(session.user.role ?? ""))
      return { success: false, error: "You don't have permission to change roles." };

    const orgId = session.user.organizationId;
    if (!orgId) return { success: false, error: "No organization found." };

    // Verify target is in the same org
    const [targetMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.organizationId, orgId),
        ),
      );
    if (!targetMember) return { success: false, error: "Member not found in your organization." };
    if (targetMember.role === "owner") return { success: false, error: "Owner role cannot be changed." };

    // Both writes in a transaction — organizationMembers is source of truth.
    await db.transaction(async (tx) => {
      await tx
        .update(organizationMembers)
        .set({ role })
        .where(
          and(
            eq(organizationMembers.userId, targetUserId),
            eq(organizationMembers.organizationId, orgId),
          ),
        );
      await tx.update(user).set({ role }).where(eq(user.id, targetUserId));
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("[actions/team] updateMemberRole", error);
    return { success: false, error: "Failed to update role." };
  }
}

// ── removeMember ──────────────────────────────────────────────────────────────

export async function removeMember(
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!CAN_REMOVE_MEMBERS.includes(session.user.role ?? ""))
      return { success: false, error: "You don't have permission to remove members." };

    const orgId = session.user.organizationId;
    if (!orgId) return { success: false, error: "No organization found." };

    if (targetUserId === session.user.id)
      return { success: false, error: "You cannot remove yourself." };

    const [targetMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, targetUserId),
          eq(organizationMembers.organizationId, orgId),
        ),
      );
    if (!targetMember) return { success: false, error: "Member not found in your organization." };
    if (targetMember.role === "owner")
      return { success: false, error: "The workspace owner cannot be removed." };

    // Check modules assigned to this member in THIS org only.
    const assignedModules = await db
      .select({ id: modules.id })
      .from(modules)
      .innerJoin(projects, eq(modules.projectId, projects.id))
      .where(
        and(
          eq(modules.assignedDeveloperId, targetUserId),
          eq(projects.organizationId, orgId),
        ),
      );

    if (assignedModules.length > 0) {
      return {
        success: false,
        error: "Cannot remove a member with assigned modules. Reassign their modules first.",
      };
    }

    // Check unresolved blockers reported by this member in THIS org.
    const openBlockers = await db
      .select({ id: blockerLogs.id })
      .from(blockerLogs)
      .innerJoin(modules, eq(blockerLogs.moduleId, modules.id))
      .innerJoin(projects, eq(modules.projectId, projects.id))
      .where(
        and(
          eq(blockerLogs.reportedBy, targetUserId),
          eq(blockerLogs.resolved, false),
          eq(projects.organizationId, orgId),
        ),
      );

    if (openBlockers.length > 0) {
      return {
        success: false,
        error: "Cannot remove a member with unresolved blockers. Resolve their blockers first.",
      };
    }

    // Delete from org then reset user — both writes in a transaction.
    await db.transaction(async (tx) => {
      await tx
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, targetUserId),
            eq(organizationMembers.organizationId, orgId),
          ),
        );

      await tx
        .update(user)
        .set({ organizationId: null, onboardingCompleted: false, role: "developer" })
        .where(eq(user.id, targetUserId));
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("[actions/team] removeMember", error);
    return { success: false, error: "Failed to remove member." };
  }
}
