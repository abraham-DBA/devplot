"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateModuleProgress, addNote, approveModule, requestChanges } from "@/actions/modules";
import type { NoteEntry } from "@/actions/modules";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ModuleStatus = "not_started" | "in_progress" | "review" | "blocked" | "completed";

type Props = {
  moduleId: string;
  initialProgress: number;
  initialStatus: ModuleStatus;
  notes: NoteEntry[];
  openBlockers: number;
  totalBlockers: number;
  canEdit: boolean;
  canReview: boolean;
};

// "Completed" is intentionally absent — it's only reachable via Approve, so
// the dropdown can't be used to bypass the review gate.
const STATUS_OPTIONS: { value: Exclude<ModuleStatus, "completed">; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "blocked", label: "Blocked" },
];

const NOTE_TYPES: { value: Exclude<NoteEntry["type"], "review">; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "implementation", label: "Implementation" },
  { value: "schema", label: "Schema" },
  { value: "api", label: "API" },
];

const noteTypeBadge: Record<NoteEntry["type"], string> = {
  technical: "border-success/30 bg-success-light text-success",
  implementation: "border-border bg-background text-muted-foreground",
  schema: "border-warning/30 bg-warning-light text-warning",
  api: "border-brand-primary/20 bg-card text-brand-primary",
  review: "border-destructive/20 bg-destructive-light text-destructive",
};

// ── Add Note modal ────────────────────────────────────────────────────────────

