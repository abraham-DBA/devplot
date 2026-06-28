"use client";

import { useState } from "react";
import Link from "next/link";

type ProjectHealth = "on_track" | "at_risk" | "high_risk";

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  health: ProjectHealth;
  progress: number;
  priority: string;
  modulesCompleted: number;
  totalModules: number;
  blockerCount: number;
  endDate: string;
  teamMembers: string[];
};

type Filter = "all" | ProjectHealth;

const healthConfig: Record<ProjectHealth, { label: string; dot: string; text: string; bg: string }> = {
  on_track: { label: "On Track", dot: "bg-success", text: "text-success", bg: "bg-success-light" },
  at_risk: { label: "At Risk", dot: "bg-warning", text: "text-warning", bg: "bg-warning-light" },
  high_risk: { label: "High Risk", dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive-light" },
};

const progressBarColor: Record<ProjectHealth, string> = {
  on_track: "bg-success",
  at_risk: "bg-warning",
  high_risk: "bg-destructive",
};

function formatPriority(p: string) {
  return p.charAt(0).toUpperCase() + p.slice(1) + " priority";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProjectCard({ project }: { project: ProjectRow }) {
  const hc = healthConfig[project.health];
  const barColor = progressBarColor[project.health];

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl border border-border bg-card p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{project.name}</h3>
          <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${hc.bg} ${hc.text}`}>
            <span className={`size-1.5 rounded-full ${hc.dot}`} aria-hidden="true" />
            {hc.label}
          </span>
          {project.blockerCount > 0 && (
            <span className="shrink-0 rounded-md bg-destructive-light px-2 py-0.5 text-xs font-semibold text-destructive">
              {project.blockerCount} BLOCKER{project.blockerCount !== 1 ? "S" : ""}
            </span>
          )}
        </div>

        {/* Team avatars */}
        <div className="flex shrink-0 -space-x-2">
          {project.teamMembers.slice(0, 5).map((name, i) => (
            <span
              key={i}
              title={name}
              className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-[9px] font-bold text-card"
            >
              {getInitials(name)}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{project.description}</p>

      {/* Progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="font-semibold text-foreground">{project.progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-background">
          <div
            className={`h-2 rounded-full ${barColor} transition-all`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-3 text-xs text-muted-foreground">
        {project.modulesCompleted}/{project.totalModules} modules done
        {" · "}
        {formatPriority(project.priority)}
        {" · "}
        Due {formatDate(project.endDate)}
      </p>
    </Link>
  );
}

type Props = {
  projects: ProjectRow[];
  totalModules: number;
  userRole: string;
};

export function ProjectsClient({ projects, totalModules, userRole }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const onTrackCount = projects.filter((p) => p.health === "on_track").length;
  const atRiskCount = projects.filter((p) => p.health === "at_risk").length;
  const highRiskCount = projects.filter((p) => p.health === "high_risk").length;

  const filtered = projects.filter((p) => {
    const matchesFilter = filter === "all" || p.health === filter;
    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "ALL", count: projects.length },
    { key: "on_track", label: "ON TRACK", count: onTrackCount },
    { key: "at_risk", label: "AT RISK", count: atRiskCount },
    { key: "high_risk", label: "HIGH RISK", count: highRiskCount },
  ];

  return (
    <>
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {totalModules} module{totalModules !== 1 ? "s" : ""}
          </p>
        </div>
        {userRole === "project_manager" && (
          <Link
            href="/projects/new"
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-card transition-colors hover:bg-brand-primary"
          >
            + New project
          </Link>
        )}
      </div>

      {/* Search + filter row */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full max-w-xs rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />

        <div className="flex items-center gap-1">
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-foreground text-card"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tab.label} {tab.count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Project grid */}
      {filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? `No projects match "${search}"` : "No projects in this category."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </>
  );
}
