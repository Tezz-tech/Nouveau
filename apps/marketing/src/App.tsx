import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import PageWipe from "@/components/PageWipe";
import ScrollToTop from "@/components/ScrollToTop";
import { AuthProvider } from "@/lib/AuthContext";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import About from "@/pages/About";
import Support from "@/pages/Support";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ResetPasswordRequest from "@/pages/ResetPasswordRequest";
import ResetPasswordConfirm from "@/pages/ResetPasswordConfirm";
import NotFound from "@/pages/NotFound";

// Code-split: recharts (and its d3 dependencies) add real weight that
// public marketing visitors shouldn't pay for on every page load — only
// fetch it when someone actually navigates into the dashboard.
const DashboardModule = lazy(() => import("@/pages/dashboard"));
import OnboardingLayout from "@/pages/onboarding/OnboardingLayout";
import IdentityStep from "@/pages/onboarding/steps/IdentityStep";
import BrokerAccountStep from "@/pages/onboarding/steps/BrokerAccountStep";
import CredentialsStep from "@/pages/onboarding/steps/CredentialsStep";
import LpoaStep from "@/pages/onboarding/steps/LpoaStep";
import CompleteStep from "@/pages/onboarding/steps/CompleteStep";

/** The public site's chrome (header/footer) — everything except the
 *  onboarding wizard, which is a focused task flow with its own layout
 *  and shouldn't show marketing nav or the footer mid-signup. */
function SiteLayout() {
  return (
    <>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SmoothScroll>
        <ScrollToTop />
        <PageWipe />
        <a
          href="#main"
          className="fixed left-4 top-4 z-[200] -translate-y-24 bg-paper px-4 py-2 text-small text-ink transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPasswordRequest />} />
            <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/onboarding" element={<OnboardingLayout />}>
            <Route index element={<Navigate to="/onboarding/identity" replace />} />
            <Route path="identity" element={<IdentityStep />} />
            <Route path="broker-account" element={<BrokerAccountStep />} />
            <Route path="credentials" element={<CredentialsStep />} />
            <Route path="lpoa" element={<LpoaStep />} />
            <Route path="complete" element={<CompleteStep />} />
          </Route>
          <Route
            path="/dashboard/*"
            element={
              <Suspense fallback={<div className="p-6 text-body text-slate">Loading…</div>}>
                <DashboardModule />
              </Suspense>
            }
          />
        </Routes>
      </SmoothScroll>
    </AuthProvider>
  );
}
