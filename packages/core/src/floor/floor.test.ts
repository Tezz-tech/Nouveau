import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { cents } from "../money";
import { fixedFloorPolicy } from "./fixed";
import { floatingFloorPolicy } from "./floating";
import { ratchetFloorPolicy } from "./ratchet";
import { getFloorPolicy, DEFAULT_FLOOR_MODEL } from "./index";
import type { FloorPolicy } from "./types";

const deposit = cents(20_000n); // $200
const initial = cents(10_000n); // half of deposit

describe("all policies agree on the initial floor", () => {
  const policies: FloorPolicy[] = [fixedFloorPolicy, floatingFloorPolicy, ratchetFloorPolicy];
  for (const policy of policies) {
    it(`${policy.model}: initialFloor is exactly half the deposit`, () => {
      expect(policy.initialFloor(deposit)).toBe(initial);
    });
  }
});

describe("fixed", () => {
  it("does not move when equity rises", () => {
    const risen = fixedFloorPolicy.recalculate(initial, cents(30_000n));
    expect(risen).toBe(initial);
  });

  it("does not move when equity falls", () => {
    const fallen = fixedFloorPolicy.recalculate(initial, cents(1_000n));
    expect(fallen).toBe(initial);
  });

  it("is invariant to any sequence of equity readings", () => {
    fc.assert(
      fc.property(fc.array(fc.bigInt({ min: 0n, max: 1_000_000n }).map(cents), { maxLength: 20 }), (readings) => {
        let floor = fixedFloorPolicy.initialFloor(deposit);
        for (const equity of readings) {
          floor = fixedFloorPolicy.recalculate(floor, equity);
        }
        expect(floor).toBe(initial);
      })
    );
  });
});

describe("floating", () => {
  it("rises when equity rises above the deposit", () => {
    const risen = floatingFloorPolicy.recalculate(initial, cents(30_000n)); // equity now 1.5x deposit
    expect(risen).toBe(cents(15_000n));
  });

  it("falls when equity falls below the deposit", () => {
    const fallen = floatingFloorPolicy.recalculate(initial, cents(4_000n));
    expect(fallen).toBe(cents(2_000n));
  });

  it("ignores its own previous value — always exactly half of the latest reading", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 1_000_000n }).map(cents), fc.bigInt({ min: 0n, max: 1_000_000n }).map(cents), (anyFloor, equity) => {
        expect(floatingFloorPolicy.recalculate(anyFloor, equity)).toBe(floatingFloorPolicy.recalculate(cents(0n), equity));
      })
    );
  });
});

describe("ratchet", () => {
  it("rises when equity makes a new high", () => {
    const risen = ratchetFloorPolicy.recalculate(initial, cents(30_000n));
    expect(risen).toBe(cents(15_000n));
  });

  it("does NOT fall when equity later drops below a previously-reached high", () => {
    let floor = ratchetFloorPolicy.initialFloor(deposit); // 10,000
    floor = ratchetFloorPolicy.recalculate(floor, cents(30_000n)); // new high -> floor 15,000
    floor = ratchetFloorPolicy.recalculate(floor, cents(5_000n)); // equity crashes
    expect(floor).toBe(cents(15_000n)); // floor held at the ratcheted level
  });

  it("still rises further on a second, higher high after a dip", () => {
    let floor = ratchetFloorPolicy.initialFloor(deposit);
    floor = ratchetFloorPolicy.recalculate(floor, cents(30_000n)); // 15,000
    floor = ratchetFloorPolicy.recalculate(floor, cents(5_000n)); // still 15,000
    floor = ratchetFloorPolicy.recalculate(floor, cents(50_000n)); // new high -> 25,000
    expect(floor).toBe(cents(25_000n));
  });

  it("property: the floor is monotonically non-decreasing across any sequence of equity readings", () => {
    fc.assert(
      fc.property(fc.array(fc.bigInt({ min: 0n, max: 1_000_000n }).map(cents), { minLength: 1, maxLength: 30 }), (readings) => {
        let floor = ratchetFloorPolicy.initialFloor(deposit);
        for (const equity of readings) {
          const next = ratchetFloorPolicy.recalculate(floor, equity);
          expect(next >= floor).toBe(true);
          floor = next;
        }
      })
    );
  });

  it("property: the floor always equals half of the highest reading seen so far (including the initial deposit-derived value)", () => {
    fc.assert(
      fc.property(fc.array(fc.bigInt({ min: 0n, max: 1_000_000n }).map(cents), { maxLength: 30 }), (readings) => {
        let floor = ratchetFloorPolicy.initialFloor(deposit);
        let peak = deposit;
        for (const equity of readings) {
          floor = ratchetFloorPolicy.recalculate(floor, equity);
          if (equity > peak) peak = equity;
        }
        expect(floor).toBe(fixedFloorPolicy.initialFloor(peak));
      })
    );
  });
});

describe("getFloorPolicy / registry", () => {
  it("resolves each model name to the matching policy", () => {
    expect(getFloorPolicy("fixed")).toBe(fixedFloorPolicy);
    expect(getFloorPolicy("floating")).toBe(floatingFloorPolicy);
    expect(getFloorPolicy("ratchet")).toBe(ratchetFloorPolicy);
  });

  it("defaults to ratchet per the brief", () => {
    expect(DEFAULT_FLOOR_MODEL).toBe("ratchet");
  });
});
