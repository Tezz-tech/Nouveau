export interface CreatePlanInput {
  name: string;
  /** Decimal-string bigint cents (really "smallest currency unit" — kobo
   *  for NGN — generic naming kept consistent with the rest of this
   *  codebase's money convention). */
  priceCents: string;
  currency: string;
  interval: "monthly";
}

export interface CreatePlanResult {
  planCode: string;
}

export interface InitializeTransactionInput {
  email: string;
  priceCents: string;
  currency: string;
  planCode: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
}

export interface WebhookEvent {
  event: string;
  reference: string | null;
  customerCode: string | null;
  customerEmail: string | null;
  subscriptionCode: string | null;
  planCode: string | null;
  status: string | null;
  /** Round-tripped from `InitializeTransactionInput.metadata` — how the
   *  webhook handler recovers which user/plan a checkout was for, without
   *  a separate pending-transaction table. */
  metadata: Record<string, unknown> | null;
}

/**
 * Real-only by explicit client choice — there is no simulator for this
 * build (see config/env.ts). Everything vendor-specific lives behind this
 * interface anyway, same discipline every adapter in this codebase has
 * used, so swapping processors later (or adding a test double) never
 * means touching a caller.
 */
export interface PaymentAdapter {
  readonly provider: string;
  createPlan(input: CreatePlanInput): Promise<CreatePlanResult>;
  initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult>;
  /** Throws if the signature doesn't verify — callers should treat that as
   *  a rejected webhook (401/400), never silently ignored. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): void;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}
