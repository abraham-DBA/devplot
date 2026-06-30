import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, modules, blockerLogs, activityLogs, user } from "@/lib/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-types";
import { Navbar } from "@/components/dashboard/Navbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { BlockerBanner } from "@/components/dashboard/BlockerBanner";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { ModulesStatusChart } from "@/components/dashboard/ModulesStatusChart";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ModulesTable } from "@/components/dashboard/ModulesTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { calculateProjectHealth } from "@/lib/health";

type ModuleStatus = "not_started" | "in_progress" | "review" | "completed" | "blocked";
type ProjectHealth = "on_track" | "at_risk" | "high_risk";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

function mostRecentBlockerTime(dates: Date[]): string {
  if (dates.length === 0) return "";
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  return `Updated ${timeAgo(latest)}`;
}

function activityColor(message: string): "success" | "warning" | "muted" {
  if (message.includes("blocker") || message.includes("flagged")) return "warning";
  if (message.includes("created") || message.includes("progress")) return "success";
  return "muted";
}

// Compute drift label: positive = behind schedule, negative = ahead
function driftLabel(startDate: string, endDate: string, progress: number): { drift: string; driftSign: "positive" | "negative" } {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const totalDuration = end - start;
  if (totalDuration <= 0) return { drift: "0d", driftSign: "positive" };
  const timeUsedPct = ((now - start) / totalDuration) * 100;
  const diffPct = timeUsedPct - progress;
  const diffDays = Math.round((diffPct / 100) * ((end - start) / (1000 * 60 * 60 * 24)));
  if (diffDays > 0) return { drift: `+${diffDays}d`, driftSign: "positive" };
  return { drift: `${diffDays}d`, driftSign: "negative" };
}

