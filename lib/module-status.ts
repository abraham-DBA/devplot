export type ModuleBadgeInput = {
  id: string;
  status: string;
  deadline: string;
  updatedAt: string;
};

export type ModuleBadges = {
  overdue: boolean;
  blocked: boolean;
  stale: boolean;
};

export type TeamPulseMember = { userId: string; name: string };
export type TeamPulseModuleInput = { assignedDeveloperId: string; updatedAt: string };
export type TeamPulseRow = {
  userId: string;
  name: string;
  updatedThisWeek: boolean;
  assignedModuleCount: number;
};

const STALE_THRESHOLD_DAYS = 3;
const PULSE_WINDOW_DAYS = 7;

// Computes which badges a module should show. Blocked suppresses stale
// deliberately — "blocked" already explains the lack of progress; showing
// "stale" on top is redundant noise, not new information.
export function computeModuleBadges(mod: ModuleBadgeInput, now?: string): ModuleBadges {
  const nowMs = now ? new Date(now).getTime() : Date.now();

  const overdue = mod.status !== "completed" && new Date(mod.deadline).getTime() < nowMs;
  const blocked = mod.status === "blocked";
  const daysSinceUpdate = (nowMs - new Date(mod.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  const stale =
    mod.status !== "completed" &&
    mod.status !== "blocked" &&
    daysSinceUpdate >= STALE_THRESHOLD_DAYS;

  return { overdue, blocked, stale };
}

// Computes which members updated their assigned modules this week vs. who's
// been silent. A member with zero assigned modules is neither — their
// assignedModuleCount === 0 and the page renders them as "no modules assigned"
// rather than including them in the "silent" count.
export function computeTeamPulse(
  members: TeamPulseMember[],
  modules: TeamPulseModuleInput[],
  now?: string,
): TeamPulseRow[] {
  const nowMs = now ? new Date(now).getTime() : Date.now();
  const windowMs = PULSE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const updatedThisWeek = new Set<string>();
  const moduleCount = new Map<string, number>();

  for (const mod of modules) {
    const count = moduleCount.get(mod.assignedDeveloperId) ?? 0;
    moduleCount.set(mod.assignedDeveloperId, count + 1);
    if (nowMs - new Date(mod.updatedAt).getTime() <= windowMs) {
      updatedThisWeek.add(mod.assignedDeveloperId);
    }
  }

  return members.map((member) => ({
    userId: member.userId,
    name: member.name,
    updatedThisWeek: updatedThisWeek.has(member.userId),
    assignedModuleCount: moduleCount.get(member.userId) ?? 0,
  }));
}
