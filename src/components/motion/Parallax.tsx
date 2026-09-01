import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import clsx from "clsx";

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps an image in a slightly oversized, absolutely-positioned inner layer and
 * translates it a few percent as the section crosses the viewport — depth, not motion.
 * Total travel stays within the brief's 12% cap.
 */
export default function Parallax({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced || !containerRef.current || !innerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        innerRef.current,
        { y: "-5%" },
        {
          y: "5%",
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={containerRef} className={clsx("relative overflow-hidden", className)}>
      <div
        ref={innerRef}
        className={clsx("absolute -inset-y-[6%] inset-x-0", innerClassName)}
      >
        {children}
      </div>
    </div>
  );
}
