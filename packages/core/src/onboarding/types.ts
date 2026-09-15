/**
 * The five steps the brief calls out: account creation, identity
 * verification, broker account creation, credential capture, and the
 * signed LPOA. Modeled as a strict, in-order checklist rather than a
 * branching state machine — onboarding doesn't have alternate paths, it has
 * a sequence a user works through (and can leave and resume) one step at a
 * time.
 */
export type OnboardingStep = "account" | "identity" | "broker_account" | "credentials" | "lpoa";

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "account",
  "identity",
  "broker_account",
  "credentials",
  "lpoa",
];

/** One plain sentence per step — shown in the wizard's progress indicator,
 *  per the brief's "explain each step in one plain sentence." */
export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  account: "Create your login with an email and password.",
  identity: "Confirm your identity, as required by law before you can trade.",
  broker_account: "We open a trading sub-account in your name at our partner broker.",
  credentials: "Your trading account login is encrypted — no one at Nouveau can read it back.",
  lpoa: "You authorize our trading desk to manage the at-risk half of your deposit, within limits you set now.",
};
