import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import RiseIn from "@/components/motion/RiseIn";
import { SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import { getBots, formatPrice, type Bot } from "@/lib/botsApi";
import { checkout } from "@/lib/subscriptionApi";
import { ApiError } from "@/lib/api";

function BotTile({ bot, selected, onSelect }: { bot: Bot; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        "flex w-full flex-col gap-1 border px-4 py-4 text-left transition-colors duration-200",
        selected ? "border-ink bg-paper-2" : "border-navy-line/40 hover:border-navy-line"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-small font-semibold text-ink">{bot.name}</span>
        <span className="font-mono-figure text-small text-ink">
          {formatPrice(bot.priceCents, bot.currency)}
          <span className="text-caption text-slate">/{bot.interval}</span>
        </span>
      </div>
      <span className="text-caption text-slate">{bot.description}</span>
    </button>
  );
}

/** First real onboarding step. No payment or account-linking happens here —
 *  just picking which master strategy's plan to buy, which immediately
 *  redirects to Paystack. */
export default function ChooseBotStep() {
  const [bots, setBots] = useState<Bot[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    getBots()
      .then((res) => setBots(res.bots))
      .catch(() => setError("Couldn't load the available bots. Refresh to try again."));
  }, []);

  async function onContinue() {
    if (inFlight.current || !selected) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const { authorizationUrl } = await checkout(selected);
      window.location.href = authorizationUrl; // full-page redirect to Paystack
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start checkout. Try again.");
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-h3 text-ink">Choose a bot</h2>
      <p className="mt-2 text-small text-slate">
        Each bot is a real trader's account — your trades will mirror whatever they do, in real time, once your account is linked. You can switch
        bots later.
      </p>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {!bots && !error && <p className="mt-6 text-body text-slate">Loading…</p>}
      {bots && bots.length === 0 && <p className="mt-6 text-body text-slate">No bots are available yet — check back shortly.</p>}

      {bots && bots.length > 0 && (
        <RiseIn index={1}>
          <div role="radiogroup" aria-label="Choose a bot" className="mt-6 space-y-3">
            {bots.map((bot) => (
              <BotTile key={bot.planId} bot={bot} selected={selected === bot.planId} onSelect={() => setSelected(bot.planId)} />
            ))}
          </div>
          <SubmitButton disabled={!selected || submitting} onClick={onContinue} className="mt-6">
            {submitting ? "Redirecting to payment…" : "Continue to payment"}
          </SubmitButton>
        </RiseIn>
      )}
    </div>
  );
}
