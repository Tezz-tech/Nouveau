import type { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import Hairline from "@/components/motion/Hairline";
import { softAppear, viewportOnce } from "@/lib/motion";
import { useActiveSection } from "@/hooks/useActiveSection";
import {
  toc,
  intro,
  theSplit,
  theCycle,
  workedExamples,
  withdrawals,
  whoWritesStrategy,
  whatWeDontDo,
} from "@/content/howItWorks";

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={softAppear}
      className="scroll-mt-28 border-t border-navy-line/15 py-14 first:border-t-0 first:pt-0"
    >
      <h2 className="font-display text-h2 text-ink">{heading}</h2>
      <div className="mt-6 space-y-5">{children}</div>
    </motion.section>
  );
}

function WorkedExample({
  example,
}: {
  example: (typeof workedExamples)[number];
}) {
  return (
    <div className="border border-navy-line/20 p-6 md:p-8">
      <p className="font-mono-figure text-h3 text-ink">
        ${example.deposit} deposit
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 font-mono-figure text-small text-slate">
        <p>Reserve — ${example.reserve}</p>
        <p>Traded — ${example.traded}</p>
      </div>
      <Hairline tone="light" className="my-6 w-full" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-caption uppercase tracking-[0.08em] text-gold-deep">
            Closes up
          </p>
          <p className="mt-2 font-mono-figure text-body text-ink">
            Traded: ${example.traded} → ${example.up.tradedResult}
          </p>
          <p className="font-mono-figure text-body text-ink">
            Total returned: ${example.up.total}
          </p>
        </div>
        <div>
          <p className="text-caption uppercase tracking-[0.08em] text-slate">
            Closes down
          </p>
          <p className="mt-2 font-mono-figure text-body text-ink">
            Traded: ${example.traded} → ${example.down.tradedResult}
          </p>
          <p className="font-mono-figure text-body text-ink">
            Total returned: ${example.down.total}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const active = useActiveSection(toc.map((t) => t.id));

  return (
    <>
      <Seo
        title="How it works"
        description="The split, the cycle, and both its endings — with worked arithmetic on a $20 and a $200 deposit."
        path="/how-it-works"
      />

      <header className="bg-paper-2 pb-16 pt-36 md:pt-44">
        <Container>
          <h1 className="max-w-2xl font-display text-h1 text-ink">
            {intro.heading}
          </h1>
          <p className="mt-6 max-w-measure text-body text-slate">
            {intro.body}
          </p>
        </Container>
      </header>

      <div className="bg-paper py-16 md:py-20">
        <Container>
          <div className="grid gap-12 md:grid-cols-12">
            <nav
              aria-label="Sections on this page"
              className="hidden md:col-span-3 md:block"
            >
              <ol className="sticky top-28 space-y-3 border-l border-navy-line/20 pl-5">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={active === item.id ? "true" : undefined}
                      className={clsx(
                        "block text-small transition-colors duration-300",
                        active === item.id
                          ? "text-gold-deep"
                          : "text-slate hover:text-ink"
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="md:col-span-8 md:col-start-5">
              <Section id="the-split" heading={theSplit.heading}>
                {theSplit.body.map((p) => (
                  <p key={p} className="max-w-measure text-body text-slate">
                    {p}
                  </p>
                ))}
              </Section>

              <Section id="the-cycle" heading={theCycle.heading}>
                {theCycle.body.map((p) => (
                  <p key={p} className="max-w-measure text-body text-slate">
                    {p}
                  </p>
                ))}
              </Section>

              <Section id="worked-examples" heading="Worked examples">
                <div className="space-y-6">
                  {workedExamples.map((ex) => (
                    <WorkedExample key={ex.deposit} example={ex} />
                  ))}
                </div>
              </Section>

              <Section id="withdrawals" heading={withdrawals.heading}>
                {withdrawals.body.map((p) => (
                  <p key={p} className="max-w-measure text-body text-slate">
                    {p}
                  </p>
                ))}
              </Section>

              <Section id="who-writes-strategy" heading={whoWritesStrategy.heading}>
                {whoWritesStrategy.body.map((p) => (
                  <p key={p} className="max-w-measure text-body text-slate">
                    {p}
                  </p>
                ))}
              </Section>

              <Section id="what-we-dont-do" heading={whatWeDontDo.heading}>
                <ul className="max-w-measure space-y-3 border-l border-navy-line/20 pl-5">
                  {whatWeDontDo.items.map((item) => (
                    <li key={item} className="text-body text-slate">
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
