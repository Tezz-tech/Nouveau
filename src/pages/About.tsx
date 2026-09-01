import { motion } from "framer-motion";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import Figure from "@/components/ui/Figure";
import Parallax from "@/components/motion/Parallax";
import Hairline from "@/components/motion/Hairline";
import { softAppear, settleFromLeft, staggerContainer, viewportOnce } from "@/lib/motion";
import {
  aboutIntro,
  foundingStory,
  reserveMechanic,
  businessModel,
  aiAccountability,
  pullQuote,
  people,
  officeImage,
} from "@/content/about";

export default function About() {
  return (
    <>
      <Seo
        title="About"
        description="Why Nouveau splits every deposit in two, how the company makes money, and who's accountable when AI drafts a strategy."
        path="/about"
      />

      <header className="bg-paper-2 pb-16 pt-36 md:pt-44">
        <Container>
          <h1 className="max-w-2xl font-display text-h1 text-ink">
            {aboutIntro.heading}
          </h1>
        </Container>
      </header>

      <section className="bg-paper py-20 md:py-28">
        <Container>
          <div className="grid gap-14 md:grid-cols-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={softAppear}
              className="md:col-span-6"
            >
              {foundingStory.map((p) => (
                <p key={p} className="mt-5 max-w-measure text-body text-slate first:mt-0">
                  {p}
                </p>
              ))}
            </motion.div>
            <Parallax className="h-72 md:col-span-5 md:col-start-8 md:h-auto">
              <Figure src={officeImage.src} alt={officeImage.alt} className="h-full w-full" />
            </Parallax>
          </div>
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
            <p className="mt-8 font-display text-h2 text-ink">“{pullQuote}”</p>
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
              className="md:col-span-6"
            >
              <h2 className="font-display text-h2 text-ink">
                The reserve mechanic.
              </h2>
              {reserveMechanic.map((p) => (
                <p key={p} className="mt-5 max-w-measure text-body text-slate">
                  {p}
                </p>
              ))}
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={softAppear}
              className="md:col-span-5 md:col-start-8"
            >
              <h2 className="font-display text-h3 text-ink">
                {businessModel.heading}
              </h2>
              <p className="mt-4 max-w-measure text-body text-slate">
                {businessModel.body}
              </p>
              <h2 className="mt-10 font-display text-h3 text-ink">
                {aiAccountability.heading}
              </h2>
              <p className="mt-4 max-w-measure text-body text-slate">
                {aiAccountability.body}
              </p>
            </motion.div>
          </div>
        </Container>
      </section>

      <section className="bg-paper-2 py-20 md:py-28">
        <Container>
          <h2 className="mb-12 font-display text-h2 text-ink">
            The people accountable.
          </h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.09)}
            className="grid gap-10 sm:grid-cols-2 md:gap-16"
          >
            {people.map((person, i) => (
              <motion.div key={person.name} custom={i} variants={settleFromLeft}>
                <Figure
                  src={person.image.src}
                  alt={person.image.alt}
                  className="aspect-[4/5] w-full"
                />
                <p className="mt-5 font-display text-h3 text-ink">
                  {person.name}
                </p>
                <p className="text-small text-slate">{person.role}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>
    </>
  );
}
