import { Button } from "@/components/ui/Button";

export default function CompleteStep() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="font-display text-h3 text-ink">You&rsquo;re all set.</h2>
        <p className="text-body text-slate">
          Your account is ready. Funding your account is coming in a later phase of this build — for now, take a
          look at the dashboard.
        </p>
      </div>
      <Button to="/dashboard" className="w-full justify-center">
        Go to your dashboard
      </Button>
    </div>
  );
}
