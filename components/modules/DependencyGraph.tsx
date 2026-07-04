"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import dagre from "@dagrejs/dagre";

const NODE_W = 200;
const NODE_H = 80;

type ModuleStatus = "not_started" | "in_progress" | "review" | "completed" | "blocked";

type GraphModule = {
  id: string;
  name: string;
  status: ModuleStatus;
  progress: number;
  deadline: string;
  atRisk: boolean;
};

type GraphEdge = {
  id: string;
  moduleId: string;
  dependsOnModuleId: string;
};

type Props = {
  projectId: string;
  modules: GraphModule[];
  edges: GraphEdge[];
  criticalNodeIds: string[];
  criticalEdgeIds: string[]; // "moduleId|dependsOnModuleId"
};

const statusConfig: Record<
  ModuleStatus,
  { border: string; bg: string; bar: string; dot: string; label: string }
> = {
  not_started: { border: "border-border",        bg: "bg-card",            bar: "bg-border",        dot: "bg-muted-foreground", label: "Not started" },
  in_progress:  { border: "border-brand-primary", bg: "bg-card",            bar: "bg-brand-primary", dot: "bg-brand-primary",   label: "In progress" },
  review:       { border: "border-warning",       bg: "bg-warning-light",   bar: "bg-warning",       dot: "bg-warning",         label: "Review"      },
  completed:    { border: "border-success",       bg: "bg-success-light",   bar: "bg-success",       dot: "bg-success",         label: "Completed"   },
  blocked:      { border: "border-destructive",   bg: "bg-destructive-light", bar: "bg-destructive", dot: "bg-destructive",     label: "Blocked"     },
};

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const dx = (last.x - first.x) * 0.45;
  return `M ${first.x} ${first.y} C ${first.x + dx} ${first.y}, ${last.x - dx} ${last.y}, ${last.x} ${last.y}`;
}

type EdgeType = "default" | "critical" | "blocked";

