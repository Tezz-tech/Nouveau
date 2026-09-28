/**
 * Two customer types, decided once at signup and never changed by these
 * functions: an "investor" deposits money and Nouveau trades it for them
 * (the original brief's mechanism); a "trader" links their own existing
 * broker account, gets live buy/sell analysis, and executes trades
 * themselves — Nouveau never takes custody or places a trade on their
 * behalf. See packages/core/src/revenue for how this also picks the
 * revenue model.
 */
export type AccountType = "investor" | "trader";

/**
 * Every step either track can ever ask for. Not every step applies to every
 * track — see `ONBOARDING_STEPS_BY_TYPE` — so treat this union as "the set
 * of valid step names," not "the sequence."
 */
export type OnboardingStep =
  | "account"
  | "identity"
  | "broker_account"
  | "credentials"
  | "lpoa"
  | "broker_link"
  | "plan";

/**
 * Each track's steps, in the strict order they must be completed. There is
 * no branching *within* a track — same strict, in-order checklist model as
 * before — the branching happens once, at the top, by picking which list
 * applies. `lpoa` is deliberately absent from the trader list: a trader
 * never authorizes Nouveau to trade their money, so there is nothing to
 * sign, not just a step that gets silently skipped.
 */
export const ONBOARDING_STEPS_BY_TYPE: Record<AccountType, readonly OnboardingStep[]> = {
  investor: ["account", "identity", "broker_account", "credentials", "lpoa"],
  trader: ["account", "identity", "broker_link", "credentials", "plan"],
};

export function stepsFor(accountType: AccountType): readonly OnboardingStep[] {
  return ONBOARDING_STEPS_BY_TYPE[accountType];
}

/** The union of every step across both tracks — only needed where a single
 *  flat list is unavoidable (e.g. a Mongoose schema enum validator that
 *  must accept whichever track a given user is on). */
export const ALL_ONBOARDING_STEPS: readonly OnboardingStep[] = Array.from(
  new Set(Object.values(ONBOARDING_STEPS_BY_TYPE).flat())
);

/** One plain sentence per step — shown in the wizard's progress indicator,
 *  per the brief's "explain each step in one plain sentence." `credentials`
 *  and `identity` are shared step names across both tracks; the description
 *  here is deliberately worded to be true for either (the safety-critical
 *  distinction — full trading password vs. read-only investor password —
 *  belongs on the step's own form, not this one-line summary). */
export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  account: "Create your login with an email and password.",
  identity: "Confirm your identity, as required by law before you can trade.",
  broker_account: "We open a trading sub-account in your name at our partner broker.",
  credentials: "Your trading account login is encrypted — no one at Nouveau can read it back.",
  lpoa: "You authorize our trading desk to manage the at-risk half of your deposit, within limits you set now.",
  broker_link: "Link your existing trading account — read-only, so we can see your activity but never place a trade or move funds.",
  plan: "Choose the subscription that covers your live trading analysis.",
};
