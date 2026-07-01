"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { modules, activityLogs, blockerLogs, projects, moduleDependencies } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { and, eq, inArray } from "drizzle-orm";
import { calculateProjectHealth, calculateProjectProgress } from "@/lib/health";
import { computeAtRiskModules } from "@/lib/dependency-risk";
import { MODULE_LEAD_ROLES } from "@/lib/roles";
import type { BlockerType } from "@/lib/blocker-types";

const VALID_STATUSES = ["not_started", "in_progress", "review", "blocked", "completed"] as const;
type ModuleStatus = (typeof VALID_STATUSES)[number];

// ── Note type stored in technicalNotes JSON ──────────────────────────────────

export type NoteEntry = {
  id: string;
  type: "technical" | "implementation" | "schema" | "api" | "review";
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
  dependsOnModuleIds?: string[];
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

  const { projectId, name, description, assignedDeveloperId, deadline, status, progress, dependsOnModuleIds = [] } = input;

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

  // Don't trust the client's filtered dropdown alone — confirm every selected
  // dependency actually belongs to this project before linking to it.
  if (dependsOnModuleIds.length > 0) {
    const validDeps = await db
      .select({ id: modules.id })
      .from(modules)
      .where(and(inArray(modules.id, dependsOnModuleIds), eq(modules.projectId, projectId)));
    if (validDeps.length !== dependsOnModuleIds.length) {
      return { success: false, error: "One or more selected dependencies are not in this project." };
    }
  }

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

    if (dependsOnModuleIds.length > 0) {
      await db.insert(moduleDependencies).values(
        dependsOnModuleIds.map((dependsOnModuleId) => ({
          id: crypto.randomUUID(),
          moduleId: id,
          dependsOnModuleId,
          createdAt: new Date(),
        })),
      );
    }

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

    // A completed module is locked — reopening isn't a silent slider drag,
    // it has to go through an explicit, audited path (not built yet).
    if (mod.status === "completed") {
      return { success: false, error: "This module is completed and locked from further edits." };
    }

    await db.update(modules)
      .set({ progress, status, updatedAt: new Date() })
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
  type: BlockerType,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!description.trim()) return { success: false, error: "Blocker description is required." };
  if (type !== "internal_dependency" && type !== "external")
    return { success: false, error: "Invalid blocker type." };

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
      type,
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

// ── approveModule / requestChanges ───────────────────────────────────────────

// Reviewer must NOT be the assignee, even if they also hold a privileged role —
// unlike updateModuleProgress/resolveBlocker's isAssignee||isPrivileged pattern,
// approval requires someone other than the person who did the work to sign off.
function getReviewEligibility(mod: { status: string; assignedDeveloperId: string }, session: { user: { id: string; role: string | null } }) {
  if (mod.status !== "review") {
    return { eligible: false, error: "Module must be in review before it can be approved." };
  }
  const isPrivileged = MODULE_LEAD_ROLES.includes(session.user.role ?? "");
  const isAssignee = mod.assignedDeveloperId === session.user.id;
  if (!isPrivileged || isAssignee) {
    return {
      eligible: false,
      error: "Only a lead/PM/owner who isn't the assignee can review this module.",
    };
  }
  return { eligible: true as const };
}

