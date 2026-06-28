type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  trend?: string;
  trendColor?: "success" | "destructive" | "muted";
};

export function StatCard({ label, value, sub, trend, trendColor = "muted" }: StatCardProps) {
  const trendClass =
    trendColor === "success"
      ? "text-success"
      : trendColor === "destructive"
        ? "text-destructive"
        : "text-muted-foreground";

  // When no trend string, the value itself carries the color signal (e.g. blockers in red)
  const valueClass =
    !trend && trendColor === "destructive"
      ? "text-destructive"
      : "text-brand-primary";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {trend && (
          <span className={`text-xs font-medium ${trendClass}`}>{trend}</span>
        )}
      </div>
      <p className={`mt-2 text-[32px] font-semibold leading-10 ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
