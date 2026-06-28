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
    <main className="grid min-h-screen bg-card text-foreground lg:grid-cols-2">
      <section className="flex min-h-[420px] flex-col justify-between bg-foreground px-6 py-8 text-card sm:px-10 lg:min-h-screen lg:px-[72px] lg:py-[72px]">
        <Link href="/" className="flex items-center gap-3" aria-label="DevFlow home">
          <span className="flex size-[42px] items-center justify-center rounded-lg bg-card text-[13px] font-bold text-foreground">
            DF
          </span>
          <span className="text-2xl font-bold leading-8 text-card">DevFlow</span>
        </Link>

        <div className="max-w-[690px] py-14 lg:py-0">
          <p className="font-mono text-sm font-semibold uppercase text-brand-secondary sm:text-base">
            From the team
          </p>
          <blockquote className="mt-8 text-3xl font-bold leading-[1.25] text-card sm:text-4xl lg:text-[38px]">
            &quot;DevFlow ended our &apos;who&apos;s working on auth?&apos; standups. Every module has an
            owner now and the health badge tells us the truth.&quot;
          </blockquote>
          <p className="mt-8 text-xl font-medium leading-7 text-brand-secondary">
            &mdash; Priya N., PM at Atlas Payments
          </p>
        </div>

        <p className="font-mono text-base font-semibold text-brand-secondary">&copy; 2026 DevFlow</p>
      </section>

      <section className="flex min-h-screen items-start justify-center bg-card px-6 py-12 sm:px-10 lg:px-16 lg:pt-20">
        <div className="w-full max-w-[575px]">
          <header>
            <h1 className="text-4xl font-bold leading-tight text-foreground">{title}</h1>
            <p className="mt-2 text-2xl leading-8 text-muted-foreground">{subtitle}</p>
          </header>

          <div className="mt-10 grid gap-3">
            <button
              type="button"
              className="flex h-[62px] w-full items-center justify-center gap-4 rounded-lg border border-border bg-card text-2xl font-medium text-foreground"
            >
              <span className="font-mono text-base font-bold">G</span>
              Continue with Google
            </button>
            <button
              type="button"
              className="flex h-[62px] w-full items-center justify-center gap-4 rounded-lg border border-border bg-card text-2xl font-medium text-foreground"
            >
              <Code2 className="size-7" aria-hidden="true" />
              Continue with GitHub
            </button>
          </div>

          <div className="my-10 flex items-center gap-5">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-sm font-semibold uppercase text-muted-foreground">Or email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form method="post" className="grid gap-7">
            {fields.map((field) => (
              <label key={field.name} className="grid gap-3">
                <span className="font-mono text-sm font-semibold uppercase text-foreground">{field.label}</span>
                <input
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  className="h-14 rounded-lg border border-border bg-card px-5 text-2xl text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                />
              </label>
            ))}

            <button
              type="submit"
              className="mt-2 h-[60px] rounded-lg bg-foreground text-2xl font-bold text-card hover:bg-brand-primary"
            >
              {submitLabel}
            </button>
          </form>

          <p className="mt-9 text-center text-2xl leading-8 text-muted-foreground">
            {footerText}{" "}
            <Link href={footerHref} className="font-bold text-foreground">
              {footerLinkLabel}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