export async function approveModule(moduleId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const mod = await getOrgScopedModule(moduleId, orgId);
    if (!mod) return { success: false, error: "Module not found." };

    const eligibility = getReviewEligibility(mod, session);
    if (!eligibility.eligible) return { success: false, error: eligibility.error };

    const openBlockers = await db
      .select({ id: blockerLogs.id })
      .from(blockerLogs)
      .where(and(eq(blockerLogs.moduleId, moduleId), eq(blockerLogs.resolved, false)));
    if (openBlockers.length > 0) {
      return { success: false, error: "Cannot approve a module with unresolved blockers. Resolve them first." };
    }

    await db.update(modules)
      .set({ status: "completed", progress: 100 })
      .where(eq(modules.id, moduleId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: mod.projectId,
      organizationId: orgId,
      message: `${session.user.name} approved ${mod.name} — module marked complete`,
      createdAt: new Date(),
    });

    await recalculateProjectHealth(mod.projectId);

    revalidatePath(`/projects/${mod.projectId}/modules/${moduleId}`);
    revalidatePath(`/projects/${mod.projectId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[actions/modules] approveModule", error);
    return { success: false, error: "Failed to approve module. Please try again." };
  }
}

export async function requestChanges(
  moduleId: string,
  comment: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  if (!comment.trim()) return { success: false, error: "Please explain what needs to change." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const mod = await getOrgScopedModule(moduleId, orgId);
    if (!mod) return { success: false, error: "Module not found." };

    const eligibility = getReviewEligibility(mod, session);
    if (!eligibility.eligible) return { success: false, error: eligibility.error };

    const existing = parseNotes(mod.technicalNotes);
    const newNote: NoteEntry = {
      id: crypto.randomUUID(),
      type: "review",
      title: "Changes requested",
      body: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...existing, newNote];

    await db.update(modules)
      .set({ status: "in_progress", technicalNotes: JSON.stringify(updated) })
      .where(eq(modules.id, moduleId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: mod.projectId,
      organizationId: orgId,
      message: `${session.user.name} requested changes on ${mod.name}`,
      createdAt: new Date(),
    });

    await recalculateProjectHealth(mod.projectId);

    revalidatePath(`/projects/${mod.projectId}/modules/${moduleId}`);
    revalidatePath(`/projects/${mod.projectId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[actions/modules] requestChanges", error);
    return { success: false, error: "Failed to request changes. Please try again." };
  }
}

// ── addDependency / removeDependency ─────────────────────────────────────────

// Declaring "Billing depends on Auth" is an architecture decision, not a
// day-to-day execution one — unlike progress updates or blocker resolution,
// this is restricted to the same role set that can create modules, with no
// assignee carve-out.
const DEPENDENCY_MANAGER_ROLES = CAN_MANAGE_MODULES;

// Walks the existing "depends on" graph from dependsOnModuleId — if that walk
// ever reaches moduleId, then dependsOnModuleId already (transitively)
// depends on moduleId, so adding moduleId -> dependsOnModuleId would close a
// cycle. Small per-project N, so an in-memory BFS beats a recursive SQL CTE.
async function wouldCreateCycle(
  projectId: string,
  moduleId: string,
  dependsOnModuleId: string,
): Promise<boolean> {
  const projectModules = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.projectId, projectId));
  const projectModuleIds = projectModules.map((m) => m.id);

  const edges =
    projectModuleIds.length > 0
      ? await db
          .select({ moduleId: moduleDependencies.moduleId, dependsOnModuleId: moduleDependencies.dependsOnModuleId })
          .from(moduleDependencies)
          .where(inArray(moduleDependencies.moduleId, projectModuleIds))
      : [];

  const dependsOnMap = new Map<string, string[]>();
  for (const edge of edges) {
    const list = dependsOnMap.get(edge.moduleId) ?? [];
    list.push(edge.dependsOnModuleId);
    dependsOnMap.set(edge.moduleId, list);
  }

  const visited = new Set<string>();
  const queue = [dependsOnModuleId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === moduleId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(dependsOnMap.get(current) ?? []));
  }
  return false;
}

