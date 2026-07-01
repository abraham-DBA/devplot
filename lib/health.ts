export type ProjectHealth = "on_track" | "at_risk" | "high_risk";

export type HealthInput = {
  startDate: string;
  endDate: string;
  progress: number;
  hasBlockedModule?: boolean;
  // True when a module in this project is fine on its own but depends
  // (directly or transitively) on a module that's blocked or overdue —
  // see lib/dependency-risk.ts. Only ever upgrades on_track to at_risk; it
  // never downgrades a high_risk verdict from a direct block or schedule
  // slippage, since a chain effect is one step removed from those.
  hasDependencyRisk?: boolean;
  today?: string;
};

export function calculateProjectHealth(input: HealthInput): ProjectHealth {
  const { startDate, endDate, progress, hasBlockedModule = false, hasDependencyRisk = false, today } = input;

  if (hasBlockedModule) return "high_risk";

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date(today ?? new Date().toISOString().slice(0, 10)).getTime();

  const totalDuration = end - start;
  if (totalDuration <= 0) return "high_risk";

  const timeUsed = ((now - start) / totalDuration) * 100;

  if (timeUsed > progress + 20) return "high_risk";
  if (timeUsed > progress) return "at_risk";
  if (hasDependencyRisk) return "at_risk";
  return "on_track";
}

export function calculateProjectProgress(modulesProgress: number[]): number {
  if (modulesProgress.length === 0) return 0;
  const sum = modulesProgress.reduce((acc, p) => acc + p, 0);
  return Math.round(sum / modulesProgress.length);
}
