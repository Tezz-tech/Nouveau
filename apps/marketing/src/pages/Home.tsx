import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import Glow from "@/components/ui/Glow";
import Icon from "@/components/ui/Icon";
import RevealLines from "@/components/motion/RevealLines";
import Hairline from "@/components/motion/Hairline";
import {
  softAppear,
  settleFromLeft,
  staggerContainer,
  viewportOnce,
} from "@/lib/motion";
import {
  hero,
  servicesIntro,
  servicesPreview,
  principles,
  differentiators,
  educationTeaser,
  personas,
  close,
} from "@/content/home";

export default function Home() {
  return (
    <>
      <Seo
        title="Elite Trading Infrastructure for Capital Growth"
        description="Professional trading. Structured risk. Measurable results. Nouveau is a trading firm built for capital holders and serious traders."
        path="/"
      />

      {/* 1. Hero */}
      <section className="on-dark relative flex min-h-[100svh] w-full items-center overflow-hidden bg-navy-deep pt-24">
        <Glow tone="gold" size={640} className="-right-40 -top-40" />
        <Glow tone="navy" size={720} className="-left-52 top-1/3" />

        <Container wide className="relative z-10 py-20">
          <h1 className="font-display text-h1 text-paper">
            <RevealLines lines={[...hero.headlineLines]} />
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="mt-6 max-w-2xl font-display text-h3 font-medium text-gold-light"
          >
            {hero.sub}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="mt-4 max-w-measure text-body text-paper/80"
          >
            {hero.supporting}
          </motion.p>

          <motion.ul
            initial="hidden"
            animate="visible"
            variants={staggerContainer(0.08)}
            className="mt-8 flex flex-wrap gap-x-8 gap-y-3"
          >
            {hero.features.map((f, i) => (
              <motion.li
                key={f}
                custom={i}
                variants={settleFromLeft}
                className="flex items-center gap-2 text-small text-paper/90"
              >
                <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                {f}
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="mt-10 flex flex-wrap items-center gap-8"
          >
            <Button to={hero.primaryCta.to} tone="dark">
              {hero.primaryCta.label}
            </Button>
            <Button to={hero.secondaryCta.to} variant="text" tone="dark">
              {hero.secondaryCta.label}
            </Button>
          </motion.div>
        </Container>
      </section>

      {/* 2. What We Do */}
      <section id="services" className="bg-paper py-28 md:py-36">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="max-w-2xl"
          >
            <span className="text-caption uppercase tracking-[0.08em] text-gold-deep">
              {servicesIntro.heading}
            </span>
            <p className="mt-4 text-body text-slate">{servicesIntro.body}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.09)}
            className="mt-14 grid gap-6 md:grid-cols-3"
          >
            {servicesPreview.map((s, i) => (
              <motion.div
                key={s.name}
                custom={i}
                variants={settleFromLeft}
                className="flex h-full flex-col border border-navy-line/20 p-8 transition-colors duration-300 hover:border-gold-deep/60"
              >
                <Icon name={s.icon} className="h-8 w-8 text-gold-deep" />
                <h3 className="mt-6 font-display text-h3 text-ink">{s.name}</h3>
                <p className="mt-3 text-small text-slate">{s.description}</p>
                <ul className="mt-6 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-caption text-slate">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-10">
            <Button to="/services" variant="text">
              See how each service works
            </Button>
          </div>
        </Container>
      </section>

      {/* 3. Principles statement */}
      <section className="on-dark relative overflow-hidden bg-navy py-28 md:py-36">
        <Glow tone="gold" size={500} className="right-1/4 top-0" />
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.12)}
            className="mx-auto max-w-3xl space-y-6 text-center"
          >
            {principles.lines.map((line, i) => (
              <motion.p
                key={line}
                custom={i}
                variants={softAppear}
                className={
                  i === 0
                    ? "font-display text-h2 text-paper"
                    : "text-body text-paper/75"
                }
              >
                {line}
              </motion.p>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* 4. What Makes Nouveau Different */}
      <section className="bg-paper-2 py-28 md:py-36">
        <Container>
          <div className="mb-16 max-w-2xl">
            <span className="text-caption uppercase tracking-[0.08em] text-ink">
              What Makes Nouveau Different
            </span>
            <h2 className="mt-3 font-display text-h2 text-ink">
              Professional Trading Systems
            </h2>
          </div>

          <div className="divide-y divide-navy-line/15 border-t border-navy-line/15">
            {differentiators.map((d, i) => (
              <motion.div
                key={d.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                custom={i}
                variants={settleFromLeft}
                className="grid gap-4 py-10 md:grid-cols-12 md:gap-10"
              >
                <div className="flex items-center gap-4 md:col-span-3">
                  <span className="font-mono-figure text-small text-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon name={d.icon} className="h-6 w-6 text-gold-deep" />
                </div>
                <div className="md:col-span-8 md:col-start-5">
                  <h3 className="font-display text-h3 text-ink">{d.title}</h3>
                  <p className="mt-3 max-w-measure text-body text-slate">{d.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* 5. Education teaser */}
      <section className="bg-paper py-20 md:py-28">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="flex flex-col items-start gap-8 border border-navy-line/20 p-10 md:flex-row md:items-center md:justify-between md:p-14"
          >
            <div className="flex items-start gap-5">
              <Icon name="education" className="h-9 w-9 shrink-0 text-gold-deep" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-h3 text-ink">
                    {educationTeaser.heading}
                  </h2>
                  <span className="border border-gold-deep px-2 py-0.5 text-caption uppercase tracking-[0.06em] text-gold-deep">
                    {educationTeaser.status}
                  </span>
                </div>
                <p className="mt-3 max-w-measure text-small text-slate">
                  {educationTeaser.body}
                </p>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* 6. Who It's For */}
      <section className="bg-paper-2 py-28 md:py-36">
        <Container>
          <h2 className="mb-14 max-w-xl font-display text-h2 text-ink">
            Who Nouveau is For
          </h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.09)}
            className="grid gap-6 md:grid-cols-3"
          >
            {personas.map((p, i) => (
              <motion.div
                key={p.title}
                custom={i}
                variants={settleFromLeft}
                className="border border-navy-line/20 bg-paper p-8"
              >
                <Icon name={p.icon} className="h-7 w-7 text-gold-deep" />
                <h3 className="mt-5 font-display text-h3 text-ink">{p.title}</h3>
                <p className="mt-3 text-small text-slate">{p.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* 7. Close */}
      <section className="on-dark relative overflow-hidden bg-navy-deep py-32 md:py-40">
        <Glow tone="gold" size={560} className="left-1/2 top-0 -translate-x-1/2" />
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="relative mx-auto max-w-2xl text-center"
          >
            <Hairline tone="dark" className="mx-auto w-16" />
            <h2 className="mt-8 font-display text-h2 text-paper">{close.heading}</h2>
            <p className="mt-4 text-body text-gold-light">{close.sub}</p>
            <p className="mt-4 text-body text-paper/75">{close.body}</p>
            <div className="mt-9 flex justify-center">
              <Button to={close.cta.to} tone="dark">
                {close.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
