import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useReducedMotion } from "framer-motion";
import { settleFromLeft, staggerContainer, viewportOnce } from "@/lib/motion";
import CountUp from "@/components/motion/CountUp";
import Hairline from "@/components/motion/Hairline";

gsap.registerPlugin(ScrollTrigger);

function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isDesktop;
}

const CAPTIONS = [
  "A $20 deposit.",
  "Ten dollars go into reserve. Ten dollars are traded.",
  "If the cycle closes up, the traded half doubles.",
  "If it closes down, the traded half can go to zero.",
  "Either way, the reserve does not move.",
];

/** The signature scroll sequence. Desktop pins a horizontal bar and scrubs it
 *  through the split and both outcomes. Mobile gets a shorter, unpinned vertical
 *  retelling of the same four beats — not a broken pin. */
export default function Split() {
  const isDesktop = useIsDesktop();
  const reduced = useReducedMotion();

  return (
    <section aria-labelledby="split-heading">
      <h2 id="split-heading" className="sr-only">
        How the split works
      </h2>
      <p className="sr-only">
        A twenty dollar deposit splits in two. Ten dollars go into reserve and
        are never traded. Ten dollars are traded. If the cycle closes up, the
        traded half doubles to twenty dollars. If it closes down, the traded
        half can go to zero. Either way, the reserve does not move.
      </p>
      {!isDesktop || reduced ? <SplitMobile /> : <SplitDesktop />}
    </section>
  );
}

