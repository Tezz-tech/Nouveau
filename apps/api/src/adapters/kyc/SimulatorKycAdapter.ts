import { randomUUID } from "node:crypto";
import type { KycAdapter, KycSubmission, KycVerificationResult } from "./KycAdapter";

/**
 * Approves anything reasonably well-formed, rejects obvious placeholder
 * input — good enough to exercise the full onboarding flow end to end in
 * development without a real KYC provider wired up. Never use this in
 * `TRADING_MODE=live` — nothing currently stops that at the type level,
 * which is worth revisiting once a real adapter exists (the same way the
 * broker layer's `SimulatorAdapter` will need a guard against being
 * selected in a live environment).
 */
export class SimulatorKycAdapter implements KycAdapter {
  readonly provider = "simulator";

  async submitVerification(input: KycSubmission): Promise<KycVerificationResult> {
    const providerReference = `sim_${randomUUID()}`;
    const looksLikePlaceholder =
      /^(test|foo|bar|asdf|xxx)$/i.test(input.fullName.trim()) ||
      input.fullName.trim().length < 3 ||
      input.idNumber.trim().length < 3;

    if (looksLikePlaceholder) {
      return { status: "rejected", providerReference, reason: "Submission looks like placeholder test data." };
    }
    return { status: "verified", providerReference };
  }
}
