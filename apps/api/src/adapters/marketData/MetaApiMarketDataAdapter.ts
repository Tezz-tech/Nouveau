// The bare "metaapi.cloud-sdk" specifier resolves (via its package.json
// "exports" "import" condition) to a browser-targeted webpack bundle that
// references `window`/`self` and crashes immediately under Node ESM. The
// "/node" subpath is the package's own escape hatch to its real Node build
// — see the "Assumptions flagged" note in apps/api/README.md.
import MetaApi from "metaapi.cloud-sdk/node";
import type { Candle } from "@nouveau/core";
import type { MarketDataAdapter } from "./MarketDataAdapter";

const TIMEFRAME = "1m";

/**
 * Real market data via MetaApi (metaapi.cloud). Candles come from a single
 * house MT account (`accountId`, MetaApi's own account id — set via
 * META_API_ACCOUNT_ID) that Nouveau connects purely as a price feed. That
 * account is not any individual trader's account: MetaApi has no
 * "just give me quotes" endpoint independent of a deployed MT account, and
 * major FX/CFD pairs quote near-identically broker to broker, so one
 * dedicated demo account stands in as the feed for every signal request
 * regardless of which broker a given trader linked.
 *
 * Written directly from metaapi.cloud-sdk v29's published type
 * definitions (`node_modules/metaapi.cloud-sdk/lib/metaApi/metatraderAccount.ts`),
 * not exercised against a live MetaApi account — there is no META_API_TOKEN
 * configured anywhere yet to test against. Treat the first real call in a
 * environment with a real token as the actual verification step, not this
 * code review.
 */
export class MetaApiMarketDataAdapter implements MarketDataAdapter {
  readonly provider = "metaapi";
  private readonly api: MetaApi;
  private readonly accountId: string;

  constructor(token: string, accountId: string) {
    this.api = new MetaApi(token);
    this.accountId = accountId;
  }

  async getRecentCandles(symbol: string, count: number): Promise<Candle[]> {
    const account = await this.api.metatraderAccountApi.getAccount(this.accountId);
    if (account.state !== "DEPLOYED") {
      await account.deploy();
    }
    await account.waitConnected();

    // Leaving startTime undefined asks for the latest available candles —
    // MetaApi's historical-candles endpoint loads backwards from "now" when
    // no startTime is given (unlike its tick endpoint, which loads forward).
    const raw = await account.getHistoricalCandles(symbol, TIMEFRAME, undefined, count);

    return raw
      .map((candle) => ({
        timestamp: new Date(candle.time).getTime(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // oldest first, matching MarketDataAdapter's contract
  }
}
