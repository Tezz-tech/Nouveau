import { motion } from "framer-motion";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import PlanCard from "@/components/ui/PlanCard";
import { Button } from "@/components/ui/Button";
import Accordion from "@/components/ui/Accordion";
import { settleFromLeft, staggerContainer, softAppear, viewportOnce } from "@/lib/motion";
import { plans, comparisonRows, pricingFaq } from "@/content/pricing";

export default function Pricing() {
  return (
    <>
      <Seo
        title="Pricing"
        description="Daily, weekly, or monthly. Three subscriptions, no fee on profits, no cut of what the traded half returns."
        path="/pricing"
      />

      <header className="bg-paper-2 pb-16 pt-36 md:pt-44">
        <Container>
          <h1 className="max-w-2xl font-display text-h1 text-ink">
            One subscription. No fee on returns.
          </h1>
          <p className="mt-6 max-w-measure text-body text-slate">
            Every plan works the same way underneath — half held, half
            traded. The subscription only changes how often the cycle turns
            over.
          </p>
        </Container>
      </header>

      <section className="bg-paper py-20 md:py-28">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.08)}
            className="grid gap-6 md:grid-cols-3"
          >
            {plans.map((plan, i) => (
              <motion.div key={plan.name} custom={i} variants={settleFromLeft}>
                <PlanCard
                  name={plan.name}
                  price={plan.price}
                  cadence={plan.cadence}
                  description={plan.description}
                  recommended={plan.recommended}
                  footer={
                    <Button to="/signup" className="w-full justify-center">
                      Open an account
                    </Button>
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      <section className="bg-paper-2 py-20 md:py-28">
        <Container>
          <h2 className="mb-10 font-display text-h2 text-ink">
            How the plans compare
          </h2>
          <div className="overflow-x-auto border border-navy-line/20 md:overflow-x-visible">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="sticky top-20 z-10 border-b border-navy-line/20 bg-paper-2 py-4 pl-6 pr-4 text-small font-medium text-slate">
                    &nbsp;
                  </th>
                  {plans.map((p) => (
                    <th
                      key={p.name}
                      className="sticky top-20 z-10 border-b border-navy-line/20 bg-paper-2 py-4 pr-6 text-small font-medium text-ink"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-navy-line/10">
                    <th
                      scope="row"
                      className="py-4 pl-6 pr-4 text-small font-medium text-ink"
                    >
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td
                        key={i}
                        className="py-4 pr-6 font-mono-figure text-small text-slate"
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section className="bg-paper py-20 md:py-28">
        <Container>
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="mb-8 font-display text-h2 text-ink"
          >
            Questions about pricing
          </motion.h2>
          <div className="max-w-3xl">
            <Accordion items={pricingFaq} idPrefix="pricing-faq" />
          </div>
        </Container>
      </section>
    </>
  );
}
