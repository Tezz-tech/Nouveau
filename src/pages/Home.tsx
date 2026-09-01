import { Fragment } from "react";
import { motion } from "framer-motion";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import Figure from "@/components/ui/Figure";
import Parallax from "@/components/motion/Parallax";
import RevealLines from "@/components/motion/RevealLines";
import Hairline from "@/components/motion/Hairline";
import StatFigure from "@/components/ui/StatFigure";
import PlanCard from "@/components/ui/PlanCard";
import Split from "@/components/Split";
import {
  softAppear,
  settleFromLeft,
  staggerContainer,
  viewportOnce,
  easeHouse,
} from "@/lib/motion";
import {
  hero,
  splitIntro,
  mechanism,
  whatYouCanLose,
  reserveReal,
  aiFit,
  plansPreview,
  close,
} from "@/content/home";

export default function Home() {
  return (
    <>
      <Seo
        title="Half of every deposit never enters the market"
        description="Nouveau splits every deposit in two. Half is held in reserve, untouched by the market. Half is traded. The reserve is the product."
        path="/"
      />

      {/* 1. Hero */}
      <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-navy-deep">
        <motion.img
          src="/images/hero-skyline.webp"
          alt="A city skyline at dusk, warm light low on the horizon beneath a darkening sky."
          className="absolute inset-0 h-full w-full object-cover [filter:saturate(0.85)_contrast(1.05)]"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: easeHouse }}
          {...{ fetchpriority: "high" }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-navy-deep/95 via-navy-deep/45 to-navy-deep/20"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gold-deep/[0.07] mix-blend-color"
          aria-hidden="true"
        />

        <div className="on-dark relative z-10 flex h-full flex-col justify-end px-6 pb-20 md:px-10 md:pb-28">
          <Container wide className="w-full px-0">
            <h1 className="font-display text-h1 text-paper">
              <RevealLines lines={[...hero.headlineLines]} hairline />
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.6, ease: easeHouse }}
              className="mt-8 max-w-measure text-body text-paper/85"
            >
              {hero.supporting}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.25, duration: 0.6, ease: easeHouse }}
              className="mt-9 flex flex-wrap items-center gap-8"
            >
              <Button to={hero.primaryCta.to} tone="dark">
                {hero.primaryCta.label}
              </Button>
              <Button to={hero.secondaryCta.to} variant="text" tone="dark">
                {hero.secondaryCta.label}
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6, ease: easeHouse }}
              className="mt-10 text-caption text-paper/60"
            >
              {hero.footnote}
            </motion.p>
          </Container>
        </div>
      </section>

      {/* 2. The split */}
      <div id="split">
        <div className="bg-paper-2 pt-16 text-center">
          <p className="font-display text-h3 text-ink">{splitIntro}</p>
        </div>
        <Split />
      </div>

      {/* 3. The mechanism */}
      <section className="bg-paper py-28 md:py-36">
        <Container>
          <div className="mb-16 grid gap-6 md:grid-cols-12">
            <h2 className="md:col-span-7 font-display text-h2 text-ink">
              How one deposit moves through the system.
            </h2>
          </div>

          <div className="divide-y divide-navy-line/15 border-t border-navy-line/15">
            {mechanism.map((stage, i) => (
              <Fragment key={stage.title}>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewportOnce}
                  custom={i}
                  variants={settleFromLeft}
                  className="grid gap-4 py-12 md:grid-cols-12 md:gap-10"
                >
                  <div className="md:col-span-3">
                    <span className="font-mono-figure text-small text-gold-deep">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-1 text-caption text-slate">{stage.index}</p>
                  </div>
                  <div className="md:col-span-8 md:col-start-5">
                    <h3 className="font-display text-h3 text-ink">
                      {stage.title}
                    </h3>
                    <p className="mt-3 max-w-measure text-body text-slate">
                      {stage.body}
                    </p>
                  </div>
                </motion.div>
                {i === 0 && (
                  <div className="py-10 md:grid md:grid-cols-12">
                    <Parallax className="h-56 md:col-span-5 md:col-start-8 md:h-72">
                      <Figure
                        src="/images/mechanism-concrete.webp"
                        alt=""
                        className="h-full w-full"
                      />
                    </Parallax>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. What you can lose */}
      <section className="on-dark bg-navy py-28 md:py-36">
        <Container>
          <div className="grid gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2 className="font-display text-h2 text-paper">
                {whatYouCanLose.heading}
              </h2>
            </div>
            <div className="md:col-span-6 md:col-start-7">
              <div className="grid gap-10 sm:grid-cols-2">
                <div>
                  <p className="text-small text-slate">
                    Worst case, from a $50 deposit
                  </p>
                  <StatFigure value={25} label="Reserve only. The traded half is gone." tone="dark" />
                </div>
                <div>
                  <p className="text-small text-slate">
                    Target case, from a $50 deposit
                  </p>
                  <StatFigure value={75} label="A target set by the strategy — not a promise." tone="dark" />
                </div>
              </div>

              <Hairline tone="dark" className="mt-12 w-full" />
              <p className="mt-8 max-w-measure text-body text-paper/85">
                {whatYouCanLose.subscription}
              </p>

              <Hairline tone="dark" className="mt-8 w-full" />
              <p className="mt-8 max-w-measure font-display text-h3 text-paper">
                {whatYouCanLose.closing}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. Why the reserve is real */}
      <section className="bg-paper-2 py-28 md:py-36">
        <Container>
          <div className="grid gap-14 md:grid-cols-12 md:items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={softAppear}
              className="md:col-span-6 md:col-start-1"
            >
              <h2 className="font-display text-h2 text-ink">
                {reserveReal.heading}
              </h2>
              <p className="mt-6 max-w-measure text-body text-slate">
                {reserveReal.body}
              </p>
            </motion.div>
            <Parallax className="h-80 md:col-span-5 md:col-start-8 md:h-[420px]">
              <Figure
                src={reserveReal.image.src}
                alt={reserveReal.image.alt}
                className="h-full w-full"
              />
            </Parallax>
          </div>
        </Container>
      </section>

      {/* 6. Where AI fits */}
      <section className="bg-paper py-28 md:py-36">
        <Container>
          <div className="grid gap-14 md:grid-cols-12 md:items-center">
            <Parallax className="order-2 h-80 md:order-1 md:col-span-5 md:h-[420px]">
              <Figure src={aiFit.image.src} alt={aiFit.image.alt} className="h-full w-full" />
            </Parallax>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={softAppear}
              className="order-1 md:order-2 md:col-span-6 md:col-start-7"
            >
              <h2 className="font-display text-h2 text-ink">{aiFit.heading}</h2>
              {aiFit.paragraphs.map((p) => (
                <p key={p} className="mt-5 max-w-measure text-body text-slate">
                  {p}
                </p>
              ))}
              <Hairline tone="light" className="mt-8 w-12" />
              <p className="mt-5 font-display text-h3 text-ink">{aiFit.closing}</p>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* 7. Plans */}
      <section className="bg-paper-2 py-28 md:py-36">
        <Container>
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-h2 text-ink">
              Three plans. Same split, different rhythm.
            </h2>
            <Button to="/pricing" variant="text">
              See full pricing
            </Button>
          </div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.08)}
            className="grid gap-6 md:grid-cols-3"
          >
            {plansPreview.map((plan, i) => (
              <motion.div key={plan.name} custom={i} variants={settleFromLeft}>
                <PlanCard
                  name={plan.name}
                  price={plan.price}
                  cadence={plan.cadence}
                  description={plan.description}
                  recommended={plan.recommended}
                />
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* 8. Close */}
      <section className="on-dark bg-navy-deep py-32 md:py-40">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="max-w-2xl"
          >
            <h2 className="font-display text-h2 text-paper">{close.heading}</h2>
            <p className="mt-5 text-body text-paper/80">{close.line}</p>
            <div className="mt-9">
              <Button to={close.cta.to} tone="dark">
                {close.cta.label}
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
