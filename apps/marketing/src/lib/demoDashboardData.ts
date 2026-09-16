/**
 * DEMO DATA — this whole file is illustrative, not connected to any real
 * account. There is no deposit flow, ledger persistence, or broker
 * integration yet (that's Phase 3+); this exists purely so the dashboard's
 * design and charts can be built and reviewed now rather than waiting on
 * that backend work. Every consumer of this data must show it behind
 * clear "example account" labeling — see Dashboard.tsx.
 *
 * The story it tells is deliberately consistent with how the real system
 * actually works (a deposit splits 50/50 into custody/at-risk, a cycle's
 * target is 1.5x the deposit in total-equity terms, non-trade decisions
 * get logged same as trades), just with invented numbers.
 */

export interface EquityPoint {
  /** Days since the cycle started. */
  day: number;
  equityCents: number;
}

export interface ActivityEntry {
  day: number;
  title: string;
  detail: string;
}

const DEPOSIT_CENTS = 1_000_000; // $10,000
const CUSTODY_CENTS = DEPOSIT_CENTS / 2; // $5,000 — segregated, never traded
const TARGET_CENTS = Math.round(DEPOSIT_CENTS * 1.5); // $15,000 total equity

/** A deterministic, hand-shaped walk — not Math.random() — so the demo
 *  looks the same on every load and the trend reads as intentional rather
 *  than jittery noise. Trends from the initial at-risk deposit toward (but
 *  not reaching) the target, with a drawdown in the middle third to look
 *  like a real trading history rather than a straight line. */
function buildEquitySeries(): EquityPoint[] {
  const atRiskStart = DEPOSIT_CENTS - CUSTODY_CENTS; // $5,000
  const days = 45;
  const points: EquityPoint[] = [];

  for (let day = 0; day <= days; day++) {
    const progress = day / days;
    // Overall upward drift toward roughly 45% growth on the at-risk half,
    // with a mid-cycle dip (sine dip weighted toward the middle third).
    const drift = progress * 0.45;
    const dip = -0.09 * Math.sin(progress * Math.PI) * Math.sin(progress * Math.PI * 3);
    const wobble = 0.015 * Math.sin(progress * Math.PI * 9);
    const atRiskMultiplier = 1 + drift + dip + wobble;
    const atRiskCents = Math.round(atRiskStart * atRiskMultiplier);
    points.push({ day, equityCents: CUSTODY_CENTS + atRiskCents });
  }

  return points;
}

export const demoEquitySeries = buildEquitySeries();

export const demoAccount = {
  depositCents: DEPOSIT_CENTS,
  custodyCents: CUSTODY_CENTS,
  targetCents: TARGET_CENTS,
  get atRiskCents() {
    return demoEquitySeries[demoEquitySeries.length - 1]!.equityCents - CUSTODY_CENTS;
  },
  get totalEquityCents() {
    return demoEquitySeries[demoEquitySeries.length - 1]!.equityCents;
  },
  get progressToTarget() {
    return (this.totalEquityCents - DEPOSIT_CENTS) / (TARGET_CENTS - DEPOSIT_CENTS);
  },
};

export const demoActivity: ActivityEntry[] = [
  {
    day: 45,
    title: "Daily settlement",
    detail: "Equity updated; no rebalancing required.",
  },
  {
    day: 34,
    title: "Position closed",
    detail: "Partial profit realized; stop-loss trailed up on the remaining position.",
  },
  {
    day: 20,
    title: "No trade taken",
    detail: "Signal confidence below the desk's threshold — sitting out was the decision, and it's logged the same as a trade would be.",
  },
  {
    day: 12,
    title: "Daily settlement",
    detail: "Equity updated; no rebalancing required.",
  },
  {
    day: 3,
    title: "Position opened",
    detail: "Trend-following signal triggered entry; stop-loss set per the strategy's risk parameters.",
  },
  {
    day: 0,
    title: "Cycle started",
    detail: `$${(DEPOSIT_CENTS / 100).toLocaleString()} deposited — $${(CUSTODY_CENTS / 100).toLocaleString()} moved to custody, $${(CUSTODY_CENTS / 100).toLocaleString()} funded the at-risk sub-account. Target set at $${(TARGET_CENTS / 100).toLocaleString()} total equity.`,
  },
];

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
