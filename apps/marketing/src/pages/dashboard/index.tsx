import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import Overview from "./Overview";
import Billing from "./Billing";
import Profile from "./Profile";

export default function DashboardModule() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="billing" element={<Billing />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
