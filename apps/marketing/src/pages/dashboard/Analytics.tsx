import { useState } from "react";
import Seo from "@/components/Seo";
import { TextField, SubmitButton } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import SketchableChart from "./analytics/SketchableChart";
import { PAIRS, demoFundamentalAnalysis, demoPriceSeries, type Bias } from "@/lib/demoAnalyticsData";

const BIAS_LABEL: Record<Bias, string> = {
  Bullish: "Bullish",
  Bearish: "Bearish",
  Neutral: "Neutral",
};

export default function Analytics() {
  const [pairSymbol, setPairSymbol] = useState(PAIRS[0]!.symbol);
  const [side, setSide] = useState<"buy" | "sell">("buy");

  const pair = PAIRS.find((p) => p.symbol === pairSymbol)!;
  const analysis = demoFundamentalAnalysis[pairSymbol]!;
  const series = demoPriceSeries[pairSymbol]!;

  return (
    <>
      <Seo
        title="Trading analytics"
        description="Chart, sketch, and review fundamental analysis on your Nouveau account."
        path="/dashboard/analytics"
      />

      <RiseIn>
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Example analysis.</strong> The chart, sketches, and trade ticket below are
          fully interactive, but the fundamental analysis is illustrative commentary, not real market data, and
          trade placement isn't connected to a live broker yet.
        </div>
      </RiseIn>

      <h1 className="mt-8 font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Trading analytics
      </h1>

      <RiseIn index={1} className="mt-6 flex flex-wrap gap-2">
        {PAIRS.map((p) => (
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

      <RiseIn index={2} className="mt-6">
        <SketchableChart pairSymbol={pairSymbol} data={series} decimals={pair.decimals} />
      </RiseIn>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <RiseIn index={3}>
          <h2 className="font-display text-h3 text-ink">Fundamental analysis</h2>
          <p className="mt-1 text-caption text-slate">{pair.name} — example commentary, not real-time analysis.</p>

          <div className="mt-4 flex items-baseline gap-3 border border-navy-line/25 bg-paper px-4 py-3">
            <span className="text-caption uppercase tracking-[0.06em] text-slate">Suggested bias</span>
            <span className="font-display text-h3 text-ink">{BIAS_LABEL[analysis.bias]}</span>
            <span className="text-caption text-slate">({analysis.confidence}% illustrative confidence)</span>
          </div>

          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-caption uppercase tracking-[0.06em] text-slate">Rate stance</dt>
              <dd className="mt-1 text-body text-ink">{analysis.rateStance}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-[0.06em] text-slate">Upcoming events</dt>
              <dd className="mt-1 text-body text-ink">{analysis.upcomingEvents}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-[0.06em] text-slate">Sentiment</dt>
              <dd className="mt-1 text-body text-ink">{analysis.sentiment}</dd>
            </div>
          </dl>
        </RiseIn>

        <RiseIn index={4}>
          <h2 className="font-display text-h3 text-ink">Place a trade</h2>
          <p className="mt-1 text-caption text-slate">{pair.symbol}</p>

          <div className="mt-4 border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
            <strong className="font-text">Not live yet.</strong> No broker is connected on this build — this is a
            preview of what placing a trade will look like.
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
