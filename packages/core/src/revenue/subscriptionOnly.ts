import { ZERO_CENTS, max } from "../money";
import type { RevenueModelPolicy } from "./types";

/** No profit split, ever. Revenue is subscriptions only. This is the
 *  default until the client confirms the split rule. */
export const subscriptionOnlyPolicy: RevenueModelPolicy = {
  model: "subscription_only",
  calculateSplitFee({ currentEquityCents, highWaterMarkCents }) {
    return {
      feeCents: ZERO_CENTS,
      newHighWaterMarkCents: max(highWaterMarkCents, currentEquityCents),
    };
  },
};
