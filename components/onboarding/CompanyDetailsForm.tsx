"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { completeOnboarding } from "@/actions/users";

type OrgSize = "1-10" | "11-50" | "51-200" | "201-500" | "500+";

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "E-commerce",
  "Marketing",
  "Retail",
  "Other",
] as const;

const SIZE_OPTIONS: OrgSize[] = ["1-10", "11-50", "51-200", "201-500", "500+"];

export function CompanyDetailsForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState<OrgSize | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Company name is required.";
    if (!description.trim()) next.description = "Description is required.";
    if (!industry) next.industry = "Please select an industry.";
    if (!size) next.size = "Please select a team size.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      const result = await completeOnboarding({
        name: name.trim(),
        description: description.trim(),
        industry,
        size: size as OrgSize,
      });
      if (result && !result.success) {
        toast.error(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60";
  const labelClass =
    "mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="grid gap-4">
      {/* Company name */}
      <div>
        <label className={labelClass}>Company name</label>
        <input
          type="text"
          placeholder="Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className={inputClass}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>What does your company do?</label>
        <textarea
          rows={3}
          placeholder="We build software that helps teams ship faster..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-destructive">{errors.description}</p>
        )}
      </div>

      {/* Industry */}
      <div>
        <label className={labelClass}>Industry</label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          disabled={isPending}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="" disabled>
            Select industry…
          </option>
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {errors.industry && (
          <p className="mt-1 text-xs text-destructive">{errors.industry}</p>
        )}
      </div>

      {/* Team size */}
      <div>
        <label className={labelClass}>Team size</label>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSize(opt)}
              disabled={isPending}
              className={[
                "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                size === opt
                  ? "border-brand-primary bg-brand-primary text-card"
                  : "border-border bg-card text-foreground hover:border-brand-secondary",
              ].join(" ")}
            >
              {opt}
            </button>
          ))}
        </div>
        {errors.size && <p className="mt-1 text-xs text-destructive">{errors.size}</p>}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-2 h-11 w-full rounded-lg bg-foreground text-sm font-bold text-card transition-colors hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating workspace…" : "Create workspace"}
      </button>
    </div>
  );
}
