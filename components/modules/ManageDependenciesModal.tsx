"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDependency, removeDependency } from "@/actions/modules";

type ModuleOption = { id: string; name: string };
type CurrentDependency = { dependencyId: string; moduleId: string };

type Props = {
  moduleId: string;
  options: ModuleOption[];
  currentDependencies: CurrentDependency[];
};

export function ManageDependenciesModal({ moduleId, options, currentDependencies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle(option: ModuleOption) {
    const existing = currentDependencies.find((d) => d.moduleId === option.id);
    startTransition(async () => {
      const result = existing
        ? await removeDependency(existing.dependencyId)
        : await addDependency(moduleId, option.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(existing ? `No longer depends on ${option.name}.` : `Now depends on ${option.name}.`);
        router.refresh();
      }
    });
  }

  if (options.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
      >
        Manage dependencies
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-base font-semibold text-foreground">Manage dependencies</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Select which modules this one depends on. This module won&apos;t be considered safe to ship until
              they&apos;re unblocked.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {options.map((option) => {
                const isActive = currentDependencies.some((d) => d.moduleId === option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggle(option)}
                    disabled={isPending}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                      isActive
                        ? "border-foreground bg-foreground text-card"
                        : "border-border bg-card text-foreground hover:bg-background",
                    ].join(" ")}
                  >
                    {option.name}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
