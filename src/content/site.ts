export const site = {
  name: "Nouveau",
  defaultTitle: "Nouveau — Elite Trading Infrastructure for Capital Growth",
  defaultDescription:
    "Professional trading. Structured risk. Measurable results. Nouveau is a trading firm built for capital holders and serious traders.",
  url: "https://nouveau.example",
};

export type NavLink = { label: string; to: string };

export const primaryNav: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "About", to: "/about" },
  { label: "Support", to: "/support" },
];

export const footerColumns: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "Services", to: "/services" },
      { label: "About", to: "/about" },
      { label: "Open an account", to: "/signup" },
      { label: "Log in", to: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Support", to: "/support" },
      { label: "Home", to: "/" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of service", to: "#" },
      { label: "Privacy policy", to: "#" },
      { label: "Risk disclosure", to: "#" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help centre", to: "/support" },
      { label: "Contact us", to: "/support" },
      { label: "FAQ", to: "/support#faq" },
    ],
  },
];

export const riskDisclosure =
  "Trading and capital allocation carry risk. Nouveau's systems are built to manage that risk through structure, drawdown controls, and disciplined execution — not to eliminate it. Past performance does not guarantee future results, and returns are never guaranteed on any product. Only allocate capital you are prepared to see fluctuate. Nouveau is not a bank and deposits are not insured.";
