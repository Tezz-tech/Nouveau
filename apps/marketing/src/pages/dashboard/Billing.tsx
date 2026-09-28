import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, DarkErrorBanner, InfoBanner, PageHeading } from "./components/DashboardUI";
import { api, ApiError } from "@/lib/api";

interface ProfileSummary {
  subscription: { plan: string; status: string; priceCents: number; currency: string } | null;
}

const PLAN_LABEL: Record<string, string> = {
  trader_monthly: "Trader monthly",
};

const STATUS_LABEL: Record<string, string> = {
  incomplete: "Incomplete",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

const STATUS_TONE: Record<string, string> = {
  incomplete: "text-slate-light",
  active: "text-gain",
  past_due: "text-loss",
  canceled: "text-loss",
};

function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(priceCents / 100);
}

/** Trader track only — real data, same pattern as Profile.tsx: reads
 *  whatever @nouveau/api's GET /account/profile already has, never invents
 *  a number. There is no real payment processor wired yet (see the note in
 *  apps/api's PaymentAdapter), so "Manage billing" has nowhere real to send
 *  a trader yet — disabled rather than linking to something that doesn't
 *  exist. */
export default function Billing() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProfileSummary>("/account/profile")
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your subscription. Try again."));
  }, []);

  return (
    <>
      <Seo title="Billing" description="Your Nouveau trader subscription." path="/dashboard/billing" />
      <PageHeading>Billing</PageHeading>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      {!profile && !error && <p className="mt-6 text-body text-slate-light">Loading…</p>}

      {profile?.subscription && (
        <RiseIn index={0} className="mt-8 max-w-md">
          <Card className="space-y-1">
            <p className="text-caption uppercase tracking-[0.08em] text-slate-light">
              {PLAN_LABEL[profile.subscription.plan] ?? profile.subscription.plan}
            </p>
            <p className="font-mono-figure text-h3 text-paper">
              {formatPrice(profile.subscription.priceCents, profile.subscription.currency)}
              <span className="text-caption font-text text-slate-light">/mo</span>
            </p>
            <p className={`text-caption ${STATUS_TONE[profile.subscription.status] ?? "text-slate-light"}`}>
              {STATUS_LABEL[profile.subscription.status] ?? profile.subscription.status}
            </p>
          </Card>
        </RiseIn>
      )}

      {profile && !profile.subscription && <p className="mt-6 text-body text-slate-light">No subscription on file yet.</p>}

      <RiseIn index={1} className="mt-8 max-w-md">
        <InfoBanner>
          <strong className="font-text">Not live yet.</strong> No payment processor is connected on this build
          — billing management isn&rsquo;t available yet.
        </InfoBanner>
      </RiseIn>
    </>
  );
}
