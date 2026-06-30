export const BLOCKER_TYPES = [
  { value: "external", label: "External" },
  { value: "internal_dependency", label: "Internal Dependency" },
] as const;

export type BlockerType = (typeof BLOCKER_TYPES)[number]["value"];

export const blockerTypeBadge: Record<BlockerType, string> = {
  internal_dependency: "border-border bg-background text-muted-foreground",
  external: "border-warning/30 bg-warning-light text-warning",
};

export const blockerTypeLabel: Record<BlockerType, string> = Object.fromEntries(
  BLOCKER_TYPES.map((t) => [t.value, t.label]),
) as Record<BlockerType, string>;
