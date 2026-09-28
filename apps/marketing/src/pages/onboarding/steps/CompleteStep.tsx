import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import RiseIn from "@/components/motion/RiseIn";
import { easeHouse, houseTransition } from "@/lib/motion";
import { useAuth } from "@/lib/AuthContext";

function CheckBadge() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...houseTransition, delay: reduced ? 0 : 0.1 }}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-ink"
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="h-7 w-7 fill-none stroke-paper stroke-[2.5]"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: easeHouse, delay: reduced ? 0 : 0.35 }}
      >
        <path d="M4 12.5L9.5 18L20 6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </motion.div>
  );
}

export default function CompleteStep() {
  const { onboarding } = useAuth();
  const isTrader = onboarding?.accountType === "trader";

  return (
    <div className="space-y-8">
      <CheckBadge />
      <RiseIn index={1}>
        <div className="space-y-3">
          <h2 className="font-display text-h3 text-ink">You&rsquo;re all set.</h2>
          <p className="text-body text-slate">
            {isTrader
              ? "Your account is ready. Your trading analytics tool is live in the dashboard — pair charts, sketching, and live buy/sell analysis on the broker account you linked."
              : "Your account is ready. Funding your account is coming in a later phase of this build — for now, take a look at the dashboard."}
          </p>
        </div>
      </RiseIn>
      <RiseIn index={2}>
        <Button to="/dashboard" className="w-full justify-center">
          Go to your dashboard
        </Button>
      </RiseIn>
    </div>
  );
}
