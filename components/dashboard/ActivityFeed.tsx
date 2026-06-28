type ActivityEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  project: string;
  timestamp: string;
  color: "success" | "warning" | "muted";
};

type ActivityFeedProps = {
  events: ActivityEvent[];
};

const dotColor: Record<ActivityEvent["color"], string> = {
  success: "bg-success",
  warning: "bg-warning",
  muted: "bg-muted-foreground",
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Activity</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Live feed</p>
      </div>

      {events.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3 px-6 py-4">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${dotColor[event.color]}`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  {event.actor ? (
                    <>
                      <span className="font-semibold">{event.actor}</span>
                      {" "}
                      {event.action}
                      {event.target ? (
                        <>{" "}<span className="font-semibold">{event.target}</span></>
                      ) : null}
                    </>
                  ) : (
                    event.action
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.project} · {event.timestamp}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
