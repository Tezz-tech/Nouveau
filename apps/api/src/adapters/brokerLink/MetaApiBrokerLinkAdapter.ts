// See MetaApiMarketDataAdapter's comment: the "/node" subpath is required to
// avoid Node ESM resolving the package's browser bundle and crashing on
// `window is not defined`.
import MetaApi from "metaapi.cloud-sdk/node";
import type { BrokerLinkAdapter, BrokerLinkInput, BrokerLinkResult } from "./BrokerLinkAdapter";

/**
 * Real broker-account verification via MetaApi. Creates a temporary
 * MetaApi-side MT account using the trader's own investor (read-only)
 * password, waits to see whether it actually connects to their broker, then
 * removes the temporary account either way — this call's only job is
 * "is this real and reachable," not "stay connected forever." (Ongoing
 * per-trader connections for live analysis aren't built yet; today's
 * signal pipeline reads from one shared house account — see
 * MetaApiMarketDataAdapter — not a connection per linked broker account.)
 *
 * Known real limitation, not just an untested edge case: MetaApi requires a
 * "provisioning profile" per broker server, and a brand-new profile only
 * reaches "active" status once the broker's servers.dat (MT5) or
 * broker.srv (MT4) file is uploaded to it — a one-time manual step this
 * code cannot do on its own, since that file has to come from the broker or
 * from MetaApi's own broker database. Many common broker servers are
 * already recognized by MetaApi without this step; anything obscure will
 * fail account creation with a real, surfaced error rather than a false
 * "verified: true".
 *
 * Written directly from metaapi.cloud-sdk v29's published type definitions,
 * not exercised against a live MetaApi account — no META_API_TOKEN exists
 * anywhere yet to test against. Treat the first real call in an environment
 * with a real token as the actual verification step, not this code review.
 */
export class MetaApiBrokerLinkAdapter implements BrokerLinkAdapter {
  readonly provider = "metaapi";
  private readonly api: MetaApi;

  constructor(token: string) {
    this.api = new MetaApi(token);
  }

  async verifyReadOnlyAccess(input: BrokerLinkInput): Promise<BrokerLinkResult> {
    let account: Awaited<ReturnType<MetaApi["metatraderAccountApi"]["createAccount"]>> | undefined;

    try {
      const profile = await this.findOrCreateProvisioningProfile(input.serverName);

      account = await this.api.metatraderAccountApi.createAccount({
        name: `verify-${input.login}-${Date.now()}`,
        login: input.login,
        password: input.investorPassword,
        server: input.serverName,
        provisioningProfileId: profile.id,
        magic: 0,
      });

      await account.deploy();
      await account.waitConnected();
      return { verified: true };
    } catch (err) {
      return {
        verified: false,
        reason: err instanceof Error ? err.message : "Couldn't verify that broker account.",
      };
    } finally {
      if (account) {
        try {
          await account.remove();
        } catch {
          // Best-effort cleanup — a leftover disabled account in MetaApi's
          // own dashboard is a nuisance to tidy up later, not a security
          // issue, since it only ever held a read-only investor credential.
        }
      }
    }
  }

  private async findOrCreateProvisioningProfile(serverName: string) {
    const existing = await this.api.provisioningProfileApi.getProvisioningProfilesWithInfiniteScrollPagination({
      query: serverName,
    });
    const match = existing.find((profile) => profile.name === serverName);
    if (match) return match;

    // version 5 (MT5) assumed as the common case — a real MT4-specific
    // broker would need this to branch on `input.broker`/a platform hint
    // once one actually shows up, rather than guessing further ahead of
    // real usage.
    return this.api.provisioningProfileApi.createProvisioningProfile({
      name: serverName,
      version: 5,
      brokerTimezone: "EET",
      brokerDSTSwitchTimezone: "EET",
    });
  }
}
