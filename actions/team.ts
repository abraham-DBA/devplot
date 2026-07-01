"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { user, modules, projects, blockerLogs, organizationMembers, inviteLinks } from "@/lib/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomBytes, randomUUID } from "crypto";

type MemberRole = "developer" | "team_lead" | "project_manager";

const VALID_ROLES: MemberRole[] = ["developer", "team_lead", "project_manager"];
const CAN_CHANGE_ROLES = ["owner", "project_manager", "team_lead"];
const CAN_REMOVE_MEMBERS = ["owner", "project_manager"];

// ── createInvite ──────────────────────────────────────────────────────────────

export async function createInvite(
  email: string,
  role: MemberRole,
): Promise<{ success: boolean; id?: string; code?: string; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (session.user.role !== "owner")
      return { success: false, error: "Only the workspace owner can create invite links." };

    const orgId = session.user.organizationId;
    if (!orgId) return { success: false, error: "No organization found." };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: "Invalid email address." };
    if (!VALID_ROLES.includes(role)) return { success: false, error: "Invalid role." };

    const now = new Date();

    // Block if an active pending invite already exists for this email in this org.
    const [existing] = await db
      .select({ id: inviteLinks.id })
      .from(inviteLinks)
      .where(
        and(
          eq(inviteLinks.organizationId, orgId),
          eq(inviteLinks.email, email.toLowerCase()),
          isNull(inviteLinks.usedAt),
          gt(inviteLinks.expiresAt, now),
        ),
      );
    if (existing)
      return { success: false, error: "An active invite already exists for this email address." };

    const id = randomUUID();
    const code = randomBytes(8).toString("hex");
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(inviteLinks).values({
      id,
      organizationId: orgId,
      email: email.toLowerCase(),
      role,
      code,
      expiresAt,
    });

    revalidatePath("/team");
    return { success: true, id, code };
  } catch (error) {
    console.error("[actions/team] createInvite", error);
    return { success: false, error: "Failed to create invite. Please try again." };
  }
}

// ── revokeInvite ──────────────────────────────────────────────────────────────

export async function revokeInvite(
  inviteId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (session.user.role !== "owner")
      return { success: false, error: "Only the workspace owner can revoke invites." };

    const orgId = session.user.organizationId;
    if (!orgId) return { success: false, error: "No organization found." };

    const [invite] = await db
      .select({ id: inviteLinks.id, organizationId: inviteLinks.organizationId })
      .from(inviteLinks)
      .where(eq(inviteLinks.id, inviteId));

    if (!invite || invite.organizationId !== orgId)
      return { success: false, error: "Invite not found." };

    await db.delete(inviteLinks).where(eq(inviteLinks.id, inviteId));

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("[actions/team] revokeInvite", error);
    return { success: false, error: "Failed to revoke invite. Please try again." };
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
