import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { Navbar } from "@/components/dashboard/Navbar";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";

export default async function NewProjectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const currentUser = session.user;

  // Fetch all workspace users to populate the team selector
  const allUsers = await db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .orderBy(user.name);

  const teamOptions = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role ?? "developer",
  }));

  // Today's date in YYYY-MM-DD for the date input default
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">←</span> Back to dashboard
        </Link>

        {/* Page header */}
        <div className="mt-4">
          <h1 className="text-[32px] font-bold leading-tight text-foreground">
            Create a new project
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set scope, dates, and team. You can add modules right after.
          </p>
        </div>

        {/* Form */}
        <div className="mt-6">
          <CreateProjectForm
            currentUserId={currentUser.id}
            teamOptions={teamOptions}
            today={today}
          />
        </div>
      </main>
    </div>
  );
}
