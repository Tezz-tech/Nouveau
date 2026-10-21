import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "@/lib/profileApi";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20; // ~30s — Paystack webhooks normally land within a second or two

/**
 * Where Paystack redirects the browser back to after checkout. Payment
 * confirmation itself happens server-side via webhook (routes/webhooks/
 * paystack.ts), which can genuinely arrive after this redirect lands — so
 * this page polls `GET /account/profile` until the flow stage moves off
 * "choose_bot" (meaning the webhook was processed), then forwards to
 * wherever OnboardingLayout's own redirect logic says to go next.
 */
export default function PayCallback() {
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (cancelled) return;
      const profile = await getProfile().catch(() => null);
      if (cancelled) return;
      if (profile && profile.flow.stage !== "choose_bot") {
        navigate("/onboarding", { replace: true });
        return;
      }
      attempts.current += 1;
      if (attempts.current >= MAX_POLLS) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div>
      <h2 className="font-display text-h3 text-ink">Confirming your payment…</h2>
      {timedOut ? (
        <p className="mt-4 text-body text-slate">
          This is taking longer than expected. If you completed payment, refresh this page in a minute — it'll pick up automatically once we hear
          back from Paystack.
        </p>
      ) : (
        <p className="mt-4 text-body text-slate">Hang tight — this usually takes a few seconds.</p>
      )}
    </div>
  );
}
