import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { modules, projects, moduleDependencies, organizationMembers, user } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-types";
import { Navbar } from "@/components/dashboard/Navbar";
import { MyModulesList } from "@/components/my-work/MyModulesList";
import { TeamPulse } from "@/components/my-work/TeamPulse";
import { computeModuleBadges, computeTeamPulse } from "@/lib/module-status";
import { computeAtRiskModules } from "@/lib/dependency-risk";
import { MODULE_LEAD_ROLES } from "@/lib/roles";

function urgencyTier(badges: { overdue: boolean; blocked: boolean; stale: boolean }, atRisk: boolean): number {
  if (badges.overdue) return 0;
  if (badges.blocked) return 1;
  if (badges.stale) return 2;
  if (atRisk) return 3;
  return 4;
}

export default async function MyWorkPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const currentUser: SessionUser = session.user;
  const orgId = currentUser.organizationId;
  if (!orgId) redirect("/onboarding");

  // Fetch my assigned modules, org-scoped via project join
  const myModules = await db
    .select({
      id: modules.id,
      name: modules.name,
      description: modules.description,
      status: modules.status,
      progress: modules.progress,
      deadline: modules.deadline,
      updatedAt: modules.updatedAt,
      projectId: modules.projectId,
      projectName: projects.name,
    })
    .from(modules)
    .innerJoin(projects, eq(modules.projectId, projects.id))
    .where(and(eq(modules.assignedDeveloperId, currentUser.id), eq(projects.organizationId, orgId)));

  // computeAtRiskModules needs all siblings in the project, not just my modules.
  // Fetch the full sibling set for every project I'm involved in.
  const myProjectIds = [...new Set(myModules.map((m) => m.projectId))];
  const siblingEdges =
    myProjectIds.length > 0
      ? await db
          .select({
            moduleId: moduleDependencies.moduleId,
            dependsOnModuleId: moduleDependencies.dependsOnModuleId,
            projectId: modules.projectId,
          })
          .from(moduleDependencies)
          .innerJoin(modules, eq(moduleDependencies.moduleId, modules.id))
          .where(inArray(modules.projectId, myProjectIds))
      : [];

  // Sibling modules (full project set) for at-risk computation
  const siblingModules =
    myProjectIds.length > 0
      ? await db
          .select({ id: modules.id, status: modules.status, deadline: modules.deadline, projectId: modules.projectId })
          .from(modules)
          .where(inArray(modules.projectId, myProjectIds))
      : [];

  // Per-project at-risk set
  const atRiskModuleIds = new Set<string>();
  for (const projectId of myProjectIds) {
    const projectMods = siblingModules.filter((m) => m.projectId === projectId);
    const projectEdges = siblingEdges
      .filter((e) => e.projectId === projectId)
      .map((e) => ({ moduleId: e.moduleId, dependsOnModuleId: e.dependsOnModuleId }));
    for (const id of computeAtRiskModules(projectMods, projectEdges)) {
      atRiskModuleIds.add(id);
    }
  }

  // Compute badges and urgency, then sort
  const nowMs = new Date().getTime();
  const rows = myModules
    .map((mod) => {
      const updatedAt = mod.updatedAt.toISOString();
      const badges = computeModuleBadges({ id: mod.id, status: mod.status, deadline: mod.deadline, updatedAt });
      const atRisk = atRiskModuleIds.has(mod.id);
      const tier = urgencyTier(badges, atRisk);
      const daysLeft = Math.ceil((new Date(mod.deadline).getTime() - nowMs) / (1000 * 60 * 60 * 24));
      return { ...mod, updatedAt, badges, atRisk, tier, daysLeft };
    })
    .sort((a, b) => a.tier - b.tier || a.daysLeft - b.daysLeft);

  // Team Pulse — only fetched for leads/PMs/owners
  const canViewPulse = MODULE_LEAD_ROLES.includes(currentUser.role ?? "");
  let pulseRows: Awaited<ReturnType<typeof computeTeamPulse>> = [];

  if (canViewPulse) {
    const orgMemberIds = (
      await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, orgId))
    ).map((m) => m.userId);

    const memberUsers =
      orgMemberIds.length > 0
        ? await db
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, orgMemberIds))
        : [];

    const allProjectIds = (
      await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, orgId))
    ).map((p) => p.id);

    const orgModules =
      allProjectIds.length > 0
        ? await db
            .select({ assignedDeveloperId: modules.assignedDeveloperId, updatedAt: modules.updatedAt })
            .from(modules)
            .where(inArray(modules.projectId, allProjectIds))
        : [];

    pulseRows = computeTeamPulse(
      memberUsers.map((u) => ({ userId: u.id, name: u.name })),
      orgModules.map((m) => ({
        assignedDeveloperId: m.assignedDeveloperId,
        updatedAt: m.updatedAt.toISOString(),
      })),
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">

        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Personal workspace
          </p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground">My Work</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modules assigned to you, sorted by urgency.
          </p>
        </div>

        <div className="mt-6">
          <MyModulesList modules={rows} />
        </div>

        {canViewPulse && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">Team Pulse</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Who updated their module progress in the last 7 days.
            </p>
            <div className="mt-4">
              <TeamPulse rows={pulseRows} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
