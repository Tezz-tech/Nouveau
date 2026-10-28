import { api } from "./api";

export interface AdminMasterStrategy {
  id: string;
  name: string;
  description: string;
  metaApiAccountId: string;
  copyFactoryStrategyId: string | null;
  maxTradeRiskPct: number | null;
  status: "provisioning" | "active" | "paused" | "failed";
  lastError: string | null;
}

export interface AdminBotPlan {
  id: string;
  name: string;
  masterStrategyId: string;
  priceCents: string;
  currency: string;
  interval: string;
  defaultMultiplier: number;
  status: "active" | "retired";
  paystackPlanCode: string | null;
}

export interface AdminUserRow {
  userId: string;
  email: string;
  fullName: string;
  memberSince: string;
  role: string;
  subscription: { botName: string; planName: string; status: string } | null;
  mtAccount: { broker: string; status: string; connectionStage: string } | null;
}

export function getMasterStrategies(): Promise<{ masterStrategies: AdminMasterStrategy[] }> {
  return api.get("/admin/master-strategies");
}

export interface CreateMasterStrategyInput {
  name: string;
  description: string;
  maxTradeRiskPct?: number;
  existingMetaApiAccountId?: string;
  broker?: string;
  login?: string;
  serverName?: string;
  tradingPassword?: string;
}

export function createMasterStrategy(input: CreateMasterStrategyInput): Promise<AdminMasterStrategy> {
  return api.post("/admin/master-strategies", input);
}

export function getMasterStrategyStatus(id: string): Promise<AdminMasterStrategy> {
  return api.get(`/admin/master-strategies/${id}/status`);
}

export function setMasterStrategyStatus(id: string, status: "active" | "paused"): Promise<AdminMasterStrategy> {
  return api.patch(`/admin/master-strategies/${id}/status`, { status });
}

export function getBotPlans(): Promise<{ botPlans: AdminBotPlan[] }> {
  return api.get("/admin/bot-plans");
}

export interface CreateBotPlanInput {
  name: string;
  masterStrategyId: string;
  priceCents: string;
  currency?: string;
  defaultMultiplier?: number;
}

export function createBotPlan(input: CreateBotPlanInput): Promise<AdminBotPlan> {
  return api.post("/admin/bot-plans", input);
}

export function setBotPlanStatus(id: string, status: "active" | "retired"): Promise<AdminBotPlan> {
  return api.patch(`/admin/bot-plans/${id}/status`, { status });
}

export function getUserActivity(page = 1): Promise<{ users: AdminUserRow[]; total: number }> {
  return api.get(`/admin/users?page=${page}`);
}
