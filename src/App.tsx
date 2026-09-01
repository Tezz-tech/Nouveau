import { Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import PageWipe from "@/components/PageWipe";
import ScrollToTop from "@/components/ScrollToTop";
import Home from "@/pages/Home";
import HowItWorks from "@/pages/HowItWorks";
import Pricing from "@/pages/Pricing";
import About from "@/pages/About";
import Support from "@/pages/Support";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/NotFound";

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
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </SmoothScroll>
  );
}
