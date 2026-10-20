import { api } from "./api";

/** Investor-track only. Real API calls to @nouveau/api's ledger endpoints
 *  (`/account/overview`, `/account/deposit`, `/account/withdraw`,
 *  `/account/transactions`) — every number these return is computed live
 *  from persisted transactions, never invented. What's still simulated is
 *  the payment capture itself; see apps/api/README.md. */

export interface EquityPoint {
  timestamp: string;
  totalEquityCents: string;
}

export interface Overview {
  custodyCents: string;
  atRiskCents: string;
  totalEquityCents: string;
  totalDepositedCents: string;
  targetCents: string | null;
  equitySeries: EquityPoint[];
}

export interface TransactionSummary {
  kind: string;
  reference: string;
  description: string;
  amountCents: string;
  createdAt: string;
}

export function getOverview(): Promise<Overview> {
  return api.get<Overview>("/account/overview");
}

export function deposit(amountCents: number): Promise<Overview> {
  return api.post<Overview>("/account/deposit", { amountCents });
}

export function withdraw(amountCents: number): Promise<Overview> {
  return api.post<Overview>("/account/withdraw", { amountCents });
}

export function getTransactions(): Promise<TransactionSummary[]> {
  return api.get<TransactionSummary[]>("/account/transactions");
}

export function formatCents(centsStr: string): string {
  return (Number(centsStr) / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Copy-trading: link to the master, demo AI trades, audit the log. */
export interface CopyStatus {
  provider: string;
  master: { login: string; strategyId: string | null };
  subscription: { mode: string; multiplier: number; status: string; strategyId: string | null } | null;
}

export interface CopyTradeRow {
  masterTicket: string;
  symbol: string;
  side: string;
  masterLot: number;
  followerLot: number;
  status: string;
  reason: string;
  createdAt: string;
}

export interface CopyDecisionRow {
  symbol: string;
  bias: string;
  verdict: string;
  approvedLot: number | null;
  logReason: string;
  createdAt: string;
}

export function getCopyStatus(): Promise<CopyStatus> {
  return api.get<CopyStatus>("/copy/status");
}

export function subscribeCopy(input: { mode?: string; multiplier?: number }): Promise<unknown> {
  return api.post("/copy/subscribe", input);
}

export function unsubscribeCopy(): Promise<unknown> {
  return api.del("/copy/subscribe");
}

export function getCopyTrades(): Promise<CopyTradeRow[]> {
  return api.get<CopyTradeRow[]>("/copy/trades");
}

export function getCopyDecisions(): Promise<CopyDecisionRow[]> {
  return api.get<CopyDecisionRow[]>("/copy/decisions");
}

export function demoCopyTrade(input: {
  symbol: string;
  bias: string;
  confidence: number;
  reason: string;
  requestedLot: number;
  stopLossPips: number | null;
  takeProfitPips?: number | null;
}): Promise<{ verdict: string; copies: number; skipped: number; logReason: string }> {
  return api.post("/copy/demo", input);
}

