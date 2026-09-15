import { describe, it, expect } from "vitest";
import { canTransition, transition, isTerminal, InvalidCycleTransitionError } from "./stateMachine";
import { ALL_CYCLE_STATUSES, type CycleStatus } from "./types";

const VALID_PAIRS: Array<[CycleStatus, CycleStatus]> = [
  ["pending", "active"],
  ["pending", "halted"],
  ["active", "closing"],
  ["active", "halted"],
  ["closing", "settled"],
  ["closing", "halted"],
  ["halted", "active"],
  ["halted", "closing"],
  ["halted", "settled"],
];

describe("cycle state machine — exhaustive transition table", () => {
  const validSet = new Set(VALID_PAIRS.map(([f, t]) => `${f}->${t}`));

  for (const from of ALL_CYCLE_STATUSES) {
    for (const to of ALL_CYCLE_STATUSES) {
      const shouldBeValid = validSet.has(`${from}->${to}`);
      it(`${from} -> ${to} is ${shouldBeValid ? "allowed" : "rejected"}`, () => {
        expect(canTransition(from, to)).toBe(shouldBeValid);
        if (shouldBeValid) {
          expect(transition(from, to)).toBe(to);
        } else {
          expect(() => transition(from, to)).toThrow(InvalidCycleTransitionError);
        }
      });
    }
  }

  it("covers exactly 25 combinations (5x5) with no gaps in the exhaustive check above", () => {
    expect(ALL_CYCLE_STATUSES.length * ALL_CYCLE_STATUSES.length).toBe(25);
  });
});

describe("settled is terminal", () => {
  it("no status transitions out of settled", () => {
    for (const to of ALL_CYCLE_STATUSES) {
      expect(canTransition("settled", to)).toBe(false);
    }
  });

  it("isTerminal is true only for settled", () => {
    for (const status of ALL_CYCLE_STATUSES) {
      expect(isTerminal(status)).toBe(status === "settled");
    }
  });
});

describe("no status transitions to itself", () => {
  it("every from === to pair is rejected", () => {
    for (const status of ALL_CYCLE_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe("InvalidCycleTransitionError", () => {
  it("carries the from/to that were attempted", () => {
    let caught: unknown;
    try {
      transition("settled", "active");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(InvalidCycleTransitionError);
    expect((caught as InvalidCycleTransitionError).from).toBe("settled");
    expect((caught as InvalidCycleTransitionError).to).toBe("active");
  });
});
