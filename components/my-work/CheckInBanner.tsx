"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitCheckIn } from "@/actions/checkins";
import { BLOCKER_TYPES, type BlockerType } from "@/lib/blocker-types";

type Props = {
  hasCheckedIn: boolean;
  prefillShipped: string;
  assignedModules: { id: string; name: string }[];
};

export function CheckInBanner({ hasCheckedIn, prefillShipped, assignedModules }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(hasCheckedIn);
  const [shipped, setShipped] = useState(prefillShipped);
  const [next, setNext] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockerModuleId, setBlockerModuleId] = useState(assignedModules[0]?.id ?? "");
  const [blockerDescription, setBlockerDescription] = useState("");
  const [blockerType, setBlockerType] = useState<BlockerType>("external");
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-light px-5 py-3">
        <span className="size-2 shrink-0 rounded-full bg-success" />
        <p className="text-sm font-medium text-success">Checked in today</p>
      </div>
    );
  }

  function handleSubmit() {
    if (isBlocked && !blockerDescription.trim()) {
      toast.error("Please describe the blocker.");
      return;
    }
    startTransition(async () => {
      const result = await submitCheckIn({
        shipped,
        next,
        ...(isBlocked && blockerModuleId
          ? { blockerModuleId, blockerDescription, blockerType }
          : {}),
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        setDone(true);
        toast.success("Checked in!");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Daily Check-In
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        What did you ship? What&apos;s next? Any blockers?
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            What did you ship?
          </label>
          <textarea
            value={shipped}
            onChange={(e) => setShipped(e.target.value)}
            rows={2}
            disabled={isPending}
            placeholder="e.g. Updated auth module to 80%, fixed token expiry bug."
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            What&apos;s next?
          </label>
          <textarea
            value={next}
            onChange={(e) => setNext(e.target.value)}
            rows={2}
            disabled={isPending}
            placeholder="e.g. Write integration tests, start on dashboard module."
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
          />
        </div>
      </div>

      {/* Blocker toggle — only shown when the user has assigned modules */}
      {assignedModules.length > 0 && (
        <div className="mt-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={isBlocked}
              onChange={(e) => setIsBlocked(e.target.checked)}
              disabled={isPending}
              className="size-4 rounded border-border accent-destructive"
            />
            <span className="text-sm font-medium text-foreground">I&apos;m blocked</span>
          </label>
        </div>
      )}

      {/* Blocker fields — revealed when checkbox is checked */}
      {isBlocked && assignedModules.length > 0 && (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive-light p-4">
          {assignedModules.length > 0 && (
            <div className="mb-3">
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Blocked module
              </label>
              <select
                value={blockerModuleId}
                onChange={(e) => setBlockerModuleId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
              >
                {assignedModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BLOCKER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setBlockerType(t.value)}
                  disabled={isPending}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                    blockerType === t.value
                      ? "border-foreground bg-foreground text-card"
                      : "border-border bg-card text-foreground hover:bg-background",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Describe the blocker
            </label>
            <textarea
              value={blockerDescription}
              onChange={(e) => setBlockerDescription(e.target.value)}
              rows={2}
              disabled={isPending}
              placeholder="e.g. Waiting on API keys from the infrastructure team."
              className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit check-in"}
        </button>
      </div>
    </div>
  );
}
