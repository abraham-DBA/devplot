"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateModule } from "@/actions/modules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DeveloperOption = {
  id: string;
  name: string;
};

type Props = {
  moduleId: string;
  projectId: string;
  developers: DeveloperOption[];
  initialValues: {
    name: string;
    description: string;
    assignedDeveloperId: string;
    deadline: string;
  };
};

export function EditModuleForm({ moduleId, projectId, developers, initialValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [ownerId, setOwnerId] = useState(initialValues.assignedDeveloperId);
  const [deadline, setDeadline] = useState(initialValues.deadline);

  function handleSubmit() {
    startTransition(async () => {
      const result = await updateModule(moduleId, {
        name,
        description,
        assignedDeveloperId: ownerId,
        deadline,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Module updated.");
        router.push(`/projects/${projectId}/modules/${moduleId}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Left — form card */}
      <div className="flex-1 rounded-xl border border-border bg-card p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">

        {/* Module name */}
        <div>
          <label className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Module Name
          </label>
          <input
            type="text"
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
            <Select value={ownerId} onValueChange={setOwnerId} disabled={isPending}>
              <SelectTrigger className="mt-2 h-12 w-full rounded-lg border-border bg-card px-4 text-sm text-foreground justify-between">
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

        <p className="mt-4 text-xs text-muted-foreground">
          Status, progress, and dependencies are managed from the module detail page.
        </p>
      </div>

      {/* Right — actions */}
      <div className="w-full lg:w-[300px]">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-12 w-full rounded-lg bg-foreground text-sm font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/projects/${projectId}/modules/${moduleId}`)}
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
