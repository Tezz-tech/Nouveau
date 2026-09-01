import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import clsx from "clsx";

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

/** Monospace figure that counts up once when scrolled into view. Reserved for
 *  money amounts, percentages, and statistics — never used decoratively. */
export default function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.1,
  commas = false,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  commas?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      setDisplay(value * easeOutQuint(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value, duration]);

  const num = commas
    ? display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : display.toFixed(decimals);

  return (
    <span ref={ref} className={clsx("font-mono-figure", className)}>
      {prefix}
      {num}
      {suffix}
    </span>
  );
}
