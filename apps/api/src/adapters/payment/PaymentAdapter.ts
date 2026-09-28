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

/**
 * The trader track's flat subscription fee. Everything vendor-specific goes
 * behind this interface, same discipline as `KycAdapter` — only
 * `SimulatorPaymentAdapter` exists so far. `@nouveau/core`'s ledger.ts
 * already assumes Paystack elsewhere in this project's comments; confirm
 * the real processor before adding a real implementation here.
 */
export interface PaymentAdapter {
  readonly provider: string;
  createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult>;
}
