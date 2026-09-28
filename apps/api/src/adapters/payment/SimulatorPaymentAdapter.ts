import { randomUUID } from "node:crypto";
import type { PaymentAdapter, CreateSubscriptionInput, CreateSubscriptionResult, ChargeInput, ChargeResult } from "./PaymentAdapter";

const TRADER_MONTHLY_PRICE_CENTS = 4900; // $49/mo — a placeholder, not a client-confirmed price

/**
 * Marks every subscription active and every deposit/payout successful
 * immediately, with no real money moving — good enough to exercise the
 * investor deposit/withdraw flow and the trader onboarding flow end to end
 * without a real payment processor connected. Never use this in
 * `TRADING_MODE=live` — `config/env.ts` already refuses to boot with that
 * combination.
 */
export class SimulatorPaymentAdapter implements PaymentAdapter {
  readonly provider = "simulator";

  async createSubscription(_input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
    return {
      status: "active",
      priceCents: TRADER_MONTHLY_PRICE_CENTS,
      currency: "usd",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  async chargeDeposit(_input: ChargeInput): Promise<ChargeResult> {
    return { succeeded: true, providerReference: `sim_dep_${randomUUID()}` };
  }

  async payOut(_input: ChargeInput): Promise<ChargeResult> {
    return { succeeded: true, providerReference: `sim_payout_${randomUUID()}` };
  }
}