function SplitDesktop() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const reserveRef = useRef<HTMLDivElement>(null);
  const tradedRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const reserveLabelRef = useRef<HTMLSpanElement>(null);
  const tradedLabelRef = useRef<HTMLSpanElement>(null);
  const depositLabelRef = useRef<HTMLSpanElement>(null);
  const reserveTagRef = useRef<HTMLSpanElement>(null);
  const tradedTagRef = useRef<HTMLSpanElement>(null);
  const captionRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  useLayoutEffect(() => {
    if (
      !wrapRef.current ||
      !pinRef.current ||
      !reserveRef.current ||
      !tradedRef.current ||
      !dividerRef.current
    )
      return;

    const ctx = gsap.context(() => {
      const setReserve = (v: number) => {
        if (reserveLabelRef.current)
          reserveLabelRef.current.textContent = `$${Math.round(v)}`;
      };
      const setTraded = (v: number) => {
        if (tradedLabelRef.current)
          tradedLabelRef.current.textContent = `$${Math.round(v)}`;
      };

      gsap.set(reserveRef.current, { width: "30%", backgroundColor: "#F0EFEA" });
      gsap.set(tradedRef.current, {
        width: "30%",
        left: "30%",
        backgroundColor: "#F0EFEA",
        borderColor: "#F0EFEA",
      });
      gsap.set(dividerRef.current, { scaleY: 0 });
      gsap.set([reserveTagRef.current, tradedTagRef.current], { opacity: 0 });
      gsap.set([reserveLabelRef.current, tradedLabelRef.current], { opacity: 0 });
      gsap.set(depositLabelRef.current, { opacity: 1 });
      captionRefs.current.forEach((el, i) =>
        gsap.set(el, { opacity: i === 0 ? 1 : 0 })
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          pin: pinRef.current,
        },
      });

      const showCaption = (i: number, at: number) => {
        tl.to(captionRefs.current[i - 1] ?? {}, { opacity: 0, duration: 0.3 }, at);
        tl.to(captionRefs.current[i], { opacity: 1, duration: 0.3 }, at);
      };

      // Phase 0: deposit sits still. (0 – 1)
      tl.to({}, { duration: 1 });

      // Phase 1: split. (1 – 2.6)
      tl.to(dividerRef.current, { scaleY: 1, duration: 0.5, ease: "power2.out" }, 1.1);
      tl.to(
        reserveRef.current,
        { backgroundColor: "#0F2740", duration: 0.6, ease: "power1.inOut" },
        1.2
      );
      tl.to(
        tradedRef.current,
        { borderColor: "#C9A227", backgroundColor: "#FAFAF7", duration: 0.6 },
        1.2
      );
      tl.to({ v: 0 }, { v: 10, duration: 0.6, onUpdate: function () { setReserve(this.targets()[0].v); } }, 1.2);
      tl.to({ v: 0 }, { v: 10, duration: 0.6, onUpdate: function () { setTraded(this.targets()[0].v); } }, 1.2);
      tl.to(depositLabelRef.current, { opacity: 0, duration: 0.3 }, 1.1);
      tl.to([reserveLabelRef.current, tradedLabelRef.current], { opacity: 1, duration: 0.4 }, 1.3);
      tl.to([reserveTagRef.current, tradedTagRef.current], { opacity: 1, duration: 0.4 }, 1.6);
      showCaption(1, 1.3);

      // Phase 2: traded doubles. (2.6 – 4.6)
      tl.to(tradedRef.current, { width: "60%", duration: 1, ease: "power2.inOut" }, 2.8);
      tl.to(
        { v: 10 },
        { v: 20, duration: 1, onUpdate: function () { setTraded(this.targets()[0].v); } },
        2.8
      );
      showCaption(2, 2.8);

      // Hold on the doubled state. (4.6 – 5.4)
      tl.to({}, { duration: 0.8 });

      // Phase 3: traded collapses to zero. (5.4 – 7.4)
      tl.to(tradedRef.current, { width: "0%", duration: 1, ease: "power2.in" }, 6.2);
      tl.to(
        { v: 20 },
        { v: 0, duration: 1, onUpdate: function () { setTraded(this.targets()[0].v); } },
        6.2
      );
      tl.to(tradedTagRef.current, { opacity: 0, duration: 0.4 }, 6.9);
      showCaption(3, 6.2);

      // Phase 4: final beat — reserve untouched throughout. (7.4 – 9)
      showCaption(4, 7.6);
      tl.to({}, { duration: 1.4 });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapRef} className="relative h-[420vh]" aria-hidden="true">
      <div
        ref={pinRef}
        className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-paper-2"
      >
        <span className="mb-16 font-mono text-caption uppercase tracking-[0.08em] text-slate">
          The split
        </span>

        <div className="relative w-full max-w-3xl px-6">
          <div className="relative h-32 md:h-40" style={{ width: "90%" }}>
            <div
              ref={reserveRef}
              className="absolute inset-y-0 left-0 flex items-center justify-center"
              style={{ width: "30%" }}
            >
              <span
                ref={reserveLabelRef}
                className="font-mono-figure text-2xl md:text-3xl text-paper"
              >
                $0
              </span>
            </div>
            <div
              ref={tradedRef}
              className="absolute inset-y-0 flex items-center justify-center overflow-hidden border"
              style={{ width: "30%", left: "30%" }}
            >
              <span
                ref={tradedLabelRef}
                className="font-mono-figure text-2xl md:text-3xl text-ink"
              >
                $0
              </span>
            </div>
            <div
              ref={dividerRef}
              className="absolute inset-y-0 w-px bg-gold"
              style={{ left: "30%", transformOrigin: "center" }}
            />
            <div
              className="absolute inset-y-0 flex items-center justify-center"
              style={{ left: 0, width: "60%" }}
            >
              <span
                ref={depositLabelRef}
                className="font-mono-figure text-2xl md:text-3xl text-ink"
              >
                $20
              </span>
            </div>
          </div>

          <div className="mt-4 flex text-caption" style={{ width: "90%" }}>
            <div style={{ width: "30%" }} className="relative text-slate">
              <span ref={reserveTagRef}>Reserve — held</span>
            </div>
            <div style={{ width: "30%", marginLeft: "0%" }} className="relative text-slate">
              <span ref={tradedTagRef}>Traded — at risk</span>
            </div>
          </div>
        </div>

        <div className="relative mt-20 h-8 w-full max-w-xl px-6 text-center">
          {CAPTIONS.map((c, i) => (
            <p
              key={c}
              ref={(el) => (captionRefs.current[i] = el)}
              className="absolute inset-x-0 font-display text-h3 text-ink"
            >
              {c}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function SplitMobile() {
  const stages = [
    { label: "Deposit", value: 20, note: "What goes in." },
    { label: "Reserve", value: 10, note: "Held. Not traded." },
    { label: "Traded, closes up", value: 20, note: "The traded half doubles." },
    { label: "Traded, closes down", value: 0, note: "The traded half can go to zero." },
  ];

  return (
    <div className="bg-paper-2 px-6 py-20">
      <span className="mb-10 block font-mono text-caption uppercase tracking-[0.08em] text-slate">
        The split
      </span>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer(0.09)}
        className="space-y-5"
      >
        {stages.map((s, i) => (
          <motion.div
            key={s.label}
            custom={i}
            variants={settleFromLeft}
            className={
              "border p-5 " +
              (i === 1
                ? "border-navy bg-navy text-paper"
                : i === 2
                ? "border-gold-deep bg-paper text-ink"
                : "border-navy-line bg-paper text-ink")
            }
          >
            <div className="flex items-baseline justify-between">
              <span className="text-small">{s.label}</span>
              <CountUp value={s.value} prefix="$" className="text-2xl" />
            </div>
            <p className="mt-2 text-small text-slate">{s.note}</p>
            {i === 1 && <Hairline tone="dark" className="mt-4 w-16" />}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
