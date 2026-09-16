import Seo from "@/components/Seo";
import { TextField, SubmitButton } from "@/components/ui/FormField";

/** Same reasoning as Funding.tsx — deliberately disabled, not just
 *  cosmetically "coming soon," since there's nothing behind this to
 *  actually move money and it must never look like there is. */
export default function Withdraw() {
  return (
    <>
      <Seo title="Withdraw funds" description="Request a withdrawal from your Nouveau account." path="/dashboard/withdraw" />
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Withdraw funds
      </h1>
      <div className="mt-6 border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
        <strong className="font-text">Not live yet.</strong> Withdrawals aren't processed on this build — this is
        a preview of what requesting one will look like.
      </div>
      <form className="mt-8 max-w-sm space-y-6" aria-disabled="true" noValidate>
        <TextField label="Amount (USD)" name="amount" type="number" placeholder="1,000" disabled />
        <TextField label="Destination account" name="destination" placeholder="Bank account on file" disabled />
        <SubmitButton disabled>Request withdrawal</SubmitButton>
      </form>
    </>
  );
}
