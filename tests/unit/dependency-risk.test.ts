import { describe, it, expect } from "vitest";
import { computeAtRiskModules, isModuleBroken, type ModuleRiskInput, type DependencyEdge } from "@/lib/dependency-risk";

const TODAY = "2026-06-30";

function mod(id: string, status: string, deadline = "2026-12-31"): ModuleRiskInput {
  return { id, status, deadline };
}

describe("computeAtRiskModules", () => {
  it("flags the direct dependent of a blocked module", () => {
    const modules = [mod("auth", "blocked"), mod("billing", "in_progress")];
    const edges: DependencyEdge[] = [{ moduleId: "billing", dependsOnModuleId: "auth" }];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("billing")).toBe(true);
  });

  it("flags a 2-hop transitive dependent", () => {
    const modules = [mod("auth", "blocked"), mod("billing", "in_progress"), mod("checkout", "in_progress")];
    const edges: DependencyEdge[] = [
      { moduleId: "billing", dependsOnModuleId: "auth" },
      { moduleId: "checkout", dependsOnModuleId: "billing" },
    ];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("billing")).toBe(true);
    expect(atRisk.has("checkout")).toBe(true);
  });

  it("does not flag an unrelated module with no dependency on the broken one", () => {
    const modules = [mod("auth", "blocked"), mod("billing", "in_progress"), mod("marketing", "in_progress")];
    const edges: DependencyEdge[] = [{ moduleId: "billing", dependsOnModuleId: "auth" }];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("marketing")).toBe(false);
  });

  it("excludes the broken module itself from the at-risk set", () => {
    const modules = [mod("auth", "blocked"), mod("billing", "in_progress")];
    const edges: DependencyEdge[] = [{ moduleId: "billing", dependsOnModuleId: "auth" }];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("auth")).toBe(false);
  });

  it("flags dependents of an overdue-but-not-blocked module", () => {
    const modules = [mod("auth", "in_progress", "2026-01-15"), mod("billing", "in_progress")];
    const edges: DependencyEdge[] = [{ moduleId: "billing", dependsOnModuleId: "auth" }];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("billing")).toBe(true);
  });

  it("does not flag dependents when the upstream module is merely not-yet-due", () => {
    const modules = [mod("auth", "in_progress", "2026-12-31"), mod("billing", "in_progress")];
    const edges: DependencyEdge[] = [{ moduleId: "billing", dependsOnModuleId: "auth" }];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("billing")).toBe(false);
  });

  it("a completed ancestor never flags its dependents, even past its original deadline", () => {
    const modules = [mod("auth", "completed", "2026-01-15"), mod("billing", "in_progress")];
    const edges: DependencyEdge[] = [{ moduleId: "billing", dependsOnModuleId: "auth" }];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("billing")).toBe(false);
  });

  it("a diamond dependency (two paths into one node) does not double-count or error", () => {
    // checkout depends on both billing and shipping, which both depend on auth
    const modules = [
      mod("auth", "blocked"),
      mod("billing", "in_progress"),
      mod("shipping", "in_progress"),
      mod("checkout", "in_progress"),
    ];
    const edges: DependencyEdge[] = [
      { moduleId: "billing", dependsOnModuleId: "auth" },
      { moduleId: "shipping", dependsOnModuleId: "auth" },
      { moduleId: "checkout", dependsOnModuleId: "billing" },
      { moduleId: "checkout", dependsOnModuleId: "shipping" },
    ];

    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.has("billing")).toBe(true);
    expect(atRisk.has("shipping")).toBe(true);
    expect(atRisk.has("checkout")).toBe(true);
    expect(atRisk.size).toBe(3);
  });

  it("returns an empty set when there are no edges", () => {
    const modules = [mod("auth", "blocked"), mod("billing", "in_progress")];
    const atRisk = computeAtRiskModules(modules, [], TODAY);
    expect(atRisk.size).toBe(0);
  });

  it("returns an empty set when nothing is broken", () => {
    const modules = [mod("auth", "in_progress"), mod("billing", "in_progress")];
    const edges: DependencyEdge[] = [{ moduleId: "billing", dependsOnModuleId: "auth" }];
    const atRisk = computeAtRiskModules(modules, edges, TODAY);
    expect(atRisk.size).toBe(0);
  });
});

describe("isModuleBroken", () => {
  it("a blocked module is broken regardless of deadline", () => {
    expect(isModuleBroken(mod("auth", "blocked", "2026-12-31"), TODAY)).toBe(true);
  });

  it("an overdue, non-completed module is broken", () => {
    expect(isModuleBroken(mod("auth", "in_progress", "2026-01-15"), TODAY)).toBe(true);
  });

  it("a completed module is never broken, even past its deadline", () => {
    expect(isModuleBroken(mod("auth", "completed", "2026-01-15"), TODAY)).toBe(false);
  });

  it("a not-yet-due, non-blocked module is not broken", () => {
    expect(isModuleBroken(mod("auth", "in_progress", "2026-12-31"), TODAY)).toBe(false);
  });
});
