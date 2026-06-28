type Blocker = {
  id: string;
  moduleName: string;
  description: string;
};

type BlockerBannerProps = {
  blockers: Blocker[];
  updatedLabel: string;
};

export function BlockerBanner({ blockers, updatedLabel }: BlockerBannerProps) {
  if (blockers.length === 0) return null;

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive-light px-6 py-4 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
          <span className="text-sm font-semibold text-destructive">
            {blockers.length} ACTIVE BLOCKER{blockers.length !== 1 ? "S" : ""}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{updatedLabel}</span>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {blockers.map((blocker) => (
          <p key={blocker.id} className="text-sm text-foreground">
            <span className="mr-1 text-destructive">*</span>
            <span className="font-semibold">{blocker.moduleName}</span>
            {" — "}
            <span className="text-muted-foreground">{blocker.description}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
