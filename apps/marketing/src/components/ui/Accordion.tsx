import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { houseTransition } from "@/lib/motion";

export type AccordionItem = { question: string; answer: string };

export default function Accordion({
  items,
  idPrefix,
  tone = "light",
}: {
  items: AccordionItem[];
  idPrefix: string;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  const toggle = (i: number) =>
    setOpen((prev) => ({ ...prev, [i]: !prev[i] }));

  const ruleClass = tone === "dark" ? "border-navy-line" : "border-navy-line/30";

  return (
    <div className={clsx("border-t", ruleClass)}>
      {items.map((item, i) => {
        const isOpen = !!open[i];
        const buttonId = `${idPrefix}-button-${i}`;
        const panelId = `${idPrefix}-panel-${i}`;
        return (
          <div key={item.question} className={clsx("border-b", ruleClass)}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className={clsx(
                  "flex w-full items-center justify-between gap-6 py-5 text-left font-text text-body",
                  tone === "dark" ? "text-paper" : "text-ink"
                )}
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "shrink-0 text-lg transition-transform duration-400 ease-house",
                    isOpen ? "rotate-45" : "rotate-0",
                    tone === "dark" ? "text-gold-light" : "text-gold-deep"
                  )}
                >
                  +
                </span>
              </button>
            </h3>
            <motion.div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              initial={false}
              animate={{ height: isOpen ? "auto" : 0 }}
              transition={houseTransition}
              className="overflow-hidden"
            >
              <p
                className={clsx(
                  "max-w-measure pb-5 text-small",
                  tone === "dark" ? "text-gold-light/90" : "text-slate"
                )}
              >
                {item.answer}
              </p>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
