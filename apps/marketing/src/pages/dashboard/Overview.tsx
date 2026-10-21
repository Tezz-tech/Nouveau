import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, Badge, IconBadge, DarkErrorBanner, PageHeading, SectionHeading } from "./components/DashboardUI";
import { getProfile, type ProfileSummary } from "@/lib/profileApi";
import { formatPrice } from "@/lib/botsApi";
import { ApiError } from "@/lib/api";

const CONNECTION_LABEL: Record<string, string> = {
  deploying: "Setting up",
  connecting: "Connecting",
  connected: "Connected",
  failed: "Connection failed",
};
const CONNECTION_TONE: Record<string, "gold" | "gain" | "loss" | "info"> = {
  deploying: "info",
  connecting: "info",
  connected: "gain",
  failed: "loss",
};

export default function Overview() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your account. Try again."));
  }, []);

  return (
    <>
      <Seo title="Overview" description="Your Nouveau copy-trading account." path="/dashboard" />
      <PageHeading>Overview</PageHeading>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}
      {!profile && !error && <p className="mt-6 text-body text-slate-light">Loading…</p>}

      {profile && (
        <div className="mt-8 space-y-6">
          <RiseIn index={0}>
            <Card>
              <div className="flex items-center justify-between gap-2">
                <SectionHeading>{profile.bot ? profile.bot.name : "No bot yet"}</SectionHeading>
                {profile.mtAccount && (
                  <IconBadge icon="broker" tone={CONNECTION_TONE[profile.mtAccount.connectionStage] ?? "gold"} />
                )}
              </div>
              {profile.bot ? (
                <p className="mt-2 text-small text-slate-light">{profile.bot.description}</p>
              ) : (
                <p className="mt-2 text-small text-slate-light">Choose a bot to get started.</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {profile.mtAccount && (
                  <Badge
                    label={CONNECTION_LABEL[profile.mtAccount.connectionStage] ?? profile.mtAccount.connectionStage}
                    tone={CONNECTION_TONE[profile.mtAccount.connectionStage] ?? "gold"}
                  />
                )}
                {profile.plan && (
                  <span className="font-mono-figure text-caption text-slate-light">
                    {formatPrice(profile.plan.priceCents, profile.plan.currency)}/{profile.plan.interval}
                  </span>
                )}
              </div>

              {profile.mtAccount?.connectionStage === "failed" && (
                <Link to="/onboarding" className="mt-4 inline-block text-caption text-gold underline-offset-4 hover:underline">
                  Fix connection →
                </Link>
              )}
              {!profile.bot && (
                <Link to="/onboarding" className="mt-4 inline-block text-caption text-gold underline-offset-4 hover:underline">
                  Choose a bot →
                </Link>
              )}
            </Card>
          </RiseIn>

          {profile.mtAccount && (
            <RiseIn index={1}>
              <Card>
                <SectionHeading>Linked account</SectionHeading>
                <dl className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-caption text-slate-light">Broker</dt>
                    <dd className="text-small text-paper">{profile.mtAccount.broker}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-caption text-slate-light">Login</dt>
                    <dd className="text-small text-paper">{profile.mtAccount.login}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-caption text-slate-light">Server</dt>
                    <dd className="text-small text-paper">{profile.mtAccount.serverName}</dd>
                  </div>
                </dl>
              </Card>
            </RiseIn>
          )}

          <RiseIn index={2}>
            <Link to="/dashboard/billing" className="inline-block text-caption text-gold underline-offset-4 hover:underline">
              Switch bots or manage billing →
            </Link>
          </RiseIn>
        </div>
      )}
    </>
  );
}
