export const servicesHero = {
  eyebrow: "What We Do",
  heading: "Built for Capital. Designed for Discipline.",
  body: "Nouveau operates as a technology-driven trading firm offering managed trading exposure, automated trading systems, and decision-grade market intelligence. We do not sell signals. We do not rely on speculation. We operate with structure, data, and controlled risk.",
};

export type ServiceDetail = {
  icon: "fund" | "bots" | "intelligence";
  name: string;
  tagline: string;
  description: string;
  bullets: string[];
};

export const services: ServiceDetail[] = [
  {
    icon: "fund",
    name: "Fund Management",
    tagline: "Trade exposure without trading yourself.",
    description:
      "Clients allocate capital to Nouveau's trading systems, where risk is managed through predefined models, drawdown controls, and performance-based structures. Allocation logic is disclosed; the underlying strategy is proprietary — you see how risk is governed, not the exact trade logic that governs it.",
    bullets: [
      "Structured risk management",
      "Performance-linked profit split",
      "Transparent allocation logic",
      "Drawdown controls on every allocation",
    ],
  },
  {
    icon: "bots",
    name: "Trading Bots",
    tagline: "Automated systems built on tested logic.",
    description:
      "Access proprietary trading bots designed for specific market conditions and risk profiles. Each system executes against fixed rules — no discretionary override, no emotional exit.",
    bullets: [
      "Rule-based execution",
      "Market-condition specific",
      "Suitable for hands-off traders",
      "Scalping, day-trading, and swing-trading variants",
    ],
  },
  {
    icon: "intelligence",
    name: "Trader Intelligence & Simulation",
    tagline: "Think like an institution before risking capital.",
    description:
      "For traders, Nouveau provides market insights, fundamental metrics, and a simulated trading environment to test strategies under real-world conditions before capital is at risk.",
    bullets: [
      "Macro & fundamental insights",
      "Quantitative metrics",
      "Risk-free simulation",
      "Institutional-grade market intelligence",
    ],
  },
];

export const whoItsFor = {
  heading: "Who Nouveau is For",
  sub: "Goods & assets according to users' interests.",
};
