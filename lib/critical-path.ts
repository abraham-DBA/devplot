export type CriticalPathModule = { id: string; deadline: string };
export type CriticalPathEdge = { moduleId: string; dependsOnModuleId: string };

export function computeCriticalPath(
  modules: CriticalPathModule[],
  edges: CriticalPathEdge[],
): { criticalNodeIds: Set<string>; criticalEdgeIds: Set<string> } {
  if (modules.length === 0 || edges.length === 0) {
    return { criticalNodeIds: new Set(), criticalEdgeIds: new Set() };
  }

  const predecessors = new Map<string, string[]>(); // dependent → prerequisites
  const successors = new Map<string, string[]>();    // prerequisite → dependents

  for (const mod of modules) {
    predecessors.set(mod.id, []);
    successors.set(mod.id, []);
  }
  for (const edge of edges) {
    predecessors.get(edge.moduleId)?.push(edge.dependsOnModuleId);
    successors.get(edge.dependsOnModuleId)?.push(edge.moduleId);
  }

  const deadlineMs = new Map<string, number>(
    modules.map((m) => [m.id, new Date(m.deadline + "T00:00:00Z").getTime()]),
  );

  // Kahn's topological sort + forward pass
  const inDegree = new Map<string, number>();
  for (const mod of modules) inDegree.set(mod.id, predecessors.get(mod.id)!.length);
  const queue: string[] = modules.filter((m) => inDegree.get(m.id) === 0).map((m) => m.id);

  // effectiveDeadline[n] = max(n.deadline, max(effectiveDeadline[all prerequisites]))
  // This propagates "how late can this chain finish?" through the graph.
  const effectiveDeadline = new Map(deadlineMs);
  const topoQueue = [...queue];

  while (topoQueue.length > 0) {
    const nodeId = topoQueue.shift()!;
    const ed = effectiveDeadline.get(nodeId) ?? 0;
    for (const succId of successors.get(nodeId) ?? []) {
      effectiveDeadline.set(succId, Math.max(effectiveDeadline.get(succId) ?? 0, ed));
      const deg = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, deg);
      if (deg === 0) topoQueue.push(succId);
    }
  }

  // Find the terminal node with the globally latest effective deadline
  let maxED = 0;
  let maxNode = "";
  for (const [id, ed] of effectiveDeadline) {
    if (ed > maxED) { maxED = ed; maxNode = id; }
  }
  if (!maxNode) return { criticalNodeIds: new Set(), criticalEdgeIds: new Set() };

  // Trace back from maxNode, always following the most-constrained predecessor.
  // This identifies the single spine with the highest scheduling pressure.
  const criticalNodeIds = new Set<string>();
  const criticalEdgeIds = new Set<string>();

  function traceBack(nodeId: string) {
    criticalNodeIds.add(nodeId);
    const preds = predecessors.get(nodeId) ?? [];
    if (preds.length === 0) return;
    let bestPred = "";
    let bestED = -1;
    for (const predId of preds) {
      const ed = effectiveDeadline.get(predId) ?? 0;
      if (ed > bestED) { bestED = ed; bestPred = predId; }
    }
    if (bestPred) {
      criticalEdgeIds.add(`${nodeId}|${bestPred}`); // "dependent|prerequisite"
      traceBack(bestPred);
    }
  }

  traceBack(maxNode);
  return { criticalNodeIds, criticalEdgeIds };
}
