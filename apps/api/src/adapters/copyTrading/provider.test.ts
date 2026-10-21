import { describe, it, expect, afterEach } from "vitest";
import { resetEnvCache } from "../../config/env";
import { getCopyTradingAdapter, resetCopyTradingAdapterCache } from "./provider";
import { NotConfiguredCopyTradingAdapter } from "./NotConfiguredCopyTradingAdapter";

// Deliberately does NOT test the "META_API_TOKEN is set" branch by actually
// constructing MetaApiCopyTradingAdapter — its constructor builds a real
// `MetaApi`/`CopyFactory` client, which does real async setup work (e.g. a
// latency monitor) that hangs a test process when given a fake token and no
// real network path to MetaApi's servers. The real-adapter branch is a
// single ternary in provider.ts; the NotConfigured branch (what was
// actually broken) is what matters to cover here.

describe("getCopyTradingAdapter", () => {
  const original = process.env.META_API_TOKEN;

  afterEach(() => {
    if (original === undefined) delete process.env.META_API_TOKEN;
    else process.env.META_API_TOKEN = original;
    resetEnvCache();
    resetCopyTradingAdapterCache();
  });

  it("returns a NotConfiguredCopyTradingAdapter when META_API_TOKEN is absent, not a crash", () => {
    delete process.env.META_API_TOKEN;
    resetEnvCache();
    resetCopyTradingAdapterCache();
    const adapter = getCopyTradingAdapter();
    expect(adapter).toBeInstanceOf(NotConfiguredCopyTradingAdapter);
  });

  it("the NotConfigured adapter throws a clear 503 on actual use, never a silent fake success", async () => {
    delete process.env.META_API_TOKEN;
    resetEnvCache();
    resetCopyTradingAdapterCache();
    const adapter = getCopyTradingAdapter();
    await expect(adapter.linkSubscriberAccount({ broker: "b", login: "l", serverName: "s", tradingPassword: "pw" })).rejects.toMatchObject({
      status: 503,
    });
  });
});
