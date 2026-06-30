import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { modules, projects, blockerLogs, user } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth-types";
import { Navbar } from "@/components/dashboard/Navbar";
import { ModuleDetailClient } from "@/components/modules/ModuleDetailClient";
import { ReportBlockerButton } from "@/components/modules/ReportBlockerButton";
import { BlockerList } from "@/components/modules/BlockerList";
import type { NoteEntry } from "@/actions/modules";

type ModuleStatus = "not_started" | "in_progress" | "review" | "blocked" | "completed";

const statusConfig: Record<ModuleStatus, { label: string; bg: string; text: string; border: string }> = {
  not_started: { label: "Not Started", bg: "bg-background",        text: "text-muted-foreground", border: "border-border" },
  in_progress: { label: "In Progress", bg: "bg-success-light",     text: "text-success",          border: "border-success/20" },
  review:      { label: "Review",      bg: "bg-warning-light",     text: "text-warning",          border: "border-warning/20" },
  completed:   { label: "Completed",   bg: "bg-success-light",     text: "text-success",          border: "border-success/20" },
  blocked:     { label: "Blocked",     bg: "bg-destructive-light", text: "text-destructive",      border: "border-destructive/20" },
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function deadlineStatus(deadline: string): { label: string; color: string } {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Overdue", color: "text-destructive" };
  if (daysLeft <= 3) return { label: `${daysLeft}d left`, color: "text-warning" };
  return { label: "On Track", color: "text-success" };
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatRole(role: string) {
  return role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default async function ModuleDetailPage({
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

  // Fetch project — scoped to org to prevent cross-org access via URL
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
  if (!project) notFound();

  // Fetch module — confirm it belongs to this project
  const [mod] = await db.select().from(modules).where(eq(modules.id, mid));
  if (!mod || mod.projectId !== id) notFound();

  // Fetch owner
  const [owner] = await db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(eq(user.id, mod.assignedDeveloperId));

  // Fetch all blockers for this module
  const allBlockers = await db
    .select()
    .from(blockerLogs)
    .where(eq(blockerLogs.moduleId, mid));
  const unresolvedBlockers = allBlockers.filter((b) => !b.resolved);
  const openBlockers = unresolvedBlockers.length;

  // Resolve reporter names for the open blockers list
  const reporterIds = [...new Set(unresolvedBlockers.map((b) => b.reportedBy))];
  const reporters = reporterIds.length > 0
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, reporterIds))
    : [];
  const reporterNameMap = Object.fromEntries(reporters.map((r) => [r.id, r.name]));
  const blockerListItems = unresolvedBlockers.map((b) => ({
    id: b.id,
    description: b.description,
    type: b.type,
    reporterName: reporterNameMap[b.reportedBy] ?? "Unknown",
    createdAt: b.createdAt.toISOString(),
  }));

  const notes = parseNotes(mod.technicalNotes ?? "");
  const sc = statusConfig[mod.status];
  const dl = deadlineStatus(mod.deadline);
  const canEdit =
    currentUser.id === mod.assignedDeveloperId ||
    ["team_lead", "project_manager", "owner"].includes(currentUser.role ?? "");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <Link href={`/projects/${id}`} className="transition-colors hover:text-foreground">
            {project.name}
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">{mod.name}</span>
        </nav>

        {/* Page header */}
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-bold leading-tight text-foreground">{mod.name}</h1>
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide ${sc.bg} ${sc.text} ${sc.border}`}
              >
                {sc.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{mod.description}</p>
          </div>

          {/* Report blocker — isolated client button, no SSR data needed */}
          <ReportBlockerButton moduleId={mid} />
        </div>

        {/* Two-column layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* Left — progress card + notes + open blockers */}
          <div>
            <ModuleDetailClient
              moduleId={mid}
              initialProgress={mod.progress}
              initialStatus={mod.status}
              notes={notes}
              openBlockers={openBlockers}
              totalBlockers={allBlockers.length}
              canEdit={canEdit}
            />
            <BlockerList blockers={blockerListItems} canResolve={canEdit} />
          </div>

          {/* Right — static sidebar panels */}
          <div className="flex flex-col gap-4">

            {/* Owner */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Owner
              </p>
              {owner ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-card">
                    {getInitials(owner.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{owner.name}</p>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {formatRole(owner.role ?? "developer")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Unassigned</p>
              )}
            </div>

            {/* Deadline */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Deadline
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatDate(mod.deadline)}</p>
              <p className={`mt-0.5 text-xs font-medium ${dl.color}`}>{dl.label}</p>
            </div>

            {/* Activity summary */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Activity on this Module
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1 rounded-full bg-muted-foreground" aria-hidden="true" />
                  {notes.length} note{notes.length !== 1 ? "s" : ""}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <span className="size-1 rounded-full bg-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    {allBlockers.length} blocker{allBlockers.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-destructive">({openBlockers} open)</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1 rounded-full bg-muted-foreground" aria-hidden="true" />
                  {mod.progress}% complete
                </li>
              </ul>
            </div>

            {/* Quick links */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quick Links
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link
                    href={`/projects/${id}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    ← Back to project
                  </Link>
                </li>
                {["owner", "team_lead", "project_manager"].includes(currentUser.role ?? "") && (
                  <li>
                    <Link
                      href={`/projects/${id}/modules/new`}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      + Add another module
                    </Link>
                  </li>
                )}
              </ul>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
