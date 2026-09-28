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
 * only `SimulatorBrokerLinkAdapter` exists so far. `MtAccount.metaApiId`
 * already hints MetaApi (metaapi.cloud) as the intended real provider,
 * reusing the same vendor relationship the investor track's copy-trading
 * needs.
 */
export interface BrokerLinkAdapter {
  readonly provider: string;
  verifyReadOnlyAccess(input: BrokerLinkInput): Promise<BrokerLinkResult>;
}
