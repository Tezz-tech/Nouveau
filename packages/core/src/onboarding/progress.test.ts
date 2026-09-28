import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ONBOARDING_STEPS_BY_TYPE, ONBOARDING_STEP_DESCRIPTIONS, ALL_ONBOARDING_STEPS, stepsFor, type OnboardingStep } from "./types";
import {
  nextStep,
  canCompleteStep,
  completeStep,
  isOnboardingComplete,
  progressFraction,
  InvalidOnboardingStepError,
} from "./progress";

const INVESTOR_STEPS = ONBOARDING_STEPS_BY_TYPE.investor;
const TRADER_STEPS = ONBOARDING_STEPS_BY_TYPE.trader;

const arbStepSubset = fc.subarray([...INVESTOR_STEPS]);

describe("nextStep", () => {
  it("returns the first step when nothing is completed", () => {
    expect(nextStep(INVESTOR_STEPS, [])).toBe("account");
  });

  it("returns each step in order as prior steps complete", () => {
    let completed: OnboardingStep[] = [];
    for (const step of INVESTOR_STEPS) {
      expect(nextStep(INVESTOR_STEPS, completed)).toBe(step);
      completed = [...completed, step];
    }
    expect(nextStep(INVESTOR_STEPS, completed)).toBe("complete");
  });

  it("property: nextStep is always either an incomplete step or 'complete', never an already-completed step", () => {
    fc.assert(
      fc.property(arbStepSubset, (completed) => {
        const next = nextStep(INVESTOR_STEPS, completed);
        if (next !== "complete") {
          expect(completed.includes(next)).toBe(false);
        }
      })
    );
  });
});

describe("canCompleteStep / completeStep — strict ordering", () => {
  it("cannot complete a step out of order", () => {
    expect(canCompleteStep(INVESTOR_STEPS, "lpoa", [])).toBe(false);
    expect(canCompleteStep(INVESTOR_STEPS, "identity", [])).toBe(false); // account not done yet
    expect(() => completeStep(INVESTOR_STEPS, "lpoa", [])).toThrow(InvalidOnboardingStepError);
  });

  it("can complete the first step with nothing done", () => {
    expect(canCompleteStep(INVESTOR_STEPS, "account", [])).toBe(true);
  });

  it("can complete a step once all prior steps are done", () => {
    expect(canCompleteStep(INVESTOR_STEPS, "credentials", ["account", "identity", "broker_account"])).toBe(true);
  });

  it("cannot complete a step that's already done", () => {
    expect(canCompleteStep(INVESTOR_STEPS, "account", ["account"])).toBe(false);
    expect(() => completeStep(INVESTOR_STEPS, "account", ["account"])).toThrow(InvalidOnboardingStepError);
  });

  it("completeStep appends and preserves prior order", () => {
    const result = completeStep(INVESTOR_STEPS, "identity", ["account"]);
    expect(result).toEqual(["account", "identity"]);
  });

  it("the error carries the attempted step and the state it was attempted against", () => {
    let caught: unknown;
    try {
      completeStep(INVESTOR_STEPS, "lpoa", ["account"]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(InvalidOnboardingStepError);
    expect((caught as InvalidOnboardingStepError).step).toBe("lpoa");
    expect((caught as InvalidOnboardingStepError).completedSteps).toEqual(["account"]);
  });

  it("property: walking every step in order via completeStep always succeeds and ends complete", () => {
    let completed: OnboardingStep[] = [];
    for (const step of INVESTOR_STEPS) {
      expect(() => {
        completed = completeStep(INVESTOR_STEPS, step, completed);
      }).not.toThrow();
    }
    expect(isOnboardingComplete(INVESTOR_STEPS, completed)).toBe(true);
  });

  it("property: completeStep never allows skipping ahead, for any prefix of steps", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: INVESTOR_STEPS.length - 1 }), (skipToIndex) => {
        const completed: OnboardingStep[] = [];
        // fc.integer's own min/max bound skipToIndex to a valid index.
        const target = INVESTOR_STEPS[skipToIndex]!;
        if (skipToIndex > 0) {
          expect(() => completeStep(INVESTOR_STEPS, target, completed)).toThrow(InvalidOnboardingStepError);
        } else {
          expect(() => completeStep(INVESTOR_STEPS, target, completed)).not.toThrow();
        }
      })
    );
  });
});

describe("isOnboardingComplete", () => {
  it("is false until every step is present", () => {
    expect(isOnboardingComplete(INVESTOR_STEPS, [])).toBe(false);
    expect(isOnboardingComplete(INVESTOR_STEPS, INVESTOR_STEPS.slice(0, -1))).toBe(false);
  });

  it("is true once every step is present, regardless of order", () => {
    expect(isOnboardingComplete(INVESTOR_STEPS, [...INVESTOR_STEPS])).toBe(true);
    expect(isOnboardingComplete(INVESTOR_STEPS, [...INVESTOR_STEPS].reverse())).toBe(true);
  });
});

describe("progressFraction", () => {
  it("is 0 at the start and 1 when complete", () => {
    expect(progressFraction(INVESTOR_STEPS, [])).toBe(0);
    expect(progressFraction(INVESTOR_STEPS, [...INVESTOR_STEPS])).toBe(1);
  });

  it("is proportional to steps completed", () => {
    expect(progressFraction(INVESTOR_STEPS, ["account"])).toBeCloseTo(1 / 5);
    expect(progressFraction(INVESTOR_STEPS, ["account", "identity"])).toBeCloseTo(2 / 5);
  });

  it("ignores unrecognized values rather than over-counting", () => {
    // @ts-expect-error deliberately passing a bad value to prove robustness
    expect(progressFraction(INVESTOR_STEPS, ["account", "not_a_real_step"])).toBeCloseTo(1 / 5);
  });
});

describe("ONBOARDING_STEP_DESCRIPTIONS", () => {
  it("has a non-empty description for every step across both tracks", () => {
    for (const step of ALL_ONBOARDING_STEPS) {
      expect(ONBOARDING_STEP_DESCRIPTIONS[step]).toBeTruthy();
      expect(ONBOARDING_STEP_DESCRIPTIONS[step].length).toBeGreaterThan(0);
    }
    expect(Object.keys(ONBOARDING_STEP_DESCRIPTIONS).length).toBe(ALL_ONBOARDING_STEPS.length);
  });
});

describe("the trader track", () => {
  it("never includes lpoa — a trader never authorizes Nouveau to trade their money", () => {
    expect(TRADER_STEPS.includes("lpoa")).toBe(false);
    expect(canCompleteStep(TRADER_STEPS, "lpoa", ["account", "identity", "broker_link", "credentials"])).toBe(false);
  });

  it("walks account -> identity -> broker_link -> credentials -> plan -> complete", () => {
    let completed: OnboardingStep[] = [];
    for (const step of TRADER_STEPS) {
      expect(nextStep(TRADER_STEPS, completed)).toBe(step);
      completed = completeStep(TRADER_STEPS, step, completed);
    }
    expect(nextStep(TRADER_STEPS, completed)).toBe("complete");
    expect(isOnboardingComplete(TRADER_STEPS, completed)).toBe(true);
  });

  it("stepsFor resolves the right list for each account type", () => {
    expect(stepsFor("investor")).toBe(INVESTOR_STEPS);
    expect(stepsFor("trader")).toBe(TRADER_STEPS);
  });
});
