export type TocSection = { id: string; label: string };

export const toc: TocSection[] = [
  { id: "the-split", label: "The split" },
  { id: "the-cycle", label: "The cycle and its two endings" },
  { id: "worked-examples", label: "Worked examples" },
  { id: "withdrawals", label: "Withdrawals and the $10 minimum" },
  { id: "who-writes-strategy", label: "Who writes the strategy" },
  { id: "what-we-dont-do", label: "What we don't do" },
];

export const intro = {
  heading: "How it works.",
  body: "There is one mechanic underneath everything Nouveau does: every deposit is split in two, and only one half is ever at risk. Everything below follows from that.",
};

export const theSplit = {
  heading: "The split",
  body: [
    "When a deposit lands, Nouveau divides it exactly in half. One half moves to a reserve account held at a separate institution. The trading system has no credentials for that account — it cannot initiate a transfer, read a balance, or post an instruction against it.",
    "The other half moves to the trading account, where an automated strategy manages it across a cycle. That's the only half that ever touches a position.",
  ],
};

export const theCycle = {
  heading: "The cycle and its two endings",
  body: [
    "A cycle is a fixed window — a day, a week, or a month, depending on your plan. During that window, the strategy opens and closes positions with the traded half. At the end of the window, the cycle closes, and it closes one of two ways.",
    "Closes up: the traded half is worth more than it started with. Historically this has meant anywhere from a modest gain to a full doubling, depending on conditions — there is no fixed target the strategy is obligated to hit.",
    "Closes down: the traded half is worth less than it started with. In the worst case, it is worth nothing. The reserve is unaffected by either outcome.",
  ],
};

export type WorkedExample = {
  deposit: number;
  reserve: number;
  traded: number;
  up: { tradedResult: number; total: number };
  down: { tradedResult: number; total: number };
};

export const workedExamples: WorkedExample[] = [
  {
    deposit: 20,
    reserve: 10,
    traded: 10,
    up: { tradedResult: 20, total: 30 },
    down: { tradedResult: 0, total: 10 },
  },
  {
    deposit: 200,
    reserve: 100,
    traded: 100,
    up: { tradedResult: 200, total: 300 },
    down: { tradedResult: 0, total: 100 },
  },
];

export const withdrawals = {
  heading: "Withdrawals and the $10 minimum",
  body: [
    "You can withdraw the full balance of your account — reserve and traded half both — at the end of any cycle. Doing so closes the account; a new cycle needs a new deposit.",
    "Most people withdraw only the traded outcome and leave the reserve in place to fund the next cycle without depositing again. Because the minimum deposit is $20, the smallest reserve this produces is $10 — which is why $10 is the minimum balance required to keep an account open between cycles.",
  ],
};

export const whoWritesStrategy = {
  heading: "Who writes the strategy",
  body: [
    "Before each cycle, an AI model researches current conditions and drafts a strategy — position sizing, the instruments in scope, the rules for closing early. It does not deploy anything itself.",
    "Femi Okafor, who leads the trading desk, reviews every draft, can adjust or reject it, and is the named person accountable for what goes live. Daily plans are reviewed daily; weekly and monthly plans are reviewed at the start of their cycle and monitored throughout.",
  ],
};

export const whatWeDontDo = {
  heading: "What we don't do",
  items: [
    "We do not guarantee returns, in marketing copy or in the product.",
    "We do not trade the reserve, under any circumstance.",
    "We do not take a share of profits — the subscription is the entire business model.",
    "We do not let a strategy go live without a named person signing off on it first.",
    "We do not hide the worst case behind the target case.",
  ],
};
