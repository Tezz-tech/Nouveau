/**
 * DEMO DATA — see the same disclaimer as demoDashboardData.ts. Price
 * series and "fundamental analysis" commentary here are invented for
 * illustration; there is no live market data feed or real analysis engine
 * behind any of it. Every consumer of this data must show it behind clear
 * "Example analysis" labeling — see Analytics.tsx.
 */

export interface Pair {
  symbol: string;
  name: string;
  basePrice: number;
  decimals: number;
}

export const PAIRS: Pair[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", basePrice: 1.082, decimals: 4 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", basePrice: 1.271, decimals: 4 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", basePrice: 149.8, decimals: 2 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", basePrice: 0.652, decimals: 4 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", basePrice: 0.883, decimals: 4 },
];

export interface PricePoint {
  day: number;
  price: number;
}

/** Same philosophy as demoDashboardData's equity series: a deterministic,
 *  hand-shaped walk (drift + a couple of sine components at different
 *  periods), not Math.random() — looks the same on every load, and the
 *  shape differs per pair via the seed so switching pairs doesn't just
 *  show the same curve rescaled. */
function buildPriceSeries(pair: Pair, seed: number): PricePoint[] {
  const days = 60;
  const points: PricePoint[] = [];
  const volatility = pair.basePrice * 0.012;

  for (let day = 0; day <= days; day++) {
    const t = day / days;
    const drift = Math.sin(seed) * 0.4 * t; // net direction over the window, sign/size varies per pair
    const wave1 = Math.sin(t * Math.PI * (2 + seed)) * 0.5;
    const wave2 = Math.sin(t * Math.PI * (7 + seed * 1.7)) * 0.18;
    const price = pair.basePrice + volatility * (drift + wave1 + wave2);
    points.push({ day, price: Number(price.toFixed(pair.decimals)) });
  }

  return points;
}

export const demoPriceSeries: Record<string, PricePoint[]> = Object.fromEntries(
  PAIRS.map((pair, i) => [pair.symbol, buildPriceSeries(pair, i + 1)])
);

export type Bias = "Bullish" | "Bearish" | "Neutral";

export interface FundamentalAnalysis {
  bias: Bias;
  confidence: number; // 0-100, illustrative only
  rateStance: string;
  upcomingEvents: string;
  sentiment: string;
}

export const demoFundamentalAnalysis: Record<string, FundamentalAnalysis> = {
  "EUR/USD": {
    bias: "Bullish",
    confidence: 62,
    rateStance: "ECB holding steady while the Fed signals room to cut — rate differential narrowing in the euro's favor.",
    upcomingEvents: "US Non-Farm Payrolls (Fri), ECB Press Conference (Thu), Eurozone Flash PMI (Wed).",
    sentiment: "Improving Eurozone PMI data and a softer dollar narrative are the main tailwinds this week.",
  },
  "GBP/USD": {
    bias: "Neutral",
    confidence: 48,
    rateStance: "BoE in a holding pattern; inflation print due this week is the next real catalyst either way.",
    upcomingEvents: "UK CPI (Wed), BoE Rate Decision (Thu), US Retail Sales (Fri).",
    sentiment: "Mixed positioning — sterling lacks a clear driver until the CPI print lands.",
  },
  "USD/JPY": {
    bias: "Bearish",
    confidence: 55,
    rateStance: "BoJ policy normalization chatter continues to build against a Fed that's done hiking.",
    upcomingEvents: "BoJ Policy Statement (Tue), US CPI (Wed), Japan Trade Balance (Thu).",
    sentiment: "Intervention risk rises the further this pair extends — asymmetric downside from here.",
  },
  "AUD/USD": {
    bias: "Neutral",
    confidence: 50,
    rateStance: "RBA data-dependent; commodity demand from China is doing more work than the rate path itself.",
    upcomingEvents: "China Trade Balance (Mon), Australia Employment Change (Thu), US PCE (Fri).",
    sentiment: "China demand data is the swing factor — no strong conviction either direction this week.",
  },
  "USD/CHF": {
    bias: "Bearish",
    confidence: 58,
    rateStance: "SNB comfortable with franc strength as a disinflation tool; Fed cut expectations weigh on the dollar side.",
    upcomingEvents: "Swiss CPI (Tue), US FOMC Minutes (Wed), Swiss Trade Balance (Fri).",
    sentiment: "Safe-haven flows into the franc persist against a backdrop of broad dollar softness.",
  },
};
