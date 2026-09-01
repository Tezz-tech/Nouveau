export const aboutIntro = {
  eyebrow: "About Nouveau",
  heading: "Bridging the Gap Between Capital and Professional Execution",
  body: "Nouveau was created to bridge the gap between capital and professional trading execution. Many investors lack the time, skill, or discipline to trade effectively. Many traders lack the capital or infrastructure to operate at a professional level. Nouveau provides both — through systems, structure, and transparency.",
};

export const ourPrinciples = {
  heading: "Our Principles",
  items: ["Risk first", "Systems over emotion", "Measured growth", "Professional accountability"],
};

export const whyNouveau = {
  heading: "Why Nouveau",
  eyebrow: "This is not retail trading.",
  intro: "Nouveau is built on the belief that:",
  beliefs: [
    "Capital must be protected before it is grown",
    "Systems outperform emotions",
    "Transparency builds long-term trust",
  ],
  closing: "We operate with professional standards, not marketing noise.",
};

export const pullQuote = "This is not retail trading. This is professional execution.";

export type Capability = {
  icon: "fund" | "bots" | "intelligence" | "education";
  title: string;
  body: string;
};

export const capabilities: Capability[] = [
  {
    icon: "fund",
    title: "Fund Management",
    body: "Live, with structured risk controls, drawdown limits, and performance tracking on every allocation.",
  },
  {
    icon: "bots",
    title: "Trading Bots",
    body: "Scalping, day-trading, and swing-trading systems, each built for a specific market condition and risk profile.",
  },
  {
    icon: "intelligence",
    title: "Trader Intelligence Dashboard",
    body: "Market insights, quantitative metrics, and a simulation environment, live for traders who want institutional tools.",
  },
  {
    icon: "education",
    title: "Education Platform",
    body: "Coming soon — practical instruction in market structure, risk modeling, and system-based trading logic.",
  },
];

export const people = [
  {
    name: "Adaeze Nwosu",
    role: "Founder",
    image: {
      src: "/images/about-portrait-1.webp",
      alt: "Portrait of Adaeze Nwosu, founder of Nouveau, in natural light.",
    },
  },
  {
    name: "Femi Okafor",
    role: "Head of Trading",
    image: {
      src: "/images/about-portrait-2.webp",
      alt: "Portrait of Femi Okafor, head of trading at Nouveau, in natural light.",
    },
  },
];
