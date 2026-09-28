import { MtAccount, Subscription, type UserDocument } from "@nouveau/db";
import type { AccountType } from "@nouveau/core";

export interface ProfileSummary {
  email: string;
  accountType: AccountType;
  kycStatus: "pending" | "verified" | "rejected";
  memberSince: string;
  brokerAccount: { broker: string; login: string; serverName: string; ownership: string; status: string } | null;
  /** Trader track only — null for an investor, who has no subscription
   *  (they pay via the profit split instead). */
  subscription: { plan: string; status: string; priceCents: number; currency: string } | null;
}

/** Read-only account summary for the dashboard's Profile page. Never
 *  includes passwordHash or any credential/secret — MtAccount's
 *  credentialRef/credentialKind (the envelope-encrypted password and what
 *  kind it is) and Subscription's stripeCustomerId/stripeSubscriptionId are
 *  deliberately left off this shape entirely, not just unset. */
export async function getProfileSummary(user: UserDocument): Promise<ProfileSummary> {
  const account = await MtAccount.findOne({ userId: user._id }).sort({ createdAt: -1 });
  const subscription =
    user.accountType === "trader" ? await Subscription.findOne({ userId: user._id }).sort({ createdAt: -1 }) : null;

  return {
    email: user.email,
    accountType: user.accountType,
    kycStatus: user.kycStatus,
    memberSince: user.get("createdAt").toISOString(),
    brokerAccount: account
      ? { broker: account.broker, login: account.login, serverName: account.serverName, ownership: account.ownership, status: account.status }
      : null,
    subscription: subscription
      ? { plan: subscription.plan, status: subscription.status, priceCents: subscription.priceCents, currency: subscription.currency }
      : null,
  };
}
