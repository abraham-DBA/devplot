type ProjectHealth = "on_track" | "at_risk" | "high_risk";

type Props = {
  health: ProjectHealth;
  timeUsed: number;
  progress: number;
  hasBlockedModule: boolean;
};

export function ScheduleAlert({ health, timeUsed, progress, hasBlockedModule }: Props) {
  if (health === "on_track") return null;

  let message: string;
  if (hasBlockedModule) {
    message = "One or more modules are blocked. Resolve blockers to restore project health.";
  } else {
    const drift = Math.round(timeUsed - progress);
    message = `${Math.round(timeUsed)}% of the timeline has elapsed but progress is at ${progress}%. Pace is starting to slip.`;
    if (drift > 20) {
      message = `${Math.round(timeUsed)}% of the timeline has elapsed but progress is at ${progress}%. This project is significantly behind schedule.`;
    }
  }

  const isHighRisk = health === "high_risk";

  return (
    <div
      className={[
        "rounded-xl border px-6 py-4",
        isHighRisk
          ? "border-destructive/20 bg-destructive-light"
          : "border-warning/20 bg-warning-light",
      ].join(" ")}
    >
      <p
        className={[
          "font-mono text-[11px] font-semibold uppercase tracking-wide",
          isHighRisk ? "text-destructive" : "text-warning",
        ].join(" ")}
      >
        Schedule Alert
      </p>
      <p className="mt-1 text-sm text-foreground">
        {message}
      </p>
    </div>
  );
}
