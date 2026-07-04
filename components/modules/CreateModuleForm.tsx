"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createModule } from "@/actions/modules";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUILTIN_TEMPLATES, applyTemplate } from "@/lib/module-templates";

type ModuleStatus = "not_started" | "in_progress" | "review" | "blocked";

type DeveloperOption = {
  id: string;
  name: string;
};

type ModuleOption = {
  id: string;
  name: string;
};

type MilestoneOption = {
  id: string;
  name: string;
};

type Props = {
  projectId: string;
  developers: DeveloperOption[];
  currentUserId: string;
  defaultDeadline: string;
  existingModules: ModuleOption[];
  milestones: MilestoneOption[];
};

const STATUSES: { value: ModuleStatus; label: string }[] = [
  { value: "not_started", label: "NOT STARTED" },
  { value: "in_progress", label: "IN PROGRESS" },
  { value: "review",      label: "REVIEW" },
  { value: "blocked",     label: "BLOCKED" },
];

export function CreateModuleForm({
  projectId,
  developers,
  currentUserId,
  defaultDeadline,
  existingModules,
  milestones,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState(() => {
    const hasCurrentUser = developers.some((d) => d.id === currentUserId);
    return hasCurrentUser ? currentUserId : (developers[0]?.id || "");
  });
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [status, setStatus] = useState<ModuleStatus>("not_started");
  const [progress, setProgress] = useState(0);
  const [dependsOnModuleIds, setDependsOnModuleIds] = useState<string[]>([]);
  const [templateNotes, setTemplateNotes] = useState("");
  const [milestoneId, setMilestoneId] = useState("");

  const activeTemplate = BUILTIN_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? null;

  function pickTemplate(templateId: string) {
    if (templateId === selectedTemplateId) {
      // Deselect → reset to blank
      setSelectedTemplateId(null);
      setName("");
      setDescription("");
      setDeadline(defaultDeadline);
      setTemplateNotes("");
      return;
    }
    const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const applied = applyTemplate(template, new Date().toISOString().split("T")[0]);
    setSelectedTemplateId(templateId);
    setName(applied.name);
    setDescription(applied.description);
    setDeadline(applied.deadline);
    setTemplateNotes(applied.technicalNotes);
  }

  function toggleDependency(moduleId: string) {
    setDependsOnModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createModule({
        projectId,
        name,
        description,
        assignedDeveloperId: ownerId,
        deadline,
        status,
        progress,
        dependsOnModuleIds,
        technicalNotes: templateNotes || undefined,
        milestoneId: milestoneId || null,
      });
      if (result?.error) {
        toast.error(result.error);
      }
      // on success, createModule calls redirect() server-side
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left — form card */}
      <div className="flex-1 rounded-xl border border-border bg-card p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">

        {/* Template picker */}
        <div>
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Start from a template
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick one to pre-fill the form, or leave blank and start fresh.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BUILTIN_TEMPLATES.map((t) => {
              const isActive = selectedTemplateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  disabled={isPending}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                    isActive
                      ? "border-foreground bg-foreground text-card"
                      : "border-border bg-card text-foreground hover:bg-background",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {activeTemplate && activeTemplate.seedNotes.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {activeTemplate.seedNotes.length} starter note
              {activeTemplate.seedNotes.length !== 1 ? "s" : ""} will be added automatically.
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-border" />

        {/* Module name */}
        <div>
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Module Name
          </label>
          <input
            type="text"
            placeholder="e.g. Authentication & SSO"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="mt-2 h-12 w-full rounded-lg border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
          />
        </div>

        {/* Description */}
        <div className="mt-6">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </label>
          <textarea
            placeholder="What this module delivers and any key constraints."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            rows={4}
            className="mt-2 w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
          />
        </div>

        {/* Owner + Deadline */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Owner
            </label>
            <Select
              value={ownerId}
              onValueChange={setOwnerId}
              disabled={isPending}
            >
              <SelectTrigger className="mt-2 h-12 w-full border-border bg-card text-foreground text-sm rounded-lg px-4 justify-between">
                <SelectValue placeholder="Select developer" />
              </SelectTrigger>
              <SelectContent position="popper">
                {developers.map((dev) => (
                  <SelectItem key={dev.id} value={dev.id}>
                    {dev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isPending}
              className="mt-2 h-12 w-full rounded-lg border border-border bg-card px-4 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            />
          </div>
        </div>

        {/* Initial Status */}
        <div className="mt-6">
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Initial Status
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const isActive = status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  disabled={isPending}
                  className={[
                    "rounded-lg border px-4 py-2 text-xs font-semibold transition-colors",
                    isActive
                      ? "border-foreground bg-foreground text-card"
                      : "border-border bg-card text-foreground hover:bg-background",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Starting Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Starting Progress
            </label>
            <span className="font-mono text-sm font-semibold text-muted-foreground">
              {progress}%
            </span>
          </div>
          <Slider
            value={[progress]}
            onValueChange={(val) => setProgress(val[0])}
            max={100}
            step={1}
            disabled={isPending}
            className="mt-3 w-full"
          />
        </div>

        {/* Depends on */}
        {existingModules.length > 0 && (
          <div className="mt-6">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Depends On
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              This module won&apos;t be considered safe to ship until these are unblocked.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {existingModules.map((mod) => {
                const isActive = dependsOnModuleIds.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleDependency(mod.id)}
                    disabled={isPending}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-foreground bg-foreground text-card"
                        : "border-border bg-card text-foreground hover:bg-background",
                    ].join(" ")}
                  >
                    {mod.name}
                  </button>
                );
              })}
            </div>
            {/* Soft suggestion from template */}
            {activeTemplate && activeTemplate.suggestedDepNames.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Typically depends on:{" "}
                <span className="font-medium text-foreground">
                  {activeTemplate.suggestedDepNames.join(", ")}
                </span>
                {" "}— wire it above if that module exists.
              </p>
            )}
          </div>
        )}

        {/* Milestone assignment */}
        {milestones.length > 0 && (
          <div className="mt-6">
            <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Milestone
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Assign this module to a release milestone.
            </p>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={isPending}
              className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
            >
              <option value="">None</option>
              {milestones.map((ms) => (
                <option key={ms.id} value={ms.id}>
                  {ms.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Suggested deps hint when no existing modules yet */}
        {existingModules.length === 0 &&
          activeTemplate &&
          activeTemplate.suggestedDepNames.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground">
                Tip: this template typically depends on{" "}
                <span className="font-medium text-foreground">
                  {activeTemplate.suggestedDepNames.join(", ")}
                </span>
                . Create that module first, then link the dependency here.
              </p>
            </div>
          )}
      </div>

      {/* Right — tip + actions */}
      <div className="w-full lg:w-[300px]">
        {/* Tip card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tip
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Modules with one owner ship 2× faster. Multi-owner modules tend to stall on hand-offs.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-12 w-full rounded-lg bg-foreground text-sm font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add module"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="h-12 w-full rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