function AddNoteModal({ moduleId, onClose, onAdded }: {
  moduleId: string;
  onClose: () => void;
  onAdded: (note: NoteEntry) => void;
}) {
  const [type, setType] = useState<Exclude<NoteEntry["type"], "review">>("technical");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await addNote(moduleId, { type, title, body });
      if (result.error) {
        toast.error(result.error);
      } else {
        onAdded({
          id: crypto.randomUUID(),
          type,
          title: title.trim(),
          body: body.trim(),
          createdAt: new Date().toISOString(),
        });
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="text-base font-semibold text-foreground">Add a note</h2>

        <div className="mt-4">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Type
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {NOTE_TYPES.map((t) => (
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
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Token strategy"
            disabled={isPending}
            className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
          />
        </div>

        <div className="mt-4">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Content
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Implementation details, constraints, references…"
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
            className="flex-1 rounded-lg bg-foreground py-2.5 text-sm font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save note"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Request Changes modal ────────────────────────────────────────────────────

function RequestChangesModal({ moduleId, onClose, onRequested }: {
  moduleId: string;
  onClose: () => void;
  onRequested: (note: NoteEntry) => void;
}) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!comment.trim()) {
      toast.error("Please explain what needs to change.");
      return;
    }
    startTransition(async () => {
      const result = await requestChanges(moduleId, comment);
      if (result.error) {
        toast.error(result.error);
      } else {
        onRequested({
          id: crypto.randomUUID(),
          type: "review",
          title: "Changes requested",
          body: comment.trim(),
          createdAt: new Date().toISOString(),
        });
        toast.success("Changes requested. Module moved back to In Progress.");
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-card p-6 shadow-lg">
        <h2 className="text-base font-semibold text-foreground">Request changes</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Explain what needs to change. The module will move back to In Progress.
        </p>

        <div className="mt-4">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            What needs to change?
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. The error handling on the refund path isn't covered yet."
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
            {isPending ? "Submitting…" : "Request changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ModuleDetailClient({
  moduleId,
  initialProgress,
  initialStatus,
  notes: initialNotes,
  canEdit,
  canReview,
}: Props) {
  // Track the last-saved values separately from the in-flight edited values.
  // isDirty compares against savedProgress/savedStatus, not the SSR initialProps,
  // so the Save button correctly resets to "Saved" after each successful save.
  const [savedProgress, setSavedProgress] = useState(initialProgress);
  const [savedStatus, setSavedStatus] = useState<ModuleStatus>(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [status, setStatus] = useState<ModuleStatus>(initialStatus);
  const [notes, setNotes] = useState<NoteEntry[]>(initialNotes);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [isReviewing, startReviewTransition] = useTransition();

  const isDirty = progress !== savedProgress || status !== savedStatus;
  // Once approved, a module is locked — silently dragging the slider or
  // flipping the dropdown back would undo a formal approval with no audit
  // trail beyond a generic "updated progress" log line. Locked regardless of
  // canEdit, since canEdit's assignee/lead set is exactly who could otherwise
  // bypass the review gate this way.
  const isLocked = savedStatus === "completed";

  function handleSave() {
    startTransition(async () => {
      const result = await updateModuleProgress(moduleId, progress, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        // Advance the saved baseline so isDirty resets to false
        setSavedProgress(progress);
        setSavedStatus(status);
        toast.success("Progress saved.");
      }
    });
  }

  function handleApprove() {
    startReviewTransition(async () => {
      const result = await approveModule(moduleId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setProgress(100);
        setSavedProgress(100);
        setStatus("completed");
        setSavedStatus("completed");
        toast.success("Module approved and marked complete.");
      }
    });
  }

  function handleChangesRequested(note: NoteEntry) {
    setStatus("in_progress");
    setSavedStatus("in_progress");
    setNotes((prev) => [...prev, note]);
  }

  return (
    <div>
      {/* Progress card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Progress
          </span>
          <span className="text-[32px] font-bold leading-none text-foreground">{progress}%</span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-background">
          <div
            className="h-2 rounded-full bg-success transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Slider
            value={[progress]}
            onValueChange={(val) => setProgress(val[0])}
            max={100}
            step={1}
            disabled={isSaving || !canEdit || isLocked}
            className="flex-1"
          />
          <Select
            value={status}
            onValueChange={(val) => setStatus(val as ModuleStatus)}
            disabled={isSaving || !canEdit || isLocked}
          >
            <SelectTrigger className="h-9 w-[130px] border-border bg-card text-foreground">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent position="popper">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
              {status === "completed" && (
                <SelectItem value="completed">Completed</SelectItem>
              )}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty || !canEdit || isLocked}
            className={[
              "h-9 min-w-[72px] rounded-lg px-4 text-sm font-semibold transition-colors",
              isDirty && !isSaving && canEdit && !isLocked
                ? "bg-foreground text-card hover:bg-brand-primary"
                : "bg-background text-muted-foreground cursor-not-allowed",
            ].join(" ")}
          >
            {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
          </button>
        </div>
        {isLocked ? (
          <p className="mt-2 text-xs text-muted-foreground">
            This module is approved and completed — locked from further edits.
          </p>
        ) : (
          !canEdit && (
            <p className="mt-2 text-xs text-muted-foreground">
              Only the assigned developer or a lead/PM/owner can edit progress.
            </p>
          )
        )}

        {savedStatus === "review" && canReview && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <p className="flex-1 text-xs text-muted-foreground">
              This module is awaiting your review.
            </p>
            <button
              type="button"
              onClick={() => setShowRequestChanges(true)}
              disabled={isReviewing}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background disabled:opacity-50"
            >
              Request changes
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isReviewing}
              className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-60"
            >
              {isReviewing ? "Approving…" : "Approve"}
            </button>
          </div>
        )}
      </div>

      {/* Notes section */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Notes &amp; Documentation</h2>
          <button
            type="button"
            onClick={() => setShowAddNote(true)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
          >
            + Add note
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="mt-4 flex h-24 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No notes yet — add the first one.</p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${noteTypeBadge[note.type]}`}
                  >
                    {note.type}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAddNote && (
        <AddNoteModal
          moduleId={moduleId}
          onClose={() => setShowAddNote(false)}
          onAdded={(note) => setNotes((prev) => [...prev, note])}
        />
      )}

      {showRequestChanges && (
        <RequestChangesModal
          moduleId={moduleId}
          onClose={() => setShowRequestChanges(false)}
          onRequested={handleChangesRequested}
        />
      )}
    </div>
  );
}
