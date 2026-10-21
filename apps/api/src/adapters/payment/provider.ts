import { getEnv } from "../../config/env";
import type { PaymentAdapter } from "./PaymentAdapter";
import { PaystackPaymentAdapter } from "./PaystackPaymentAdapter";

let cached: PaymentAdapter | undefined;

/** env.ts already refuses to boot without PAYSTACK_SECRET_KEY, so this is
 *  always the real adapter — no provider toggle, no simulator. */
export function getPaymentAdapter(): PaymentAdapter {
  if (!cached) {
    cached = new PaystackPaymentAdapter(getEnv().PAYSTACK_SECRET_KEY);
  }
  return cached;
}

export function resetPaymentAdapterCache(): void {
  cached = undefined;
}
