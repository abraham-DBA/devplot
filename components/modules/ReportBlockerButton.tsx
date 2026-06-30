"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reportBlocker } from "@/actions/modules";
import { BLOCKER_TYPES, type BlockerType } from "@/lib/blocker-types";

type Props = { moduleId: string };

export function ReportBlockerButton({ moduleId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<BlockerType>("external");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!description.trim()) {
      toast.error("Please describe what is blocking progress.");
      return;
    }
    startTransition(async () => {
      const result = await reportBlocker(moduleId, description, type);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Blocker reported. Module status set to Blocked.");
        setDescription("");
        setType("external");
        setOpen(false);
        // Refresh server data so the status badge + sidebar update without a manual reload
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive-light"
      >
        Report blocker
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-card p-6 shadow-lg">
            <h2 className="text-base font-semibold text-foreground">Report a blocker</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe what is blocking progress. The module status will be set to Blocked.
            </p>

            <div className="mt-4">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {BLOCKER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                      type === t.value
                        ? "border-foreground bg-foreground text-card"
                        : "border-border bg-card text-foreground hover:bg-background",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                What are you waiting on?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Waiting on schema sign-off from the data team."
                rows={4}
                disabled={isPending}
                className="mt-2 w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-card transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? "Reporting…" : "Report blocker"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
