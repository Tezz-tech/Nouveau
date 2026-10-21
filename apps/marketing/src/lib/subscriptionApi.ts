import { api } from "./api";

export function checkout(botPlanId: string): Promise<{ authorizationUrl: string }> {
  return api.post<{ authorizationUrl: string }>("/subscription/checkout", { botPlanId });
}
