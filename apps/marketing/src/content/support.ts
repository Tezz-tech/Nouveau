export type FaqItem = { question: string; answer: string };

export const supportFaq: FaqItem[] = [
  {
    question: "How does Nouveau's fund management work?",
    answer:
      "Nouveau's fund management allows clients to allocate capital to our trading systems. Risk is managed through predefined models, drawdown controls, and performance-based structures. We operate with transparent allocation logic and structured risk management protocols.",
  },
  {
    question: "What types of trading bots does Nouveau offer?",
    answer:
      "Rule-based bots tuned to specific market conditions, including scalping, day-trading, and swing-trading systems. Each executes a fixed strategy with no discretionary override, and suits traders who want exposure without watching the market themselves.",
  },
  {
    question: "What is the Trader Intelligence & Simulation platform?",
    answer:
      "A research and practice layer for active traders: macro and fundamental market insights, quantitative metrics, and a simulated trading environment where you can test strategies under real market conditions before any capital is at risk.",
  },
  {
    question: "Do I need trading experience to use Nouveau?",
    answer:
      "No. Fund Management is built for capital holders who don't trade at all. Trading Bots and the Trader Intelligence platform are for traders who want institutional-grade tools alongside their own decisions.",
  },
  {
    question: "How is risk managed?",
    answer:
      "Through predefined models, drawdown controls, and performance-based structures, set before capital is allocated — not adjusted after the fact based on how a position is performing.",
  },
  {
    question: "Can I withdraw my capital?",
    answer:
      "Yes. Withdrawal terms are set out at the time of allocation and vary by product. Our support team can walk you through the specifics for your account.",
  },
  {
    question: "Is your trading strategy visible to clients?",
    answer:
      "Allocation logic and risk controls are transparent. The underlying trading strategy itself is proprietary — true of any professional trading operation, not specific to Nouveau.",
  },
  {
    question: "Who is accountable for trading decisions?",
    answer:
      "Every system is reviewed and governed by our trading desk, not run unsupervised. Nouveau operates with professional accountability at every stage.",
  },
];

export const contactRoutes = [
  {
    label: "Email",
    detail: "support@nouveau.example",
    response: "Response within one business day.",
  },
  {
    label: "Desk line",
    detail: "Available during trading hours",
    response: "Response within a few hours on trading days.",
  },
  {
    label: "Scheduled call",
    detail: "A 15-minute call with support",
    response: "Next available slot within two business days.",
  },
];

export const topics = [
  "Fund management",
  "Trading bots",
  "Trader intelligence & simulation",
  "Account and billing",
  "Something else",
];
