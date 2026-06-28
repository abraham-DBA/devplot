"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { projects } from "@/lib/schema";
import { auth } from "@/lib/auth";

const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;
type Priority = "low" | "medium" | "high" | "critical";

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
  if (session.user.role !== "project_manager")
    return { success: false, error: "Only project managers can create projects." };

  const { name, description, startDate, endDate, priority, teamMembers } = input;

  if (!name.trim()) return { success: false, error: "Project name is required." };
  if (!description.trim()) return { success: false, error: "Description is required." };
  if (!startDate) return { success: false, error: "Start date is required." };
  if (!endDate) return { success: false, error: "End date is required." };
  if (new Date(endDate) <= new Date(startDate))
    return { success: false, error: "End date must be after start date." };
  if (!VALID_PRIORITIES.includes(priority))
    return { success: false, error: "Invalid priority." };

  const id = crypto.randomUUID();

  try {
    await db.insert(projects).values({
      id,
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
