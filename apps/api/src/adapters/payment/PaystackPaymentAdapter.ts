import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentAdapter,
  CreatePlanInput,
  CreatePlanResult,
  InitializeTransactionInput,
  InitializeTransactionResult,
  WebhookEvent,
} from "./PaymentAdapter";
import { HttpError } from "../../middleware/errorHandler";

const PAYSTACK_API_URL = "https://api.paystack.co";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

/**
 * Talks to Paystack's REST API directly over `fetch`, same "no vendor SDK
 * for a handful of plain REST calls" choice this codebase already made for
 * Resend's email adapter. Real-only — see PaymentAdapter's own note.
 */
export class PaystackPaymentAdapter implements PaymentAdapter {
  readonly provider = "paystack";

  constructor(private readonly secretKey: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    const body = (await response.json()) as PaystackResponse<T>;
    if (!response.ok || !body.status) {
      // Never include the secret key (it's in this request's own header) in
      // a thrown error — only Paystack's own message, which never echoes it.
      throw new HttpError(502, `Paystack request failed: ${body.message ?? response.statusText}`);
    }
    return body.data;
  }

  async createPlan(input: CreatePlanInput): Promise<CreatePlanResult> {
    const data = await this.request<{ plan_code: string }>("/plan", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        amount: Number(input.priceCents),
        interval: input.interval,
        currency: input.currency,
      }),
    });
    return { planCode: data.plan_code };
  }

  async initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
    const data = await this.request<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: Number(input.priceCents),
        currency: input.currency,
        plan: input.planCode,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });
    return {
      authorizationUrl: data.authorization_url,
      reference: data.reference,
      accessCode: data.access_code,
    };
  }

  /** Paystack signs webhook bodies with HMAC-SHA512 of the raw request
   *  body, keyed with the same secret key used for API auth (not a
   *  separate webhook-signing secret, unlike some other processors). */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): void {
    if (!signatureHeader) {
      throw new HttpError(401, "Missing Paystack signature.");
    }
    const expected = createHmac("sha512", this.secretKey).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signatureHeader, "hex");
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      throw new HttpError(401, "Invalid Paystack signature.");
    }
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      event: string;
      data?: {
        reference?: string;
        status?: string;
        customer?: { customer_code?: string; email?: string };
        subscription_code?: string;
        plan?: { plan_code?: string } | string;
        plan_code?: string;
        metadata?: Record<string, unknown>;
      };
    };
    const planCode =
      typeof parsed.data?.plan === "string" ? parsed.data.plan : (parsed.data?.plan?.plan_code ?? parsed.data?.plan_code ?? null);
    return {
      event: parsed.event,
      reference: parsed.data?.reference ?? null,
      customerCode: parsed.data?.customer?.customer_code ?? null,
      customerEmail: parsed.data?.customer?.email ?? null,
      subscriptionCode: parsed.data?.subscription_code ?? null,
      planCode,
      status: parsed.data?.status ?? null,
      metadata: parsed.data?.metadata ?? null,
    };
  }
}
