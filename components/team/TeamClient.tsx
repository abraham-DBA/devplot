"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { updateMemberRole, removeMember, createInvite, revokeInvite } from "@/actions/team";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MemberRole = "owner" | "developer" | "team_lead" | "project_manager";
type InviteRole = "developer" | "team_lead" | "project_manager";
// All org members are immediately "active" — joining via invite link grants
// full membership with no approval step, so there's no "pending" state for
// any member to ever be in.
type MemberStatus = "active";
type Filter = "all" | "active";

type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
  status: MemberStatus;
};

type PendingInvite = {
  id: string;
  email: string;
  role: InviteRole;
  expiresAt: string;
  code: string;
};

type Stats = {
  members: number;
  active: number;
  owners: number;
  leadsAndPMs: number;
};

type Props = {
  members: Member[];
  stats: Stats;
  currentUserId: string;
  currentUserRole: string;
  inviteBase: string;
  pendingInvites: PendingInvite[];
};

const editableRoleOptions: { value: Exclude<MemberRole, "owner">; label: string }[] = [
  { value: "developer", label: "Developer" },
  { value: "team_lead", label: "Team Lead" },
  { value: "project_manager", label: "Project Manager" },
];

const inviteRoleOptions: { value: InviteRole; label: string; description: string; icon: string }[] = [
  { value: "developer", label: "Developer", description: "Build features, fix bugs, and ship code.", icon: "⌨" },
  { value: "team_lead", label: "Team Lead", description: "Guide your team, review work, and unblock progress.", icon: "◈" },
  { value: "project_manager", label: "Project Manager", description: "Plan timelines, track deliverables, and coordinate teams.", icon: "◎" },
];

const filterTabs: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
];

