import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { PaystackPaymentAdapter } from "./PaystackPaymentAdapter";

const SECRET = "test-secret-key";

function sign(rawBody: string): string {
  return createHmac("sha512", SECRET).update(rawBody).digest("hex");
}

describe("PaystackPaymentAdapter", () => {
  describe("verifyWebhookSignature", () => {
    it("accepts a correctly signed body", () => {
      const adapter = new PaystackPaymentAdapter(SECRET);
      const rawBody = JSON.stringify({ event: "charge.success", data: {} });
      expect(() => adapter.verifyWebhookSignature(rawBody, sign(rawBody))).not.toThrow();
    });

    it("rejects a body signed with the wrong secret", () => {
      const adapter = new PaystackPaymentAdapter(SECRET);
      const rawBody = JSON.stringify({ event: "charge.success", data: {} });
      const wrongSignature = createHmac("sha512", "a-different-secret").update(rawBody).digest("hex");
      expect(() => adapter.verifyWebhookSignature(rawBody, wrongSignature)).toThrow(/invalid/i);
    });

    it("rejects a tampered body even with a validly-formatted signature", () => {
      const adapter = new PaystackPaymentAdapter(SECRET);
      const original = JSON.stringify({ event: "charge.success", data: { amount: 100 } });
      const tampered = JSON.stringify({ event: "charge.success", data: { amount: 999999 } });
      expect(() => adapter.verifyWebhookSignature(tampered, sign(original))).toThrow(/invalid/i);
    });

    it("rejects a missing signature header", () => {
      const adapter = new PaystackPaymentAdapter(SECRET);
      expect(() => adapter.verifyWebhookSignature("{}", undefined)).toThrow(/missing/i);
    });
  });

  describe("parseWebhookEvent", () => {
    it("maps Paystack's real nested wire format into a flat WebhookEvent", () => {
      const adapter = new PaystackPaymentAdapter(SECRET);
      const rawBody = JSON.stringify({
        event: "charge.success",
        data: {
          reference: "ref-123",
          status: "success",
          customer: { customer_code: "CUS_abc", email: "user@example.com" },
          subscription_code: "SUB_xyz",
          plan: { plan_code: "PLN_plan1" },
          metadata: { userId: "user-1", botPlanId: "plan-1" },
        },
      });

      const event = adapter.parseWebhookEvent(rawBody);
      expect(event).toEqual({
        event: "charge.success",
        reference: "ref-123",
        customerCode: "CUS_abc",
        customerEmail: "user@example.com",
        subscriptionCode: "SUB_xyz",
        planCode: "PLN_plan1",
        status: "success",
        metadata: { userId: "user-1", botPlanId: "plan-1" },
      });
    });

    it("handles plan as a bare plan-code string instead of a nested object", () => {
      const adapter = new PaystackPaymentAdapter(SECRET);
      const rawBody = JSON.stringify({ event: "subscription.create", data: { plan: "PLN_bare" } });
      const event = adapter.parseWebhookEvent(rawBody);
      expect(event.planCode).toBe("PLN_bare");
    });

    it("never throws on a sparsely-populated event — every field is nullable", () => {
      const adapter = new PaystackPaymentAdapter(SECRET);
      const event = adapter.parseWebhookEvent(JSON.stringify({ event: "invoice.payment_failed" }));
      expect(event.reference).toBeNull();
      expect(event.metadata).toBeNull();
    });
  });
});
