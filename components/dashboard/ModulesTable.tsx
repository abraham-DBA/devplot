type ModuleStatus = "in_progress" | "blocked" | "review" | "completed" | "not_started";

type ModuleRow = {
  id: string;
  name: string;
  projectName: string;
  assignee: string;
  status: ModuleStatus;
  progress: number;
  deadline: string;
  deadlineUrgent: boolean;
};

import Link from "next/link";

type ModulesTableProps = {
  modules: ModuleRow[];
};

const statusConfig: Record<ModuleStatus, { label: string; bg: string; text: string }> = {
  in_progress: { label: "IN PROGRESS", bg: "bg-success-light", text: "text-success" },
  blocked: { label: "BLOCKED", bg: "bg-destructive-light", text: "text-destructive" },
  review: { label: "REVIEW", bg: "bg-warning-light", text: "text-warning" },
  completed: { label: "COMPLETED", bg: "bg-success-light", text: "text-success" },
  not_started: { label: "NOT STARTED", bg: "bg-muted", text: "text-muted-foreground" },
};

const progressBarColor: Record<ModuleStatus, string> = {
  in_progress: "bg-success",
  blocked: "bg-destructive",
  review: "bg-warning",
  completed: "bg-success",
  not_started: "bg-muted",
};

export function ModulesTable({ modules }: ModulesTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground">Active modules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Closest deadlines first</p>
        </div>
        <Link href="/projects" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          See all modules →
        </Link>
      </div>

      {modules.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">All modules completed — nothing active.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Module
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Progress
                </th>
                <th className="px-6 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Deadline
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modules.map((mod) => {
                const sc = statusConfig[mod.status];
                const barColor = progressBarColor[mod.status];
                return (
                  <tr key={mod.id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{mod.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {mod.projectName} · {mod.assignee}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 rounded-full bg-background">
                          <div
                            className={`h-1.5 rounded-full ${barColor}`}
                            style={{ width: `${mod.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{mod.progress}%</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-medium ${mod.deadlineUrgent ? "text-destructive" : "text-foreground"}`}>
                      {mod.deadline}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
