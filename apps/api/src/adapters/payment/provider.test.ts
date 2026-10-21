import { describe, it, expect, afterEach } from "vitest";
import { resetEnvCache } from "../../config/env";
import { getPaymentAdapter, resetPaymentAdapterCache } from "./provider";
import { PaystackPaymentAdapter } from "./PaystackPaymentAdapter";
import { NotConfiguredPaymentAdapter } from "./NotConfiguredPaymentAdapter";

describe("getPaymentAdapter", () => {
  const original = process.env.PAYSTACK_SECRET_KEY;

  afterEach(() => {
    if (original === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = original;
    resetEnvCache();
    resetPaymentAdapterCache();
  });

  it("returns a NotConfiguredPaymentAdapter when PAYSTACK_SECRET_KEY is absent, not a crash", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    resetEnvCache();
    resetPaymentAdapterCache();
    const adapter = getPaymentAdapter();
    expect(adapter).toBeInstanceOf(NotConfiguredPaymentAdapter);
  });

  it("the NotConfigured adapter throws a clear 503 on actual use, never a silent fake success", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    resetEnvCache();
    resetPaymentAdapterCache();
    const adapter = getPaymentAdapter();
    await expect(adapter.createPlan({ name: "n", priceCents: "100", currency: "NGN", interval: "monthly" })).rejects.toMatchObject({
      status: 503,
    });
  });

  it("returns the real PaystackPaymentAdapter when PAYSTACK_SECRET_KEY is set", () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_fake";
    resetEnvCache();
    resetPaymentAdapterCache();
    const adapter = getPaymentAdapter();
    expect(adapter).toBeInstanceOf(PaystackPaymentAdapter);
  });
});
