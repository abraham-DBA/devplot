"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMilestone, updateMilestone, deleteMilestone } from "@/actions/milestones";

type MilestoneItem = {
  id: string;
  name: string;
  targetDate: string;
  rollbackOwnerId: string | null;
  rollbackOwnerName: string | null;
  contractsAgreed: boolean;
  moduleStats: { total: number; completed: number; openBlockers: number };
};

type Props = {
  projectId: string;
  milestones: MilestoneItem[];
  teamMembers: { id: string; name: string }[];
  canManage: boolean;
};

type MilestoneStatus = "upcoming" | "at_risk" | "completed" | "missed";

function getMilestoneStatus(targetDate: string, stats: MilestoneItem["moduleStats"]): MilestoneStatus {
  const today = new Date().toISOString().split("T")[0];
  const daysLeft = Math.ceil(
    (new Date(targetDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) /
      86400000,
  );
  const allDone = stats.total > 0 && stats.completed === stats.total;
  const hasBlockers = stats.openBlockers > 0;

  if (daysLeft < 0 && !allDone) return "missed";
  if (allDone && !hasBlockers) return "completed";
  if (daysLeft <= 7 && !allDone) return "at_risk";
  return "upcoming";
}

const statusConfig: Record<MilestoneStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  upcoming:  { label: "Upcoming",  dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-background",        border: "border-border" },
  at_risk:   { label: "At Risk",   dot: "bg-warning",          text: "text-warning",          bg: "bg-warning-light",     border: "border-warning/20" },
  missed:    { label: "Missed",    dot: "bg-destructive",      text: "text-destructive",      bg: "bg-destructive-light", border: "border-destructive/20" },
  completed: { label: "Completed", dot: "bg-success",          text: "text-success",          bg: "bg-success-light",     border: "border-success/20" },
};

function ReadinessItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
          checked
            ? "border-success bg-success text-card"
            : "border-border bg-background text-muted-foreground",
        ].join(" ")}
        aria-hidden="true"
      >
        {checked ? "✓" : "–"}
      </span>
      <span className={`text-xs ${checked ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function MilestoneCard({
  milestone,
  teamMembers,
  canManage,
}: {
  milestone: MilestoneItem;
  teamMembers: Props["teamMembers"];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contractsAgreed, setContractsAgreed] = useState(milestone.contractsAgreed);
  const [rollbackOwnerId, setRollbackOwnerId] = useState(milestone.rollbackOwnerId ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const status = getMilestoneStatus(milestone.targetDate, milestone.moduleStats);
  const sc = statusConfig[status];
  const { total, completed, openBlockers } = milestone.moduleStats;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const allModulesDone = total > 0 && completed === total;
  const noBlockers = openBlockers === 0;
  const rollbackAssigned = !!rollbackOwnerId;

  function toggleContracts() {
    const next = !contractsAgreed;
    setContractsAgreed(next);
    startTransition(async () => {
      const result = await updateMilestone({ id: milestone.id, contractsAgreed: next });
      if (result.error) {
        setContractsAgreed(!next);
        toast.error(result.error);
      }
    });
  }

  function handleRollbackOwner(userId: string) {
    const prev = rollbackOwnerId;
    setRollbackOwnerId(userId);
    startTransition(async () => {
      const result = await updateMilestone({ id: milestone.id, rollbackOwnerId: userId || null });
      if (result.error) {
        setRollbackOwnerId(prev);
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMilestone({ id: milestone.id });
      if (result.error) {
        toast.error(result.error);
        setConfirmingDelete(false);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{milestone.name}</p>
          <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Target: {milestone.targetDate}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sc.bg} ${sc.text} ${sc.border}`}
          >
            <span className={`size-1.5 rounded-full ${sc.dot}`} aria-hidden="true" />
            {sc.label}
          </span>
          {canManage && (
            confirmingDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold text-destructive transition-colors hover:bg-destructive-light disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isPending}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={isPending}
                title="Delete milestone"
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                </svg>
              </button>
            )
          )}
        </div>
      </div>

      {/* Module progress bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Modules
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {completed}/{total} done
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Release readiness
        </p>
        <div className="flex flex-col gap-2">
          <ReadinessItem label="All modules completed" checked={allModulesDone} />
          <ReadinessItem label="No open blockers" checked={noBlockers} />

          {/* Contracts agreed — interactive for managers */}
          {canManage ? (
            <button
              type="button"
              onClick={toggleContracts}
              disabled={isPending}
              className="flex items-center gap-2 text-left disabled:opacity-50"
            >
              <span
                className={[
                  "flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-colors",
                  contractsAgreed
                    ? "border-success bg-success text-card"
                    : "border-border bg-background text-muted-foreground hover:border-foreground",
                ].join(" ")}
                aria-hidden="true"
              >
                {contractsAgreed ? "✓" : "–"}
              </span>
              <span className={`text-xs ${contractsAgreed ? "text-foreground" : "text-muted-foreground"}`}>
                Contracts agreed
              </span>
            </button>
          ) : (
            <ReadinessItem label="Contracts agreed" checked={contractsAgreed} />
          )}

          {/* Rollback owner — interactive for managers */}
          {canManage ? (
            <div className="flex items-center gap-2">
              <span
                className={[
                  "flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                  rollbackAssigned
                    ? "border-success bg-success text-card"
                    : "border-border bg-background text-muted-foreground",
                ].join(" ")}
                aria-hidden="true"
              >
                {rollbackAssigned ? "✓" : "–"}
              </span>
              <select
                value={rollbackOwnerId}
                onChange={(e) => handleRollbackOwner(e.target.value)}
                disabled={isPending}
                className="flex-1 rounded border border-border bg-card px-2 py-0.5 text-xs text-foreground focus:border-brand-primary focus:outline-none disabled:opacity-50"
              >
                <option value="">Rollback owner…</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <ReadinessItem
              label={
                milestone.rollbackOwnerName
                  ? `Rollback: ${milestone.rollbackOwnerName}`
                  : "Rollback owner assigned"
              }
              checked={rollbackAssigned}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function MilestonesSection({ projectId, milestones, teamMembers, canManage }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isCreating, startCreating] = useTransition();

  function handleCreate() {
    if (!name.trim() || !targetDate) {
      toast.error("Name and target date are required.");
      return;
    }
    startCreating(async () => {
      const result = await createMilestone({ projectId, name, targetDate });
      if (result.error) {
        toast.error(result.error);
      } else {
        setName("");
        setTargetDate("");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  const sorted = [...milestones].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
          {milestones.length > 0 && (
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {milestones.length}
            </span>
          )}
        </div>
        {canManage && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
          >
            + Add milestone
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            New milestone
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="e.g. API freeze"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              disabled={isCreating}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-50"
            >
              {isCreating ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setName(""); setTargetDate(""); }}
              disabled={isCreating}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Milestone cards */}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canManage ? "No milestones yet — add one above." : "No milestones defined for this project."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              teamMembers={teamMembers}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
