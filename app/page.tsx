import Link from "next/link";

const features = [
  {
    title: "Modular ownership",
    description:
      "Break work into Authentication, Billing, Reporting — assign one owner per module, end the responsibility fog.",
  },
  {
    title: "Live progress math",
    description:
      "Every module update rolls up to project completion. Leads never ask 'where are we?' again.",
  },
  {
    title: "Schedule risk engine",
    description:
      "If time used outruns progress by 20%, we flag the project red — before the deadline slips.",
  },
  {
    title: "Blocker surfacing",
    description:
      "One click to flag a blocker. It shows up red on every dashboard until someone unblocks it.",
  },
  {
    title: "Module knowledge base",
    description:
      "API contracts, schemas, business rules — pinned to the module that needs them. No more lost Notion pages.",
  },
  {
    title: "Real-time activity feed",
    description:
      "Every status, progress bump, and blocker is logged in order. Catch up in 30 seconds.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Create the project",
    description: "Name, dates, priority, team.",
  },
  {
    number: "02",
    title: "Define modules",
    description: "Slice scope into ownable units.",
  },
  {
    number: "03",
    title: "Track & update",
    description: "Devs push progress, flag blockers.",
  },
  {
    number: "04",
    title: "Ship on schedule",
    description: "Health badge stays green to launch.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-15 w-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5" aria-label="DevFlow home">
            <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-card">
              DF
            </span>
            <span className="text-[15px] font-bold text-foreground">DevFlow</span>
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-medium text-muted-foreground md:flex">
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </Link>
            <Link href="#get-started" className="transition-colors hover:text-foreground">
              Get started
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-foreground px-4 py-2 text-sm text-card shadow-sm transition-colors hover:bg-brand-primary"
            >
              Open app
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="mx-auto flex h-11 w-full max-w-[1280px] items-center justify-center gap-6 border-t border-border px-4 text-sm font-medium text-muted-foreground sm:px-6 md:hidden">
          <Link href="#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="#workflow" className="hover:text-foreground">
            Workflow
          </Link>
          <Link href="#get-started" className="hover:text-foreground">
            Get started
          </Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 sm:py-16 lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Delivery OS for software teams
            </p>
            <h1 className="text-[32px] font-bold leading-[1.1] text-foreground sm:text-[40px] lg:text-[48px]">
              Stop guessing where the build stands.
              <span className="block text-muted-foreground">Start shipping on schedule.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
              DevFlow turns every project into modules with clear owners, live progress, and
              instant blocker alerts — so leads can see risk before it becomes a missed deadline.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-semibold text-card shadow-sm transition-colors hover:bg-brand-primary"
              >
                Open workspace&nbsp;&rarr;
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-background"
              >
                Create an account
              </Link>
            </div>
          </div>

          {/* Mock dashboard card */}
          <div className="mt-12 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex h-10 items-center gap-2 border-b border-border bg-background px-5">
              <span className="size-3 rounded-full bg-border" />
              <span className="size-3 rounded-full bg-border" />
              <span className="size-3 rounded-full bg-border" />
              <span className="ml-3 font-mono text-sm text-muted-foreground">
                devflow.io/projects/atlas
              </span>
            </div>

            <div className="grid gap-7 p-7 md:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Project health
                </p>
                <div className="mt-2.5 flex items-baseline gap-2.5">
                  <span className="text-3xl font-semibold leading-none text-foreground">58%</span>
                  <span className="text-sm font-semibold text-foreground">At Risk</span>
                </div>
                <div className="mt-2.5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-background">
                  <div className="h-full w-[58%] bg-warning" />
                </div>
                <p className="mt-2.5 text-sm text-muted-foreground">72% of timeline used</p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Active modules
                </p>
                <p className="mt-2.5 text-3xl font-semibold leading-none text-foreground">4</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  2 in progress · 1 review · 1 blocked
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Open blockers
                </p>
                <p className="mt-2.5 text-3xl font-semibold leading-none text-destructive">1</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Reporting — waiting on Billing schema
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Why teams pick DevFlow
          </p>
          <h2 className="mt-4 max-w-2xl text-[26px] font-bold leading-snug text-foreground sm:text-[30px] lg:text-[34px]">
            Designed for the way developers actually build.
          </h2>

          <div className="mt-10 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="grid md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="border-b border-border p-7 last:border-b-0 md:odd:border-r lg:[&:nth-child(3n+1)]:border-r lg:[&:nth-child(3n+2)]:border-r lg:[&:nth-child(3n)]:border-r-0"
                >
                  <h3 className="text-base font-bold text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="bg-background">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            The flow
          </p>
          <h2 className="mt-4 text-[26px] font-bold leading-snug text-foreground sm:text-[30px] lg:text-[34px]">
            From kickoff to delivery in one tab.
          </h2>

          <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step) => (
              <article key={step.number}>
                <div className="mb-4 h-px bg-brand-secondary" />
                <p className="font-mono text-sm font-semibold text-muted-foreground">{step.number}</p>
                <h3 className="mt-3 text-base font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="get-started" className="bg-foreground text-card">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-12 lg:py-20">
          <h2 className="text-[26px] font-bold leading-snug sm:text-[30px] lg:text-[34px]">
            Bring your next sprint into DevFlow.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-brand-secondary">
            Create a workspace in under a minute. Invite your team. Watch ownership click into place.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-background"
            >
              Create account
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-brand-secondary px-5 text-sm font-semibold text-card transition-colors hover:bg-brand-primary"
            >
              Explore the demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-background">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-8 font-mono text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12">
          <p>&copy; 2026 DevFlow</p>
          <p>v0.1 &middot; demo build</p>
        </div>
      </footer>
    </main>
  );
}
