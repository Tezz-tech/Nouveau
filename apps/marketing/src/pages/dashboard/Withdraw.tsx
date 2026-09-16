import Seo from "@/components/Seo";
import { TextField, SubmitButton } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";

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
      <RiseIn index={1} className="mt-6">
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Not live yet.</strong> Withdrawals aren't processed on this build — this is
          a preview of what requesting one will look like.
        </div>
      </RiseIn>
      <form className="mt-8 max-w-sm space-y-6" aria-disabled="true" noValidate>
        <RiseIn index={2}>
          <TextField label="Amount (USD)" name="amount" type="number" placeholder="1,000" disabled />
        </RiseIn>
        <RiseIn index={3}>
          <TextField label="Destination account" name="destination" placeholder="Bank account on file" disabled />
        </RiseIn>
        <RiseIn index={4}>
          <SubmitButton disabled>Request withdrawal</SubmitButton>
        </RiseIn>
      </form>
    </>
  );
}
