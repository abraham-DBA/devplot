import type { TeamPulseRow } from "@/lib/module-status";

type Props = {
  rows: TeamPulseRow[];
};

export function TeamPulse({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No team members found.</p>
      </div>
    );
  }

  const active = rows.filter((r) => r.assignedModuleCount > 0 && r.updatedThisWeek);
  const silent = rows.filter((r) => r.assignedModuleCount > 0 && !r.updatedThisWeek);
  const unassigned = rows.filter((r) => r.assignedModuleCount === 0);

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }

  function MemberRow({ row }: { row: TeamPulseRow }) {
    return (
      <li className="flex items-center gap-3 px-5 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-card">
          {getInitials(row.name)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.assignedModuleCount} module{row.assignedModuleCount !== 1 ? "s" : ""} assigned
          </p>
        </div>
        {row.updatedThisWeek ? (
          <span className="rounded-md border border-success/20 bg-success-light px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-success">
            Updated
          </span>
        ) : (
          <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Silent
          </span>
        )}
      </li>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-success">{active.length}</span> updated this week
          </span>
          <span>
            <span className="font-semibold text-warning">{silent.length}</span> silent
          </span>
          {unassigned.length > 0 && (
            <span>
              <span className="font-semibold text-muted-foreground">{unassigned.length}</span> unassigned
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {active.map((r) => <MemberRow key={r.userId} row={r} />)}
        {silent.map((r) => <MemberRow key={r.userId} row={r} />)}
        {unassigned.map((r) => <MemberRow key={r.userId} row={r} />)}
      </ul>
    </div>
  );
}