export async function addDependency(
  moduleId: string,
  dependsOnModuleId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!DEPENDENCY_MANAGER_ROLES.includes(session.user.role as (typeof DEPENDENCY_MANAGER_ROLES)[number]))
    return { success: false, error: "Only owners, team leads, and project managers can manage dependencies." };

  if (moduleId === dependsOnModuleId) {
    return { success: false, error: "A module cannot depend on itself." };
  }

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const mod = await getOrgScopedModule(moduleId, orgId);
    if (!mod) return { success: false, error: "Module not found." };
    const dependency = await getOrgScopedModule(dependsOnModuleId, orgId);
    if (!dependency) return { success: false, error: "Dependency module not found." };

    if (mod.projectId !== dependency.projectId) {
      return { success: false, error: "Modules must belong to the same project to declare a dependency." };
    }

    const existing = await db
      .select({ id: moduleDependencies.id })
      .from(moduleDependencies)
      .where(
        and(
          eq(moduleDependencies.moduleId, moduleId),
          eq(moduleDependencies.dependsOnModuleId, dependsOnModuleId),
        ),
      );
    if (existing.length > 0) {
      return { success: false, error: "This dependency already exists." };
    }

    if (await wouldCreateCycle(mod.projectId, moduleId, dependsOnModuleId)) {
      return { success: false, error: "This would create a circular dependency." };
    }

    await db.insert(moduleDependencies).values({
      id: crypto.randomUUID(),
      moduleId,
      dependsOnModuleId,
      createdAt: new Date(),
    });

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: mod.projectId,
      organizationId: orgId,
      message: `${session.user.name} marked ${mod.name} as depending on ${dependency.name}`,
      createdAt: new Date(),
    });

    // A new edge can immediately put a module at risk (e.g. linking onto an
    // already-overdue module) — the project's computed health needs to
    // reflect that right away, not wait for some unrelated module mutation.
    await recalculateProjectHealth(mod.projectId);

    revalidatePath(`/projects/${mod.projectId}/modules/${moduleId}`);
    revalidatePath(`/projects/${mod.projectId}/modules/${dependsOnModuleId}`);
    revalidatePath(`/projects/${mod.projectId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[actions/modules] addDependency", error);
    return { success: false, error: "Failed to add dependency. Please try again." };
  }
}

export async function removeDependency(dependencyId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (!DEPENDENCY_MANAGER_ROLES.includes(session.user.role as (typeof DEPENDENCY_MANAGER_ROLES)[number]))
    return { success: false, error: "Only owners, team leads, and project managers can manage dependencies." };

  const orgId = session.user.organizationId;
  if (!orgId) return { success: false, error: "No organization found." };

  try {
    const [dep] = await db
      .select({
        id: moduleDependencies.id,
        moduleId: moduleDependencies.moduleId,
        dependsOnModuleId: moduleDependencies.dependsOnModuleId,
        projectId: modules.projectId,
        moduleName: modules.name,
      })
      .from(moduleDependencies)
      .innerJoin(modules, eq(moduleDependencies.moduleId, modules.id))
      .innerJoin(projects, eq(modules.projectId, projects.id))
      .where(and(eq(moduleDependencies.id, dependencyId), eq(projects.organizationId, orgId)));

    if (!dep) return { success: false, error: "Dependency not found." };

    await db.delete(moduleDependencies).where(eq(moduleDependencies.id, dependencyId));

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      projectId: dep.projectId,
      organizationId: orgId,
      message: `${session.user.name} removed a dependency from ${dep.moduleName}`,
      createdAt: new Date(),
    });

    // Removing the edge that was the only thing keeping a module at risk
    // should clear that risk immediately, same reasoning as addDependency.
    await recalculateProjectHealth(dep.projectId);

    revalidatePath(`/projects/${dep.projectId}/modules/${dep.moduleId}`);
    revalidatePath(`/projects/${dep.projectId}/modules/${dep.dependsOnModuleId}`);
    revalidatePath(`/projects/${dep.projectId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[actions/modules] removeDependency", error);
    return { success: false, error: "Failed to remove dependency. Please try again." };
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
    .select({ id: modules.id, progress: modules.progress, status: modules.status, deadline: modules.deadline })
    .from(modules)
    .where(eq(modules.projectId, projectId));

  const moduleIds = allModules.map((m) => m.id);
  const edges =
    moduleIds.length > 0
      ? await db
          .select({ moduleId: moduleDependencies.moduleId, dependsOnModuleId: moduleDependencies.dependsOnModuleId })
          .from(moduleDependencies)
          .where(inArray(moduleDependencies.moduleId, moduleIds))
      : [];

  const newProgress = calculateProjectProgress(allModules.map((m) => m.progress));
  const hasBlockedModule = allModules.some((m) => m.status === "blocked");
  const atRiskModuleIds = computeAtRiskModules(allModules, edges);
  const newHealth = calculateProjectHealth({
    startDate: project.startDate,
    endDate: project.endDate,
    progress: newProgress,
    hasBlockedModule,
    hasDependencyRisk: atRiskModuleIds.size > 0,
  });

  await db.update(projects)
    .set({ progress: newProgress, health: newHealth })
    .where(eq(projects.id, projectId));
}
