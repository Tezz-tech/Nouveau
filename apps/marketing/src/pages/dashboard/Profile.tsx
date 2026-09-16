import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import { ErrorBanner } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";
import { api, ApiError } from "@/lib/api";

interface ProfileSummary {
  email: string;
  kycStatus: "pending" | "verified" | "rejected";
  memberSince: string;
  brokerAccount: { broker: string; login: string; serverName: string; status: string } | null;
}

const KYC_LABEL: Record<ProfileSummary["kycStatus"], string> = {
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Verification unsuccessful",
};

function Field({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <RiseIn index={index} className="border-b border-navy-line/15 py-4 first:pt-0">
      <dt className="text-caption uppercase tracking-[0.06em] text-slate">{label}</dt>
      <dd className="mt-1 text-body text-ink">{value}</dd>
    </RiseIn>
  );
}

/** The only dashboard page backed by real data, not lib/demoDashboardData —
 *  it just reads what @nouveau/api already has (email, KYC status, broker
 *  account summary) via GET /account/profile. Never renders a credential;
 *  the backend response itself never includes one. */
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
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Profile
      </h1>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {!profile && !error && <p className="mt-6 text-body text-slate">Loading…</p>}

      {profile && (
        <dl className="mt-8 max-w-md">
          <Field index={0} label="Email" value={profile.email} />
          <Field index={1} label="Identity verification" value={KYC_LABEL[profile.kycStatus]} />
          <Field
            index={2}
            label="Member since"
            value={new Date(profile.memberSince).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          {profile.brokerAccount ? (
            <>
              <Field index={3} label="Broker" value={profile.brokerAccount.broker} />
              <Field index={4} label="Trading account login" value={profile.brokerAccount.login} />
              <Field index={5} label="Trading account status" value={profile.brokerAccount.status} />
            </>
          ) : (
            <Field index={3} label="Broker account" value="Not set up yet" />
          )}
        </dl>
      )}
    </>
  );
}
