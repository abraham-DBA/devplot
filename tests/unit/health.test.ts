import { describe, it, expect } from "vitest";
import { calculateProjectHealth, calculateProjectProgress } from "@/lib/health";

describe("calculateProjectHealth", () => {
  describe("blocked module overrides everything", () => {
    it("returns high_risk when any module is blocked, regardless of progress", () => {
      expect(
        calculateProjectHealth({
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          progress: 90,
          hasBlockedModule: true,
          today: "2026-01-10",
        })
      ).toBe("high_risk");
    });
  });

  describe("on_track", () => {
    it("returns on_track when progress is ahead of time used", () => {
      expect(
        calculateProjectHealth({
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          progress: 80,
          today: "2026-06-30", // ~50% time used
        })
      ).toBe("on_track");
    });

    it("returns on_track when progress equals time used exactly", () => {
      // 10 days into a 100-day project = 10% time used, 10% progress
      expect(
        calculateProjectHealth({
          startDate: "2026-01-01",
          endDate: "2026-04-11", // 100 days
          progress: 10,
          today: "2026-01-11", // 10 days in
        })
      ).toBe("on_track");
    });

    it("returns on_track on the first day of the project", () => {
      expect(
        calculateProjectHealth({
          startDate: "2026-06-28",
          endDate: "2026-12-31",
          progress: 0,
          today: "2026-06-28",
        })
      ).toBe("on_track");
    });
  });

  describe("at_risk", () => {
    it("returns at_risk when time used exceeds progress but by 20% or less", () => {
      // 50% time used, 40% progress → gap of 10% → at_risk
      expect(
        calculateProjectHealth({
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          progress: 40,
          today: "2026-07-02", // ~50% of year
        })
      ).toBe("at_risk");
    });

    it("returns at_risk when gap is exactly 20%", () => {
      // 50% time used, 30% progress → gap of exactly 20% → at_risk
      expect(
        calculateProjectHealth({
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          progress: 30,
          today: "2026-07-02",
        })
      ).toBe("at_risk");
    });
  });

  describe("high_risk", () => {
    it("returns high_risk when time used exceeds progress by more than 20%", () => {
      // 50% time used, 20% progress → gap of 30% → high_risk
      expect(
        calculateProjectHealth({
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          progress: 20,
          today: "2026-07-02",
        })
      ).toBe("high_risk");
    });

    it("returns high_risk when deadline has passed and project is incomplete", () => {
      expect(
        calculateProjectHealth({
          startDate: "2026-01-01",
          endDate: "2026-03-01",
          progress: 50,
          today: "2026-06-28", // past the deadline
        })
      ).toBe("high_risk");
    });

    it("returns high_risk when start equals end (zero-duration project)", () => {
      expect(
        calculateProjectHealth({
          startDate: "2026-06-28",
          endDate: "2026-06-28",
          progress: 0,
          today: "2026-06-28",
        })
      ).toBe("high_risk");
    });
  });
});

describe("calculateProjectProgress", () => {
  it("returns 0 for an empty module list", () => {
    expect(calculateProjectProgress([])).toBe(0);
  });

  it("returns the single module progress when there is one module", () => {
    expect(calculateProjectProgress([75])).toBe(75);
  });

  it("returns the rounded average of all module progress values", () => {
    expect(calculateProjectProgress([10, 20, 30])).toBe(20);
  });

  it("rounds 0.5 up", () => {
    // (10 + 11) / 2 = 10.5 → rounds to 11
    expect(calculateProjectProgress([10, 11])).toBe(11);
  });

  it("handles all modules at 0%", () => {
    expect(calculateProjectProgress([0, 0, 0])).toBe(0);
  });

  it("handles all modules at 100%", () => {
    expect(calculateProjectProgress([100, 100, 100])).toBe(100);
  });

  it("handles mixed progress including boundary values", () => {
    expect(calculateProjectProgress([0, 50, 100])).toBe(50);
  });
});
