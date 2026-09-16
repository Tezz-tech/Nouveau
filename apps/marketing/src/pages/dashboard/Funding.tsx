import Seo from "@/components/Seo";
import { TextField, SelectField, SubmitButton } from "@/components/ui/FormField";
import RiseIn from "@/components/motion/RiseIn";

/**
 * Deliberately disabled, not just cosmetically "coming soon" — there is no
 * payment processor connected yet, so a form that looked submittable here
 * could make a real user think they'd actually deposited money when
 * nothing happened. Every control is `disabled`, not just style-muted.
 */
export default function Funding() {
  return (
    <>
      <Seo title="Fund your account" description="Deposit into your Nouveau account." path="/dashboard/funding" />
      <h1 className="font-display text-ink" style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}>
        Fund your account
      </h1>
      <RiseIn index={1} className="mt-6">
        <div className="border border-gold-deep/40 bg-paper-2 px-4 py-3 text-small text-ink">
          <strong className="font-text">Not live yet.</strong> Deposits aren't processed on this build — this is a
          preview of what funding will look like once a payment method is connected.
        </div>
      </RiseIn>
      <form className="mt-8 max-w-sm space-y-6" aria-disabled="true" noValidate>
        <RiseIn index={2}>
          <TextField label="Amount (USD)" name="amount" type="number" placeholder="10,000" disabled />
        </RiseIn>
        <RiseIn index={3}>
          <SelectField
            label="Payment method"
            name="method"
            disabled
            options={["Bank transfer", "Debit card", "Wire transfer"]}
          />
        </RiseIn>
        <RiseIn index={4}>
          <SubmitButton disabled>Deposit funds</SubmitButton>
        </RiseIn>
      </form>
    </>
  );
}
