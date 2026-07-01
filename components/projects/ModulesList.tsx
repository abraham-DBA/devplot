import Link from "next/link";

type ModuleStatus = "not_started" | "in_progress" | "review" | "completed" | "blocked";

type ModuleRow = {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  progress: number;
  ownerName: string;
  deadline: string;
  atRisk?: boolean;
};

type Props = {
  projectId: string;
  modules: ModuleRow[];
};

const statusConfig: Record<ModuleStatus, { label: string; bg: string; text: string; border: string }> = {
  not_started: { label: "NOT STARTED", bg: "bg-background", text: "text-muted-foreground", border: "border-border" },
  in_progress:  { label: "IN PROGRESS",  bg: "bg-success-light",     text: "text-success",     border: "border-success/20" },
  review:       { label: "REVIEW",        bg: "bg-warning-light",     text: "text-warning",     border: "border-warning/20" },
  completed:    { label: "COMPLETED",     bg: "bg-success-light",     text: "text-success",     border: "border-success/20" },
  blocked:      { label: "BLOCKED",       bg: "bg-destructive-light", text: "text-destructive", border: "border-destructive/20" },
};

const progressBarColor: Record<ModuleStatus, string> = {
  not_started: "bg-muted",
  in_progress: "bg-success",
  review:      "bg-success",
  completed:   "bg-success",
  blocked:     "bg-destructive",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ModulesList({ projectId, modules }: Props) {
  if (modules.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">No modules yet — add the first one.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_120px_160px_48px_72px] border-b border-border px-6 py-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Module
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Progress
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Owner
        </span>
        <span className="text-right font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Due
        </span>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-border">
        {modules.map((mod) => {
          const sc = statusConfig[mod.status];
          const barColor = progressBarColor[mod.status];

          return (
            <li key={mod.id}>
              <Link
                href={`/projects/${projectId}/modules/${mod.id}`}
                className="grid grid-cols-[1fr_120px_160px_48px_72px] items-center px-6 py-4 transition-colors hover:bg-background"
              >
                {/* Name + description */}
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{mod.name}</p>
                    {mod.atRisk && (
                      <span
                        title="Integration risk — depends on a blocked or overdue module"
                        className="size-1.5 shrink-0 rounded-full bg-warning"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{mod.description}</p>
                </div>

                {/* Status badge */}
                <div>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${sc.bg} ${sc.text} ${sc.border}`}
                  >
                    {sc.label}
                  </span>
                </div>

                {/* Progress bar + % */}
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 rounded-full bg-background">
                    <div
                      className={`h-1.5 rounded-full ${barColor}`}
                      style={{ width: `${mod.progress}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">
                    {mod.progress}%
                  </span>
                </div>

                {/* Owner avatar */}
                <div className="flex justify-center">
                  <span
                    title={mod.ownerName}
                    className="flex size-7 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-card"
                  >
                    {getInitials(mod.ownerName)}
                  </span>
                </div>

                {/* Due date */}
                <div className="text-right text-xs font-medium text-muted-foreground">
                  {formatDate(mod.deadline)}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
