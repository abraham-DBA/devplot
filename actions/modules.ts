"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { modules, activityLogs, blockerLogs, projects } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { calculateProjectHealth, calculateProjectProgress } from "@/lib/health";

const VALID_STATUSES = ["not_started", "in_progress", "review", "blocked", "completed"] as const;
type ModuleStatus = (typeof VALID_STATUSES)[number];

// Shared eligibility for module-level mutations that should be restricted to
// the assignee or a lead/PM/owner — progress updates and blocker resolution.
const MODULE_LEAD_ROLES = ["team_lead", "project_manager", "owner"];

// ── Note type stored in technicalNotes JSON ──────────────────────────────────

export type NoteEntry = {
  id: string;
  type: "technical" | "implementation" | "schema" | "api";
  title: string;
  body: string;
  createdAt: string;
};

function parseNotes(raw: string): NoteEntry[] {
  if (!raw || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── createModule ─────────────────────────────────────────────────────────────

type CreateModuleInput = {
  projectId: string;
  name: string;
  description: string;
  assignedDeveloperId: string;
  deadline: string;
  status: ModuleStatus;
  progress: number;
};

const CAN_MANAGE_MODULES = ["owner", "team_lead", "project_manager"] as const;

export async function createModule(
  input: CreateModuleInput,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!CAN_MANAGE_MODULES.includes(session.user.role as (typeof CAN_MANAGE_MODULES)[number]))
    return { success: false, error: "Only team leads and project managers can create modules." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  const { projectId, name, description, assignedDeveloperId, deadline, status, progress } = input;

  if (!name.trim()) return { success: false, error: "Module name is required." };
  if (!description.trim()) return { success: false, error: "Description is required." };
  if (!assignedDeveloperId) return { success: false, error: "Owner is required." };
  if (!deadline) return { success: false, error: "Deadline is required." };
  if (!VALID_STATUSES.includes(status)) return { success: false, error: "Invalid status." };
  if (progress < 0 || progress > 100) return { success: false, error: "Progress must be 0–100." };

  // Verify project belongs to this org
  const [proj] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!proj || proj.organizationId !== orgId) return { success: false, error: "Project not found." };

  const id = crypto.randomUUID();

  try {
    await db.insert(modules).values({
      id,
      projectId,
      name: name.trim(),
      description: description.trim(),
      assignedDeveloperId,
      deadline,
      status,
      progress,
      technicalNotes: "",
      createdAt: new Date(),
    });

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId,
      organizationId: orgId,
      message: `${session.user.name} created module ${name.trim()}`,
      createdAt: new Date(),
    });

    await recalculateProjectHealth(projectId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[actions/modules] createModule", error);
    return { success: false, error: "Failed to create module. Please try again." };
  }

  redirect(`/projects/${projectId}`);
}

// ── updateModuleProgress ─────────────────────────────────────────────────────

