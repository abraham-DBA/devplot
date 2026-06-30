import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { user, organizations, organizationMembers } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { Navbar } from "@/components/dashboard/Navbar";
import { TeamClient } from "@/components/team/TeamClient";
import type { SessionUser } from "@/lib/auth-types";
import { getRequestOrigin } from "@/lib/get-request-origin";

type MemberRole = "owner" | "developer" | "team_lead" | "project_manager";

export default async function TeamPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const currentUser: SessionUser = session.user;
  const orgId = currentUser.organizationId;
  if (!orgId) redirect("/onboarding");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));
  if (!org) redirect("/onboarding");

  // Fetch org members
  const orgMemberRows = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));

  const memberUserIds = orgMemberRows.map((m) => m.userId);
  const userRows =
    memberUserIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, memberUserIds))
      : [];

  const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

  const members = orgMemberRows.map((m) => {
    const u = userMap[m.userId];
    return {
      id: m.userId,
      name: u?.name ?? "Unknown",
      email: u?.email ?? "",
      role: m.role as MemberRole,
      joinedAt: m.joinedAt.toISOString().split("T")[0],
      status: "active" as const,
    };
  });

  const stats = {
    members: members.length,
    active: members.length,
    owners: members.filter((m) => m.role === "owner").length,
    leadsAndPMs: members.filter(
      (m) => m.role === "team_lead" || m.role === "project_manager",
    ).length,
  };

  const appUrl = await getRequestOrigin();
  const inviteBase = `${appUrl}/join`;

  // Only the owner can invite — non-owners never receive the invite code, not even in the page payload.
  const isOwner = currentUser.role === "owner";
  const initialInviteCode = isOwner ? org.inviteCode : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userName={currentUser.name} userRole={currentUser.role ?? "developer"} />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-8 py-8">
        <TeamClient
          members={members}
          stats={stats}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role ?? "developer"}
          inviteBase={inviteBase}
          initialInviteCode={initialInviteCode}
        />
      </main>
    </div>
  );
}
