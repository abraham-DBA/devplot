"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type ProgressChartProps = {
  data: { name: string; progress: number; timeUsed: number }[];
};

export function ProgressChart({ data }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Progress vs. Time Elapsed
        </p>
        <div className="flex h-[180px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No projects yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Progress vs. Time Elapsed
        </p>
        <span className="text-xs text-muted-foreground">By project</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            cursor={{ fill: "var(--color-background)" }}
          />
          <Bar dataKey="progress" name="Progress %" fill="var(--color-brand-primary)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="timeUsed" name="Time Used %" fill="var(--color-brand-secondary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
