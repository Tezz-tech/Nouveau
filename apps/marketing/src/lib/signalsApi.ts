import { api } from "./api";

/** Trader-track only. Real API calls to @nouveau/api's `GET /signals/:base/:quote`
 *  — see that route for what actually computes the bias (deterministic
 *  technical indicators in @nouveau/core, never an LLM). This file is just
 *  the frontend's typed wrapper around it. */

export interface TraderPair {
  symbol: string;
  name: string;
  decimals: number;
}

export const TRADER_PAIRS: TraderPair[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", decimals: 4 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", decimals: 4 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", decimals: 2 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", decimals: 4 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", decimals: 4 },
];

export type SignalBias = "buy" | "sell" | "hold";

export interface SignalResponse {
  symbol: string;
  bias: SignalBias;
  confidence: number;
  narration: string;
  disclaimer: string;
  priceSeries: { day: number; price: number }[];
  dataSource: string;
}

export function getSignal(symbol: string): Promise<SignalResponse> {
  const [base, quote] = symbol.split("/");
  return api.get<SignalResponse>(`/signals/${base}/${quote}`);
}

export interface MarketChatResponse {
  symbol: string;
  message: string;
  dataSource: string;
  priceSeries: { day: number; price: number }[];
  latest: { timestamp: number; open: number; high: number; low: number; close: number };
  changePercent: number;
  observedAt: number;
}

export function askMarketChat(symbol: string, message: string): Promise<MarketChatResponse> {
  const [base, quote] = symbol.split("/");
  return api.post<MarketChatResponse>(`/market-chat/${base}/${quote}`, { message });
}
