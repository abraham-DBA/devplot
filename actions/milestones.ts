"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { milestones, modules, projects, activityLogs, organizationMembers } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

const CAN_MANAGE = ["owner", "team_lead", "project_manager"] as const;

async function getOrgScopedMilestone(milestoneId: string, orgId: string) {
  const [row] = await db
    .select({ id: milestones.id, projectId: milestones.projectId })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(and(eq(milestones.id, milestoneId), eq(projects.organizationId, orgId)));
  return row ?? null;
}

export async function createMilestone(input: {
  projectId: string;
  name: string;
  targetDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_MANAGE.includes(session.user.role as (typeof CAN_MANAGE)[number]))
    return { success: false, error: "Only team leads and project managers can create milestones." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  const { projectId, name, targetDate } = input;
  if (!name.trim()) return { success: false, error: "Milestone name is required." };
  if (!targetDate) return { success: false, error: "Target date is required." };

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)));
  if (!project) return { success: false, error: "Project not found." };

  try {
    await db.insert(milestones).values({
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      targetDate,
      createdAt: new Date(),
    });

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      projectId,
      message: `${session.user.name} created milestone "${name.trim()}"`,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[actions/milestones] createMilestone", error);
    return { success: false, error: "Failed to create milestone." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updateMilestone(input: {
  id: string;
  contractsAgreed?: boolean;
  rollbackOwnerId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_MANAGE.includes(session.user.role as (typeof CAN_MANAGE)[number]))
    return { success: false, error: "Only team leads and project managers can update milestones." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  const milestone = await getOrgScopedMilestone(input.id, orgId);
  if (!milestone) return { success: false, error: "Milestone not found." };

  if (input.rollbackOwnerId) {
    const [member] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, input.rollbackOwnerId),
      ));
    if (!member) return { success: false, error: "Rollback owner must be an org member." };
  }

  const patch: Partial<typeof milestones.$inferInsert> = {};
  if (input.contractsAgreed !== undefined) patch.contractsAgreed = input.contractsAgreed;
  if ("rollbackOwnerId" in input) patch.rollbackOwnerId = input.rollbackOwnerId ?? null;

  try {
    await db.update(milestones).set(patch).where(eq(milestones.id, input.id));
  } catch (error) {
    console.error("[actions/milestones] updateMilestone", error);
    return { success: false, error: "Failed to update milestone." };
  }

  revalidatePath(`/projects/${milestone.projectId}`);
  return { success: true };
}

export async function deleteMilestone(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_MANAGE.includes(session.user.role as (typeof CAN_MANAGE)[number]))
    return { success: false, error: "Only team leads and project managers can delete milestones." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  const milestone = await getOrgScopedMilestone(input.id, orgId);
  if (!milestone) return { success: false, error: "Milestone not found." };

  try {
    await db.delete(milestones).where(eq(milestones.id, input.id));
  } catch (error) {
    console.error("[actions/milestones] deleteMilestone", error);
    return { success: false, error: "Failed to delete milestone." };
  }

  revalidatePath(`/projects/${milestone.projectId}`);
  return { success: true };
}

export async function setModuleMilestone(input: {
  moduleId: string;
  milestoneId: string | null;
  projectId: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_MANAGE.includes(session.user.role as (typeof CAN_MANAGE)[number]))
    return { success: false, error: "Only team leads and project managers can assign milestones." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.organizationId, orgId)));
  if (!project) return { success: false, error: "Project not found." };

  if (input.milestoneId) {
    const [ms] = await db
      .select({ id: milestones.id })
      .from(milestones)
      .where(and(eq(milestones.id, input.milestoneId), eq(milestones.projectId, input.projectId)));
    if (!ms) return { success: false, error: "Milestone not in this project." };
  }

  try {
    await db
      .update(modules)
      .set({ milestoneId: input.milestoneId })
      .where(and(eq(modules.id, input.moduleId), eq(modules.projectId, input.projectId)));
  } catch (error) {
    console.error("[actions/milestones] setModuleMilestone", error);
    return { success: false, error: "Failed to assign milestone." };
  }

  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath(`/projects/${input.projectId}/modules/${input.moduleId}`);
  return { success: true };
}
