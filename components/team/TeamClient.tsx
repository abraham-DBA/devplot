"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { updateMemberRole, removeMember, rotateInviteCode } from "@/actions/team";
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
// All org members are immediately "active" — joining via invite link grants
// full membership with no approval step, so there's no "pending" state for
// any member to ever be in. Don't reintroduce a Pending filter without an
// actual pending-membership concept behind it.
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
  initialInviteCode: string | null;
};

const editableRoleOptions: { value: Exclude<MemberRole, "owner">; label: string }[] = [
  { value: "developer", label: "Developer" },
  { value: "team_lead", label: "Team Lead" },
  { value: "project_manager", label: "Project Manager" },
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

const CAN_CHANGE_ROLES = ["owner", "project_manager", "team_lead"];
const CAN_REMOVE_MEMBERS = ["owner", "project_manager"];

export function TeamClient({ members, stats, currentUserId, currentUserRole, inviteBase, initialInviteCode }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? "");
  const [isRotating, setIsRotating] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Inviting (viewing/copying/regenerating the link) is owner-only.
  const canInvite = currentUserRole === "owner" && initialInviteCode !== null;
  const currentInviteLink = `${inviteBase}/${inviteCode}`;

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

  function handleCopyLink() {
    navigator.clipboard
      .writeText(currentInviteLink)
      .then(() => toast.success("Invite link copied!"))
      .catch(() => toast.error("Failed to copy link. Please copy it manually."));
  }

  function handleRotateInvite() {
    if (!confirm("Regenerate the invite link? The old link will stop working immediately.")) return;
    setIsRotating(true);
    startTransition(async () => {
      const result = await rotateInviteCode();
      setIsRotating(false);
      if (!result.success) {
        toast.error(result.error ?? "Failed to regenerate invite link.");
      } else {
        setInviteCode(result.newCode!);
        toast.success("Invite link regenerated.");
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

      {/* Invite modal — shareable link, owner-only */}
      {inviteOpen && canInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInviteOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Invite someone to your team</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this link with anyone you want to invite. They&apos;ll pick their role when they join.
            </p>

            <div className="mt-5">
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Invite link
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={currentInviteLink}
                  className="h-10 flex-1 truncate rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={isPending}
                  className="shrink-0 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-card transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
              <button
                type="button"
                onClick={handleRotateInvite}
                disabled={isPending}
                className="mt-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                {isRotating ? "Regenerating…" : "Regenerate link"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="mt-5 w-full rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Close
            </button>
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
              They will immediately lose access to this workspace and will need a new invite link to
              rejoin.
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
