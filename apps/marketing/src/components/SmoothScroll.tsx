import { useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LenisContext } from "@/hooks/useLenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Drives Lenis smooth scroll and keeps GSAP ScrollTrigger in sync with it.
 * Mounted once at the app root; no-ops entirely under prefers-reduced-motion
 * so reduced-motion visitors get native, instant scrolling.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const instance = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });
    lenisRef.current = instance;
    setLenis(instance);

    instance.on("scroll", ScrollTrigger.update);

    const tickerFn = (time: number) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerFn);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
