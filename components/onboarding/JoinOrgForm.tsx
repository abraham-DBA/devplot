"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { joinOrganization } from "@/actions/users";

type MemberRole = "developer" | "team_lead" | "project_manager";

const roleConfig: Record<MemberRole, { label: string; description: string; icon: string }> = {
  developer: {
    label: "Developer",
    description: "Build features, fix bugs, and ship code.",
    icon: "⌨",
  },
  team_lead: {
    label: "Team Lead",
    description: "Guide your team, review work, and unblock progress.",
    icon: "◈",
  },
  project_manager: {
    label: "Project Manager",
    description: "Plan timelines, track deliverables, and coordinate teams.",
    icon: "◎",
  },
};

type Props = {
  inviteCode: string;
  orgName: string;
  role: MemberRole;
};

export function JoinOrgForm({ inviteCode, orgName, role }: Props) {
  const [isPending, startTransition] = useTransition();
  const config = roleConfig[role];

  function handleJoin() {
    startTransition(async () => {
      const result = await joinOrganization(inviteCode);
      if (result && !result.success) {
        toast.error(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="grid gap-4">
      {/* Role display — non-interactive */}
      <div className="flex items-start gap-4 rounded-xl border border-brand-primary bg-card p-5 ring-1 ring-brand-primary">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-brand-primary bg-brand-primary text-base text-card"
        >
          {config.icon}
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{config.label}</span>
          <span className="mt-0.5 text-sm text-muted-foreground">{config.description}</span>
        </span>
        <span className="ml-auto mt-0.5 shrink-0 text-brand-primary" aria-hidden="true">✓</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Your role has been set by the workspace owner and cannot be changed here.
      </p>

      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="mt-2 h-11 w-full rounded-lg bg-foreground text-sm font-bold text-card transition-colors hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Joining…" : `Join ${orgName}`}
      </button>
    </div>
  );
}
