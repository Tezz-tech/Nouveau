import { motion } from "framer-motion";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import Glow from "@/components/ui/Glow";
import Icon from "@/components/ui/Icon";
import Hairline from "@/components/motion/Hairline";
import { softAppear, settleFromLeft, staggerContainer, viewportOnce } from "@/lib/motion";
import {
  aboutIntro,
  ourPrinciples,
  whyNouveau,
  pullQuote,
  capabilities,
} from "@/content/about";

export default function About() {
  return (
    <>
      <Seo
        title="About"
        description="Nouveau bridges the gap between capital and professional trading execution — systems, structure, and transparency."
        path="/about"
      />

      <header className="on-dark relative overflow-hidden bg-navy-deep pb-20 pt-36 md:pt-44">
        <Glow tone="gold" size={520} className="-right-32 -top-32" />
        <Container>
          <span className="text-caption uppercase tracking-[0.08em] text-gold-light">
            {aboutIntro.eyebrow}
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-h1 text-paper">
            {aboutIntro.heading}
          </h1>
          <p className="mt-6 max-w-measure text-body text-paper/80">
            {aboutIntro.body}
          </p>
        </Container>
      </header>

      <section className="bg-paper py-20 md:py-28">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.09)}
            className="grid gap-6 sm:grid-cols-2 md:grid-cols-4"
          >
            {ourPrinciples.items.map((p, i) => (
              <motion.div key={p} custom={i} variants={settleFromLeft} className="border-l-2 border-gold-deep pl-5">
                <p className="font-display text-h3 text-ink">{p}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      <section className="bg-paper-2 py-24 md:py-32">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="mx-auto max-w-3xl text-center"
          >
            <Hairline tone="light" className="mx-auto w-16" />
            <p className="mt-8 font-display text-h2 text-ink">&ldquo;{pullQuote}&rdquo;</p>
            <Hairline tone="light" className="mx-auto mt-8 w-16" />
          </motion.div>
        </Container>
      </section>

      <section className="bg-paper py-20 md:py-28">
        <Container>
          <div className="grid gap-14 md:grid-cols-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={softAppear}
              className="md:col-span-5"
            >
              <span className="text-caption uppercase tracking-[0.08em] text-gold-deep">
                {whyNouveau.heading}
              </span>
              <h2 className="mt-3 font-display text-h2 text-ink">{whyNouveau.eyebrow}</h2>
              <p className="mt-5 text-body text-slate">{whyNouveau.intro}</p>
              <ul className="mt-4 space-y-2">
                {whyNouveau.beliefs.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-body text-slate">
                    <span className="mt-2.5 h-1 w-1 shrink-0 bg-gold-deep" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-measure text-body text-ink">{whyNouveau.closing}</p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.08)}
              className="md:col-span-6 md:col-start-7"
            >
              <h2 className="mb-6 font-display text-h3 text-ink">What we've built</h2>
              <div className="space-y-6">
                {capabilities.map((c, i) => (
                  <motion.div
                    key={c.title}
                    custom={i}
                    variants={settleFromLeft}
                    className="flex items-start gap-4 border-t border-navy-line/15 pt-6 first:border-t-0 first:pt-0"
                  >
                    <Icon name={c.icon} className="mt-1 h-6 w-6 shrink-0 text-gold-deep" />
                    <div>
                      <h3 className="font-display text-body font-semibold text-ink">
                        {c.title}
                      </h3>
                      <p className="mt-1 text-small text-slate">{c.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </Container>
      </section>
    </>
  );
}
