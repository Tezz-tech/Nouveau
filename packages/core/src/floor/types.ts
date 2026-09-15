import type { Cents } from "../money";

export type FloorModel = "fixed" | "floating" | "ratchet";

/**
 * A floor policy answers two questions, deterministically:
 *  - `initialFloor`: given the deposit, what's the floor at cycle open?
 *  - `recalculate`: given the floor as it stands and the latest equity
 *    reading, what should the floor be now?
 *
 * These are pure functions over plain numbers — no dates, no persistence, no
 * knowledge of *why* equity changed. The cycle service (Phase 4) is
 * responsible for calling `recalculate` on every equity tick and persisting
 * the result; this interface just says what the new number should be.
 */
export interface FloorPolicy {
  readonly model: FloorModel;
  initialFloor(depositCents: Cents): Cents;
  recalculate(currentFloor: Cents, currentEquityCents: Cents): Cents;
}
