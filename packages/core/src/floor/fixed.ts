import { half } from "../money";
import type { FloorPolicy } from "./types";

/**
 * Floor is set once, at 50% of the deposit, and never moves again.
 *
 * ASSUMPTION FLAGGED (applies to all three policies, documented once here):
 * the brief's `recalculate(currentFloor, currentEquityCents)` doesn't say
 * whether "equity" means the at-risk MT5 sub-account's own equity, or the
 * user's total (custody + at-risk). We use TOTAL. Reasoning: custody is
 * constant for the life of a cycle (invariant #1), so floor = 50% of
 * deposit = exactly the custody amount — meaning "floor hit" under this
 * model occurs exactly when the at-risk half reaches zero, which is what
 * section 1 describes ("floor hit — the at-risk half is exhausted"). If
 * "equity" meant the at-risk sub-account alone, the fixed floor would equal
 * the at-risk starting balance exactly, and the very first cent of
 * drawdown would trigger a floor hit — clearly not the intent. Confirm this
 * reading before Phase 4 wires equity ticks to `recalculate`.
 */
export const fixedFloorPolicy: FloorPolicy = {
  model: "fixed",
  initialFloor(depositCents) {
    return half(depositCents);
  },
  recalculate(currentFloor) {
    return currentFloor;
  },
};
