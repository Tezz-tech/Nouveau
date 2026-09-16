import { useEffect, useState } from "react";

/**
 * Returns true only once `active` has been continuously true for at least
 * `delayMs` — for showing a "this is taking a while" reassurance during a
 * slow submit, without flashing it on every normal, fast response.
 *
 * Exists because of a real incident: Vercel's free-tier serverless
 * functions cold-start when idle, and each cold invocation also opens a
 * fresh MongoDB connection — login/signup can genuinely take 2.5–4+
 * seconds on a cold request. A submit button that just says "Logging in…"
 * for that long, with nothing else happening on screen, reads as frozen
 * or broken even though it's actually still working.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return shown;
}
