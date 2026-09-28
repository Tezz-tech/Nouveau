import type { RevenueModel, RevenueModelPolicy } from "./types";
import { subscriptionOnlyPolicy } from "./subscriptionOnly";
import { subscriptionPlusSplitPolicy } from "./subscriptionPlusSplit";
import type { AccountType } from "../onboarding/types";

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

/** Kept as the investor-track default (client-confirmed 2026-09-15: every
 *  investor gets the split model, no eligibility gate). Traders are never
 *  resolved through this constant directly — use `defaultRevenueModelFor`,
 *  which is the accountType-aware entry point every call site should use. */
export const DEFAULT_REVENUE_MODEL: RevenueModel = "subscription_plus_split";

/**
 * The one function that should decide a new user's revenue model — a
 * trader never gets the profit-split model (Nouveau never holds or trades
 * their money, so there's no profit to split), an investor always gets
 * `DEFAULT_REVENUE_MODEL`. Call sites should resolve through this rather
 * than branching on accountType themselves.
 */
export function defaultRevenueModelFor(accountType: AccountType): RevenueModel {
  return accountType === "trader" ? "subscription_only" : DEFAULT_REVENUE_MODEL;
}
