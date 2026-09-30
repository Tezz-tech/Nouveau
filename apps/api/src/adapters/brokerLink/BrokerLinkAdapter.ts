export interface BrokerLinkInput {
  broker: string;
  login: string;
  serverName: string;
  /** MT4/5's own read-only credential — must never be the account's full
   *  trading password. Enforced by `onboardingService.linkBrokerAccount`,
   *  which stores every trader-linked account with
   *  `credentialKind: "investor_password"`. */
  investorPassword: string;
}

export interface BrokerLinkResult {
  verified: boolean;
  reason?: string;
}

/**
 * Confirms a trader's own broker account is real and reachable read-only,
 * before Nouveau starts pulling live analysis from it. Everything vendor-
 * specific goes behind this interface, same discipline as `KycAdapter` —
 * only `SimulatorBrokerLinkAdapter` is available. Twelve Data supplies
 * market candles but cannot verify MT4/5 credentials; choose a broker or
 * integration that supports account verification before enabling this for
 * real users.
 */
export interface BrokerLinkAdapter {
  readonly provider: string;
  verifyReadOnlyAccess(input: BrokerLinkInput): Promise<BrokerLinkResult>;
}
