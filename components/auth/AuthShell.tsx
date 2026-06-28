import Link from "next/link";
import { type ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
  children: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  footerText,
  footerHref,
  footerLinkLabel,
  children,
}: AuthShellProps) {
  return (
    <main className="grid h-screen overflow-hidden bg-card text-foreground lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-foreground px-6 py-8 text-card sm:px-10 lg:flex lg:px-14 lg:py-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="DevFlow home">
          <span className="flex size-9 items-center justify-center rounded-lg bg-card text-[11px] font-bold text-foreground">
            DF
          </span>
          <span className="text-lg font-bold leading-7 text-card">DevFlow</span>
        </Link>

        <div className="max-w-[520px]">
          <p className="font-mono text-xs font-semibold uppercase text-brand-secondary">
            From the team
          </p>
          <blockquote className="mt-5 text-xl font-bold leading-[1.3] text-card lg:text-[26px]">
            &quot;DevFlow ended our &apos;who&apos;s working on auth?&apos; standups. Every module has an
            owner now and the health badge tells us the truth.&quot;
          </blockquote>
          <p className="mt-5 text-sm font-medium leading-5 text-brand-secondary">
            &mdash; Priya N., PM at Atlas Payments
          </p>
        </div>

        <p className="font-mono text-xs text-brand-secondary">&copy; 2026 DevFlow</p>
      </section>

      <section className="flex h-screen items-center justify-center overflow-y-auto bg-card px-6 py-8 sm:px-10 lg:px-14">
        <div className="w-full max-w-[400px]">
          <header>
            <h1 className="text-2xl font-bold leading-tight text-foreground">{title}</h1>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{subtitle}</p>
          </header>

          {children}

          <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">
            {footerText}{" "}
            <Link href={footerHref} className="font-semibold text-foreground transition-colors hover:text-brand-primary">
              {footerLinkLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
