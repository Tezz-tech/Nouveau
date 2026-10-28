// Both packages resolve (via their "import" package.json export condition)
// to a browser-targeted webpack bundle that crashes under Node ESM with
// `window is not defined` — the "/node" subpath is each package's own
// escape hatch to its real Node build. Found and fixed earlier this
// project for the base SDK; confirmed the CopyFactory SDK has the exact
// same package.json shape, so the same fix applies here too.
//
// That still isn't enough on its own, though: native Node's ESM-importing-
// CJS interop does NOT unwrap this particular CJS build's `exports.default`
// the way `import X from "..."` implies — `import MetaApi from
// "metaapi.cloud-sdk/node"` silently binds `MetaApi` to the whole
// `module.exports` object (so `new MetaApi(...)` fails with "MetaApi is not
// a constructor"), one level short of the real class at
// `module.exports.default`. Confirmed this only breaks under genuine native
// Node ESM (i.e. the bundled Vercel output) — `tsx`'s own interop resolves
// `import X from` correctly with zero extra unwrapping, which is exactly
// why this was invisible in local dev and only surfaced testing the actual
// bundle. `createRequire` sidesteps the ambiguity entirely by using real
// CommonJS `require()` semantics, which behave identically (and correctly)
// in both environments — verified directly against both packages before
// relying on it here.
import { createRequire } from "node:module";
import type MetaApiType from "metaapi.cloud-sdk/node";
import type CopyFactoryType from "metaapi.cloud-copyfactory-sdk/node";
import type {
  CopyTradingAdapter,
  LinkSubscriberAccountInput,
  LinkSubscriberAccountResult,
  ConnectionStatusResult,
  EnsureProviderStrategyInput,
  EnsureProviderStrategyResult,
  CreateProviderAccountInput,
  FinalizeProviderStrategyInput,
  FinalizeProviderStrategyResult,
} from "./CopyTradingAdapter";

/**
 * Written directly from both SDKs' published v29/v11 type definitions
 * (`node_modules/metaapi.cloud-sdk/...`, `node_modules/
 * metaapi.cloud-copyfactory-sdk/...`), not exercised against a live
 * MetaApi account or a real master strategy — there is no META_API_TOKEN
 * configured anywhere yet to test against. Treat the first real call in an
 * environment with a real token as the actual verification step, not this
 * code review.
 *
 * Known real limitation, not just an untested edge case (carried over from
 * this session's earlier broker-link work): a brand-new MetaApi
 * provisioning profile only reaches "active" status once the broker's
 * servers.dat (MT5) file is uploaded to it — a manual, broker-specific step
 * this code cannot do on its own. Many common broker servers are already
 * recognized by MetaApi without it; an obscure one will fail account
 * creation with a real, surfaced error.
 */
const requireFromHere = createRequire(import.meta.url);
const MetaApi: typeof MetaApiType = requireFromHere("metaapi.cloud-sdk/node").default;
const CopyFactory: typeof CopyFactoryType = requireFromHere("metaapi.cloud-copyfactory-sdk/node").default;

export class MetaApiCopyTradingAdapter implements CopyTradingAdapter {
  readonly provider = "metaapi";
  private readonly api: MetaApiType;
  private readonly copyFactory: CopyFactoryType;

  constructor(token: string) {
    this.api = new MetaApi(token);
    this.copyFactory = new CopyFactory(token);
  }

  async linkSubscriberAccount(input: LinkSubscriberAccountInput): Promise<LinkSubscriberAccountResult> {
    const account = await this.createAccount({
      name: `subscriber-${input.login}-${Date.now()}`,
      broker: input.broker,
      login: input.login,
      serverName: input.serverName,
      password: input.tradingPassword,
      role: "SUBSCRIBER",
    });
    await account.deploy();
    // Deliberately NOT awaiting waitConnected() — a serverless function's
    // execution-time limit is shorter than MetaApi's worst-case deploy+
    // connect time. The caller (mtAccountService) polls
    // pollConnectionStatus separately instead of blocking this call.
    return { metaApiAccountId: account.id };
  }

  async pollConnectionStatus(metaApiAccountId: string): Promise<ConnectionStatusResult> {
    try {
      const account = await this.api.metatraderAccountApi.getAccount(metaApiAccountId);
      if (account.state === "DEPLOY_FAILED" || account.state === "UNDEPLOY_FAILED") {
        return { stage: "failed", errorMessage: `MetaApi account state: ${account.state}` };
      }
      if (account.state !== "DEPLOYED") {
        return { stage: "deploying" };
      }
      if (account.connectionStatus === "CONNECTED") {
        return { stage: "connected" };
      }
      return { stage: "connecting" };
    } catch (err) {
      return { stage: "failed", errorMessage: err instanceof Error ? err.message : "Unknown MetaApi error." };
    }
  }

