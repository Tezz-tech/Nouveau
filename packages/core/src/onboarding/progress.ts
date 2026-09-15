import { ONBOARDING_STEPS, type OnboardingStep } from "./types";

export class InvalidOnboardingStepError extends Error {
  constructor(
    public readonly step: OnboardingStep,
    public readonly completedSteps: readonly OnboardingStep[]
  ) {
    super(
      `Cannot complete onboarding step "${step}" — either it's already done, or a required earlier step isn't. Completed so far: [${completedSteps.join(", ")}]`
    );
    this.name = "InvalidOnboardingStepError";
  }
}

/** The next step a user needs to do, or `"complete"` once every step is
 *  done. This is the single function that answers "where does a resuming
 *  user land" — call it with whatever's persisted and route there. */
export function nextStep(completedSteps: readonly OnboardingStep[]): OnboardingStep | "complete" {
  for (const step of ONBOARDING_STEPS) {
    if (!completedSteps.includes(step)) return step;
  }
  return "complete";
}

/** Steps must be completed strictly in order — this is what stops a client
 *  from POSTing "lpoa" before "identity" exists. */
export function canCompleteStep(step: OnboardingStep, completedSteps: readonly OnboardingStep[]): boolean {
  if (completedSteps.includes(step)) return false;
  const index = ONBOARDING_STEPS.indexOf(step);
  const requiredPriorSteps = ONBOARDING_STEPS.slice(0, index);
  return requiredPriorSteps.every((s) => completedSteps.includes(s));
}

export function completeStep(step: OnboardingStep, completedSteps: readonly OnboardingStep[]): OnboardingStep[] {
  if (!canCompleteStep(step, completedSteps)) {
    throw new InvalidOnboardingStepError(step, completedSteps);
  }
  return [...completedSteps, step];
}

export function isOnboardingComplete(completedSteps: readonly OnboardingStep[]): boolean {
  return ONBOARDING_STEPS.every((s) => completedSteps.includes(s));
}

/** For the persistent progress indicator: a 0..1 fraction. */
export function progressFraction(completedSteps: readonly OnboardingStep[]): number {
  const validCompleted = completedSteps.filter((s) => ONBOARDING_STEPS.includes(s));
  return validCompleted.length / ONBOARDING_STEPS.length;
}
