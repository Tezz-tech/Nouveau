import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import Overview from "./Overview";
import Funding from "./Funding";
import Withdraw from "./Withdraw";
import Transactions from "./Transactions";
import TradingHistory from "./TradingHistory";
import Profile from "./Profile";

/**
 * The whole dashboard section as one lazy-loaded module (see App.tsx) —
 * bundled together since recharts and every dashboard sub-page are only
 * ever needed once someone is actually in the dashboard, never for a
 * public marketing visitor.
 */
export default function DashboardModule() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="funding" element={<Funding />} />
        <Route path="withdraw" element={<Withdraw />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="history" element={<TradingHistory />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
