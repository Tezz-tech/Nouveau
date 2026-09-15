import { half, max } from "../money";
import type { FloorPolicy } from "./types";

/**
 * Floor is 50% of the highest total equity ever reached, and never
 * decreases. The default model per the brief.
 *
 * Implemented as `max(currentFloor, half(currentEquity))` rather than
 * tracking a separate "peak equity" value — this recurrence is exactly
 * equivalent to `half(max(peakEquitySoFar, currentEquity))` as long as this
 * function is the only thing ever allowed to update the floor (true here:
 * `half` is monotonic, so the max of two halves equals the half of the max).
 * That means the caller never has to persist a separate high-water-mark
 * field for this policy — `currentFloor` already carries all the state it
 * needs.
 */
export const ratchetFloorPolicy: FloorPolicy = {
  model: "ratchet",
  initialFloor(depositCents) {
    return half(depositCents);
  },
  recalculate(currentFloor, currentEquityCents) {
    return max(currentFloor, half(currentEquityCents));
  },
};
