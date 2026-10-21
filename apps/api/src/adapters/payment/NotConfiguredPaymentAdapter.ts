import { HttpError } from "../../middleware/errorHandler";
import type { PaymentAdapter, CreatePlanInput, CreatePlanResult, InitializeTransactionInput, InitializeTransactionResult, WebhookEvent } from "./PaymentAdapter";

const MESSAGE = "Paystack isn't configured yet — set PAYSTACK_SECRET_KEY in apps/api/.env to enable checkout.";

/**
 * Returned by `provider.ts` when `PAYSTACK_SECRET_KEY` is absent — same
 * reasoning as `NotConfiguredCopyTradingAdapter`: a missing vendor key
 * must never crash the whole server (that previously took down
 * login/signup along with checkout) or silently fake a successful charge.
 * Only a request that actually tries to check out or verify a webhook
 * fails, with a clear 503, scoped to exactly that request.
 */
export class NotConfiguredPaymentAdapter implements PaymentAdapter {
  readonly provider = "not-configured";

  async createPlan(_input: CreatePlanInput): Promise<CreatePlanResult> {
    throw new HttpError(503, MESSAGE);
  }

  async initializeTransaction(_input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
    throw new HttpError(503, MESSAGE);
  }

  verifyWebhookSignature(_rawBody: string, _signatureHeader: string | undefined): void {
    throw new HttpError(503, MESSAGE);
  }

  parseWebhookEvent(_rawBody: string): WebhookEvent {
    throw new HttpError(503, MESSAGE);
  }
}
