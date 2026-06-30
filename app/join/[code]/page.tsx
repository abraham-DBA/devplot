import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { organizations } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { JoinOrgForm } from "@/components/onboarding/JoinOrgForm";
import type { SessionUser } from "@/lib/auth-types";

type Props = {
  params: Promise<{ code: string }>;
};

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

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.inviteCode, code));

  if (!org) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive-light">
            <span className="text-xl text-destructive">✕</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Invalid invite link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite link is invalid or has expired. Ask your workspace owner for a new one.
          </p>
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
            Join <span className="text-card">{org.name}</span> on DevFlow — pick your role and
            start collaborating.
          </p>
          <p className="mt-5 text-sm font-medium leading-5 text-brand-secondary">
            {org.description}
          </p>
        </div>

        <p className="font-mono text-xs text-brand-secondary">&copy; 2026 DevFlow</p>
      </section>

      {/* Right — role picker */}
      <section className="flex h-screen items-center justify-center overflow-y-auto bg-card px-6 py-8 sm:px-10 lg:px-14">
        <div className="w-full max-w-[420px]">
          <header className="mb-7">
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              Join {org.name}
            </h1>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Pick the role that best describes how you&apos;ll contribute.
            </p>
          </header>

          <JoinOrgForm inviteCode={code} orgName={org.name} />
        </div>
      </section>
    </main>
  );
}