const roleLabel: Record<MemberRole, string> = {
  owner: "Owner",
  developer: "Developer",
  team_lead: "Team Lead",
  project_manager: "Project Manager",
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const CAN_CHANGE_ROLES = ["owner", "project_manager", "team_lead"];
const CAN_REMOVE_MEMBERS = ["owner", "project_manager"];

export function TeamClient({ members, stats, currentUserId, currentUserRole, inviteBase, pendingInvites: initialPendingInvites }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("developer");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPendingInvites);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canInvite = currentUserRole === "owner";
  const canChangeRoles = CAN_CHANGE_ROLES.includes(currentUserRole);
  const canRemoveMembers = CAN_REMOVE_MEMBERS.includes(currentUserRole);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === "" ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      roleLabel[m.role].toLowerCase().includes(q);
    const matchesFilter = filter === "all" || m.status === filter;
    return matchesSearch && matchesFilter;
  });

  function handleRoleChange(memberId: string, newRole: MemberRole) {
    if (newRole === "owner") return;
    startTransition(async () => {
      const result = await updateMemberRole(memberId, newRole as Exclude<MemberRole, "owner">);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update role");
      } else {
        toast.success("Role updated");
      }
    });
  }

  function handleRemove(memberId: string, memberName: string) {
    startTransition(async () => {
      const result = await removeMember(memberId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove member");
      } else {
        toast.success(`${memberName} removed from workspace`);
      }
      setMemberToRemove(null);
    });
  }

  function handleCreateInvite() {
    startTransition(async () => {
      const result = await createInvite(inviteEmail.trim(), inviteRole);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create invite");
        return;
      }
      const link = `${inviteBase}/${result.code}`;
      setCreatedLink(link);
      // Optimistically add to pending list using the real DB id so revoke works immediately.
      setPendingInvites((prev) => [
        ...prev,
        {
          id: result.id!,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          code: result.code!,
        },
      ]);
    });
  }

  function handleCopyCreatedLink() {
    if (!createdLink) return;
    navigator.clipboard
      .writeText(createdLink)
      .then(() => toast.success("Invite link copied!"))
      .catch(() => toast.error("Failed to copy. Please copy it manually."));
  }

  function handleCloseInviteModal() {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("developer");
    setCreatedLink(null);
  }

  function handleRevoke(inviteId: string, email: string) {
    startTransition(async () => {
      const result = await revokeInvite(inviteId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to revoke invite");
      } else {
        setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        toast.success(`Invite for ${email} revoked`);
      }
    });
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite developers, assign roles, and manage who can access your projects.
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-card transition-opacity hover:opacity-90"
          >
            + Invite member
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Members", value: stats.members },
          { label: "Active", value: stats.active },
          { label: "Owners", value: stats.owners },
          { label: "Leads & PMs", value: stats.leadsAndPMs },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]"
          >
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <p className="mt-2 text-[32px] font-semibold leading-10 text-brand-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or role"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-72 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={[
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                filter === tab.value
                  ? "bg-foreground text-card"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Member
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Joined
              </th>
              <th className="px-6 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No members found
                </td>
              </tr>
            ) : (
              filtered.map((member) => {
                const isOwner = member.role === "owner";
                const isSelf = member.id === currentUserId;
                return (
                  <tr key={member.id} className="transition-colors hover:bg-background">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-card">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {isOwner || !canChangeRoles || isSelf ? (
                        <span className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">
                          {roleLabel[member.role]}
                        </span>
                      ) : (
                        <div className="relative inline-block w-44">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as MemberRole)}
                            disabled={isPending}
                            className="w-full cursor-pointer appearance-none rounded-lg border border-border bg-card px-3 py-1.5 pr-8 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-60"
                          >
                            {editableRoleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground">{member.joinedAt}</td>
                    <td className="px-6 py-4 text-right">
                      {!isSelf && !isOwner && canRemoveMembers && (
                        <button
                          type="button"
                          onClick={() => setMemberToRemove({ id: member.id, name: member.name })}
                          disabled={isPending}
                          className="text-sm font-medium text-destructive transition-opacity hover:opacity-75 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pending invites — owner only */}
      {canInvite && (
        <div className="mt-6">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pending Invites
          </h2>
          {pendingInvites.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingInvites.map((inv) => (
                    <tr key={inv.id} className="transition-colors hover:bg-background">
                      <td className="px-6 py-4 text-sm text-foreground">{inv.email}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                          {roleLabel[inv.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatExpiry(inv.expiresAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevoke(inv.id, inv.email)}
                          disabled={isPending}
                          className="text-sm font-medium text-destructive transition-opacity hover:opacity-75 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && canInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseInviteModal();
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            {createdLink ? (
              /* Step 2 — show generated link */
              <>
                <h2 className="text-lg font-semibold text-foreground">Invite link created</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Share this link with <span className="font-medium text-foreground">{inviteEmail}</span>.
                  It expires in 7 days and can only be used once.
                </p>
                <div className="mt-5">
                  <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Invite link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={createdLink}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="h-10 flex-1 truncate rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyCreatedLink}
                      className="shrink-0 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-card transition-opacity hover:opacity-90"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseInviteModal}
                  className="mt-5 w-full rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
                >
                  Done
                </button>
              </>
            ) : (
              /* Step 1 — email + role form */
              <>
                <h2 className="text-lg font-semibold text-foreground">Invite a team member</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter their email and assign a role. They&apos;ll join with exactly that role — no changes on their end.
                </p>

                <div className="mt-5">
                  <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Email address
                  </label>
                  <input
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isPending}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Role
                  </label>
                  <div className="grid gap-2">
                    {inviteRoleOptions.map((opt) => {
                      const isSelected = inviteRole === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setInviteRole(opt.value)}
                          disabled={isPending}
                          className={[
                            "flex items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:opacity-60",
                            isSelected
                              ? "border-brand-primary ring-1 ring-brand-primary"
                              : "border-border hover:border-brand-secondary",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors",
                              isSelected
                                ? "border-brand-primary bg-brand-primary text-card"
                                : "border-border bg-background text-muted-foreground",
                            ].join(" ")}
                          >
                            {opt.icon}
                          </span>
                          <span className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                            <span className="mt-0.5 text-xs text-muted-foreground">{opt.description}</span>
                          </span>
                          {isSelected && (
                            <span className="ml-auto mt-0.5 shrink-0 text-brand-primary">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseInviteModal}
                    disabled={isPending}
                    className="flex-1 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInvite}
                    disabled={isPending || !inviteEmail.trim()}
                    className="flex-1 rounded-lg bg-brand-primary py-2.5 text-sm font-semibold text-card transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? "Creating…" : "Create invite"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Remove member confirmation */}
      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to this workspace and will need a new invite to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => memberToRemove && handleRemove(memberToRemove.id, memberToRemove.name)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
