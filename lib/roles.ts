// Shared role-set constants. Kept out of actions/modules.ts deliberately —
// that file has "use server" at the top, and Next.js requires every export
// from a "use server" file to be an async function, so a plain const array
// can't live there even though it conceptually belongs with module RBAC.

// Eligible for module-level mutations restricted to the assignee or a
// lead/PM/owner — progress updates and blocker resolution — and for
// /my-work's Team Pulse view, which gates on this exact same set.
export const MODULE_LEAD_ROLES = ["team_lead", "project_manager", "owner"];
