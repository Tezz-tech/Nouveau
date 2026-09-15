import type { Cents } from "../money";

export type RevenueModel = "subscription_only" | "subscription_plus_split";

export interface SplitCalculationInput {
  /** Total equity (custody + at-risk) at the moment of settlement. */
  currentEquityCents: Cents;
  /** The highest equity level profit has already been charged up through.
   *  Starts at the deposit amount for a brand-new user (no profit yet). */
  highWaterMarkCents: Cents;
}

export interface SplitCalculationResult {
  feeCents: Cents;
  /** Always `max(highWaterMarkCents, currentEquityCents)` — persist this
   *  back onto the user/account so the same gains are never charged twice,
   *  even under `subscription_only` (where the fee is always zero, but the
   *  high-water mark still advances, so a later switch to the split model
   *  doesn't retroactively charge gains already earned). */
  newHighWaterMarkCents: Cents;
}

export interface RevenueModelPolicy {
  readonly model: RevenueModel;
  calculateSplitFee(input: SplitCalculationInput): SplitCalculationResult;
}

/**
 * RESOLVED (client, 2026-09-15): every user is on `subscription_plus_split` —
 * there is no eligibility gate ("profiled versus unprofiled users" doesn't
 * apply). This package still doesn't hardcode that decision here; it's
 * expressed via `DEFAULT_REVENUE_MODEL` below, and whatever calls
 * `calculateSplitFee` should resolve the model via `getRevenuePolicy(user.revenueModel
 * ?? DEFAULT_REVENUE_MODEL)` rather than assuming a model inline.
 * `subscription_only` is kept implemented (not deleted) since a future
 * per-user override is one Mongoose field away, not a redesign.
 */
