export type DependencyEdge = { moduleId: string; dependsOnModuleId: string };
export type ModuleRiskInput = { id: string; status: string; deadline: string };

function isBroken(mod: ModuleRiskInput, nowMs: number): boolean {
  if (mod.status === "blocked") return true;
  if (mod.status === "completed") return false;
  return new Date(mod.deadline).getTime() < nowMs;
}

// Single-module convenience wrapper for display code that needs to know
// "is this specific upstream module the reason something downstream is at
// risk" without re-deriving the blocked-or-overdue rule itself.
export function isModuleBroken(mod: ModuleRiskInput, today?: string): boolean {
  const nowMs = new Date(today ?? new Date().toISOString().slice(0, 10)).getTime();
  return isBroken(mod, nowMs);
}

// Modules that are themselves fine, but depend (directly or transitively) on
// a module that's blocked or overdue — the chain is broken upstream, even
// though this module's own numbers look fine. Excludes the broken modules
// themselves, since those already surface as blocked/overdue directly.
export function computeAtRiskModules(
  modules: ModuleRiskInput[],
  edges: DependencyEdge[],
  today?: string,
): Set<string> {
  const nowMs = new Date(today ?? new Date().toISOString().slice(0, 10)).getTime();

  // "who depends on me" — forward edges from a prerequisite to its dependents
  const dependents = new Map<string, string[]>();
  for (const edge of edges) {
    const list = dependents.get(edge.dependsOnModuleId) ?? [];
    list.push(edge.moduleId);
    dependents.set(edge.dependsOnModuleId, list);
  }

  const brokenIds = new Set(modules.filter((m) => isBroken(m, nowMs)).map((m) => m.id));
  const atRisk = new Set<string>();

  for (const brokenId of brokenIds) {
    const queue = [...(dependents.get(brokenId) ?? [])];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (atRisk.has(current) || brokenIds.has(current)) continue;
      atRisk.add(current);
      queue.push(...(dependents.get(current) ?? []));
    }
  }

  return atRisk;
}
