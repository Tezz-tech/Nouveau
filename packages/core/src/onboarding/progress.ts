import type { OnboardingStep } from "./types";

export class InvalidOnboardingStepError extends Error {
  constructor(
    public readonly step: OnboardingStep,
    public readonly completedSteps: readonly OnboardingStep[]
  ) {
    super(
      `Cannot complete onboarding step "${step}" — either it's already done, a required earlier step isn't, or this step doesn't belong to this account's track. Completed so far: [${completedSteps.join(", ")}]`
    );
    this.name = "InvalidOnboardingStepError";
  }
}

/** The next step a user needs to do, or `"complete"` once every step in
 *  `steps` is done. This is the single function that answers "where does a
 *  resuming user land" — call it with the track's step list (see
 *  `stepsFor(accountType)`) and whatever's persisted, and route there. */
export function nextStep(
  steps: readonly OnboardingStep[],
  completedSteps: readonly OnboardingStep[]
): OnboardingStep | "complete" {
  for (const step of steps) {
    if (!completedSteps.includes(step)) return step;
  }
  return "complete";
}

/** Steps must be completed strictly in order, and only if they belong to
 *  this track at all — this is what stops a client from POSTing "lpoa" for
 *  a trader account, not just "lpoa before identity" for anyone. */
export function canCompleteStep(
  steps: readonly OnboardingStep[],
  step: OnboardingStep,
  completedSteps: readonly OnboardingStep[]
): boolean {
  if (completedSteps.includes(step)) return false;
  const index = steps.indexOf(step);
  if (index === -1) return false;
  const requiredPriorSteps = steps.slice(0, index);
  return requiredPriorSteps.every((s) => completedSteps.includes(s));
}

export function completeStep(
  steps: readonly OnboardingStep[],
  step: OnboardingStep,
  completedSteps: readonly OnboardingStep[]
): OnboardingStep[] {
  if (!canCompleteStep(steps, step, completedSteps)) {
    throw new InvalidOnboardingStepError(step, completedSteps);
  }
  return [...completedSteps, step];
}

export function isOnboardingComplete(
  steps: readonly OnboardingStep[],
  completedSteps: readonly OnboardingStep[]
): boolean {
  return steps.every((s) => completedSteps.includes(s));
}

/** For the persistent progress indicator: a 0..1 fraction. */
export function progressFraction(
  steps: readonly OnboardingStep[],
  completedSteps: readonly OnboardingStep[]
): number {
  const validCompleted = completedSteps.filter((s) => steps.includes(s));
  return validCompleted.length / steps.length;
}
