import { ZERO_CENTS, max, subtract, percentOf, isPositive } from "../money";
import type { RevenueModelPolicy } from "./types";

const SPLIT_PERCENT = 30n;

/**
 * 30% of profit above the high-water mark, deducted from custody at
 * settlement. If equity is at or below the high-water mark (no new profit,
 * or a loss), the fee is zero and the high-water mark does not move down —
 * it only ever advances to a new high.
 */
export const subscriptionPlusSplitPolicy: RevenueModelPolicy = {
  model: "subscription_plus_split",
  calculateSplitFee({ currentEquityCents, highWaterMarkCents }) {
    const newHighWaterMarkCents = max(highWaterMarkCents, currentEquityCents);
    const newProfit = subtract(currentEquityCents, highWaterMarkCents);
    const feeCents = isPositive(newProfit) ? percentOf(newProfit, SPLIT_PERCENT) : ZERO_CENTS;
    return { feeCents, newHighWaterMarkCents };
  },
};
