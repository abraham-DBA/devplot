import Link from "next/link";
import { Code2 } from "lucide-react";

type AuthField = {
  label: string;
  name: string;
  type: "email" | "password" | "text";
  placeholder: string;
};

type AuthShellProps = {
  title: string;
  subtitle: string;
  fields: readonly AuthField[];
  submitLabel: string;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
};

export function AuthShell({
  title,
  subtitle,
  fields,
  submitLabel,
  footerText,
  footerHref,
  footerLinkLabel,
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
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand-secondary">
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

          <div className="mt-6 grid gap-2">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <span className="font-mono text-sm font-bold">G</span>
              Continue with Google
            </button>
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <Code2 className="size-5" aria-hidden="true" />
              Continue with GitHub
            </button>
          </div>

          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">Or email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form method="post" className="grid gap-4">
            {fields.map((field) => (
              <label key={field.name} className="grid gap-1.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-foreground">{field.label}</span>
                <input
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  className="h-10 rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </label>
            ))}

            <button
              type="submit"
              className="mt-1 h-11 rounded-lg bg-foreground text-sm font-bold text-card transition-colors hover:bg-brand-primary"
            >
              {submitLabel}
            </button>
          </form>

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
