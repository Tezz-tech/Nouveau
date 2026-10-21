import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, Badge, IconBadge, DarkErrorBanner, PageHeading, SectionHeading } from "./components/DashboardUI";
import { getProfile, type ProfileSummary } from "@/lib/profileApi";
import { ApiError } from "@/lib/api";

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

/** Reads whatever GET /account/profile already has — never a credential;
 *  the backend response itself never includes one. */
export default function Profile() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
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
                <p className="truncate text-body text-paper">{profile.fullName}</p>
                <p className="mt-1 truncate text-caption text-slate-light">{profile.email}</p>
                <p className="mt-1 text-caption text-slate-light">
                  Member since{" "}
                  {new Date(profile.memberSince).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </Card>
          </RiseIn>

          <RiseIn index={1}>
            <Card>
              <div className="flex items-center justify-between gap-2">
                <SectionHeading>Bot</SectionHeading>
                {profile.bot && <IconBadge icon="bots" tone="gold" />}
              </div>
              {profile.bot ? (
                <dl className="mt-4">
                  <InfoRow label="Name" value={profile.bot.name} />
                  <InfoRow label="Description" value={profile.bot.description} />
                </dl>
              ) : (
                <p className="mt-4 text-small text-slate-light">No bot chosen yet.</p>
              )}
            </Card>
          </RiseIn>

          <RiseIn index={2}>
            <Card>
              <div className="flex items-center justify-between gap-2">
                <SectionHeading>Linked account</SectionHeading>
                {profile.mtAccount && <IconBadge icon="broker" tone="gain" />}
              </div>
              {profile.mtAccount ? (
                <dl className="mt-4">
                  <InfoRow label="Broker" value={profile.mtAccount.broker} />
                  <InfoRow label="Login" value={profile.mtAccount.login} />
                  <InfoRow label="Server" value={profile.mtAccount.serverName} />
                  <div className="flex items-center justify-between gap-4 pt-2.5">
                    <dt className="text-caption text-slate-light">Status</dt>
                    <Badge label={profile.mtAccount.status} tone={profile.mtAccount.status === "linked" ? "gain" : "info"} />
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-small text-slate-light">Not linked yet.</p>
              )}
            </Card>
          </RiseIn>
        </div>
      )}
    </>
  );
}
