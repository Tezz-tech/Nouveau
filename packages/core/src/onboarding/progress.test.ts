import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ONBOARDING_STEPS, ONBOARDING_STEP_DESCRIPTIONS, type OnboardingStep } from "./types";
import {
  nextStep,
  canCompleteStep,
  completeStep,
  isOnboardingComplete,
  progressFraction,
  InvalidOnboardingStepError,
} from "./progress";

const arbStepSubset = fc.subarray([...ONBOARDING_STEPS]);

describe("nextStep", () => {
  it("returns the first step when nothing is completed", () => {
    expect(nextStep([])).toBe("account");
  });

  it("returns each step in order as prior steps complete", () => {
    let completed: OnboardingStep[] = [];
    for (const step of ONBOARDING_STEPS) {
      expect(nextStep(completed)).toBe(step);
      completed = [...completed, step];
    }
    expect(nextStep(completed)).toBe("complete");
  });

  it("property: nextStep is always either an incomplete step or 'complete', never an already-completed step", () => {
    fc.assert(
      fc.property(arbStepSubset, (completed) => {
        const next = nextStep(completed);
        if (next !== "complete") {
          expect(completed.includes(next)).toBe(false);
        }
      })
    );
  });
});

describe("canCompleteStep / completeStep — strict ordering", () => {
  it("cannot complete a step out of order", () => {
    expect(canCompleteStep("lpoa", [])).toBe(false);
    expect(canCompleteStep("identity", [])).toBe(false); // account not done yet
    expect(() => completeStep("lpoa", [])).toThrow(InvalidOnboardingStepError);
  });

  it("can complete the first step with nothing done", () => {
    expect(canCompleteStep("account", [])).toBe(true);
  });

  it("can complete a step once all prior steps are done", () => {
    expect(canCompleteStep("credentials", ["account", "identity", "broker_account"])).toBe(true);
  });

  it("cannot complete a step that's already done", () => {
    expect(canCompleteStep("account", ["account"])).toBe(false);
    expect(() => completeStep("account", ["account"])).toThrow(InvalidOnboardingStepError);
  });

  it("completeStep appends and preserves prior order", () => {
    const result = completeStep("identity", ["account"]);
    expect(result).toEqual(["account", "identity"]);
  });

  it("the error carries the attempted step and the state it was attempted against", () => {
    let caught: unknown;
    try {
      completeStep("lpoa", ["account"]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(InvalidOnboardingStepError);
    expect((caught as InvalidOnboardingStepError).step).toBe("lpoa");
    expect((caught as InvalidOnboardingStepError).completedSteps).toEqual(["account"]);
  });

  it("property: walking every step in order via completeStep always succeeds and ends complete", () => {
    let completed: OnboardingStep[] = [];
    for (const step of ONBOARDING_STEPS) {
      expect(() => {
        completed = completeStep(step, completed);
      }).not.toThrow();
    }
    expect(isOnboardingComplete(completed)).toBe(true);
  });

  it("property: completeStep never allows skipping ahead, for any prefix of steps", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: ONBOARDING_STEPS.length - 1 }), (skipToIndex) => {
        const completed: OnboardingStep[] = [];
        // fc.integer's own min/max bound skipToIndex to a valid index.
        const target = ONBOARDING_STEPS[skipToIndex]!;
        if (skipToIndex > 0) {
          expect(() => completeStep(target, completed)).toThrow(InvalidOnboardingStepError);
        } else {
          expect(() => completeStep(target, completed)).not.toThrow();
        }
      })
    );
  });
});

describe("isOnboardingComplete", () => {
  it("is false until every step is present", () => {
    expect(isOnboardingComplete([])).toBe(false);
    expect(isOnboardingComplete(ONBOARDING_STEPS.slice(0, -1))).toBe(false);
  });

  it("is true once every step is present, regardless of order", () => {
    expect(isOnboardingComplete([...ONBOARDING_STEPS])).toBe(true);
    expect(isOnboardingComplete([...ONBOARDING_STEPS].reverse())).toBe(true);
  });
});

describe("progressFraction", () => {
  it("is 0 at the start and 1 when complete", () => {
    expect(progressFraction([])).toBe(0);
    expect(progressFraction([...ONBOARDING_STEPS])).toBe(1);
  });

  it("is proportional to steps completed", () => {
    expect(progressFraction(["account"])).toBeCloseTo(1 / 5);
    expect(progressFraction(["account", "identity"])).toBeCloseTo(2 / 5);
  });

  it("ignores unrecognized values rather than over-counting", () => {
    // @ts-expect-error deliberately passing a bad value to prove robustness
    expect(progressFraction(["account", "not_a_real_step"])).toBeCloseTo(1 / 5);
  });
});

describe("ONBOARDING_STEP_DESCRIPTIONS", () => {
  it("has exactly one description per step, all non-empty", () => {
    for (const step of ONBOARDING_STEPS) {
      expect(ONBOARDING_STEP_DESCRIPTIONS[step]).toBeTruthy();
      expect(ONBOARDING_STEP_DESCRIPTIONS[step].length).toBeGreaterThan(0);
    }
    expect(Object.keys(ONBOARDING_STEP_DESCRIPTIONS).length).toBe(ONBOARDING_STEPS.length);
  });
});
