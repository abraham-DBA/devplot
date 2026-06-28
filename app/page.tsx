import Link from "next/link";

const features = [
  {
    title: "Modular ownership",
    description:
      "Break work into Authentication, Billing, Reporting - assign one owner per module, end the responsibility fog.",
  },
  {
    title: "Live progress math",
    description:
      "Every module update rolls up to project completion. Leads never ask 'where are we?' again.",
  },
  {
    title: "Schedule risk engine",
    description:
      "If time used outruns progress by 20%, we flag the project red - before the deadline slips.",
  },
  {
    title: "Blocker surfacing",
    description:
      "One click to flag a blocker. It shows up red on every dashboard until someone unblocks it.",
  },
  {
    title: "Module knowledge base",
    description:
      "API contracts, schemas, business rules - pinned to the module that needs them. No more lost Notion pages.",
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-24">
          <Link href="/" className="flex items-center gap-3" aria-label="DevFlow home">
            <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-card">
              DF
            </span>
            <span className="text-base font-bold text-foreground">DevFlow</span>
          </Link>

          <nav className="hidden items-center gap-10 text-sm font-medium text-muted-foreground md:flex">
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

          <div className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login" className="hidden text-muted-foreground hover:text-foreground sm:inline">
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-foreground px-4 py-2 text-card shadow-sm hover:bg-brand-primary"
            >
              Open app
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex h-12 w-full max-w-[1440px] items-center justify-center gap-6 border-t border-border px-4 text-sm font-medium text-muted-foreground sm:px-6 md:hidden">
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

      <section className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20 lg:px-24 lg:py-28">
          <div className="max-w-4xl">
            <p className="mb-6 text-[11px] font-semibold uppercase text-muted-foreground">
              Delivery OS for software teams
            </p>
            <h1 className="text-5xl font-bold leading-[0.98] text-foreground sm:text-6xl lg:text-[72px]">
              Stop guessing where the build stands.
              <span className="block text-muted-foreground">Start shipping on schedule.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
              DevFlow turns every project into modules with clear owners, live progress, and
              instant blocker alerts - so leads can see risk before it becomes a missed deadline.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-semibold text-card shadow-sm hover:bg-brand-primary"
              >
                Open workspace&nbsp;-&gt;
              </Link>
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm hover:bg-background"
            >
              Create an account
              </Link>
            </div>
          </div>

          <div className="mt-16 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex h-10 items-center gap-2 border-b border-border bg-background px-5">
              <span className="size-3 rounded-full bg-border" />
              <span className="size-3 rounded-full bg-border" />
              <span className="size-3 rounded-full bg-border" />
              <span className="ml-4 font-mono text-sm font-semibold text-muted-foreground">
                devflow.io/projects/atlas
              </span>
            </div>

            <div className="grid gap-8 p-8 md:grid-cols-3 lg:p-9">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Project health
                </p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-4xl font-semibold leading-none text-foreground">58%</span>
                  <span className="text-sm font-semibold text-foreground">At Risk</span>
                </div>
                <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-background">
                  <div className="h-full w-[58%] bg-warning" />
                </div>
                <p className="mt-3 text-sm font-medium text-muted-foreground">72% of timeline used</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Active modules
                </p>
                <p className="mt-3 text-4xl font-semibold leading-none text-foreground">4</p>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  2 in progress - 1 review - 1 blocked
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Open blockers
                </p>
                <p className="mt-3 text-4xl font-semibold leading-none text-destructive">1</p>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Reporting - waiting on Billing schema
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-24 lg:py-24">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Why teams pick DevFlow
          </p>
          <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-tight text-foreground lg:text-[42px]">
            Designed for the way developers actually build.
          </h2>

          <div className="mt-12 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="grid md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="border-b border-border p-8 md:odd:border-r lg:min-h-44 lg:[&:nth-child(3n+1)]:border-r lg:[&:nth-child(3n+2)]:border-r lg:[&:nth-child(3n)]:border-r-0"
                >
                  <h3 className="text-xl font-bold leading-7 text-foreground">{feature.title}</h3>
                  <p className="mt-4 text-base leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-background">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-24 lg:py-24">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            The flow
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-tight text-foreground lg:text-[42px]">
            From kickoff to delivery in one tab.
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step) => (
              <article key={step.number}>
                <div className="mb-5 h-px bg-brand-secondary" />
                <p className="font-mono text-sm font-semibold text-muted-foreground">{step.number}</p>
                <h3 className="mt-4 text-base font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-base leading-6 text-muted-foreground">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="get-started" className="bg-foreground text-card">
        <div className="mx-auto flex min-h-80 w-full max-w-[1440px] flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-24">
          <h2 className="text-4xl font-bold leading-tight lg:text-[42px]">
            Bring your next sprint into DevFlow.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-6 text-brand-secondary">
            Create a workspace in under a minute. Invite your team. Watch ownership click into place.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-card px-6 text-sm font-semibold text-foreground shadow-sm hover:bg-background"
            >
              Create account
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-brand-secondary px-6 text-sm font-semibold text-card hover:bg-brand-primary"
            >
              Explore the demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-background">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-9 font-mono text-sm font-semibold text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-24">
          <p>&copy; 2026 DevFlow</p>
          <p>v0.1 &middot; demo build</p>
        </div>
      </footer>
    </main>
  );
}
