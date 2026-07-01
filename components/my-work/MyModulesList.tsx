import Link from "next/link";
import { ProgressBumpButtons } from "@/components/my-work/ProgressBumpButtons";
import type { ModuleBadges } from "@/lib/module-status";

type ModuleStatus = "not_started" | "in_progress" | "review" | "completed" | "blocked";

type MyModuleRow = {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  progress: number;
  deadline: string;
  projectId: string;
  projectName: string;
  badges: ModuleBadges;
  atRisk: boolean;
  daysLeft: number;
};

type Props = {
  modules: MyModuleRow[];
};

const statusConfig: Record<ModuleStatus, { label: string; bg: string; text: string; border: string }> = {
  not_started: { label: "Not Started", bg: "bg-background",        text: "text-muted-foreground", border: "border-border" },
  in_progress:  { label: "In Progress", bg: "bg-success-light",    text: "text-success",          border: "border-success/20" },
  review:       { label: "Review",      bg: "bg-warning-light",    text: "text-warning",          border: "border-warning/20" },
  completed:    { label: "Completed",   bg: "bg-success-light",    text: "text-success",          border: "border-success/20" },
  blocked:      { label: "Blocked",     bg: "bg-destructive-light",text: "text-destructive",      border: "border-destructive/20" },
};

function DeadlineLabel({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) return <span className="text-xs font-medium text-destructive">Overdue</span>;
  if (daysLeft === 0) return <span className="text-xs font-medium text-warning">Due today</span>;
  if (daysLeft <= 3) return <span className="text-xs font-medium text-warning">{daysLeft}d left</span>;
  return <span className="text-xs font-medium text-muted-foreground">{daysLeft}d left</span>;
}

export function MyModulesList({ modules }: Props) {
  if (modules.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No modules assigned to you yet.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {modules.map((mod) => {
        const sc = statusConfig[mod.status];
        return (
          <li
            key={mod.id}
            className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
          >
            {/* Top row: name/project link + status badge + bump buttons */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/projects/${mod.projectId}/modules/${mod.id}`}
                    className="text-sm font-semibold text-foreground hover:underline"
                  >
                    {mod.name}
                  </Link>
                  {mod.atRisk && (
                    <span
                      title="Integration risk — depends on a blocked or overdue module"
                      className="size-1.5 shrink-0 rounded-full bg-warning"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <Link href={`/projects/${mod.projectId}`} className="hover:text-foreground">
                    {mod.projectName}
                  </Link>
                  {" · "}
                  <DeadlineLabel daysLeft={mod.daysLeft} />
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${sc.bg} ${sc.text} ${sc.border}`}
                >
                  {sc.label}
                </span>
                <ProgressBumpButtons
                  moduleId={mod.id}
                  currentProgress={mod.progress}
                  currentStatus={mod.status}
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-background">
                <div
                  className={`h-1.5 rounded-full transition-all ${mod.status === "blocked" ? "bg-destructive" : "bg-success"}`}
                  style={{ width: `${mod.progress}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-muted-foreground">{mod.progress}%</span>
            </div>

            {/* Badges row */}
            {(mod.badges.overdue || mod.badges.blocked || mod.badges.stale) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {mod.badges.overdue && (
                  <span className="rounded-md border border-destructive/20 bg-destructive-light px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-destructive">
                    Overdue
                  </span>
                )}
                {mod.badges.blocked && (
                  <span className="rounded-md border border-destructive/20 bg-destructive-light px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-destructive">
                    Blocked
                  </span>
                )}
                {mod.badges.stale && (
                  <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    No update in 3+ days
                  </span>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
