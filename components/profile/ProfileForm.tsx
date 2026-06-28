"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/actions/users";

type Role = "developer" | "team_lead" | "project_manager";

type OwnedModule = {
  id: string;
  name: string;
  projectName: string;
  progress: number;
  status: string;
};

type ConnectedAccount = {
  provider: "google" | "github";
  connected: boolean;
};

type Props = {
  initialName: string;
  email: string;
  initialRole: Role;
  initials: string;
  ownedModules: OwnedModule[];
  connectedAccounts: ConnectedAccount[];
};

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "developer",        label: "Developer",       description: "Update progress on assigned modules." },
  { value: "team_lead",        label: "Team Lead",       description: "Create modules and manage team." },
  { value: "project_manager",  label: "Project Manager", description: "Create projects and oversee delivery." },
];

const STATUS_LABELS: Record<string, string> = {
  not_started: "NOT STARTED",
  in_progress:  "IN PROGRESS",
  review:       "REVIEW",
  completed:    "COMPLETED",
  blocked:      "BLOCKED",
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "text-muted-foreground",
  in_progress:  "text-success",
  review:       "text-warning",
  completed:    "text-success",
  blocked:      "text-destructive",
};

function ProviderIcon({ provider }: { provider: "google" | "github" }) {
  if (provider === "google") {
    return (
      <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-card">
        G
      </span>
    );
  }
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-card">
      {/* GitHub mark */}
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.744 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    </span>
  );
}

export function ProfileForm({
  initialName,
  email,
  initialRole,
  initials,
  ownedModules,
  connectedAccounts,
}: Props) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<Role>(initialRole);
  // savedName/savedRole track the last value persisted to DB.
  // isDirty compares against these so the form resets correctly after each save
  // without needing a full page reload (same pattern as ModuleDetailClient).
  const [savedName, setSavedName] = useState(initialName);
  const [savedRole, setSavedRole] = useState<Role>(initialRole);
  const [isPending, startTransition] = useTransition();

  const isDirty = name.trim() !== savedName || role !== savedRole;

  function handleSave() {
    if (!name.trim()) {
      toast.error("Display name is required.");
      return;
    }
    startTransition(async () => {
      const trimmedName = name.trim();
      const result = await updateProfile({ name: trimmedName, role });
      if (result.error) {
        toast.error(result.error);
      } else {
        setSavedName(trimmedName);
        setSavedRole(role);
        setName(trimmedName);
        toast.success("Changes saved.");
      }
    });
  }

  function handleCancel() {
    setName(savedName);
    setRole(savedRole);
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">

      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">

        {/* Identity card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          {/* Avatar + display name + email */}
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-card text-lg">
              {initials}
            </span>
            <div>
              <p className="text-lg font-semibold text-foreground">{savedName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground opacity-60 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Role card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Role
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role determines what actions you can take on{" "}
            <span className="text-foreground">projects</span> and{" "}
            <span className="text-foreground">modules</span>.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  disabled={isPending}
                  className={[
                    "rounded-xl border p-4 text-left transition-colors",
                    selected
                      ? "border-foreground bg-muted"
                      : "border-border bg-card hover:bg-background",
                    "disabled:opacity-50",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {r.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected accounts card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Connected Accounts
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {connectedAccounts.map((acct) => (
              <li
                key={acct.provider}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={acct.provider} />
                  <div>
                    <p className="text-sm font-semibold text-foreground capitalize">
                      {acct.provider === "github" ? "GitHub" : "Google"}
                    </p>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {acct.connected ? "Connected" : "Not Connected"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground opacity-70 cursor-not-allowed"
                >
                  {acct.connected ? "Disconnect" : "Connect"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Save / Cancel */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending || !isDirty}
            className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !isDirty}
            className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-card transition-colors hover:bg-brand-primary disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* ── Right column — Your modules ─────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Your modules</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Modules you own across all projects.</p>

        <div className="mt-4 flex flex-col gap-3">
          {ownedModules.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No modules assigned yet.</p>
            </div>
          ) : (
            ownedModules.map((mod) => (
              <div
                key={mod.id}
                className="rounded-xl border border-border bg-card p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
              >
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {mod.projectName}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{mod.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{mod.progress}%</span>
                  <span className={`font-mono text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[mod.status] ?? "text-muted-foreground"}`}>
                    {STATUS_LABELS[mod.status] ?? mod.status.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
