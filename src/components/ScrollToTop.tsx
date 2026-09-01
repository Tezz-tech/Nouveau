import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/hooks/useLenis";

const HEADER_OFFSET = 88;

/** On every route change: scrolls to top, or — if the URL carries a hash —
 *  scrolls to that element instead (via Lenis when it's active, so the
 *  smooth-scroll engine's internal position stays in sync). Also fires when
 *  only the hash changes (a same-page anchor click), since React Router's
 *  <Link> doesn't trigger the browser's native hash-scroll behavior. */
export default function ScrollToTop() {
  const location = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 100);

    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        if (lenis) {
          lenis.scrollTo(target, { offset: -HEADER_OFFSET, duration: 1 });
        } else {
          const y =
            target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    } else {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    }

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.hash, lenis]);

  return null;
}
