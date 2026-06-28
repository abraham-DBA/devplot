"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type ActivityChartProps = {
  data: { date: string; count: number }[];
};

export function ActivityChart({ data }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Activity
        </p>
        <div className="flex h-[180px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Activity
        </p>
        <span className="text-xs text-muted-foreground">Last 14 days</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-brand-secondary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-brand-secondary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={20}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Events"
            stroke="var(--color-brand-secondary)"
            strokeWidth={2}
            fill="url(#activityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
