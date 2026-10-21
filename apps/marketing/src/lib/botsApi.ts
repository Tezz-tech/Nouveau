import { api } from "./api";

export interface Bot {
  planId: string;
  name: string;
  description: string;
  priceCents: string;
  currency: string;
  interval: string;
}

export function getBots(): Promise<{ bots: Bot[] }> {
  return api.get<{ bots: Bot[] }>("/bots");
}

export function formatPrice(priceCents: string, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(Number(priceCents) / 100);
}
