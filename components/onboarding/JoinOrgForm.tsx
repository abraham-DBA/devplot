"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { joinOrganization } from "@/actions/users";

type MemberRole = "developer" | "team_lead" | "project_manager";

type RoleOption = {
  value: MemberRole;
  label: string;
  description: string;
  icon: string;
};

const roles: RoleOption[] = [
  {
    value: "developer",
    label: "Developer",
    description: "Build features, fix bugs, and ship code.",
    icon: "⌨",
  },
  {
    value: "team_lead",
    label: "Team Lead",
    description: "Guide your team, review work, and unblock progress.",
    icon: "◈",
  },
  {
    value: "project_manager",
    label: "Project Manager",
    description: "Plan timelines, track deliverables, and coordinate teams.",
    icon: "◎",
  },
];

type Props = {
  inviteCode: string;
  orgName: string;
};

export function JoinOrgForm({ inviteCode, orgName }: Props) {
  const [selected, setSelected] = useState<MemberRole | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    if (!selected) return;
    startTransition(async () => {
      const result = await joinOrganization(inviteCode, selected);
      if (result && !result.success) {
        toast.error(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="grid gap-3">
      {roles.map((role) => {
        const isSelected = selected === role.value;
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => setSelected(role.value)}
            disabled={isPending}
            className={[
              "flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70",
              isSelected
                ? "border-brand-primary ring-1 ring-brand-primary"
                : "border-border hover:border-brand-secondary",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border text-base transition-colors",
                isSelected
                  ? "border-brand-primary bg-brand-primary text-card"
                  : "border-border bg-background text-muted-foreground",
              ].join(" ")}
            >
              {role.icon}
            </span>

            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{role.label}</span>
              <span className="mt-0.5 text-sm text-muted-foreground">{role.description}</span>
            </span>

            {isSelected && (
              <span className="ml-auto mt-0.5 shrink-0 text-brand-primary" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        );
      })}

      <button
        type="button"
        onClick={handleJoin}
        disabled={!selected || isPending}
        className="mt-2 h-11 w-full rounded-lg bg-foreground text-sm font-bold text-card transition-colors hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Joining…" : `Join ${orgName}`}
      </button>
    </div>
  );
}
