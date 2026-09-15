import { type Cents, add, subtract, splitByRatio, isNegative } from "../money";
import type { CycleOutcome } from "./types";

/**
 * The target: at-risk half doubles, custody is untouched. In TOTAL-equity
 * terms (see the floor policies' assumption note — "equity" throughout this
 * package means custody + at-risk combined): target = custody + 2*atRisk =
 * deposit + atRisk = 1.5 * deposit.
 */
export function computeTarget(depositCents: Cents): Cents {
  const { first: custodyCents, second: atRiskCents } = splitByRatio(depositCents, 1n, 2n);
  return add(custodyCents, add(atRiskCents, atRiskCents));
}

/**
 * Checks whether a live total-equity reading has crossed target or floor.
 * Returns `null` while the cycle is still open — this is the function the
 * cycle service calls on every equity tick; `calculateSettlement` below is
 * only called once one of these fires.
 *
 * Precedence: target is checked first. In the ratchet floor model, floor can
 * in principle climb close to (or, if a cycle is left running well past
 * target, above) the target value — if a reading somehow satisfies both,
 * hitting the target is the outcome we report, never a floor-hit technicality
 * overriding an actual target achievement.
 */
export function detectOutcome(totalEquityCents: Cents, floorCents: Cents, targetCents: Cents): CycleOutcome | null {
  if (totalEquityCents >= targetCents) return "target_hit";
  if (totalEquityCents <= floorCents) return "floor_hit";
  return null;
}

export interface SettlementInput {
  depositCents: Cents;
  /** Total equity (custody + at-risk) at the moment of settlement. */
  finalTotalEquityCents: Cents;
  floorCents: Cents;
  targetCents: Cents;
}

export interface SettlementResult {
  outcome: CycleOutcome;
  custodyCents: Cents;
  initialAtRiskCents: Cents;
  finalAtRiskCents: Cents;
  /** Feed this straight into `settleTradingOutcome` from the ledger module. */
  atRiskChangeCents: Cents;
  /** custody + finalAtRisk — what the user is owed in total if they withdraw
   *  everything right now. */
  totalPayoutCents: Cents;
}

export class SettlementNotReachedError extends Error {
  constructor() {
    super("calculateSettlement was called with a total equity reading that has not actually reached the floor or the target");
    this.name = "SettlementNotReachedError";
  }
}

/**
 * The pure settlement calculation. Asserts that target or floor has actually
 * been reached — this is not the function to call speculatively to "check"
 * an outcome; use `detectOutcome` for that. `custodyCents` is never a
 * function of `finalTotalEquityCents` in any way other than being derived
 * once, up front, from the original deposit — the custody figure returned
 * here is always identical to the one computed at deposit time.
 */
export function calculateSettlement(input: SettlementInput): SettlementResult {
  const { depositCents, finalTotalEquityCents, floorCents, targetCents } = input;

  const outcome = detectOutcome(finalTotalEquityCents, floorCents, targetCents);
  if (outcome === null) {
    throw new SettlementNotReachedError();
  }

  const { first: custodyCents, second: initialAtRiskCents } = splitByRatio(depositCents, 1n, 2n);
  const finalAtRiskCents = subtract(finalTotalEquityCents, custodyCents);

  if (isNegative(finalAtRiskCents)) {
    // A real MT5 sub-account's equity cannot go below zero — the broker
    // stops the account out first. If this ever fires, the equity reading
    // fed in is wrong (or custody was somehow touched), not something to
    // silently clamp and hide.
    throw new RangeError(
      `calculateSettlement: derived at-risk equity is negative (finalTotalEquity ${finalTotalEquityCents} - custody ${custodyCents}) — this implies custody was touched or the equity reading is corrupt, not a real broker state`
    );
  }

  const atRiskChangeCents = subtract(finalAtRiskCents, initialAtRiskCents);

  return {
    outcome,
    custodyCents,
    initialAtRiskCents,
    finalAtRiskCents,
    atRiskChangeCents,
    totalPayoutCents: finalTotalEquityCents,
  };
}
