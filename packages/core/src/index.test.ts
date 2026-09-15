import { describe, it, expect } from "vitest";
import * as Core from "./index";

/**
 * A smoke test over the package's actual public entry point — everything
 * else in this package imports from specific submodule files directly (for
 * precise, readable test failures), which means `index.ts` and the
 * subdirectory `index.ts` re-export barrels never otherwise get exercised.
 * This is what a real consumer (`import { ... } from "@nouveau/core"`)
 * actually sees.
 */
describe("public API surface (@nouveau/core)", () => {
  it("exports the money primitives", () => {
    expect(Core.cents(100n)).toBe(100n);
    expect(Core.ZERO_CENTS).toBe(0n);
    expect(Core.toDecimalString(Core.cents(1234n))).toBe("12.34");
  });

  it("exports the ledger builders and they interoperate end to end", () => {
    const txn = Core.splitDeposit("user_1", "ref", Core.cents(2000n));
    expect(txn.kind).toBe("deposit");
    const balances = Core.applyToBalances(new Map(), [txn]);
    expect(Core.sum([...balances.values()])).toBe(Core.ZERO_CENTS);
  });

  it("exports all three floor policies via the registry", () => {
    expect(Core.getFloorPolicy("fixed")).toBe(Core.fixedFloorPolicy);
    expect(Core.getFloorPolicy("floating")).toBe(Core.floatingFloorPolicy);
    expect(Core.getFloorPolicy("ratchet")).toBe(Core.ratchetFloorPolicy);
    expect(Core.DEFAULT_FLOOR_MODEL).toBe("ratchet");
  });

  it("exports both revenue policies via the registry", () => {
    expect(Core.getRevenuePolicy("subscription_only")).toBe(Core.subscriptionOnlyPolicy);
    expect(Core.getRevenuePolicy("subscription_plus_split")).toBe(Core.subscriptionPlusSplitPolicy);
    expect(Core.DEFAULT_REVENUE_MODEL).toBe("subscription_plus_split");
  });

  it("exports the cycle state machine and settlement calculator, wired together end to end", () => {
    const deposit = Core.cents(20_000n);
    const floor = Core.fixedFloorPolicy.initialFloor(deposit);
    const target = Core.computeTarget(deposit);

    let status = Core.transition("pending", "active");
    status = Core.transition(status, "closing");

    const result = Core.calculateSettlement({
      depositCents: deposit,
      finalTotalEquityCents: target,
      floorCents: floor,
      targetCents: target,
    });
    expect(result.outcome).toBe("target_hit");

    status = Core.transition(status, "settled");
    expect(status).toBe("settled");
    expect(Core.isTerminal(status)).toBe(true);
  });
});
