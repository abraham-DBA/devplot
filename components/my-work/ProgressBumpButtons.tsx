"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateModuleProgress } from "@/actions/modules";

type ModuleStatus = "not_started" | "in_progress" | "review" | "completed" | "blocked";

type Props = {
  moduleId: string;
  currentProgress: number;
  currentStatus: ModuleStatus;
};

export function ProgressBumpButtons({ moduleId, currentProgress, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (currentStatus === "completed") return null;

  function bump(amount: 5 | 10) {
    startTransition(async () => {
      const newProgress = Math.min(currentProgress + amount, 100);
      const result = await updateModuleProgress(moduleId, newProgress, currentStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => bump(5)}
        disabled={isPending || currentProgress >= 100}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
      >
        +5%
      </button>
      <button
        type="button"
        onClick={() => bump(10)}
        disabled={isPending || currentProgress >= 100}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
      >
        +10%
      </button>
    </div>
  );
}
