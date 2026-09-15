import { motion } from "framer-motion";
import clsx from "clsx";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Glow from "@/components/ui/Glow";
import { softAppear, settleFromLeft, staggerContainer, viewportOnce } from "@/lib/motion";
import { servicesHero, services } from "@/content/services";

const backgrounds = ["bg-paper", "bg-paper-2", "bg-paper"];

export default function Services() {
  return (
    <>
      <Seo
        title="Services"
        description="Fund Management, Trading Bots, and Trader Intelligence & Simulation — how Nouveau's three products work."
        path="/services"
      />

      <header className="on-dark relative overflow-hidden bg-navy-deep pb-20 pt-36 md:pt-44">
        <Glow tone="gold" size={520} className="-right-24 -top-24" />
        <Container>
          <span className="text-caption uppercase tracking-[0.08em] text-gold-light">
            {servicesHero.eyebrow}
          </span>
          <h1 className="mt-4 max-w-2xl font-display text-h1 text-paper">
            {servicesHero.heading}
          </h1>
          <p className="mt-6 max-w-measure text-body text-paper/80">
            {servicesHero.body}
          </p>
        </Container>
      </header>

      {services.map((s, i) => {
        const reversed = i % 2 === 1;
        return (
          <section key={s.name} className={clsx("py-24 md:py-32", backgrounds[i])}>
            <Container>
              <div className="grid gap-12 md:grid-cols-12 md:items-start">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewportOnce}
                  variants={softAppear}
                  className={clsx(
                    "md:col-span-4",
                    reversed ? "md:order-2 md:col-start-9" : "md:col-start-1"
                  )}
                >
                  <Icon name={s.icon} className="h-10 w-10 text-gold-deep" />
                  <span className="mt-6 block font-mono-figure text-caption text-slate">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-2 font-display text-h2 text-ink">{s.name}</h2>
                  <p
                    className={clsx(
                      "mt-3 font-display text-h3 font-medium",
                      reversed ? "text-ink" : "text-gold-deep"
                    )}
                  >
                    {s.tagline}
                  </p>
                </motion.div>

                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewportOnce}
                  variants={staggerContainer(0.08)}
                  className={clsx(
                    "md:col-span-7",
                    reversed ? "md:order-1 md:col-start-1" : "md:col-start-6"
                  )}
                >
                  <motion.p variants={settleFromLeft} className="max-w-measure text-body text-slate">
                    {s.description}
                  </motion.p>
                  <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                    {s.bullets.map((b, bi) => (
                      <motion.li
                        key={b}
                        custom={bi}
                        variants={settleFromLeft}
                        className="border-t border-navy-line/20 pt-3 text-small text-ink"
                      >
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </Container>
          </section>
        );
      })}

      <section className="on-dark relative overflow-hidden bg-navy py-28 md:py-36">
        <Glow tone="gold" size={480} className="left-1/2 top-0 -translate-x-1/2" />
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-display text-h2 text-paper">
              Ready to allocate with structure?
            </h2>
            <p className="mt-4 text-body text-paper/75">
              Open an account and choose the product that fits how you want exposure.
            </p>
            <div className="mt-8 flex justify-center">
              <Button to="/signup" tone="dark">
                Open an account
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
