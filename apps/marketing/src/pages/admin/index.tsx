import { Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import MasterStrategies from "./MasterStrategies";
import BotPlans from "./BotPlans";
import Users from "./Users";

export default function AdminModule() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<MasterStrategies />} />
        <Route path="bot-plans" element={<BotPlans />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
}
