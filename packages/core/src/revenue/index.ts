import type { RevenueModel, RevenueModelPolicy } from "./types";
import { subscriptionOnlyPolicy } from "./subscriptionOnly";
import { subscriptionPlusSplitPolicy } from "./subscriptionPlusSplit";

export type { RevenueModel, RevenueModelPolicy, SplitCalculationInput, SplitCalculationResult } from "./types";
export { subscriptionOnlyPolicy } from "./subscriptionOnly";
export { subscriptionPlusSplitPolicy } from "./subscriptionPlusSplit";

const registry: Record<RevenueModel, RevenueModelPolicy> = {
  subscription_only: subscriptionOnlyPolicy,
  subscription_plus_split: subscriptionPlusSplitPolicy,
};

export function getRevenuePolicy(model: RevenueModel): RevenueModelPolicy {
  return registry[model];
}

export const DEFAULT_REVENUE_MODEL: RevenueModel = "subscription_plus_split";
