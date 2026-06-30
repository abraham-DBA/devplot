"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { projects, organizationMembers } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { and, eq, inArray } from "drizzle-orm";

const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;
type Priority = "low" | "medium" | "high" | "critical";

const CAN_CREATE_PROJECT = ["owner", "team_lead", "project_manager"] as const;

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
