import { api } from "./api";

export interface LinkAccountInput {
  broker: string;
  login: string;
  serverName: string;
  tradingPassword: string;
  consent: true;
}

export interface LinkAccountResult {
  status: string;
  connectionStage: string;
}

export interface AccountStatus {
  status: string;
  connectionStage: "deploying" | "connecting" | "connected" | "failed";
  lastError: string | null;
}

export function linkAccount(input: LinkAccountInput): Promise<LinkAccountResult> {
  return api.post<LinkAccountResult>("/mt-account/link", input);
}

export function getAccountStatus(): Promise<AccountStatus> {
  return api.get<AccountStatus>("/mt-account/status");
}
