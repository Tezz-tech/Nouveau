import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Badge, Card, DarkErrorBanner, IconBadge, PageHeading, SectionHeading } from "./components/DashboardUI";
import { api, ApiError } from "@/lib/api";

interface ProfileSummary {
  email: string;
  accountType: "investor" | "trader";
  kycStatus: "pending" | "verified" | "rejected";
  memberSince: string;
  brokerAccount: { broker: string; login: string; serverName: string; ownership: string; status: string } | null;
  subscription: { plan: string; status: string; priceCents: number; currency: string } | null;
}

type Tone = "gold" | "gain" | "loss" | "info";

const KYC_LABEL: Record<ProfileSummary["kycStatus"], string> = {
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Verification unsuccessful",
};
const KYC_TONE: Record<ProfileSummary["kycStatus"], Tone> = { pending: "info", verified: "gain", rejected: "loss" };

const ACCOUNT_TYPE_LABEL: Record<ProfileSummary["accountType"], string> = { investor: "Investor", trader: "Trader" };
const ACCOUNT_TYPE_COPY: Record<ProfileSummary["accountType"], string> = {
  investor: "Nouveau opens and manages a broker sub-account in your name, and you pay via a share of profit — never a flat fee.",
  trader: "You trade on your own linked broker account. Nouveau only ever reads it for analysis, and can never place a trade on it.",
};

const BROKER_STATUS_LABEL: Record<string, string> = { pending: "Pending", active: "Active", suspended: "Suspended", closed: "Closed" };
const BROKER_STATUS_TONE: Record<string, Tone> = { pending: "info", active: "gain", suspended: "loss", closed: "loss" };
const OWNERSHIP_LABEL: Record<string, string> = {
  platform_opened: "Opened by Nouveau",
  user_linked: "Your own account, linked read-only",
};

const PLAN_LABEL: Record<string, string> = { trader_monthly: "Trader monthly" };
const SUB_STATUS_LABEL: Record<string, string> = { incomplete: "Incomplete", active: "Active", past_due: "Past due", canceled: "Canceled" };
const SUB_STATUS_TONE: Record<string, Tone> = { incomplete: "info", active: "gain", past_due: "loss", canceled: "loss" };

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(priceCents / 100);
}

/** Initials-style avatar from the one identifying string this account
 *  actually has — email. Onboarding collects a full legal name for KYC, but
 *  it's only ever sent to the KYC adapter and never persisted (see
 *  apps/api's identityService), so there's nothing else real to show here
 *  yet without inventing a display name. */
function Avatar({ email }: { email: string }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-gold/10 font-display text-h3 text-gold">
      {email.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-navy-line/40 py-2.5 last:border-0 last:pb-0">
      <dt className="text-caption text-slate-light">{label}</dt>
      <dd className="truncate text-small text-paper">{value}</dd>
    </div>
  );
}

/** Every card here reads whatever @nouveau/api's GET /account/profile
 *  already returns — same "only real data" discipline as before, just
 *  organized into a proper profile layout instead of one flat definition
 *  list. Never renders a credential; the backend response itself never
 *  includes one. */
export default function Profile() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProfileSummary>("/account/profile")
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your profile. Try again."));
  }, []);

  return (
    <>
      <Seo title="Profile" description="Your Nouveau account details." path="/dashboard/profile" />
      <PageHeading>Profile</PageHeading>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      {!profile && !error && <p className="mt-6 text-body text-slate-light">Loading…</p>}

      {profile && (
        <div className="mt-8 space-y-6">
          <RiseIn index={0}>
            <Card className="flex flex-wrap items-center gap-5">
              <Avatar email={profile.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-paper">{profile.email}</p>
                <p className="mt-1 text-caption text-slate-light">
                  Member since{" "}
                  {new Date(profile.memberSince).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <Badge label={ACCOUNT_TYPE_LABEL[profile.accountType]} tone={profile.accountType === "trader" ? "info" : "gold"} />
            </Card>
          </RiseIn>

          <div className="grid gap-6 md:grid-cols-2">
            <RiseIn index={1}>
              <Card className="h-full">
                <div className="flex items-center justify-between gap-2">
                  <SectionHeading>Identity verification</SectionHeading>
                  <IconBadge icon="professional" tone={KYC_TONE[profile.kycStatus]} />
                </div>
                <div className="mt-4">
                  <Badge label={KYC_LABEL[profile.kycStatus]} tone={KYC_TONE[profile.kycStatus]} />
                </div>
              </Card>
            </RiseIn>

            <RiseIn index={2}>
              <Card className="h-full">
                <div className="flex items-center justify-between gap-2">
                  <SectionHeading>Account type</SectionHeading>
                  <IconBadge
                    icon={profile.accountType === "trader" ? "analytics" : "funding"}
                    tone={profile.accountType === "trader" ? "info" : "gold"}
                  />
                </div>
                <p className="mt-4 text-small text-slate-light">{ACCOUNT_TYPE_COPY[profile.accountType]}</p>
              </Card>
            </RiseIn>

            <RiseIn index={3}>
              <Card className="h-full md:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <SectionHeading>Broker account</SectionHeading>
                  <IconBadge icon="broker" tone={profile.brokerAccount ? BROKER_STATUS_TONE[profile.brokerAccount.status] : "gold"} />
                </div>
                {profile.brokerAccount ? (
                  <dl className="mt-4">
                    <InfoRow label="Broker" value={profile.brokerAccount.broker} />
                    <InfoRow label="Login" value={profile.brokerAccount.login} />
                    <InfoRow label="Server" value={profile.brokerAccount.serverName} />
                    <InfoRow
                      label="Ownership"
                      value={OWNERSHIP_LABEL[profile.brokerAccount.ownership] ?? profile.brokerAccount.ownership}
                    />
                    <div className="flex items-center justify-between gap-4 pt-2.5">
                      <dt className="text-caption text-slate-light">Status</dt>
                      <Badge
                        label={BROKER_STATUS_LABEL[profile.brokerAccount.status] ?? profile.brokerAccount.status}
                        tone={BROKER_STATUS_TONE[profile.brokerAccount.status] ?? "gold"}
                      />
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-small text-slate-light">Not set up yet.</p>
                )}
              </Card>
            </RiseIn>

            {profile.accountType === "trader" && (
              <RiseIn index={4}>
                <Card className="h-full md:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <SectionHeading>Subscription</SectionHeading>
                    <IconBadge icon="billing" tone={profile.subscription ? SUB_STATUS_TONE[profile.subscription.status] : "gold"} />
                  </div>
                  {profile.subscription ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-small text-paper">{PLAN_LABEL[profile.subscription.plan] ?? profile.subscription.plan}</p>
                        <p className="mt-1 font-mono-figure text-body text-paper">
                          {formatPrice(profile.subscription.priceCents, profile.subscription.currency)}
                          <span className="text-caption font-text text-slate-light">/mo</span>
                        </p>
                      </div>
                      <Badge
                        label={SUB_STATUS_LABEL[profile.subscription.status] ?? profile.subscription.status}
                        tone={SUB_STATUS_TONE[profile.subscription.status] ?? "gold"}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-small text-slate-light">No subscription on file yet.</p>
                  )}
                  <Link to="/dashboard/billing" className="mt-4 inline-block text-caption text-gold underline-offset-4 hover:underline">
                    Manage billing →
                  </Link>
                </Card>
              </RiseIn>
            )}
          </div>
        </div>
      )}
    </>
  );
}
