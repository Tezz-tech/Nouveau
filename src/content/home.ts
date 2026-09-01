export const hero = {
  headlineLines: ["Half of every deposit", "never enters the market."],
  supporting:
    "The other half is held in a separate account the trading system cannot reach. It is not lent, staked, or used as collateral.",
  primaryCta: { label: "Open an account", to: "/signup" },
  secondaryCta: { label: "See how it works", to: "#split" },
  footnote:
    "$20 minimum deposit. The traded half carries real risk and can be lost in full.",
};

export const splitIntro = "Every deposit is split the same way.";

export type MechanismStage = { index: string; title: string; body: string };

export const mechanism: MechanismStage[] = [
  {
    index: "Deposit and split",
    title: "You deposit. It divides.",
    body: "You deposit $20 or more. The moment it lands, Nouveau splits it in two — half into a reserve account held outside the trading system's reach, half into the trading account. The split happens once, immediately, and isn't adjustable afterward.",
  },
  {
    index: "The desk trades",
    title: "The second half goes to work.",
    body: "The traded half is managed by an automated strategy a person on the desk has reviewed and signed off on. It opens and closes positions across a cycle — daily, weekly, or monthly. The reserve is never involved and never funds or absorbs any of it.",
  },
  {
    index: "The cycle closes",
    title: "It ends one of two ways.",
    body: "Every cycle closes up or closes down. Closes up, and the traded half grows — sometimes doubling. Closes down, and it shrinks, in the worst case to zero. Both outcomes are real, and both are shown on your account before you ever fund it.",
  },
  {
    index: "Withdraw or repeat",
    title: "Take it out, or start again.",
    body: "At the end of a cycle you can withdraw everything, reserve included. Most people withdraw the traded outcome and leave $10 in reserve to start the next cycle without a new deposit. The subscription for that next cycle is charged either way.",
  },
];

export const whatYouCanLose = {
  heading: "What you can lose.",
  worst:
    "Worst case, you lose the traded half in full. A $50 deposit returns $25 — the reserve, and nothing else.",
  target:
    "Target case, the traded half grows by half again. A $50 deposit returns $75. That's a target set by the strategy, not a promise made by us.",
  subscription:
    "The subscription is charged either way. It funds the desk, not a share of your trade.",
  closing:
    "Every platform that has ever collapsed led with a profit figure. We lead with the number you could lose.",
};

export const reserveReal = {
  heading: "Why the reserve is real.",
  body: "The reserve sits in a separate account. The trading system holds no credentials for it — no API key, no login, no standing instruction. It cannot be reached by a trade, a bug, or a bad deployment. Moving it requires a manual, verified transfer outside the trading path entirely.",
  image: {
    src: "/images/reserve-brass.webp",
    alt: "Close-up of a brushed brass surface, catching low directional light.",
  },
};

export const aiFit = {
  heading: "Where AI fits.",
  paragraphs: [
    "An AI model researches market conditions and drafts a strategy for the coming cycle. It doesn't go live on its own. Femi Okafor, who leads the trading desk, reviews every draft and signs off before it touches a single account.",
    "A second assistant can explain your own account history in plain language, on request — what traded, when a cycle closed, and why. It answers from your data. It does not place trades and cannot change your settings.",
  ],
  closing: "AI assists. A person is accountable.",
  image: {
    src: "/images/ai-hands.webp",
    alt: "Close-up of hands writing on paper in natural light.",
  },
};

export type PlanPreview = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  recommended?: boolean;
};

export const plansPreview: PlanPreview[] = [
  {
    name: "Daily",
    price: "$2",
    cadence: "per day",
    description: "For accounts reviewed and re-approved every day.",
  },
  {
    name: "Weekly",
    price: "$10",
    cadence: "per week",
    description: "One decision most weeks. The middle ground.",
    recommended: true,
  },
  {
    name: "Monthly",
    price: "$30",
    cadence: "per month",
    description: "One cycle, one decision, once a month.",
  },
];

export const close = {
  heading: "Start with what you can afford to lose.",
  line: "$20 minimum. Half held, half traded — both visible the entire time.",
  cta: { label: "Open an account", to: "/signup" },
};
