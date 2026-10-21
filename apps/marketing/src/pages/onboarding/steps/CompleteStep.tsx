import { Link } from "react-router-dom";
import RiseIn from "@/components/motion/RiseIn";

export default function CompleteStep() {
  return (
    <RiseIn>
      <h2 className="font-display text-h3 text-ink">You're all set.</h2>
      <p className="mt-4 text-body text-slate">
        Your account is linked and connected. Trades from your chosen bot will now be copied onto your account automatically.
      </p>
      <Link to="/dashboard" className="mt-8 inline-block bg-ink px-6 py-3.5 text-small text-paper transition-colors duration-300 hover:bg-navy">
        Go to dashboard
      </Link>
    </RiseIn>
  );
}
