import { randomUUID } from "node:crypto";
import type {
  PaymentAdapter,
  CreatePlanInput,
  CreatePlanResult,
  InitializeTransactionInput,
  InitializeTransactionResult,
  WebhookEvent,
} from "../../adapters/payment/PaymentAdapter";
import { HttpError } from "../../middleware/errorHandler";

/** Deterministic in-memory double for automated tests — not a selectable
 *  production mode. `verifyWebhookSignature` treats the literal string
 *  "invalid" as a bad signature and anything else as valid, so tests can
 *  exercise both paths without reimplementing HMAC. `parseWebhookEvent`
 *  expects the raw body to already be a flat `WebhookEvent`-shaped JSON
 *  object (not Paystack's real nested `{event, data: {...}}` wire format —
 *  that mapping is the real `PaystackPaymentAdapter`'s own job, covered by
 *  its own dedicated unit test, not re-tested through every route test
 *  that uses this fake). */
export class FakePaymentAdapter implements PaymentAdapter {
  readonly provider = "fake";

  async createPlan(input: CreatePlanInput): Promise<CreatePlanResult> {
    return { planCode: `fake_plan_${input.name.toLowerCase().replace(/\s+/g, "_")}` };
  }

  async initializeTransaction(_input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
    const reference = `fake_ref_${randomUUID()}`;
    return {
      authorizationUrl: `https://fake-paystack.test/pay/${reference}`,
      reference,
      accessCode: `fake_access_${reference}`,
    };
  }

  verifyWebhookSignature(_rawBody: string, signatureHeader: string | undefined): void {
    if (!signatureHeader || signatureHeader === "invalid") {
      throw new HttpError(401, "Invalid Paystack signature (fake).");
    }
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    return JSON.parse(rawBody) as WebhookEvent;
  }
}
