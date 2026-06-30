import Link from "next/link";
import { blockerTypeBadge, blockerTypeLabel, type BlockerType } from "@/lib/blocker-types";

type Blocker = {
  id: string;
  moduleId: string;
  projectId: string;
  moduleName: string;
  description: string;
  type: BlockerType;
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
          <Link
            key={blocker.id}
            href={`/projects/${blocker.projectId}/modules/${blocker.moduleId}`}
            className="text-sm text-foreground transition-opacity hover:opacity-75"
          >
            <span className="mr-1 text-destructive">*</span>
            <span className="font-semibold">{blocker.moduleName}</span>
            <span
              className={`ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${blockerTypeBadge[blocker.type]}`}
            >
              {blockerTypeLabel[blocker.type]}
            </span>
            {" — "}
            <span className="text-muted-foreground">{blocker.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
