import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { modules, projects, account } from "@/lib/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { Navbar } from "@/components/dashboard/Navbar";
import { ProfileForm } from "@/components/profile/ProfileForm";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const currentUser = session.user;

  // Owned modules with project names
  const ownedModules = await db
    .select({
      id: modules.id,
      name: modules.name,
      projectId: modules.projectId,
      progress: modules.progress,
      status: modules.status,
    })
    .from(modules)
    .where(eq(modules.assignedDeveloperId, currentUser.id))
    .orderBy(asc(modules.createdAt));

  const projectIds = [...new Set(ownedModules.map((m) => m.projectId))];
  const projectRows =
    projectIds.length > 0
      ? await db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(inArray(projects.id, projectIds))
      : [];

  const projectNameMap = Object.fromEntries(projectRows.map((p) => [p.id, p.name]));

  const ownedModuleRows = ownedModules.map((m) => ({
    id: m.id,
    name: m.name,
    projectName: projectNameMap[m.projectId] ?? "Unknown Project",
    progress: m.progress,
    status: m.status,
  }));

  // Which OAuth providers are connected
  const connectedAccounts = await db
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, currentUser.id));

  const connectedProviders = new Set(connectedAccounts.map((a) => a.providerId));

  const accountSummary = [
    { provider: "google" as const, connected: connectedProviders.has("google") },
    { provider: "github" as const, connected: connectedProviders.has("github") },
  ];

  const isOwner = currentUser.role === "owner";
  const memberRole = (
    isOwner || !currentUser.role || currentUser.role === "owner"
      ? "developer"
      : currentUser.role
  ) as "developer" | "team_lead" | "project_manager";

  // Owners display as project_manager in the Navbar (closest permission tier)
  const navbarRole = isOwner ? "project_manager" : memberRole;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={navbarRole} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold leading-tight text-foreground">
            Profile &amp; settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your identity, role, and notification preferences.
          </p>
        </div>

        <ProfileForm
          initialName={currentUser.name}
          email={currentUser.email}
          initialRole={memberRole}
          initials={getInitials(currentUser.name)}
          ownedModules={ownedModuleRows}
          connectedAccounts={accountSummary}
          isOwner={isOwner}
        />
      </main>
    </div>
  );
}
