import { api } from "./api";

export type FlowStage = "choose_bot" | "awaiting_link" | "linking" | "link_failed" | "complete";

export interface FlowStatus {
  stage: FlowStage;
  subscription: { masterStrategyId: string; botPlanId: string; status: string } | null;
  mtAccount: { connectionStage: string; status: string; lastError: string | null } | null;
}

export interface ProfileSummary {
  email: string;
  fullName: string;
  memberSince: string;
  flow: FlowStatus;
  bot: { name: string; description: string } | null;
  plan: { name: string; priceCents: string; currency: string; interval: string } | null;
  mtAccount: { broker: string; login: string; serverName: string; status: string; connectionStage: string } | null;
}

export function getProfile(): Promise<ProfileSummary> {
  return api.get<ProfileSummary>("/account/profile");
}
