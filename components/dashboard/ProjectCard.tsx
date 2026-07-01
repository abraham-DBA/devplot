import Link from "next/link";

type ProjectHealth = "on_track" | "at_risk" | "high_risk";

type TeamMember = { initials: string };

type ProjectCardProps = {
  id: string;
  name: string;
  description: string;
  health: ProjectHealth;
  progress: number;
  timeUsed: number;
  drift: string;
  driftSign: "positive" | "negative";
  modulesCompleted: number;
  totalModules: number;
  priority: string;
  blockerCount: number;
  dueDate: string;
  teamMembers: TeamMember[];
};

const healthConfig: Record<ProjectHealth, { label: string; dot: string; text: string; bg: string }> = {
  on_track: {
    label: "On Track",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success-light",
  },
  at_risk: {
    label: "At Risk",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning-light",
  },
  high_risk: {
    label: "High Risk",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive-light",
  },
};

export function ProjectCard({
  id,
  name,
  description,
  health,
  progress,
  timeUsed,
  drift,
  driftSign,
  modulesCompleted,
  totalModules,
  priority,
  blockerCount,
  dueDate,
  teamMembers,
}: ProjectCardProps) {
  const hc = healthConfig[health];
  const progressBarColor =
    health === "on_track"
      ? "bg-success"
      : health === "at_risk"
        ? "bg-warning"
        : "bg-destructive";

  return (
    <Link
      href={`/projects/${id}`}
      className="block rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-base font-semibold text-foreground">{name}</h3>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${hc.bg} ${hc.text}`}>
            <span className={`size-1.5 rounded-full ${hc.dot}`} aria-hidden="true" />
            {hc.label}
          </span>
        </div>
        {/* Team avatars */}
        <div className="flex shrink-0 -space-x-2">
          {teamMembers.slice(0, 5).map((m, i) => (
            <span
              key={i}
              className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-[9px] font-bold text-card"
            >
              {m.initials}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{description}</p>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{progress}% complete · {timeUsed}% time</span>
          <span className={driftSign === "positive" ? "text-destructive font-medium" : "text-success font-medium"}>
            {drift} drift
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-background">
          <div
            className={`h-1.5 rounded-full ${progressBarColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {modulesCompleted}/{totalModules} modules · {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </span>
        <div className="flex items-center gap-3">
          {blockerCount > 0 && (
            <span className="rounded-md bg-destructive-light px-2 py-0.5 text-xs font-semibold text-destructive">
              {blockerCount} BLOCKER{blockerCount !== 1 ? "S" : ""}
            </span>
          )}
          <span>Due {dueDate}</span>
        </div>
      </div>

      {/* View details CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Click to open project</span>
        <span className="text-xs font-semibold text-brand-primary">View details →</span>
      </div>
    </Link>
  );
}
