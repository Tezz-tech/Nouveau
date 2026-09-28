export interface CreateSubscriptionInput {
  userId: string;
  plan: "trader_monthly";
}

export interface CreateSubscriptionResult {
  status: "incomplete" | "active";
  priceCents: number;
  currency: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface ChargeInput {
  userId: string;
  /** Decimal-string bigint cents — this interface deliberately doesn't
   *  depend on @nouveau/core's `Cents` type, so it stays usable from any
   *  layer without pulling that import in just for a brand type. */
  amountCents: string;
}

export interface ChargeResult {
  succeeded: boolean;
  providerReference: string;
  reason?: string;
}

/**
 * Investor-track deposits/withdrawals and the trader track's flat
 * subscription fee — everything vendor-specific goes behind this
 * interface, same discipline as `KycAdapter`. Only `SimulatorPaymentAdapter`
 * exists so far. `@nouveau/core`'s ledger.ts already assumes Paystack
 * elsewhere in this project's comments; confirm the real processor before
 * adding a real implementation here.
 */
export interface PaymentAdapter {
  readonly provider: string;
  createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult>;
  /** Pulls money in — a deposit into custody. */
  chargeDeposit(input: ChargeInput): Promise<ChargeResult>;
  /** Pushes money out — completing a withdrawal already recorded as
   *  pending in the ledger. */
  payOut(input: ChargeInput): Promise<ChargeResult>;
}
