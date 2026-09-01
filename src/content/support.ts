export type FaqItem = { question: string; answer: string };

export const supportFaq: FaqItem[] = [
  {
    question: "How do I open an account?",
    answer:
      "Sign up, verify your email, and deposit $20 or more. The split into reserve and traded happens automatically the moment the deposit clears.",
  },
  {
    question: "How long does a cycle take to close?",
    answer:
      "Exactly as long as your plan: one day, one week, or one month. Cycles don't extend or shorten based on how the strategy is performing mid-cycle.",
  },
  {
    question: "Can I withdraw before a cycle ends?",
    answer:
      "The reserve, yes, at any time. The traded half is locked for the cycle so the strategy can run as designed — you'll see it at the next close.",
  },
  {
    question: "What happens to the reserve if Nouveau shuts down?",
    answer:
      "It sits in an account the trading system was never able to touch, so it isn't affected by anything that happens to our trading operations. Standard account closure and transfer procedures apply.",
  },
  {
    question: "Is my data shared with anyone?",
    answer:
      "No. Account and identity data is used to run your account and isn't sold or shared with third parties for marketing.",
  },
  {
    question: "What currencies can I deposit in?",
    answer:
      "USD by card or bank transfer. Other currencies are converted at deposit.",
  },
  {
    question: "How do I close my account entirely?",
    answer:
      "Withdraw the full balance at the end of a cycle and confirm closure from your account settings. There's no cancellation fee.",
  },
  {
    question: "Who do I talk to about a specific trade?",
    answer:
      "Message support with your account reference and the cycle date. Questions about strategy decisions are routed to the trading desk directly.",
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
  "Account and deposits",
  "A specific trade or cycle",
  "Billing and subscriptions",
  "Something else",
];
