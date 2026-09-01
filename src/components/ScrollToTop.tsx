import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  return null;
}
