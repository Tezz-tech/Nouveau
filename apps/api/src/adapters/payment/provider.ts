import { getEnv } from "../../config/env";
import type { PaymentAdapter } from "./PaymentAdapter";
import { SimulatorPaymentAdapter } from "./SimulatorPaymentAdapter";

let cached: PaymentAdapter | undefined;

export function getPaymentAdapter(): PaymentAdapter {
  if (!cached) {
    const env = getEnv();
    if (env.PAYMENT_PROVIDER === "real") {
      throw new Error(
        "PAYMENT_PROVIDER=real has no adapter implementation yet — confirm the real processor (Paystack? Stripe?) before wiring this, per the note in config/env.ts."
      );
    }
    cached = new SimulatorPaymentAdapter();
  }
  return cached;
}

export function resetPaymentAdapterCache(): void {
  cached = undefined;
}
