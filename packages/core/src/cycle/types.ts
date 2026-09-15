export type CycleStatus = "pending" | "active" | "closing" | "settled" | "halted";

export const ALL_CYCLE_STATUSES: readonly CycleStatus[] = ["pending", "active", "closing", "settled", "halted"];

export type CycleOutcome = "target_hit" | "floor_hit";
