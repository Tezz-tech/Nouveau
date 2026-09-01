export type Plan = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  reviewCadence: string;
  recommended?: boolean;
};

export const plans: Plan[] = [
  {
    name: "Daily",
    price: "$2",
    cadence: "per day",
    description:
      "A new cycle every day. For accounts you want to check and reconsider often.",
    reviewCadence: "Reviewed and re-approved every day",
  },
  {
    name: "Weekly",
    price: "$10",
    cadence: "per week",
    description:
      "A new cycle every week. One decision most weeks — the middle ground between the two.",
    reviewCadence: "Reviewed at the start of each week",
    recommended: true,
  },
  {
    name: "Monthly",
    price: "$30",
    cadence: "per month",
    description:
      "A new cycle every month. One cycle, one decision, once a month.",
    reviewCadence: "Reviewed at the start of each month",
  },
];

export type ComparisonRow = {
  label: string;
  values: [string, string, string];
};

export const comparisonRows: ComparisonRow[] = [
  { label: "Subscription", values: ["$2 / day", "$10 / week", "$30 / month"] },
  { label: "Cycle length", values: ["1 day", "1 week", "1 month"] },
  {
    label: "Strategy review",
    values: ["Daily", "Start of each week", "Start of each month"],
  },
  { label: "Minimum deposit", values: ["$20", "$20", "$20"] },
  {
    label: "Withdrawal available",
    values: ["End of each day", "End of each week", "End of each month"],
  },
  { label: "Fee on profits", values: ["None", "None", "None"] },
  {
    label: "Best suited to",
    values: [
      "Frequent check-ins",
      "Most accounts",
      "Hands-off, longer horizon",
    ],
  },
];

export type FaqItem = { question: string; answer: string };

export const pricingFaq: FaqItem[] = [
  {
    question: "Does the subscription come out of my deposit?",
    answer:
      "No. The subscription is billed separately to your payment method. Your deposit — reserve and traded half both — is never used to cover it.",
  },
  {
    question: "What happens if I cancel mid-cycle?",
    answer:
      "Cancelling stops the next charge. The current cycle finishes on schedule; the strategy doesn't exit early just because a subscription was cancelled.",
  },
  {
    question: "Is there a fee on profits?",
    answer:
      "No. Nouveau earns from subscriptions only. What the traded half returns is yours in full, whether the cycle closes up or down.",
  },
  {
    question: "How do I pay?",
    answer:
      "By card or bank transfer, billed automatically at the start of each cycle for the plan you've chosen.",
  },
  {
    question: "Can I change plans?",
    answer:
      "Yes, at the end of a cycle. A plan change takes effect on the next cycle, not the one already in progress.",
  },
  {
    question: "What if I never fund my account?",
    answer:
      "Nothing happens. An unfunded account isn't billed. The subscription only starts once a deposit lands and a cycle begins.",
  },
];
