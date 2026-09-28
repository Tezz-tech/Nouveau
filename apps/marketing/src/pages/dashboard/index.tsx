import { useEffect, type ReactNode } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import Overview from "./Overview";
import Analytics from "./Analytics";
import Funding from "./Funding";
import Withdraw from "./Withdraw";
import Transactions from "./Transactions";
import TradingHistory from "./TradingHistory";
import Billing from "./Billing";
import Profile from "./Profile";
import { useAuth, type AccountType } from "@/lib/AuthContext";

/** Guards a track-specific page against being opened directly by the other
 *  account type (typed URL, stale bookmark) — sends them back to their own
 *  dashboard home instead of rendering a page that doesn't apply to them.
 *  Centralized here rather than duplicated inside each page component,
 *  since this is routing policy, not something each page needs to know. */
function RequireAccountType({ type, children }: { type: AccountType; children: ReactNode }) {
  const { onboarding } = useAuth();
  const navigate = useNavigate();
  const mismatched = onboarding != null && onboarding.accountType !== type;

  useEffect(() => {
    if (mismatched) navigate("/dashboard", { replace: true });
  }, [mismatched, navigate]);

  if (mismatched) return <div className="p-6 text-body text-slate">Loading…</div>;
  return <>{children}</>;
}

/** The investor and trader dashboards share this one module (see App.tsx)
 *  — bundled together since recharts and every dashboard sub-page are only
 *  ever needed once someone is actually in the dashboard, never for a
 *  public marketing visitor. The index route is the one place the two
 *  tracks genuinely diverge on what "home" means: an investor sees their
 *  account Overview, a trader sees their live Analytics. */
function DashboardHome() {
  const { onboarding } = useAuth();
  return onboarding?.accountType === "trader" ? <Analytics /> : <Overview />;
}

export default function DashboardModule() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route
          path="analytics"
          element={
            <RequireAccountType type="trader">
              <Analytics />
            </RequireAccountType>
          }
        />
        <Route
          path="funding"
          element={
            <RequireAccountType type="investor">
              <Funding />
            </RequireAccountType>
          }
        />
        <Route
          path="withdraw"
          element={
            <RequireAccountType type="investor">
              <Withdraw />
            </RequireAccountType>
          }
        />
        <Route
          path="transactions"
          element={
            <RequireAccountType type="investor">
              <Transactions />
            </RequireAccountType>
          }
        />
        <Route
          path="history"
          element={
            <RequireAccountType type="investor">
              <TradingHistory />
            </RequireAccountType>
          }
        />
        <Route
          path="billing"
          element={
            <RequireAccountType type="trader">
              <Billing />
            </RequireAccountType>
          }
        />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
