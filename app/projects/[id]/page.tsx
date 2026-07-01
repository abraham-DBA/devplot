import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { projects, modules, blockerLogs, activityLogs, user, moduleDependencies } from "@/lib/schema";
import { eq, inArray, desc, and } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-types";
import { Navbar } from "@/components/dashboard/Navbar";
import { ScheduleAlert } from "@/components/projects/ScheduleAlert";
import { ModulesList } from "@/components/projects/ModulesList";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import { calculateProjectHealth } from "@/lib/health";
import { computeAtRiskModules, isModuleBroken } from "@/lib/dependency-risk";

type ProjectHealth = "on_track" | "at_risk" | "high_risk";

const healthConfig: Record<ProjectHealth, { label: string; dot: string; text: string; bg: string }> = {
  on_track:  { label: "On Track",  dot: "bg-success",     text: "text-success",     bg: "bg-success-light" },
  at_risk:   { label: "At Risk",   dot: "bg-warning",     text: "text-warning",     bg: "bg-warning-light" },
  high_risk: { label: "High Risk", dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive-light" },
};

const progressBarHealthColor: Record<ProjectHealth, string> = {
  on_track:  "bg-success",
  at_risk:   "bg-warning",
  high_risk: "bg-destructive",
};

function getActivityDot(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("flagged") || lower.includes("blocker")) return "bg-destructive";
  if (lower.includes("review") || lower.includes("risk"))    return "bg-warning";
  if (lower.includes("progress") || lower.includes("completed")) return "bg-success";
  return "bg-muted-foreground";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatRole(role: string) {
  return role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const currentUser: SessionUser = session.user;
  const orgId = currentUser.organizationId;
  if (!orgId) redirect("/onboarding");

  // Fetch project — scoped to org so users can't access other orgs' projects by ID
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
  if (!project) notFound();

  // Fetch modules ordered by deadline (ascending — earliest due first)
  const projectModules = await db
    .select({
      id: modules.id,
      name: modules.name,
      description: modules.description,
      status: modules.status,
      progress: modules.progress,
      deadline: modules.deadline,
      assignedDeveloperId: modules.assignedDeveloperId,
    })
    .from(modules)
    .where(eq(modules.projectId, id))
    .orderBy(modules.deadline);

  // Fetch only the owners referenced by these modules (fix #1)
  const ownerIds = [...new Set(projectModules.map((m) => m.assignedDeveloperId))];
  const owners =
    ownerIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name, role: user.role })
          .from(user)
          .where(inArray(user.id, ownerIds))
      : [];
  const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o]));

  // Fetch active blockers for this project's modules
  const moduleIds = projectModules.map((m) => m.id);
  const projectBlockers =
    moduleIds.length > 0
      ? await db
          .select()
          .from(blockerLogs)
          .where(inArray(blockerLogs.moduleId, moduleIds))
          .then((rows) => rows.filter((b) => !b.resolved))
      : [];

  // Fetch activity logs — newest first (fix #7)
  const recentActivity = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.projectId, id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);

  // Fetch only the team members referenced in this project (fix #1)
  const teamMemberIds = project.teamMembers as string[];
  const teamMembers =
    teamMemberIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name, role: user.role })
          .from(user)
          .where(inArray(user.id, teamMemberIds))
      : [];

  // Fetch dependency edges for this project's modules
  const dependencyEdges =
    moduleIds.length > 0
      ? await db
          .select({
            id: moduleDependencies.id,
            moduleId: moduleDependencies.moduleId,
            dependsOnModuleId: moduleDependencies.dependsOnModuleId,
          })
          .from(moduleDependencies)
          .where(inArray(moduleDependencies.moduleId, moduleIds))
      : [];
  const moduleNameMap = Object.fromEntries(projectModules.map((m) => [m.id, m]));

  // ── Compute metrics ───────────────────────────────────────────────────────

  const hasBlockedModule = projectModules.some((m) => m.status === "blocked");
  const atRiskModuleIds = computeAtRiskModules(projectModules, dependencyEdges);

  const health = calculateProjectHealth({
    startDate: project.startDate,
    endDate: project.endDate,
    progress: project.progress,
    hasBlockedModule,
    hasDependencyRisk: atRiskModuleIds.size > 0,
  });

  // Time used %
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const now = new Date().getTime();
  const rawTimeUsed = ((now - start) / (end - start)) * 100;
  const timeUsed = Math.min(100, Math.max(0, Math.round(rawTimeUsed)));

  // Module breakdown
  const activeModules = projectModules.filter(
    (m) => m.status === "in_progress" || m.status === "not_started",
  ).length;
  const reviewModules = projectModules.filter((m) => m.status === "review").length;
  const doneModules   = projectModules.filter((m) => m.status === "completed").length;

  const hc = healthConfig[health];
  const progressBarColor = progressBarHealthColor[health]; // fix #3 — map is now correct for all health values

  // Priority display
  const priorityLabel =
    project.priority.charAt(0).toUpperCase() + project.priority.slice(1) + " priority";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">

        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">←</span> Dashboard
        </Link>

        {/* Page header */}
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-bold leading-tight text-foreground">
                {project.name}
              </h1>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${hc.bg} ${hc.text}`}>
                <span className={`size-1.5 rounded-full ${hc.dot}`} aria-hidden="true" />
                {hc.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{project.description}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {project.startDate} → {project.endDate}
              {" · "}
              {priorityLabel}
              {" · "}
              {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
            </p>
          </div>

          {["owner", "team_lead", "project_manager"].includes(currentUser.role ?? "") && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/projects/${id}/edit`}
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background"
              >
                Edit project
              </Link>
              {["owner", "project_manager"].includes(currentUser.role ?? "") && (
                <DeleteProjectButton projectId={id} projectName={project.name} />
              )}
              <Link
                href={`/projects/${id}/modules/new`}
                className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-card transition-colors hover:bg-brand-primary"
              >
                + Add module
              </Link>
            </div>
          )}
        </div>

        {/* Schedule alert */}
        {health !== "on_track" && (
          <div className="mt-5">
            <ScheduleAlert
              health={health}
              timeUsed={timeUsed}
              progress={project.progress}
              hasBlockedModule={hasBlockedModule}
            />
          </div>
        )}

        {/* Dependency chain */}
        {dependencyEdges.length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {dependencyEdges.map((edge) => {
              const dependent = moduleNameMap[edge.moduleId];
              const upstream = moduleNameMap[edge.dependsOnModuleId];
              const upstreamBroken = upstream ? isModuleBroken(upstream) : false;
              return (
                <div
                  key={edge.id}
                  className={[
                    "flex items-center gap-2 rounded-xl border p-4 text-sm",
                    upstreamBroken
                      ? "border-destructive/20 bg-destructive-light text-destructive"
                      : "border-border bg-card text-foreground",
                  ].join(" ")}
                >
                  <Link href={`/projects/${id}/modules/${edge.moduleId}`} className="font-semibold hover:underline">
                    {dependent?.name ?? "Unknown module"}
                  </Link>
                  <span className={upstreamBroken ? "text-destructive" : "text-muted-foreground"}>depends on</span>
                  <Link href={`/projects/${id}/modules/${edge.dependsOnModuleId}`} className="font-semibold hover:underline">
                    {upstream?.name ?? "Unknown module"}
                  </Link>
                  {upstreamBroken && (
                    <span className="ml-auto font-mono text-[10px] font-semibold uppercase tracking-wide">
                      Upstream blocked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Overall Progress */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Overall Progress
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-10 text-foreground">
              {project.progress}%
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-background">
              <div
                className={`h-1.5 rounded-full ${progressBarColor}`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* Time Used */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Time Used
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-10 text-foreground">
              {timeUsed}%
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-background">
              <div
                className="h-1.5 rounded-full bg-success"
                style={{ width: `${timeUsed}%` }}
              />
            </div>
          </div>

          {/* Modules */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Modules
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-10 text-foreground">
              {projectModules.length}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {activeModules} active · {reviewModules} review · {doneModules} done
            </p>
          </div>

          {/* Open Blockers */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Open Blockers
            </p>
            <p className={`mt-2 text-[32px] font-semibold leading-10 ${projectBlockers.length > 0 ? "text-destructive" : "text-foreground"}`}>
              {projectBlockers.length}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {projectBlockers.length > 0 ? "Needs attention" : "All clear"}
            </p>
          </div>
        </div>

        {/* Main content — two columns */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">

          {/* Left — Modules */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Modules</h2>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {projectModules.length} Total
              </span>
            </div>
            <ModulesList
              projectId={id}
              modules={projectModules.map((m) => ({
                id: m.id,
                name: m.name,
                description: m.description,
                status: m.status,
                progress: m.progress,
                ownerName: ownerMap[m.assignedDeveloperId]?.name ?? "Unknown",
                deadline: m.deadline,
                atRisk: atRiskModuleIds.has(m.id),
              }))}
            />
          </div>

          {/* Right — Team + Activity */}
          <div className="flex flex-col gap-6">

            {/* Team */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Team</h2>
              <div className="rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
                {/* Avatar stack row */}
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <div className="flex -space-x-2">
                    {teamMembers.slice(0, 5).map((m) => (
                      <span
                        key={m.id}
                        title={m.name}
                        className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-foreground text-[10px] font-bold text-card"
                      >
                        {getInitials(m.name)}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Member list */}
                <ul className="divide-y divide-border">
                  {teamMembers.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-card">
                        {getInitials(member.name)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {formatRole(member.role ?? "developer")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Activity */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Activity</h2>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {recentActivity.map((event) => {
                    const dot = getActivityDot(event.message);
                    return (
                      <li key={event.id} className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm text-foreground">{event.message}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {timeAgo(new Date(event.createdAt))}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
