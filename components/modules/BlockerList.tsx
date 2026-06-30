"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resolveBlocker } from "@/actions/modules";
import { blockerTypeBadge, blockerTypeLabel, type BlockerType } from "@/lib/blocker-types";

type Blocker = {
  id: string;
  description: string;
  reporterName: string;
  createdAt: string;
  type: BlockerType;
};

type Props = {
  blockers: Blocker[];
  canResolve: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BlockerList({ blockers, canResolve }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (blockers.length === 0) return null;

  function handleResolve(blockerId: string) {
    startTransition(async () => {
      const result = await resolveBlocker(blockerId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Blocker resolved.");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-foreground">
        Open Blocker{blockers.length !== 1 ? "s" : ""}
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {blockers.map((blocker) => (
          <li
            key={blocker.id}
            className="rounded-xl border border-destructive/20 bg-destructive-light p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${blockerTypeBadge[blocker.type]}`}
                >
                  {blockerTypeLabel[blocker.type]}
                </span>
                <p className="mt-1.5 text-sm text-foreground">{blocker.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reported by {blocker.reporterName} · {formatDate(blocker.createdAt)}
                </p>
              </div>
              {canResolve && (
                <button
                  type="button"
                  onClick={() => handleResolve(blocker.id)}
                  disabled={isPending}
                  className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background disabled:opacity-50"
                >
                  {isPending ? "Resolving…" : "Resolve"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
