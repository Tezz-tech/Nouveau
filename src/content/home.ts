export const hero = {
  headlineLines: ["Elite Trading Infrastructure", "for Capital Growth"],
  sub: "Professional Trading. Structured Risk. Measurable Results.",
  supporting:
    "Nouveau is a trading firm built for capital holders and serious traders.",
  features: [
    "Institutional-grade systems",
    "Risk-managed execution",
    "Transparent logic",
    "Education-backed decisions",
  ],
  primaryCta: { label: "Open an account", to: "/signup" },
  secondaryCta: { label: "See what we do", to: "#services" },
};

export const servicesIntro = {
  heading: "What We Do",
  body: "Nouveau operates as a technology-driven trading firm offering managed trading exposure, automated trading systems, and decision-grade market intelligence. We do not sell signals. We do not rely on speculation. We operate with structure, data, and controlled risk.",
};

export type ServicePreview = {
  icon: "fund" | "bots" | "intelligence";
  name: string;
  description: string;
  bullets: string[];
};

export const servicesPreview: ServicePreview[] = [
  {
    icon: "fund",
    name: "Fund Management",
    description:
      "Trade exposure without trading yourself. Clients allocate capital to Nouveau's trading systems, where risk is managed through predefined models, drawdown controls, and performance-based structures.",
    bullets: [
      "Structured risk management",
      "Performance-linked profit split",
      "Transparent allocation logic",
    ],
  },
  {
    icon: "bots",
    name: "Trading Bots",
    description:
      "Automated systems built on tested logic. Access proprietary trading bots designed for specific market conditions and risk profiles.",
    bullets: [
      "Rule-based execution",
      "Market-condition specific",
      "Suitable for hands-off traders",
    ],
  },
  {
    icon: "intelligence",
    name: "Trader Intelligence & Simulation",
    description:
      "Think like an institution before risking capital. For traders, Nouveau provides market insights, fundamental metrics, and a simulated trading environment to test strategies under real-world conditions.",
    bullets: [
      "Macro & fundamental insights",
      "Quantitative metrics",
      "Risk-free simulation",
    ],
  },
];

export const principles = {
  eyebrow: "Why Nouveau",
  lines: [
    "This is not retail trading. This is professional execution.",
    "Capital must be protected before it is grown.",
    "Systems outperform emotions. Transparency builds trust.",
  ],
};

export type Differentiator = {
  icon: "systems" | "ai" | "transparency" | "education";
  title: string;
  body: string;
};

export const differentiators: Differentiator[] = [
  {
    icon: "systems",
    title: "Structured Systems & Bots",
    body: "Capital is traded through structured systems and bots. Our automated trading systems execute based on predefined logic, not emotional decisions.",
  },
  {
    icon: "ai",
    title: "AI-Powered Analysis",
    body: "Decisions are backed by fundamental and AI-driven technical analysis. We combine quantitative insights with institutional-grade market intelligence.",
  },
  {
    icon: "transparency",
    title: "Transparent Performance Logic",
    body: "Transparent performance logic — not signals, not hype. Every decision is traceable, every outcome is measurable, every process is accountable.",
  },
  {
    icon: "education",
    title: "Integrated Education",
    body: "Education is integrated into execution, not sold as motivation. Understanding precedes execution — learn as you trade, not before you start.",
  },
];

export const educationTeaser = {
  heading: "Education Platform",
  status: "Coming soon",
  body: "Understanding precedes execution. Our upcoming education layer will focus on market structure, risk modeling, and system-based trading logic. Education at Nouveau is practical, not motivational.",
};

export type Persona = {
  icon: "capital" | "professional" | "trader";
  title: string;
  body: string;
};

export const personas: Persona[] = [
  {
    icon: "capital",
    title: "Capital Holders Who Don't Trade",
    body: "Professionals and investors seeking risk-managed market exposure without the time or expertise to trade actively.",
  },
  {
    icon: "professional",
    title: "Professionals Seeking Risk-Managed Exposure",
    body: "Serious users who want institutional-grade insights, metrics, and simulation tools to make informed trading decisions.",
  },
  {
    icon: "trader",
    title: "Traders Wanting Institutional Tools",
    body: "Active traders seeking quantitative insights, market intelligence, and automated systems to enhance their trading strategies.",
  },
];

export const close = {
  heading: "Start with Structure. Trade with Confidence.",
  sub: "Join Nouveau's Professional Trading Platform",
  body: "Ready to experience institutional-grade trading systems? Get started with Nouveau today.",
  cta: { label: "Open an account", to: "/signup" },
};