export function DependencyGraph({ projectId, modules, edges, criticalNodeIds, criticalEdgeIds }: Props) {
  const router = useRouter();

  const criticalNodeSet = useMemo(() => new Set(criticalNodeIds), [criticalNodeIds]);
  const criticalEdgeSet = useMemo(() => new Set(criticalEdgeIds), [criticalEdgeIds]);

  const connectedIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of edges) { s.add(e.moduleId); s.add(e.dependsOnModuleId); }
    return s;
  }, [edges]);

  const connectedModules = useMemo(
    () => modules.filter((m) => connectedIds.has(m.id)),
    [modules, connectedIds],
  );
  const isolatedModules = useMemo(
    () => modules.filter((m) => !connectedIds.has(m.id)),
    [modules, connectedIds],
  );
  const blockedIds = useMemo(
    () => new Set(modules.filter((m) => m.status === "blocked").map((m) => m.id)),
    [modules],
  );

  const { nodePositions, edgePaths, svgWidth, svgHeight } = useMemo(() => {
    if (connectedModules.length === 0) {
      return { nodePositions: {} as Record<string, { x: number; y: number }>, edgePaths: [], svgWidth: 0, svgHeight: 0 };
    }

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 80, marginx: 40, marginy: 40 });

    for (const mod of connectedModules) {
      g.setNode(mod.id, { width: NODE_W, height: NODE_H });
    }
    for (const edge of edges) {
      if (g.hasNode(edge.dependsOnModuleId) && g.hasNode(edge.moduleId)) {
        g.setEdge(edge.dependsOnModuleId, edge.moduleId); // prerequisite → dependent
      }
    }

    dagre.layout(g);

    const gData = g.graph();
    const svgW = (gData.width ?? 0) + 80;
    const svgH = (gData.height ?? 0) + 80;

    const nodePositions: Record<string, { x: number; y: number }> = {};
    for (const mod of connectedModules) {
      const nd = g.node(mod.id);
      nodePositions[mod.id] = { x: nd.x, y: nd.y };
    }

    const edgePaths: Array<{ id: string; path: string; edgeType: EdgeType }> = [];
    for (const edge of edges) {
      if (!g.hasNode(edge.dependsOnModuleId) || !g.hasNode(edge.moduleId)) continue;
      const edgeData = g.edge(edge.dependsOnModuleId, edge.moduleId);
      if (!edgeData?.points) continue;
      const path = buildPath(edgeData.points);
      const edgeKey = `${edge.moduleId}|${edge.dependsOnModuleId}`;
      const edgeType: EdgeType = criticalEdgeSet.has(edgeKey)
        ? "critical"
        : blockedIds.has(edge.dependsOnModuleId)
        ? "blocked"
        : "default";
      edgePaths.push({ id: edge.id, path, edgeType });
    }

    return { nodePositions, edgePaths, svgWidth: svgW, svgHeight: svgH };
  }, [connectedModules, edges, criticalEdgeSet, blockedIds]);

  const hasGraph = connectedModules.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {hasGraph && (
        <div className="overflow-auto rounded-xl border border-border bg-card shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div
            className="relative"
            style={{ width: Math.max(svgWidth, 1), height: Math.max(svgHeight, 1), minWidth: "100%" }}
          >
            {/* Edge + arrowhead layer */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={svgWidth}
              height={svgHeight}
              aria-hidden="true"
            >
              <defs>
                <marker id="dg-arrow-default" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <polygon points="0 0, 8 4, 0 8" style={{ fill: "var(--color-border)" }} />
                </marker>
                <marker id="dg-arrow-critical" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <polygon points="0 0, 8 4, 0 8" style={{ fill: "var(--color-warning)" }} />
                </marker>
                <marker id="dg-arrow-blocked" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <polygon points="0 0, 8 4, 0 8" style={{ fill: "var(--color-destructive)" }} />
                </marker>
              </defs>

              {edgePaths.map(({ id, path, edgeType }) => (
                <path
                  key={id}
                  d={path}
                  fill="none"
                  strokeWidth={edgeType === "critical" ? 2 : 1.5}
                  strokeDasharray={edgeType === "blocked" ? "4 3" : undefined}
                  markerEnd={`url(#dg-arrow-${edgeType})`}
                  style={{
                    stroke:
                      edgeType === "critical"
                        ? "var(--color-warning)"
                        : edgeType === "blocked"
                        ? "var(--color-destructive)"
                        : "var(--color-border)",
                  }}
                />
              ))}
            </svg>

            {/* Node layer */}
            {connectedModules.map((mod) => {
              const pos = nodePositions[mod.id];
              if (!pos) return null;
              const sc = statusConfig[mod.status];
              const isCritical = criticalNodeSet.has(mod.id);

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => router.push(`/projects/${projectId}/modules/${mod.id}`)}
                  style={{
                    position: "absolute",
                    left: pos.x - NODE_W / 2,
                    top: pos.y - NODE_H / 2,
                    width: NODE_W,
                    height: NODE_H,
                    boxShadow: isCritical
                      ? "0 0 0 2px var(--color-warning), 0 1px 3px rgba(0,0,0,0.05)"
                      : "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                  className={[
                    "rounded-xl border-2 p-3 text-left transition-all focus:outline-none",
                    "hover:shadow-md",
                    sc.border,
                    sc.bg,
                  ].join(" ")}
                  title={`${mod.name} · ${sc.label} · ${mod.progress}%`}
                >
                  {/* Name + status dot */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 truncate text-[11px] font-semibold leading-tight text-foreground">
                      {mod.name}
                    </p>
                    <span
                      className={`mt-0.5 size-2 shrink-0 rounded-full ${sc.dot}`}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className={`h-full rounded-full ${sc.bar}`}
                      style={{ width: `${mod.progress}%` }}
                    />
                  </div>

                  {/* Status + deadline */}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-mono text-[9px] font-semibold text-muted-foreground">
                      {sc.label}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {mod.progress}% · {mod.deadline}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {hasGraph && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Legend
          </p>
          <div className="flex items-center gap-1.5">
            <div className="h-px w-5" style={{ background: "var(--color-border)" }} />
            <span className="text-[11px] text-muted-foreground">Dependency</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-5 rounded-full" style={{ background: "var(--color-warning)" }} />
            <span className="text-[11px] text-muted-foreground">Critical path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="20" height="2" aria-hidden="true">
              <line
                x1="0" y1="1" x2="20" y2="1"
                strokeDasharray="4 3"
                strokeWidth="1.5"
                style={{ stroke: "var(--color-destructive)" }}
              />
            </svg>
            <span className="text-[11px] text-muted-foreground">Blocked upstream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="size-3 rounded-sm border-2"
              style={{ borderColor: "var(--color-warning)", boxShadow: "0 0 0 1.5px var(--color-warning)" }}
            />
            <span className="text-[11px] text-muted-foreground">On critical path</span>
          </div>
        </div>
      )}

      {/* Isolated modules — no dependencies */}
      {isolatedModules.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            No dependencies
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {isolatedModules.map((mod) => {
              const sc = statusConfig[mod.status];
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => router.push(`/projects/${projectId}/modules/${mod.id}`)}
                  className={[
                    "rounded-xl border-2 p-3 text-left shadow-sm transition-all hover:shadow-md focus:outline-none",
                    sc.border,
                    sc.bg,
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${sc.dot}`} aria-hidden="true" />
                    <p className="truncate text-[11px] font-semibold text-foreground">{mod.name}</p>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-background">
                    <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${mod.progress}%` }} />
                  </div>
                  <p className="mt-1.5 font-mono text-[9px] text-muted-foreground">
                    {mod.progress}% · {mod.deadline}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
