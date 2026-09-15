import type { CycleStatus } from "./types";

/**
 * pending -> active -> closing -> settled, with `halted` reachable from any
 * pre-settled state and able to resume back into `active` or `closing`, or
 * be force-settled directly. `settled` is terminal — nothing transitions out
 * of it, ever; a settled cycle is history, not something to reopen.
 */
const ALLOWED_TRANSITIONS: ReadonlySet<string> = new Set([
  "pending->active",
  "pending->halted",
  "active->closing",
  "active->halted",
  "closing->settled",
  "closing->halted",
  "halted->active",
  "halted->closing",
  "halted->settled",
]);

export class InvalidCycleTransitionError extends Error {
  constructor(
    public readonly from: CycleStatus,
    public readonly to: CycleStatus
  ) {
    super(`Cannot transition a cycle from "${from}" to "${to}"`);
    this.name = "InvalidCycleTransitionError";
  }
}

function key(from: CycleStatus, to: CycleStatus): string {
  return `${from}->${to}`;
}

export function canTransition(from: CycleStatus, to: CycleStatus): boolean {
  return ALLOWED_TRANSITIONS.has(key(from, to));
}

/** Throws `InvalidCycleTransitionError` on an illegal transition; otherwise
 *  returns `to`. Callers persist the return value — this function never
 *  mutates anything, it just says "this move is legal." */
export function transition(from: CycleStatus, to: CycleStatus): CycleStatus {
  if (!canTransition(from, to)) {
    throw new InvalidCycleTransitionError(from, to);
  }
  return to;
}

export function isTerminal(status: CycleStatus): boolean {
  return status === "settled";
}