export async function updateModuleProgress(
  moduleId: string,
  progress: number,
  status: ModuleStatus,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (progress < 0 || progress > 100) return { success: false, error: "Progress must be 0–100." };
  if (!VALID_STATUSES.includes(status)) return { success: false, error: "Invalid status." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const mod = await getOrgScopedModule(moduleId, orgId);
    if (!mod) return { success: false, error: "Module not found." };

    const isAssignee = mod.assignedDeveloperId === session.user.id;
    const isPrivileged = MODULE_LEAD_ROLES.includes(session.user.role ?? "");
    if (!isAssignee && !isPrivileged) {
      return {
        success: false,
        error: "Only the assigned developer or a lead/PM/owner can update this module's progress.",
      };
    }

    await db.update(modules)
      .set({ progress, status })
      .where(eq(modules.id, moduleId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: mod.projectId,
      organizationId: orgId,
      message: `${session.user.name} updated progress to ${progress}% on ${mod.name}`,
      createdAt: new Date(),
    });

    await recalculateProjectHealth(mod.projectId);

    revalidatePath(`/projects/${mod.projectId}/modules/${moduleId}`);
    revalidatePath(`/projects/${mod.projectId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[actions/modules] updateModuleProgress", error);
    return { success: false, error: "Failed to update progress. Please try again." };
  }
}

// ── addNote ──────────────────────────────────────────────────────────────────

export async function addNote(
  moduleId: string,
  note: { type: NoteEntry["type"]; title: string; body: string },
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!note.title.trim()) return { success: false, error: "Note title is required." };
  if (!note.body.trim()) return { success: false, error: "Note body is required." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const mod = await getOrgScopedModule(moduleId, orgId);
    if (!mod) return { success: false, error: "Module not found." };

    const existing = parseNotes(mod.technicalNotes);
    const newNote: NoteEntry = {
      id: crypto.randomUUID(),
      type: note.type,
      title: note.title.trim(),
      body: note.body.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...existing, newNote];

    await db.update(modules)
      .set({ technicalNotes: JSON.stringify(updated) })
      .where(eq(modules.id, moduleId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: mod.projectId,
      organizationId: orgId,
      message: `${session.user.name} added technical note to module`,
      createdAt: new Date(),
    });

    revalidatePath(`/projects/${mod.projectId}/modules/${moduleId}`);
    return { success: true };
  } catch (error) {
    console.error("[actions/modules] addNote", error);
    return { success: false, error: "Failed to save note. Please try again." };
  }
}

// ── reportBlocker ─────────────────────────────────────────────────────────────

export async function reportBlocker(
  moduleId: string,
  description: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!description.trim()) return { success: false, error: "Blocker description is required." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const mod = await getOrgScopedModule(moduleId, orgId);
    if (!mod) return { success: false, error: "Module not found." };

    await db.insert(blockerLogs).values({
      id: crypto.randomUUID(),
      moduleId,
      reportedBy: session.user.id,
      description: description.trim(),
      resolved: false,
      createdAt: new Date(),
    });

    // Set module status to blocked
    await db.update(modules)
      .set({ status: "blocked" })
      .where(eq(modules.id, moduleId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: mod.projectId,
      organizationId: orgId,
      message: `${session.user.name} flagged blocker on ${mod.name}`,
      createdAt: new Date(),
    });

    await recalculateProjectHealth(mod.projectId);

    revalidatePath(`/projects/${mod.projectId}/modules/${moduleId}`);
    revalidatePath(`/projects/${mod.projectId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[actions/modules] reportBlocker", error);
    return { success: false, error: "Failed to report blocker. Please try again." };
  }
}

// ── resolveBlocker ────────────────────────────────────────────────────────────

export async function resolveBlocker(blockerId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const [blocker] = await db
      .select({
        id: blockerLogs.id,
        moduleId: blockerLogs.moduleId,
        moduleName: modules.name,
        moduleStatus: modules.status,
        assignedDeveloperId: modules.assignedDeveloperId,
        projectId: modules.projectId,
      })
      .from(blockerLogs)
      .innerJoin(modules, eq(blockerLogs.moduleId, modules.id))
      .innerJoin(projects, eq(modules.projectId, projects.id))
      .where(and(eq(blockerLogs.id, blockerId), eq(projects.organizationId, orgId)));

    if (!blocker) return { success: false, error: "Blocker not found." };

    const isAssignee = blocker.assignedDeveloperId === session.user.id;
    const isPrivileged = MODULE_LEAD_ROLES.includes(session.user.role ?? "");
    if (!isAssignee && !isPrivileged) {
      return {
        success: false,
        error: "Only the assigned developer or a lead/PM/owner can resolve this blocker.",
      };
    }

    await db.update(blockerLogs)
      .set({ resolved: true })
      .where(eq(blockerLogs.id, blockerId));

    // Only move the module off "blocked" if this was the last open blocker — and
    // only if status is still "blocked" (don't clobber a manually-set status).
    const remainingOpen = await db
      .select({ id: blockerLogs.id })
      .from(blockerLogs)
      .where(and(eq(blockerLogs.moduleId, blocker.moduleId), eq(blockerLogs.resolved, false)));

    if (remainingOpen.length === 0 && blocker.moduleStatus === "blocked") {
      await db.update(modules)
        .set({ status: "in_progress" })
        .where(eq(modules.id, blocker.moduleId));
    }

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: blocker.projectId,
      organizationId: orgId,
      message: `${session.user.name} resolved a blocker on ${blocker.moduleName}`,
      createdAt: new Date(),
    });

    await recalculateProjectHealth(blocker.projectId);

    revalidatePath(`/projects/${blocker.projectId}/modules/${blocker.moduleId}`);
    revalidatePath(`/projects/${blocker.projectId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[actions/modules] resolveBlocker", error);
    return { success: false, error: "Failed to resolve blocker. Please try again." };
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

// Verifies the module's parent project belongs to the caller's org before any
// mutation touches it — without this, a module ID from another org (leaked via
// logs, a shared link, or simple guessing) could be mutated by anyone authenticated.
async function getOrgScopedModule(moduleId: string, orgId: string) {
  const [mod] = await db
    .select({
      id: modules.id,
      projectId: modules.projectId,
      name: modules.name,
      status: modules.status,
      assignedDeveloperId: modules.assignedDeveloperId,
      technicalNotes: modules.technicalNotes,
    })
    .from(modules)
    .innerJoin(projects, eq(modules.projectId, projects.id))
    .where(and(eq(modules.id, moduleId), eq(projects.organizationId, orgId)));
  return mod;
}

async function recalculateProjectHealth(projectId: string) {
  const [project] = await db
    .select({ startDate: projects.startDate, endDate: projects.endDate })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) return;

  const allModules = await db
    .select({ progress: modules.progress, status: modules.status })
    .from(modules)
    .where(eq(modules.projectId, projectId));

  const newProgress = calculateProjectProgress(allModules.map((m) => m.progress));
  const hasBlockedModule = allModules.some((m) => m.status === "blocked");
  const newHealth = calculateProjectHealth({
    startDate: project.startDate,
    endDate: project.endDate,
    progress: newProgress,
    hasBlockedModule,
  });

  await db.update(projects)
    .set({ progress: newProgress, health: newHealth })
    .where(eq(projects.id, projectId));
}
