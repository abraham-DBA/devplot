"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProject } from "@/actions/projects";

type Priority = "low" | "medium" | "high" | "critical";

type TeamMemberOption = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  currentUserId: string;
  teamOptions: TeamMemberOption[];
  today: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export function CreateProjectForm({ currentUserId, teamOptions, today }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUserId]);

  function toggleMember(id: string) {
    if (id === currentUserId) return; // current user always stays selected
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createProject({
        name,
        description,
        startDate,
        endDate,
        priority,
        teamMembers: selectedMembers,
      });
      if (result?.error) {
        toast.error(result.error);
      }
      // on success, createProject calls redirect() server-side — navigation is automatic
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left — form card */}
      <div className="flex-1 rounded-xl border border-border bg-card p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">

        {/* Project name */}
        <div>
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Project Name
          </label>
          <input
            type="text"
            placeholder="e.g. Atlas Payments Platform"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="mt-2 h-12 w-full rounded-lg border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">A clear, recognizable name.</p>
        </div>

        {/* Description */}
        <div className="mt-6">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </label>
          <textarea
            placeholder="Multi-currency merchant payments stack with..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            rows={4}
            className="mt-2 w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            What this project delivers, in 1–2 sentences.
          </p>
        </div>

        {/* Dates */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isPending}
              className="mt-2 h-12 w-full rounded-lg border border-border bg-card px-4 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isPending}
              min={startDate}
              className="mt-2 h-12 w-full rounded-lg border border-border bg-card px-4 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            />
          </div>
        </div>

        {/* Priority */}
        <div className="mt-6">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Priority
          </label>
          <div className="mt-2 grid grid-cols-4 overflow-hidden rounded-lg border border-border">
            {PRIORITIES.map((p) => {
              const isActive = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  disabled={isPending}
                  className={[
                    "py-3 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                    isActive
                      ? "bg-foreground text-card"
                      : "bg-card text-foreground hover:bg-background",
                  ].join(" ")}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right — team + submit */}
      <div className="w-full rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)] lg:w-[340px]">
        <div className="px-6 pt-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Team Members
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the people who&apos;ll own modules.
          </p>
        </div>

        {/* Member list */}
        <ul className="mt-4 divide-y divide-border px-4">
          {teamOptions.map((member) => {
            const isSelected = selectedMembers.includes(member.id);
            const isSelf = member.id === currentUserId;
            return (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  disabled={isPending || isSelf}
                  className={[
                    "flex w-full items-center gap-3 rounded-lg px-2 py-3 transition-colors",
                    isSelected ? "bg-background" : "hover:bg-background",
                  ].join(" ")}
                >
                  {/* Avatar */}
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-card">
                    {getInitials(member.name)}
                  </span>

                  {/* Name + role */}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {formatRole(member.role)}
                    </p>
                  </div>

                  {/* Checkbox */}
                  <span
                    className={[
                      "flex size-5 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-foreground bg-foreground"
                        : "border-border bg-card",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg className="size-3 text-card" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Actions */}
        <div className="px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-12 w-full rounded-lg bg-foreground text-sm font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create project"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="mt-3 h-10 w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
