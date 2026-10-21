import { getEnv } from "../../config/env";
import type { PaymentAdapter } from "./PaymentAdapter";
import { PaystackPaymentAdapter } from "./PaystackPaymentAdapter";
import { NotConfiguredPaymentAdapter } from "./NotConfiguredPaymentAdapter";

let cached: PaymentAdapter | undefined;

/** Real adapter when PAYSTACK_SECRET_KEY is set; otherwise a clear, scoped
 *  "not configured" error on first actual use — never a simulator, never
 *  something that blocks server startup (see config/env.ts's note on why
 *  that was a real incident). */
export function getPaymentAdapter(): PaymentAdapter {
  if (!cached) {
    const key = getEnv().PAYSTACK_SECRET_KEY;
    cached = key ? new PaystackPaymentAdapter(key) : new NotConfiguredPaymentAdapter();
  }
  return cached;
}

export function resetPaymentAdapterCache(): void {
  cached = undefined;
}
