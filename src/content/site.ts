export const site = {
  name: "Nouveau",
  defaultTitle: "Nouveau — Half of every deposit never enters the market",
  defaultDescription:
    "Nouveau splits every deposit in two. Half is held in reserve, untouched by the market. Half is traded. The reserve is the product.",
  url: "https://nouveau.example",
  minimumDeposit: 20,
};

export type NavLink = { label: string; to: string };

export const primaryNav: NavLink[] = [
  { label: "Home", to: "/" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Support", to: "/support" },
];

export const footerColumns: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
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
      { label: "Cookie policy", to: "#" },
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
  "Nouveau splits every deposit in two. Half is held in a separate reserve account and is never traded. Half is traded by an automated strategy and carries real risk: in the worst case, the traded half can be lost in full. A subscription fee applies regardless of trading outcome and is not refunded if a cycle closes down. Past performance of a strategy, including any figures shown on this site, does not guarantee future results. Nouveau is not a bank and deposits are not insured. Only deposit money you can afford to lose in full.";
