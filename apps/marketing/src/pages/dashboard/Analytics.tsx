import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, DarkTextField, InfoBanner, PageHeading, SectionHeading } from "./components/DashboardUI";
import SketchableChart from "./analytics/SketchableChart";
import { TRADER_PAIRS, getSignal, type SignalResponse } from "@/lib/signalsApi";
import { ApiError } from "@/lib/api";

const BIAS_LABEL: Record<SignalResponse["bias"], string> = {
  buy: "Bullish",
  sell: "Bearish",
  hold: "Neutral",
};

const BIAS_TONE: Record<SignalResponse["bias"], string> = {
  buy: "text-gain",
  sell: "text-loss",
  hold: "text-slate-light",
};

/**
 * Trader track only — real live buy/sell analysis on the broker account the
 * trader linked. Reached either as `/dashboard` (an investor's index route
 * shows Overview instead — see dashboard/index.tsx's `DashboardHome`) or as
 * `/dashboard/analytics`, wrapped there in `RequireAccountType`; either way,
 * by the time this component renders, accountType is already confirmed
 * "trader," so there's no guard to repeat here. The chart, pair switching,
 * and sketch tool are real and API-backed (see @nouveau/api's
 * `GET /signals/:base/:quote`); the trade ticket stays permanently disabled
 * by design, not as a "not live yet" placeholder — a trader always executes
 * on their own broker platform, Nouveau never places a trade here.
 */
export default function Analytics() {
  const [pairSymbol, setPairSymbol] = useState(TRADER_PAIRS[0]!.symbol);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [signal, setSignal] = useState<SignalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getSignal(pairSymbol)
      .then((result) => {
        if (!cancelled) setSignal(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load live analysis. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [pairSymbol]);

  const pair = TRADER_PAIRS.find((p) => p.symbol === pairSymbol)!;

  return (
    <>
      <Seo
        title="Trading analytics"
        description="Live buy/sell analysis, charting, and sketch tools on the broker account you linked."
        path="/dashboard/analytics"
      />

      <InfoBanner>
        <strong className="font-text">Trade on your own account.</strong> The chart, sketches, and live analysis
        below are real. Nouveau never places trades for you — you decide whether and when to act, on your own
        broker platform.
      </InfoBanner>

      {signal?.dataSource === "simulator" && (
        <RiseIn index={1} className="mt-3">
          <div className="border border-navy-line/50 bg-navy px-4 py-2 text-caption text-slate-light">
            Running on simulated market data for now — real prices arrive once a live data provider is connected.
          </div>
        </RiseIn>
      )}

      <div className="mt-8">
        <PageHeading>Trading analytics</PageHeading>
      </div>

      <RiseIn index={2} className="mt-6 flex flex-wrap gap-2">
        {TRADER_PAIRS.map((p) => (
          <button
            key={p.symbol}
            type="button"
            onClick={() => setPairSymbol(p.symbol)}
            className={`border px-3 py-1.5 font-mono-figure text-small transition-colors duration-200 ${
              p.symbol === pairSymbol
                ? "border-gold bg-gold text-navy-deep"
                : "border-navy-line text-slate-light hover:border-gold hover:text-paper"
            }`}
          >
            {p.symbol}
          </button>
        ))}
      </RiseIn>

      <RiseIn index={3} className="mt-6">
        {signal ? (
          <SketchableChart pairSymbol={pairSymbol} data={signal.priceSeries} decimals={pair.decimals} />
        ) : (
          <Card className="flex h-72 items-center justify-center text-caption text-slate-light">
            {error ?? "Loading chart…"}
          </Card>
        )}
      </RiseIn>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <RiseIn index={4}>
          <SectionHeading>Live analysis</SectionHeading>
          <p className="mt-1 text-caption text-slate-light">{pair.name}</p>

          {signal ? (
            <>
              <Card className="mt-4 flex items-baseline gap-3">
                <span className="text-caption uppercase tracking-[0.08em] text-slate-light">Signal</span>
                <span className={`font-display text-h3 ${BIAS_TONE[signal.bias]}`}>{BIAS_LABEL[signal.bias]}</span>
                <span className="text-caption text-slate-light">({Math.round(signal.confidence * 100)}% confidence)</span>
              </Card>
              <p className="mt-4 text-body text-paper">{signal.narration}</p>
              <p className="mt-4 text-caption text-slate-light">{signal.disclaimer}</p>
            </>
          ) : (
            <p className="mt-4 text-body text-slate-light">{error ?? "Loading…"}</p>
          )}
        </RiseIn>

        <RiseIn index={5}>
          <SectionHeading>Place a trade</SectionHeading>
          <p className="mt-1 text-caption text-slate-light">{pair.symbol}</p>

          <div className="mt-4">
            <InfoBanner>
              <strong className="font-text">Trade on your own broker.</strong> Nouveau doesn&rsquo;t hold your
              funds or place trades on this account — use the analysis above, then act on your own broker
              platform.
            </InfoBanner>
          </div>

          <form className="mt-4 space-y-6" aria-disabled="true" noValidate>
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                onClick={() => setSide("buy")}
                aria-pressed={side === "buy"}
                className={`flex-1 border px-4 py-2.5 text-small ${
                  side === "buy" ? "border-gain bg-gain/15 text-gain" : "border-navy-line text-slate-light"
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                disabled
                onClick={() => setSide("sell")}
                aria-pressed={side === "sell"}
                className={`flex-1 border px-4 py-2.5 text-small ${
                  side === "sell" ? "border-loss bg-loss/15 text-loss" : "border-navy-line text-slate-light"
                }`}
              >
                Sell
              </button>
            </div>
            <DarkTextField label="Lot size" name="lotSize" type="number" placeholder="0.10" disabled />
            <DarkTextField label="Stop loss" name="stopLoss" type="number" placeholder="Required on every trade" disabled />
            <DarkTextField label="Take profit (optional)" name="takeProfit" type="number" placeholder="Optional" disabled />
            <button
              type="submit"
              disabled
              className="w-full cursor-not-allowed bg-navy-line/30 px-6 py-3.5 text-small text-slate-light/70"
            >
              Place trade
            </button>
          </form>
        </RiseIn>
      </div>
    </>
  );
}
