import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { inviteLinks, organizations } from "@/lib/schema";
import { and, eq, isNull } from "drizzle-orm";
import { JoinOrgForm } from "@/components/onboarding/JoinOrgForm";
import type { SessionUser } from "@/lib/auth-types";

type Props = {
  params: Promise<{ code: string }>;
};

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive-light">
          <span className="text-xl text-destructive">✕</span>
        </div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-card hover:opacity-90"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect(`/login?redirect=/join/${code}`);
  }

  const currentUser: SessionUser = session.user;

  if (currentUser.onboardingCompleted) {
    redirect("/dashboard");
  }

  const now = new Date();

  const [invite] = await db
    .select()
    .from(inviteLinks)
    .where(and(eq(inviteLinks.code, code), isNull(inviteLinks.usedAt)));

  if (!invite) {
    return (
      <ErrorCard
        title="Invalid invite link"
        message="This invite link is invalid or has already been used. Ask your workspace owner for a new one."
      />
    );
  }

  if (invite.expiresAt <= now) {
    return (
      <ErrorCard
        title="Invite link expired"
        message="This invite link has expired. Ask your workspace owner to send you a new one."
      />
    );
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, description: organizations.description })
    .from(organizations)
    .where(eq(organizations.id, invite.organizationId));

  if (!org) {
    return (
      <ErrorCard
        title="Organization not found"
        message="This invite link is no longer valid. Ask your workspace owner for a new one."
      />
    );
  }

  return (
    <main className="grid h-screen overflow-hidden bg-card text-foreground lg:grid-cols-2">
      {/* Left — brand panel */}
      <section className="hidden flex-col justify-between bg-foreground px-6 py-8 text-card sm:px-10 lg:flex lg:px-14 lg:py-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="DevFlow home">
          <span className="flex size-9 items-center justify-center rounded-lg bg-card text-[11px] font-bold text-foreground">
            DF
          </span>
          <span className="text-lg font-bold leading-7 text-card">DevFlow</span>
        </Link>

        <div className="max-w-[520px]">
          <p className="font-mono text-xs font-semibold uppercase text-brand-secondary">
            You&apos;ve been invited
          </p>
          <p className="mt-5 text-xl font-bold leading-[1.3] text-card lg:text-[26px]">
            Join <span className="text-card">{org.name}</span> on DevFlow and start collaborating.
          </p>
          <p className="mt-5 text-sm font-medium leading-5 text-brand-secondary">
            {org.description}
          </p>
        </div>

        <p className="font-mono text-xs text-brand-secondary">&copy; 2026 DevFlow</p>
      </section>

      {/* Right — join confirmation */}
      <section className="flex h-screen items-center justify-center overflow-y-auto bg-card px-6 py-8 sm:px-10 lg:px-14">
        <div className="w-full max-w-[420px]">
          <header className="mb-7">
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              Join {org.name}
            </h1>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              You&apos;ve been invited to join as a{" "}
              <span className="font-semibold text-foreground">
                {invite.role === "team_lead"
                  ? "Team Lead"
                  : invite.role === "project_manager"
                    ? "Project Manager"
                    : "Developer"}
              </span>
              .
            </p>
          </header>

          <JoinOrgForm inviteCode={code} orgName={org.name} role={invite.role} />
        </div>
      </section>
    </main>
  );
}
