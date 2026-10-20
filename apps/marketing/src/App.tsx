import { Routes, Route, Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import PageWipe from "@/components/PageWipe";
import ScrollToTop from "@/components/ScrollToTop";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import About from "@/pages/About";
import Support from "@/pages/Support";
import NotFound from "@/pages/NotFound";

/** The public site's chrome (header/footer). Everything that used to live
 *  behind login — onboarding, the dashboard, and the API/db/security
 *  packages that backed them — has been removed; a new pattern for that
 *  side of the product is coming. This file is intentionally just the
 *  informational site now: Home/Services/About/Support. */
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </SmoothScroll>
  );
}
