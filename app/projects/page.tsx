import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, modules, blockerLogs, user } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { Navbar } from "@/components/dashboard/Navbar";
import { ProjectsClient } from "@/components/projects/ProjectsClient";

export default async function ProjectsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const currentUser = session.user;

  // Fetch all projects
  const allProjects = await db.select().from(projects).orderBy(projects.createdAt);

  // Fetch all modules (for counts)
  const allModules = await db.select().from(modules);

  // Fetch all unresolved blockers
  const activeBlockers = await db
    .select()
    .from(blockerLogs)
    .where(eq(blockerLogs.resolved, false));

  // Collect all unique team member IDs across all projects
  const allMemberIds = [
    ...new Set(allProjects.flatMap((p) => p.teamMembers as string[])),
  ];

  // Fetch only the users referenced as team members
  const teamUsers =
    allMemberIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, allMemberIds))
      : [];
  const userNameMap = Object.fromEntries(teamUsers.map((u) => [u.id, u.name]));

  // Build module counts per project
  const modulesByProject = allModules.reduce<Record<string, typeof allModules>>(
    (acc, mod) => {
      if (!acc[mod.projectId]) acc[mod.projectId] = [];
      acc[mod.projectId].push(mod);
      return acc;
    },
    {},
  );

  // Build blocker counts per project (via module → project)
  const moduleProjectMap = allModules.reduce<Record<string, string>>((acc, mod) => {
    acc[mod.id] = mod.projectId;
    return acc;
  }, {});

  const blockerCountByProject = activeBlockers.reduce<Record<string, number>>(
    (acc, b) => {
      const projectId = moduleProjectMap[b.moduleId];
      if (projectId) acc[projectId] = (acc[projectId] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const totalModules = allModules.length;

  // Shape data — resolve team member IDs to name strings for avatar initials
  const projectRows = allProjects.map((p) => {
    const mods = modulesByProject[p.id] ?? [];
    const completedModules = mods.filter((m) => m.status === "completed").length;
    const memberIds = p.teamMembers as string[];
    const memberNames = memberIds
      .map((id) => userNameMap[id])
      .filter((name): name is string => !!name);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      health: p.health,
      progress: p.progress,
      priority: p.priority,
      modulesCompleted: completedModules,
      totalModules: mods.length,
      blockerCount: blockerCountByProject[p.id] ?? 0,
      endDate: p.endDate,
      teamMembers: memberNames, // names, not IDs
    };
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <ProjectsClient projects={projectRows} totalModules={totalModules} userRole={currentUser.role ?? "developer"} />
      </main>
    </div>
  );
}
