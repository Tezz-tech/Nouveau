import { useEffect, useRef, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, Badge, DarkErrorBanner, PageHeading, SectionHeading } from "./components/DashboardUI";
import { getProfile, type ProfileSummary } from "@/lib/profileApi";
import { getBots, formatPrice, type Bot } from "@/lib/botsApi";
import { checkout } from "@/lib/subscriptionApi";
import { ApiError } from "@/lib/api";

/** Switching bots reuses the exact same checkout flow as the first
 *  purchase — a new successful payment is what re-points an already-linked
 *  account's CopyFactory subscription (see apps/api's
 *  botSubscriptionService.handlePaymentSucceeded). No separate "switch"
 *  endpoint exists because none is needed. */
export default function Billing() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [bots, setBots] = useState<Bot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    Promise.all([getProfile(), getBots()])
      .then(([p, b]) => {
        setProfile(p);
        setBots(b.bots);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load billing. Try again."));
  }, []);

  async function onSwitch(planId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSwitching(planId);
    setError(null);
    try {
      const { authorizationUrl } = await checkout(planId);
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start checkout. Try again.");
      inFlight.current = false;
      setSwitching(null);
    }
  }

  return (
    <>
      <Seo title="Billing" description="Your Nouveau subscription and bot." path="/dashboard/billing" />
      <PageHeading>Billing</PageHeading>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}
      {(!profile || !bots) && !error && <p className="mt-6 text-body text-slate-light">Loading…</p>}

      {profile && bots && (
        <div className="mt-8 space-y-6">
          {profile.plan && profile.bot && (
            <RiseIn index={0}>
              <Card>
                <SectionHeading>Current plan</SectionHeading>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-small text-paper">{profile.bot.name}</p>
                    <p className="mt-1 font-mono-figure text-body text-paper">
                      {formatPrice(profile.plan.priceCents, profile.plan.currency)}
                      <span className="text-caption font-text text-slate-light">/{profile.plan.interval}</span>
                    </p>
                  </div>
                  <Badge label={profile.flow.subscription?.status ?? "—"} tone="gain" />
                </div>
              </Card>
            </RiseIn>
          )}

          <RiseIn index={1}>
            <SectionHeading>{profile.bot ? "Switch bots" : "Choose a bot"}</SectionHeading>
            <div className="mt-4 space-y-3">
              {bots.map((bot) => (
                <Card key={bot.planId} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-small text-paper">{bot.name}</p>
                    <p className="mt-1 text-caption text-slate-light">{bot.description}</p>
                    <p className="mt-1 font-mono-figure text-caption text-paper">
                      {formatPrice(bot.priceCents, bot.currency)}/{bot.interval}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSwitch(bot.planId)}
                    disabled={switching !== null}
                    className="shrink-0 border border-gold/40 px-4 py-2 text-caption text-gold transition-colors duration-200 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {switching === bot.planId ? "Redirecting…" : profile.bot?.name === bot.name ? "Current" : profile.bot ? "Switch" : "Choose"}
                  </button>
                </Card>
              ))}
            </div>
          </RiseIn>
        </div>
      )}
    </>
  );
}
