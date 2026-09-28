/**
 * Shown alongside every single signal returned to a trader, not just once
 * on the tab — the signal itself is the liability-bearing artifact, so the
 * disclaimer travels with it. `SIGNAL_DISCLAIMER_VERSION` is stamped onto
 * every `SignalLog` row (same versioning discipline as
 * `LPOA_DOCUMENT_VERSION`) so "what did we tell this user, and when" stays
 * reconstructable if the wording ever changes.
 *
 * ASSUMPTION FLAGGED: this is not reviewed by counsel. Per this project's
 * own plan for the trader track, get a compliance/legal read on whether
 * live buy/sell/hold guidance needs licensing or different disclaimer
 * structuring in the client's jurisdiction before this reaches real users.
 */
export const SIGNAL_DISCLAIMER_VERSION = "2026-09-28-draft-v1";

export const SIGNAL_DISCLAIMER_TEXT =
  "This is automated commentary on market data, generated from technical indicators — it is not personalized financial advice, and Nouveau does not place trades on your behalf. Markets can move against any signal shown here. You decide whether, when, and how to act on it, on your own broker account.";
