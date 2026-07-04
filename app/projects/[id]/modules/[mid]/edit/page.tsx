import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { projects, modules, user, milestones } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-types";
import { Navbar } from "@/components/dashboard/Navbar";
import { EditModuleForm } from "@/components/modules/EditModuleForm";

const CAN_EDIT = ["owner", "team_lead", "project_manager"];

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id, mid } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const currentUser: SessionUser = session.user;
  const orgId = currentUser.organizationId;
  if (!orgId) redirect("/onboarding");
  if (!CAN_EDIT.includes(currentUser.role ?? "")) redirect(`/projects/${id}/modules/${mid}`);

  const [project] = await db
    .select({ id: projects.id, name: projects.name, teamMembers: projects.teamMembers })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
  if (!project) notFound();

  const [mod] = await db.select().from(modules).where(eq(modules.id, mid));
  if (!mod || mod.projectId !== id) notFound();

  const memberIds = project.teamMembers as string[];
  const teamUsers =
    memberIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, memberIds))
          .orderBy(user.name)
      : [];

  const developerOptions =
    teamUsers.length > 0
      ? teamUsers
      : [{ id: currentUser.id, name: currentUser.name }];

  const projectMilestones = await db
    .select({ id: milestones.id, name: milestones.name })
    .from(milestones)
    .where(eq(milestones.projectId, id))
    .orderBy(milestones.targetDate);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">Dashboard</Link>
          <span>/</span>
          <Link href={`/projects/${id}`} className="transition-colors hover:text-foreground">{project.name}</Link>
          <span>/</span>
          <Link href={`/projects/${id}/modules/${mid}`} className="transition-colors hover:text-foreground">{mod.name}</Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Edit</span>
        </nav>

        <div className="mt-4">
          <h1 className="text-[32px] font-bold leading-tight text-foreground">Edit module</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mod.name}</p>
        </div>

        <div className="mt-6">
          <EditModuleForm
            moduleId={mid}
            projectId={id}
            developers={developerOptions}
            initialValues={{
              name: mod.name,
              description: mod.description,
              assignedDeveloperId: mod.assignedDeveloperId,
              deadline: mod.deadline,
              milestoneId: mod.milestoneId ?? null,
            }}
            milestones={projectMilestones}
          />
        </div>
      </main>
    </div>
  );
}
