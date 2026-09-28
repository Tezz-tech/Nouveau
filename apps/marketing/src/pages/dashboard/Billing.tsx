import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import { ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
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
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Billing
      </h1>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {!profile && !error && <p className="mt-6 text-body text-slate">Loading…</p>}

      {profile?.subscription && (
        <RiseIn index={0} className="mt-8 max-w-md space-y-1 border border-navy-line/25 bg-paper px-4 py-3">
          <p className="text-caption uppercase tracking-[0.06em] text-slate">
            {PLAN_LABEL[profile.subscription.plan] ?? profile.subscription.plan}
          </p>
          <p className="font-display text-h3 text-ink">
            {formatPrice(profile.subscription.priceCents, profile.subscription.currency)}
            <span className="text-caption font-text text-slate">/mo</span>
          </p>
          <p className="text-caption text-slate">{STATUS_LABEL[profile.subscription.status] ?? profile.subscription.status}</p>
        </RiseIn>
      )}

      {profile && !profile.subscription && <p className="mt-6 text-body text-slate">No subscription on file yet.</p>}

      <RiseIn index={1} className="mt-8 max-w-md border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
        <strong className="font-text">Not live yet.</strong> No payment processor is connected on this build —
        billing management isn&rsquo;t available yet.
      </RiseIn>
    </>
  );
}
