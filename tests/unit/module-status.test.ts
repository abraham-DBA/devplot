import { describe, it, expect } from "vitest";
import { computeModuleBadges, computeTeamPulse, type ModuleBadgeInput } from "@/lib/module-status";

const NOW = "2026-06-30T12:00:00.000Z";

function makeMod(
  overrides: Partial<ModuleBadgeInput> & Pick<ModuleBadgeInput, "status">,
): ModuleBadgeInput {
  return {
    id: "mod-1",
    deadline: "2026-12-31",
    updatedAt: "2026-06-28T12:00:00.000Z", // 2 days ago — not stale
    ...overrides,
  };
}

describe("computeModuleBadges", () => {
  describe("overdue", () => {
    it("flags a non-completed module past its deadline", () => {
      const { overdue } = computeModuleBadges(makeMod({ status: "in_progress", deadline: "2026-01-15" }), NOW);
      expect(overdue).toBe(true);
    });

    it("does not flag a completed module past its deadline", () => {
      const { overdue } = computeModuleBadges(makeMod({ status: "completed", deadline: "2026-01-15" }), NOW);
      expect(overdue).toBe(false);
    });

    it("does not flag a module with a future deadline", () => {
      const { overdue } = computeModuleBadges(makeMod({ status: "in_progress", deadline: "2026-12-31" }), NOW);
      expect(overdue).toBe(false);
    });
  });

  describe("blocked", () => {
    it("flags a module with status blocked", () => {
      const { blocked } = computeModuleBadges(makeMod({ status: "blocked" }), NOW);
      expect(blocked).toBe(true);
    });

    it("does not flag a non-blocked module", () => {
      const { blocked } = computeModuleBadges(makeMod({ status: "in_progress" }), NOW);
      expect(blocked).toBe(false);
    });
  });

  describe("stale", () => {
    it("flags a module not updated for exactly 3 days", () => {
      const updatedAt = "2026-06-27T12:00:00.000Z"; // exactly 3 days before NOW
      const { stale } = computeModuleBadges(makeMod({ status: "in_progress", updatedAt }), NOW);
      expect(stale).toBe(true);
    });

    it("does not flag a module updated 2 days and 23 hours ago", () => {
      const updatedAt = "2026-06-27T13:00:00.000Z"; // just under 3 days
      const { stale } = computeModuleBadges(makeMod({ status: "in_progress", updatedAt }), NOW);
      expect(stale).toBe(false);
    });

    it("does not flag a module updated today", () => {
      const { stale } = computeModuleBadges(
        makeMod({ status: "in_progress", updatedAt: "2026-06-30T10:00:00.000Z" }),
        NOW,
      );
      expect(stale).toBe(false);
    });

    it("suppresses stale when the module is blocked — blocked already explains the lack of progress", () => {
      const updatedAt = "2026-06-01T00:00:00.000Z"; // very old
      const { stale, blocked } = computeModuleBadges(makeMod({ status: "blocked", updatedAt }), NOW);
      expect(blocked).toBe(true);
      expect(stale).toBe(false);
    });

    it("suppresses stale when the module is completed", () => {
      const updatedAt = "2026-01-01T00:00:00.000Z"; // very old
      const { stale } = computeModuleBadges(makeMod({ status: "completed", updatedAt }), NOW);
      expect(stale).toBe(false);
    });
  });

  describe("all-false baseline", () => {
    it("returns no badges for a healthy, recently-updated module", () => {
      const badges = computeModuleBadges(
        makeMod({ status: "in_progress", deadline: "2026-12-31", updatedAt: "2026-06-30T10:00:00.000Z" }),
        NOW,
      );
      expect(badges).toEqual({ overdue: false, blocked: false, stale: false });
    });
  });
});

describe("computeTeamPulse", () => {
  const alice = { userId: "alice", name: "Alice" };
  const bob = { userId: "bob", name: "Bob" };
  const carol = { userId: "carol", name: "Carol" };

  const recentUpdate = "2026-06-27T12:00:00.000Z"; // 3 days ago — within 7-day window
  const oldUpdate = "2026-06-01T12:00:00.000Z";    // 29 days ago — outside window

  it("marks a member as updated when any assigned module was recently updated", () => {
    const rows = computeTeamPulse(
      [alice],
      [{ assignedDeveloperId: "alice", updatedAt: recentUpdate }],
      NOW,
    );
    expect(rows[0].updatedThisWeek).toBe(true);
  });

  it("marks a member as silent when their module was updated more than 7 days ago", () => {
    const rows = computeTeamPulse(
      [alice],
      [{ assignedDeveloperId: "alice", updatedAt: oldUpdate }],
      NOW,
    );
    expect(rows[0].updatedThisWeek).toBe(false);
  });

  it("uses OR logic — marks updated if only one of multiple modules was recently updated", () => {
    const rows = computeTeamPulse(
      [alice],
      [
        { assignedDeveloperId: "alice", updatedAt: oldUpdate },
        { assignedDeveloperId: "alice", updatedAt: recentUpdate },
      ],
      NOW,
    );
    expect(rows[0].updatedThisWeek).toBe(true);
    expect(rows[0].assignedModuleCount).toBe(2);
  });

  it("reports zero assigned modules for a member with nothing assigned", () => {
    const rows = computeTeamPulse([carol], [], NOW);
    expect(rows[0].assignedModuleCount).toBe(0);
    expect(rows[0].updatedThisWeek).toBe(false);
  });

  it("handles multiple members correctly", () => {
    const rows = computeTeamPulse(
      [alice, bob],
      [
        { assignedDeveloperId: "alice", updatedAt: recentUpdate },
        { assignedDeveloperId: "bob", updatedAt: oldUpdate },
      ],
      NOW,
    );
    const aliceRow = rows.find((r) => r.userId === "alice")!;
    const bobRow = rows.find((r) => r.userId === "bob")!;
    expect(aliceRow.updatedThisWeek).toBe(true);
    expect(bobRow.updatedThisWeek).toBe(false);
  });
});