function timeUsedPct(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end === start) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const currentUser: SessionUser = session.user;
  const orgId = currentUser.organizationId;
  if (!orgId) redirect("/onboarding");

  const firstName = currentUser.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // ── Fetch org projects ────────────────────────────────────────────────────

  const allProjects = await db.select().from(projects).where(eq(projects.organizationId, orgId));

  // ── Fetch all modules ─────────────────────────────────────────────────────

  const allModules = allProjects.length > 0
    ? await db.select().from(modules).where(
        inArray(modules.projectId, allProjects.map((p) => p.id))
      )
    : [];

  // ── Fetch open blockers (unresolved) ─────────────────────────────────────

  const moduleIds = allModules.map((m) => m.id);
  const allBlockers = moduleIds.length > 0
    ? await db.select().from(blockerLogs).where(
        and(inArray(blockerLogs.moduleId, moduleIds), eq(blockerLogs.resolved, false))
      )
    : [];

  // ── Fetch recent activity (last 30 entries) ───────────────────────────────

  const recentActivity = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.organizationId, orgId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(30);

  // ── Resolve user names for modules table assignees ────────────────────────

  const ownerIds = [...new Set(allModules.map((m) => m.assignedDeveloperId))];
  const ownerUsers = ownerIds.length > 0
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ownerIds))
    : [];
  const ownerNameMap = Object.fromEntries(ownerUsers.map((u) => [u.id, u.name]));

  // ── Resolve team member names for project cards ───────────────────────────

  const allMemberIds = [...new Set(allProjects.flatMap((p) => p.teamMembers as string[]))];
  const memberUsers = allMemberIds.length > 0
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, allMemberIds))
    : [];
  const memberNameMap = Object.fromEntries(memberUsers.map((u) => [u.id, u.name]));

  // ── Live project health ────────────────────────────────────────────────────
  // Recomputed here instead of trusting the stored `projects.health` column,
  // which only updates on module mutations — a project with no recent activity
  // can otherwise show a stale "on_track" badge while the detail page (already
  // live) shows the correct at_risk/high_risk. Computed once, reused for the
  // attention count, the sort order, and each ProjectCard below.

  const projectModuleMap: Record<string, typeof allModules> = {};
  for (const m of allModules) {
    if (!projectModuleMap[m.projectId]) projectModuleMap[m.projectId] = [];
    projectModuleMap[m.projectId].push(m);
  }
  const healthByProject = Object.fromEntries(
    allProjects.map((p) => {
      const mods = projectModuleMap[p.id] ?? [];
      const hasBlockedModule = mods.some((m) => m.status === "blocked");
      const health = calculateProjectHealth({
        startDate: p.startDate,
        endDate: p.endDate,
        progress: p.progress,
        hasBlockedModule,
      });
      return [p.id, health];
    }),
  );

  // ── Derived stats ─────────────────────────────────────────────────────────

  const activeProjectCount = allProjects.length;
  const needAttentionCount = allProjects.filter(
    (p) => healthByProject[p.id] === "at_risk" || healthByProject[p.id] === "high_risk"
  ).length;
  const avgProgress = allProjects.length > 0
    ? Math.round(allProjects.reduce((sum, p) => sum + p.progress, 0) / allProjects.length)
    : 0;
  const completedModuleCount = allModules.filter((m) => m.status === "completed").length;
  const openBlockerCount = allBlockers.length;

  // ── Progress chart data (one bar per project) ─────────────────────────────

  const progressChartData = allProjects.map((p) => ({
    name: p.name.split(" ")[0], // first word keeps chart labels short
    progress: p.progress,
    timeUsed: timeUsedPct(p.startDate, p.endDate),
  }));

  // ── Modules status chart data ─────────────────────────────────────────────

  const statusCounts: Record<ModuleStatus, number> = {
    not_started: 0, in_progress: 0, review: 0, blocked: 0, completed: 0,
  };
  for (const m of allModules) {
    statusCounts[m.status as ModuleStatus] = (statusCounts[m.status as ModuleStatus] ?? 0) + 1;
  }
  const moduleStatuses = [
    { key: "in_progress" as const,  label: "In Progress",  count: statusCounts.in_progress },
    { key: "review" as const,       label: "Review",       count: statusCounts.review },
    { key: "blocked" as const,      label: "Blocked",      count: statusCounts.blocked },
    { key: "not_started" as const,  label: "Not Started",  count: statusCounts.not_started },
    { key: "completed" as const,    label: "Completed",    count: statusCounts.completed },
  ].filter((s) => s.count > 0);

  // ── Activity chart: events per day for last 7 days ────────────────────────

  const activityByDay: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    activityByDay[key] = 0;
  }
  for (const log of recentActivity) {
    const key = new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in activityByDay) activityByDay[key]++;
  }
  const activityData = Object.entries(activityByDay).map(([date, count]) => ({ date, count }));

  // ── Blocker banner data ───────────────────────────────────────────────────

  const blockerModuleIds = [...new Set(allBlockers.map((b) => b.moduleId))];
  const blockerModules = blockerModuleIds.length > 0
    ? allModules.filter((m) => blockerModuleIds.includes(m.id))
    : [];
  const blockerModuleInfoMap = Object.fromEntries(
    blockerModules.map((m) => [m.id, { name: m.name, projectId: m.projectId }]),
  );

  const blockerBannerItems = allBlockers.slice(0, 4).map((b) => ({
    id: b.id,
    moduleId: b.moduleId,
    projectId: blockerModuleInfoMap[b.moduleId]?.projectId ?? "",
    moduleName: blockerModuleInfoMap[b.moduleId]?.name ?? "Unknown module",
    description: b.description,
    type: b.type,
  }));
  const blockerUpdatedLabel = mostRecentBlockerTime(allBlockers.map((b) => new Date(b.createdAt)));

  // ── Project cards (sorted: high_risk → at_risk → on_track) ───────────────

  const healthOrder: Record<ProjectHealth, number> = { high_risk: 0, at_risk: 1, on_track: 2 };
  // Build moduleId → projectId map once so blocker aggregation is O(n) not O(n²)
  const moduleProjectIdMap = Object.fromEntries(allModules.map((m) => [m.id, m.projectId]));
  const projectBlockerCountMap: Record<string, number> = {};
  for (const b of allBlockers) {
    const projectId = moduleProjectIdMap[b.moduleId];
    if (projectId) projectBlockerCountMap[projectId] = (projectBlockerCountMap[projectId] ?? 0) + 1;
  }

  const sortedProjects = [...allProjects].sort(
    (a, b) => healthOrder[healthByProject[a.id]] - healthOrder[healthByProject[b.id]]
  );

  const projectCards = sortedProjects.map((p) => {
    const mods = projectModuleMap[p.id] ?? [];
    const completedCount = mods.filter((m) => m.status === "completed").length;
    const memberIds = p.teamMembers as string[];
    const teamMembers = memberIds
      .map((id) => memberNameMap[id])
      .filter((name): name is string => !!name)
      .map((name) => ({ initials: getInitials(name) }));
    const { drift, driftSign } = driftLabel(p.startDate, p.endDate, p.progress);

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      health: healthByProject[p.id],
      progress: p.progress,
      timeUsed: timeUsedPct(p.startDate, p.endDate),
      drift,
      driftSign,
      modulesCompleted: completedCount,
      totalModules: mods.length,
      priority: p.priority,
      blockerCount: projectBlockerCountMap[p.id] ?? 0,
      dueDate: formatDueDate(p.endDate),
      teamMembers,
    };
  });

  // ── Modules table: non-completed, sorted by deadline ascending ────────────

  const activeModuleRows = allModules
    .filter((m) => m.status !== "completed")
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 8)
    .map((m) => {
      const proj = allProjects.find((p) => p.id === m.projectId);
      const nowMs = new Date().getTime();
      const daysLeft = Math.ceil((new Date(m.deadline).getTime() - nowMs) / (1000 * 60 * 60 * 24));
      return {
        id: m.id,
        projectId: m.projectId,
        name: m.name,
        projectName: proj?.name ?? "Unknown project",
        assignee: ownerNameMap[m.assignedDeveloperId] ?? "Unassigned",
        status: m.status as ModuleStatus,
        progress: m.progress,
        deadline: formatDueDate(m.deadline),
        deadlineUrgent: daysLeft <= 3,
      };
    });

  // ── Activity feed: parse messages into structured display ─────────────────

  // Activity messages are free-form strings — pass the full message as action
  // rather than splitting on whitespace (which breaks multi-word names).
  // actor and target are left empty; ActivityFeed renders action alone when actor is empty.
  const activityFeedEvents = recentActivity.slice(0, 8).map((log) => {
    const proj = allProjects.find((p) => p.id === log.projectId);
    return {
      id: log.id,
      actor: "",
      action: log.message,
      target: "",
      project: proj?.name ?? "DevFlow",
      timestamp: timeAgo(new Date(log.createdAt)),
      color: activityColor(log.message),
    };
  });

  // ── Subtitle counts ───────────────────────────────────────────────────────

  const contributorCount = allMemberIds.length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace · DevFlow
            </p>
            <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeProjectCount} project{activeProjectCount !== 1 ? "s" : ""} ·{" "}
              {allModules.length} module{allModules.length !== 1 ? "s" : ""} ·{" "}
              {contributorCount} contributor{contributorCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/projects"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
            >
              View projects
            </Link>
            {["owner", "team_lead", "project_manager"].includes(currentUser.role ?? "") && (
              <Link
                href="/projects/new"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-card transition-colors hover:bg-brand-primary"
              >
                + New project
              </Link>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Active Projects"
            value={String(activeProjectCount)}
            sub={needAttentionCount > 0 ? `${needAttentionCount} need attention` : "All on track"}
            trendColor={needAttentionCount > 0 ? "destructive" : "muted"}
          />
          <StatCard
            label="Avg. Progress"
            value={`${avgProgress}%`}
            sub="Across all projects"
            trendColor="success"
          />
          <StatCard
            label="Modules Shipped"
            value={`${completedModuleCount}/${allModules.length}`}
            sub="Completed this cycle"
          />
          <StatCard
            label="Open Blockers"
            value={String(openBlockerCount)}
            sub={openBlockerCount > 0 ? "Action required" : "No blockers"}
            trendColor={openBlockerCount > 0 ? "destructive" : "muted"}
          />
        </div>

        {/* Blocker banner — only shown when blockers exist */}
        {blockerBannerItems.length > 0 && (
          <div className="mt-4">
            <BlockerBanner blockers={blockerBannerItems} updatedLabel={blockerUpdatedLabel} />
          </div>
        )}

        {/* Charts row */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ProgressChart data={progressChartData} />
          <ModulesStatusChart total={allModules.length} statuses={moduleStatuses} />
          <ActivityChart data={activityData} />
        </div>

        {/* Projects overview */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Projects overview</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Sorted by health</p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              See all projects →
            </Link>
          </div>

          {projectCards.length === 0 ? (
            <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                {["owner", "team_lead", "project_manager"].includes(currentUser.role ?? "") ? (
                  <>No projects yet — <Link href="/projects/new" className="text-foreground underline underline-offset-2">create one</Link></>
                ) : (
                  "No projects yet."
                )}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {projectCards.map((project) => (
                <ProjectCard key={project.id} {...project} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom row — modules table + activity feed */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
          <ModulesTable modules={activeModuleRows} />
          <ActivityFeed events={activityFeedEvents} />
        </div>

      </main>
    </div>
  );
}
