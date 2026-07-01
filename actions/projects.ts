"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { projects, organizationMembers, activityLogs } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { and, eq, inArray } from "drizzle-orm";

const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;
type Priority = "low" | "medium" | "high" | "critical";

const CAN_CREATE_PROJECT = ["owner", "team_lead", "project_manager"] as const;
const CAN_EDIT_PROJECT   = ["owner", "team_lead", "project_manager"] as const;
const CAN_DELETE_PROJECT = ["owner", "project_manager"] as const;

type CreateProjectInput = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: Priority;
  teamMembers: string[];
};

export async function createProject(
  input: CreateProjectInput,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_CREATE_PROJECT.includes(session.user.role as (typeof CAN_CREATE_PROJECT)[number]))
    return { success: false, error: "Only owners, team leads, and project managers can create projects." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found. Please complete onboarding." };

  const { name, description, startDate, endDate, priority, teamMembers } = input;

  if (!name.trim()) return { success: false, error: "Project name is required." };
  if (!description.trim()) return { success: false, error: "Description is required." };
  if (!startDate) return { success: false, error: "Start date is required." };
  if (!endDate) return { success: false, error: "End date is required." };
  if (new Date(endDate) <= new Date(startDate))
    return { success: false, error: "End date must be after start date." };
  if (!VALID_PRIORITIES.includes(priority))
    return { success: false, error: "Invalid priority." };

  if (teamMembers.length > 0) {
    const validMembers = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          inArray(organizationMembers.userId, teamMembers),
        ),
      );
    const validIds = new Set(validMembers.map((m) => m.userId));
    const invalid = teamMembers.filter((memberId) => !validIds.has(memberId));
    if (invalid.length > 0)
      return { success: false, error: "One or more selected team members are not in your organization." };
  }

  const id = crypto.randomUUID();

  try {
    await db.insert(projects).values({
      id,
      organizationId: orgId,
      name: name.trim(),
      description: description.trim(),
      startDate,
      endDate,
      priority,
      progress: 0,
      health: "on_track",
      teamMembers,
    });
    revalidatePath("/projects");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[actions/projects] createProject", error);
    return { success: false, error: "Failed to create project. Please try again." };
  }

  redirect(`/projects/${id}`);
}

// ── updateProject ─────────────────────────────────────────────────────────────

type UpdateProjectInput = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: Priority;
  teamMembers: string[];
};

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_EDIT_PROJECT.includes(session.user.role as (typeof CAN_EDIT_PROJECT)[number]))
    return { success: false, error: "Only owners, team leads, and project managers can edit projects." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  const { name, description, startDate, endDate, priority, teamMembers } = input;

  if (!name.trim()) return { success: false, error: "Project name is required." };
  if (!description.trim()) return { success: false, error: "Description is required." };
  if (!startDate) return { success: false, error: "Start date is required." };
  if (!endDate) return { success: false, error: "End date is required." };
  if (new Date(endDate) <= new Date(startDate))
    return { success: false, error: "End date must be after start date." };
  if (!VALID_PRIORITIES.includes(priority))
    return { success: false, error: "Invalid priority." };

  try {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)));
    if (!existing) return { success: false, error: "Project not found." };

    if (teamMembers.length > 0) {
      const validMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.organizationId, orgId), inArray(organizationMembers.userId, teamMembers)));
      const validIds = new Set(validMembers.map((m) => m.userId));
      const invalid = teamMembers.filter((id) => !validIds.has(id));
      if (invalid.length > 0)
        return { success: false, error: "One or more selected team members are not in your organization." };
    }

    await db.update(projects)
      .set({ name: name.trim(), description: description.trim(), startDate, endDate, priority, teamMembers })
      .where(eq(projects.id, projectId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId,
      organizationId: orgId,
      message: `${session.user.name} updated project ${name.trim()}`,
      createdAt: new Date(),
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/my-work");
  } catch (error) {
    console.error("[actions/projects] updateProject", error);
    return { success: false, error: "Failed to update project. Please try again." };
  }

  return { success: true };
}

// ── deleteProject ─────────────────────────────────────────────────────────────

export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_DELETE_PROJECT.includes(session.user.role as (typeof CAN_DELETE_PROJECT)[number]))
    return { success: false, error: "Only owners and project managers can delete projects." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)));
    if (!existing) return { success: false, error: "Project not found." };

    await db.delete(projects).where(eq(projects.id, projectId));
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/my-work");
  } catch (error) {
    console.error("[actions/projects] deleteProject", error);
    return { success: false, error: "Failed to delete project. Please try again." };
  }

  return { success: true };
}
