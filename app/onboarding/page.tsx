import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CompanyDetailsForm } from "@/components/onboarding/CompanyDetailsForm";
import type { SessionUser } from "@/lib/auth-types";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const user: SessionUser = session.user;
  if (user.onboardingCompleted) redirect("/dashboard");

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
            Set up your organization
          </p>
          <p className="mt-5 text-xl font-bold leading-[1.3] text-card lg:text-[26px]">
            Your team&apos;s home in DevFlow — create your workspace and invite teammates with a
            single link.
          </p>
          <p className="mt-5 text-sm font-medium leading-5 text-brand-secondary">
            You&apos;ll be the workspace owner. Your colleagues join by picking their role.
          </p>
        </div>

        <p className="font-mono text-xs text-brand-secondary">&copy; 2026 DevFlow</p>
      </section>

      {/* Right — company details form */}
      <section className="flex h-screen items-center justify-center overflow-y-auto bg-card px-6 py-8 sm:px-10 lg:px-14">
        <div className="w-full max-w-[420px]">
          <header className="mb-7">
            <h1 className="text-2xl font-bold leading-tight text-foreground">
              Let&apos;s set up your workspace
            </h1>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Tell us about your company so your team knows where they&apos;re joining.
            </p>
          </header>

          <CompanyDetailsForm />
        </div>
      </section>
    </main>
  );
}
