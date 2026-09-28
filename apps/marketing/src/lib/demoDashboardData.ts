/**
 * DEMO DATA — for `TradingHistory.tsx` only. Every other dashboard page
 * that used to read from this file (Overview, Funding, Withdraw,
 * Transactions) is now backed by real, ledger-persisted data — see
 * `lib/ledgerApi.ts`. Trading history remains demo data because there is
 * no real trading yet: without a real broker connection, there are no real
 * trades to show, and inventing some would be actively misleading rather
 * than just incomplete. Remove this file's last use once real broker
 * trading exists and TradingHistory can read real trade records instead.
 */

export interface TradeEntry {
  day: number;
  instrument: string;
  direction: "Long" | "Short";
  entryPrice: number;
  exitPrice: number | null;
  pnlCents: number | null;
}

export const demoTrades: TradeEntry[] = [
  { day: 42, instrument: "EUR/USD", direction: "Long", entryPrice: 1.0842, exitPrice: null, pnlCents: null },
  {
    day: 34,
    instrument: "GBP/USD",
    direction: "Short",
    entryPrice: 1.2711,
    exitPrice: 1.2634,
    pnlCents: 61_300,
  },
  {
    day: 3,
    instrument: "USD/JPY",
    direction: "Long",
    entryPrice: 149.82,
    exitPrice: 151.05,
    pnlCents: 42_800,
  },
];

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
