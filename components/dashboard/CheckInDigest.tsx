type Props = {
  digest: { checkedIn: number; total: number } | null;
};

export function CheckInDigest({ digest }: Props) {
  if (!digest || digest.total === 0) return null;

  const { checkedIn, total } = digest;
  const pct = Math.round((checkedIn / total) * 100);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Team Check-In Today
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          {checkedIn} / {total} members checked in
        </p>
      </div>
      <div className="w-32 shrink-0">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{pct}%</p>
      </div>
    </div>
  );
}
