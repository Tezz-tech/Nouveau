/**
 * The shared "Wall Street strip" watchlist. `symbol` is the exact Twelve Data
 * symbol to request (forex uses `BASE/QUOTE`, stocks can carry an exchange
 * suffix like `0700/HKG`). `display` is what the ticker shows, `flag` is an
 * emoji flag for the listing venue, `region` groups the strip header
 * ("United States", "Hong Kong", ...).
 */
export interface WatchlistInstrument {
  symbol: string;
  display: string;
  name: string;
  flag: string;
  region: string;
  market: string;
  decimals: number;
}

export const WATCHLIST: WatchlistInstrument[] = [
  { symbol: "AAPL", display: "AAPL", name: "Apple Inc.", flag: "🇺🇸", region: "United States", market: "NASDAQ", decimals: 2 },
  { symbol: "TSLA", display: "TSLA", name: "Tesla Inc.", flag: "🇺🇸", region: "United States", market: "NASDAQ", decimals: 2 },
  { symbol: "EUR/USD", display: "EUR/USD", name: "Euro / US Dollar", flag: "🇪🇺", region: "United States", market: "FOREX", decimals: 5 },
  { symbol: "0700/HKG", display: "0700", name: "Tencent Holdings", flag: "🇭🇰", region: "Hong Kong", market: "HKEX", decimals: 2 },
  { symbol: "NESN/SIX", display: "NESN", name: "Nestlé S.A.", flag: "🇨🇭", region: "Switzerland", market: "SIX", decimals: 2 },
  { symbol: "7203/TYO", display: "7203", name: "Toyota Motor", flag: "🇯🇵", region: "Japan", market: "JPX", decimals: 2 },
];

export const WATCHLIST_SYMBOLS = WATCHLIST.map((w) => w.symbol);
