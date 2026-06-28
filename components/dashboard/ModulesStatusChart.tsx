"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type StatusKey = "review" | "in_progress" | "blocked" | "not_started" | "completed";

type StatusCount = {
  key: StatusKey;
  label: string;
  count: number;
};

type ModulesStatusChartProps = {
  total: number;
  statuses: StatusCount[];
};

const statusTextClass: Record<StatusKey, string> = {
  review: "text-warning",
  in_progress: "text-success",
  blocked: "text-destructive",
  not_started: "text-muted-foreground",
  completed: "text-success",
};

const statusFill: Record<StatusKey, string> = {
  review: "var(--color-warning)",
  in_progress: "var(--color-success)",
  blocked: "var(--color-destructive)",
  not_started: "var(--color-brand-secondary)",
  completed: "var(--color-success)",
};

export function ModulesStatusChart({ total, statuses }: ModulesStatusChartProps) {
  const hasData = statuses.some((s) => s.count > 0);
  const pieData = statuses.map((s) => ({ name: s.label, value: s.count, fill: statusFill[s.key] }));

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Modules by Status
        </p>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>

      {!hasData ? (
        <div className="flex h-[120px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No modules yet</p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={56}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex flex-col gap-2">
            {statuses.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-6">
                <span className={`text-sm ${statusTextClass[s.key]}`}>{s.label}</span>
                <span className="text-sm font-semibold text-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
