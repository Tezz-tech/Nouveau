import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import { TextField, SubmitButton } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import SketchableChart from "./analytics/SketchableChart";
import { TRADER_PAIRS, getSignal, type SignalResponse } from "@/lib/signalsApi";
import { ApiError } from "@/lib/api";

const BIAS_LABEL: Record<SignalResponse["bias"], string> = {
  buy: "Bullish",
  sell: "Bearish",
  hold: "Neutral",
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

      <RiseIn>
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Trade on your own account.</strong> The chart, sketches, and live analysis
          below are real. Nouveau never places trades for you — you decide whether and when to act, on your own
          broker platform.
        </div>
      </RiseIn>

      {signal?.dataSource === "simulator" && (
        <RiseIn index={1}>
          <div className="mt-3 border border-navy-line/30 bg-paper px-4 py-2 text-caption text-slate">
            Running on simulated market data for now — real prices arrive once a live data provider is connected.
          </div>
        </RiseIn>
      )}

      <h1 className="mt-8 font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Trading analytics
      </h1>

      <RiseIn index={2} className="mt-6 flex flex-wrap gap-2">
        {TRADER_PAIRS.map((p) => (
          <button
            key={p.symbol}
            type="button"
            onClick={() => setPairSymbol(p.symbol)}
            className={`border px-3 py-1.5 text-small transition-colors duration-200 ${
              p.symbol === pairSymbol
                ? "border-ink bg-ink text-paper"
                : "border-navy-line/30 text-slate hover:border-ink hover:text-ink"
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
          <div className="flex h-72 items-center justify-center border border-navy-line/25 bg-paper text-caption text-slate">
            {error ?? "Loading chart…"}
          </div>
        )}
      </RiseIn>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <RiseIn index={4}>
          <h2 className="font-display text-h3 text-ink">Live analysis</h2>
          <p className="mt-1 text-caption text-slate">{pair.name}</p>

          {signal ? (
            <>
              <div className="mt-4 flex items-baseline gap-3 border border-navy-line/25 bg-paper px-4 py-3">
                <span className="text-caption uppercase tracking-[0.06em] text-slate">Signal</span>
                <span className="font-display text-h3 text-ink">{BIAS_LABEL[signal.bias]}</span>
                <span className="text-caption text-slate">({Math.round(signal.confidence * 100)}% confidence)</span>
              </div>
              <p className="mt-4 text-body text-ink">{signal.narration}</p>
              <p className="mt-4 text-caption text-slate">{signal.disclaimer}</p>
            </>
          ) : (
            <p className="mt-4 text-body text-slate">{error ?? "Loading…"}</p>
          )}
        </RiseIn>

        <RiseIn index={5}>
          <h2 className="font-display text-h3 text-ink">Place a trade</h2>
          <p className="mt-1 text-caption text-slate">{pair.symbol}</p>

          <div className="mt-4 border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
            <strong className="font-text">Trade on your own broker.</strong> Nouveau doesn&rsquo;t hold your funds
            or place trades on this account — use the analysis above, then act on your own broker platform.
          </div>

          <form className="mt-4 space-y-6" aria-disabled="true" noValidate>
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                onClick={() => setSide("buy")}
                aria-pressed={side === "buy"}
                className={`flex-1 border px-4 py-2.5 text-small ${
                  side === "buy" ? "border-ink bg-ink text-paper" : "border-navy-line/30 text-slate"
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
                  side === "sell" ? "border-ink bg-ink text-paper" : "border-navy-line/30 text-slate"
                }`}
              >
                Sell
              </button>
            </div>
            <TextField label="Lot size" name="lotSize" type="number" placeholder="0.10" disabled />
            <TextField label="Stop loss" name="stopLoss" type="number" placeholder="Required on every trade" disabled />
            <TextField label="Take profit (optional)" name="takeProfit" type="number" placeholder="Optional" disabled />
            <SubmitButton disabled>Place trade</SubmitButton>
          </form>
        </RiseIn>
      </div>
    </>
  );
}
