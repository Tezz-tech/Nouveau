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
