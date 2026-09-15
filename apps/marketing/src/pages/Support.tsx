import { motion } from "framer-motion";
import { useState } from "react";
import Seo from "@/components/Seo";
import Container from "@/components/ui/Container";
import Accordion from "@/components/ui/Accordion";
import { TextField, TextAreaField, SelectField } from "@/components/ui/FormField";
import { softAppear, viewportOnce } from "@/lib/motion";
import { supportFaq, contactRoutes, topics } from "@/content/support";

export default function Support() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <Seo
        title="Support"
        description="Questions about accounts, cycles, and withdrawals, plus how to reach the support and trading desks directly."
        path="/support"
      />

      <header className="bg-paper-2 pb-16 pt-36 md:pt-44">
        <Container>
          <h1 className="max-w-2xl font-display text-h1 text-ink">
            Support.
          </h1>
        </Container>
      </header>

      <section className="bg-paper py-20 md:py-28">
        <Container>
          <div className="grid gap-16 md:grid-cols-12">
            <div id="faq" className="md:col-span-6">
              <h2 className="mb-8 font-display text-h2 text-ink">
                Common questions
              </h2>
              <Accordion items={supportFaq} idPrefix="support-faq" />
            </div>

            <div className="md:col-span-5 md:col-start-8">
              <h2 className="mb-8 font-display text-h2 text-ink">
                Get in touch
              </h2>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-6"
              >
                <TextField label="Name" name="name" required autoComplete="name" />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
                <SelectField label="Topic" name="topic" options={topics} />
                <TextAreaField label="Message" name="message" required />
                <button
                  type="submit"
                  className="bg-ink px-6 py-3.5 text-small text-paper transition-colors duration-300 hover:bg-navy"
                >
                  Send message
                </button>
                <p
                  role="status"
                  aria-live="polite"
                  className="text-caption text-gold-deep"
                >
                  {sent
                    ? "This is a design preview — no message was actually sent."
                    : ""}
                </p>
              </form>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-paper py-20 md:py-28">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={softAppear}
            className="grid gap-10 border-t border-navy-line/15 pt-14 sm:grid-cols-3"
          >
            {contactRoutes.map((route) => (
              <div key={route.label}>
                <h3 className="font-display text-h3 text-ink">{route.label}</h3>
                <p className="mt-2 text-small text-slate">{route.detail}</p>
                <p className="mt-4 text-caption text-gold-deep">
                  {route.response}
                </p>
              </div>
            ))}
          </motion.div>
        </Container>
      </section>
    </>
  );
}
