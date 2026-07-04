import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { projects, user, modules, milestones } from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-types";
import { Navbar } from "@/components/dashboard/Navbar";
import { CreateModuleForm } from "@/components/modules/CreateModuleForm";

export default async function NewModulePage({
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

  // Confirm project exists and belongs to this org
  const [project] = await db
    .select({ id: projects.id, name: projects.name, teamMembers: projects.teamMembers })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
  if (!project) notFound();

  // Fetch team members as developer options
  const memberIds = project.teamMembers as string[];
  const teamUsers =
    memberIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, memberIds))
          .orderBy(user.name)
      : [];

  // If the project has no team members at all, the current user is the fallback owner.
  // Ensure they appear in the dropdown so the form is always submittable.
  const developerOptions =
    teamUsers.length > 0
      ? teamUsers
      : [{ id: currentUser.id, name: currentUser.name }];

  // Default deadline: 30 days from today
  const defaultDeadline = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Existing modules in this project — selectable as dependencies for the new one
  const existingModules = await db
    .select({ id: modules.id, name: modules.name })
    .from(modules)
    .where(eq(modules.projectId, id))
    .orderBy(modules.name);

  // Milestones for this project
  const projectMilestones = await db
    .select({ id: milestones.id, name: milestones.name })
    .from(milestones)
    .where(eq(milestones.projectId, id))
    .orderBy(milestones.targetDate);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">←</span> {project.name}
        </Link>

        {/* Page header */}
        <div className="mt-4">
          <h1 className="text-[32px] font-bold leading-tight text-foreground">
            Add a module
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define an ownable slice of work with a deadline and one accountable developer.
          </p>
        </div>

        {/* Form */}
        <div className="mt-6">
          <CreateModuleForm
            projectId={id}
            developers={developerOptions}
            currentUserId={currentUser.id}
            defaultDeadline={defaultDeadline}
            existingModules={existingModules}
            milestones={projectMilestones}
          />
        </div>
      </main>
    </div>
  );
}
