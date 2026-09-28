import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { DarkErrorBanner, PageHeading } from "./components/DashboardUI";
import { api, ApiError } from "@/lib/api";

interface ProfileSummary {
  email: string;
  accountType: "investor" | "trader";
  kycStatus: "pending" | "verified" | "rejected";
  memberSince: string;
  brokerAccount: { broker: string; login: string; serverName: string; status: string } | null;
  subscription: { plan: string; status: string; priceCents: number; currency: string } | null;
}

const KYC_LABEL: Record<ProfileSummary["kycStatus"], string> = {
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Verification unsuccessful",
};

function Field({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <RiseIn index={index} className="border-b border-navy-line/40 py-4 first:pt-0">
      <dt className="text-caption uppercase tracking-[0.08em] text-slate-light">{label}</dt>
      <dd className="mt-1 text-body text-paper">{value}</dd>
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
      <PageHeading>Profile</PageHeading>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      {!profile && !error && <p className="mt-6 text-body text-slate-light">Loading…</p>}

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
