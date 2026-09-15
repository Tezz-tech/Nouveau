import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ResetPasswordRequest from "@/pages/ResetPasswordRequest";
import ResetPasswordConfirm from "@/pages/ResetPasswordConfirm";
import OnboardingLayout from "@/pages/onboarding/OnboardingLayout";
import IdentityStep from "@/pages/onboarding/steps/IdentityStep";
import BrokerAccountStep from "@/pages/onboarding/steps/BrokerAccountStep";
import CredentialsStep from "@/pages/onboarding/steps/CredentialsStep";
import LpoaStep from "@/pages/onboarding/steps/LpoaStep";
import CompleteStep from "@/pages/onboarding/steps/CompleteStep";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPasswordRequest />} />
        <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
        <Route path="/onboarding" element={<OnboardingLayout />}>
          <Route index element={<Navigate to="/onboarding/identity" replace />} />
          <Route path="identity" element={<IdentityStep />} />
          <Route path="broker-account" element={<BrokerAccountStep />} />
          <Route path="credentials" element={<CredentialsStep />} />
          <Route path="lpoa" element={<LpoaStep />} />
          <Route path="complete" element={<CompleteStep />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