  async subscribeToStrategy(metaApiAccountId: string, copyFactoryStrategyId: string, multiplier: number): Promise<void> {
    await this.copyFactory.configurationApi.updateSubscriber(metaApiAccountId, {
      name: metaApiAccountId,
      subscriptions: [{ strategyId: copyFactoryStrategyId, multiplier }],
    });
  }

  async ensureProviderStrategy(input: EnsureProviderStrategyInput): Promise<EnsureProviderStrategyResult> {
    let metaApiAccountId = input.existingMetaApiAccountId;
    if (!metaApiAccountId) {
      if (!input.broker || !input.login || !input.serverName || !input.tradingPassword) {
        throw new Error(
          "ensureProviderStrategy needs either existingMetaApiAccountId or the full broker/login/serverName/tradingPassword set."
        );
      }
      const account = await this.createAccount({
        name: `master-${input.name}`,
        broker: input.broker,
        login: input.login,
        serverName: input.serverName,
        password: input.tradingPassword,
        role: "PROVIDER",
      });
      await account.deploy();
      await account.waitConnected(); // only ever runs offline (the seed script), fine to block here
      metaApiAccountId = account.id;
    }

    const result = await this.finalizeProviderStrategy({
      metaApiAccountId,
      name: input.name,
      description: input.description,
      maxTradeRiskPct: input.maxTradeRiskPct,
    });
    return { metaApiAccountId, ...result };
  }

  async createProviderAccount(input: CreateProviderAccountInput): Promise<LinkSubscriberAccountResult> {
    const account = await this.createAccount({
      name: `master-${input.login}-${Date.now()}`,
      broker: input.broker,
      login: input.login,
      serverName: input.serverName,
      password: input.tradingPassword,
      role: "PROVIDER",
    });
    await account.deploy();
    // Deliberately NOT awaiting waitConnected() — same non-blocking
    // contract as linkSubscriberAccount, so an admin HTTP request never
    // blocks on MetaApi's real deploy/connect time. The caller
    // (adminMasterStrategyService) polls pollConnectionStatus, then calls
    // finalizeProviderStrategy once connected.
    return { metaApiAccountId: account.id };
  }

  async finalizeProviderStrategy(input: FinalizeProviderStrategyInput): Promise<FinalizeProviderStrategyResult> {
    const { id: copyFactoryStrategyId } = await this.copyFactory.configurationApi.generateStrategyId();
    const strategyConfig = {
      name: input.name,
      description: input.description,
      accountId: input.metaApiAccountId,
      // CopyFactory expresses this as a fraction of 1, not a percentage.
      maxTradeRisk: input.maxTradeRiskPct !== undefined ? input.maxTradeRiskPct / 100 : undefined,
    };
    await this.copyFactory.configurationApi.updateStrategy(copyFactoryStrategyId, strategyConfig);
    return { copyFactoryStrategyId, appliedConfig: strategyConfig };
  }

  private async createAccount(input: {
    name: string;
    broker: string;
    login: string;
    serverName: string;
    password: string;
    role: "SUBSCRIBER" | "PROVIDER";
  }) {
    const profile = await this.findOrCreateProvisioningProfile(input.serverName);
    return this.api.metatraderAccountApi.createAccount({
      name: input.name,
      login: input.login,
      password: input.password,
      server: input.serverName,
      provisioningProfileId: profile.id,
      magic: 0,
      copyFactoryRoles: [input.role],
    });
  }

  private async findOrCreateProvisioningProfile(serverName: string) {
    const existing = await this.api.provisioningProfileApi.getProvisioningProfilesWithInfiniteScrollPagination({
      query: serverName,
    });
    const match = existing.find((profile) => profile.name === serverName);
    if (match) return match;

    // version 5 (MT5) assumed as the common case — a real MT4-specific
    // broker would need this to branch on a platform hint once one
    // actually shows up, rather than guessing further ahead of real usage.
    return this.api.provisioningProfileApi.createProvisioningProfile({
      name: serverName,
      version: 5,
      brokerTimezone: "EET",
      brokerDSTSwitchTimezone: "EET",
    });
  }
}
