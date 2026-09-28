import type { BrokerLinkAdapter, BrokerLinkInput, BrokerLinkResult } from "./BrokerLinkAdapter";

/**
 * Approves anything reasonably well-formed, rejects obvious placeholder
 * input — same shape as `SimulatorKycAdapter`, good enough to exercise the
 * trader onboarding flow end to end without a real MetaApi connection.
 * Never use this in `TRADING_MODE=live` — `config/env.ts` already refuses
 * to boot with that combination.
 */
export class SimulatorBrokerLinkAdapter implements BrokerLinkAdapter {
  readonly provider = "simulator";

  async verifyReadOnlyAccess(input: BrokerLinkInput): Promise<BrokerLinkResult> {
    const looksLikePlaceholder =
      /^(test|foo|bar|asdf|xxx)$/i.test(input.login.trim()) || input.investorPassword.trim().length < 4;

    if (looksLikePlaceholder) {
      return { verified: false, reason: "Couldn't verify that account — check the login and investor password." };
    }
    return { verified: true };
  }
}
