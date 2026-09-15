import { createHash } from "node:crypto";

/**
 * ASSUMPTION FLAGGED: this is a fuller generic draft template (client
 * requested this expansion, 2026-09-15, to reduce the gap until a lawyer
 * reviews it) — it is still NOT drafted or reviewed by counsel and must not
 * be treated as real legal text or relied on with a real user. It exists so
 * the onboarding flow has a real document to hash, display, and sign
 * against end to end. `LPOA_DOCUMENT_VERSION` exists specifically so that
 * changing the text later doesn't invalidate this file's logic — only the
 * constant changes, and it's bumped here since the text itself changed.
 */
export const LPOA_DOCUMENT_VERSION = "2026-09-15-draft-v2";

export const LPOA_DOCUMENT_TEXT = `LIMITED POWER OF ATTORNEY (DRAFT TEMPLATE — NOT LEGAL ADVICE)

This is a draft template only. It has not been drafted or reviewed by a
lawyer and must not be relied upon as a real, binding legal document until
qualified counsel has reviewed and approved it.

1. PARTIES

"I", "me", or "the Grantor" refers to the account holder granting this
authorization. "Nouveau's trading desk" or "the Attorney-in-Fact" refers to
Nouveau's automated trading system and the personnel who operate it, acting
solely within the scope described below.

2. SCOPE OF AUTHORITY GRANTED

By signing below, I authorize Nouveau's trading desk to, on my behalf and
without seeking my approval for each individual action:

  (a) open, hold, adjust, and close positions in the trading sub-account
      funded by the at-risk half of my deposit;
  (b) select and change the specific financial instruments traded within
      that sub-account, consistent with the automated strategy then in
      effect; and
  (c) place, modify, and cancel the orders necessary to carry out (a) and
      (b), including standard risk-management orders (e.g. stop-loss).

3. LIMITATIONS ON AUTHORITY

This authorization is strictly limited to the at-risk half of my deposit,
held in the trading sub-account described above. It does NOT authorize
Nouveau, its trading desk, or its systems to:

  (a) access, move, or trade my custody balance, which remains untouched
      and inaccessible to Nouveau's trading systems under any
      circumstance;
  (b) withdraw, transfer, or otherwise direct funds out of my account to
      any third party or to Nouveau itself, beyond the fees I have
      separately agreed to;
  (c) change my account's registered ownership, beneficiary, or contact
      details; or
  (d) bind me to any obligation outside the trading of the at-risk
      sub-account described in Section 2.

4. RISK ACKNOWLEDGMENT

I understand and accept that:

  (a) the at-risk half of my deposit can be partially or fully lost as a
      result of trading activity conducted under this authorization;
  (b) no specific return, profit, or outcome is promised or guaranteed by
      Nouveau, regardless of past performance of any strategy; and
  (c) automated trading carries risks distinct from manual trading,
      including the risk of executing a strategy faster and more
      frequently than a human trader would.

5. DURATION AND REVOCATION

This authorization takes effect upon signing and remains in effect until
whichever of the following happens first:

  (a) I revoke it in writing through my account settings or by written
      notice to Nouveau, effective once Nouveau has had a reasonable
      opportunity to act on it (open positions at the time of revocation
      may need to be closed in an orderly manner rather than instantly);
      or
  (b) I close my Nouveau account.

6. GOVERNING LAW

[Placeholder — the governing law and jurisdiction for this document are not
yet specified and must be added by counsel before this document is used
with a real user.]

By typing my full legal name below, I confirm that I have read, understood,
and agree to this Limited Power of Attorney.`;

export function computeLpoaDocumentHash(): string {
  return createHash("sha256").update(LPOA_DOCUMENT_TEXT).digest("hex");
}
