import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { projects, organizationMembers, user } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-types";
import { Navbar } from "@/components/dashboard/Navbar";
import { EditProjectForm } from "@/components/projects/EditProjectForm";

const CAN_EDIT = ["owner", "team_lead", "project_manager"];

export default async function EditProjectPage({
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
  if (!CAN_EDIT.includes(currentUser.role ?? "")) redirect(`/projects/${id}`);

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
  if (!project) notFound();

  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));

  const memberIds = members.map((m) => m.userId);
  const orgUsers =
    memberIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name, role: user.role })
          .from(user)
          .where(inArray(user.id, memberIds))
          .orderBy(user.name)
      : [];

  const teamOptions = orgUsers.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role ?? "developer",
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">←</span> Back to project
        </Link>

        <div className="mt-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {project.name}
          </p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground">Edit project</h1>
        </div>

        <div className="mt-6">
          <EditProjectForm
            projectId={id}
            currentUserId={currentUser.id}
            teamOptions={teamOptions}
            initialValues={{
              name: project.name,
              description: project.description,
              startDate: project.startDate,
              endDate: project.endDate,
              priority: project.priority,
              teamMembers: project.teamMembers as string[],
            }}
          />
        </div>
      </main>
    </div>
  );
}
