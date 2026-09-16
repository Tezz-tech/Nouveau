import { MtAccount, type UserDocument } from "@nouveau/db";

export interface ProfileSummary {
  email: string;
  kycStatus: "pending" | "verified" | "rejected";
  memberSince: string;
  brokerAccount: { broker: string; login: string; serverName: string; status: string } | null;
}

/** Read-only account summary for the dashboard's Profile page. Never
 *  includes passwordHash or any credential/secret — MtAccount's
 *  credentialRef (the envelope-encrypted MT5 password) is deliberately
 *  left off this shape entirely, not just unset. */
export async function getProfileSummary(user: UserDocument): Promise<ProfileSummary> {
  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });

  return {
    email: user.email,
    kycStatus: user.kycStatus,
    memberSince: user.get("createdAt").toISOString(),
    brokerAccount: account
      ? { broker: account.broker, login: account.login, serverName: account.serverName, status: account.status }
      : null,
  };
}
