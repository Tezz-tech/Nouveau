import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import clsx from "clsx";
import RiseIn from "@/components/motion/RiseIn";
import { TextField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import { linkAccount, getAccountStatus } from "@/lib/mtAccountApi";
import { ApiError } from "@/lib/api";
import type { FlowStatus } from "@/lib/profileApi";

const POLL_INTERVAL_MS = 2000;

type OutletCtx = { flow: FlowStatus; refreshFlow: () => Promise<void> };

/**
 * The step the client specifically called out: "most users don't really
 * know how to do this... walk them through step by step." Three parts:
 * (1) explain what's needed and why before asking for anything, (2) collect
 * broker/login/server/trading-password with an explicit, plain-language
 * consent checkbox (this account WILL have real trades placed on it
 * automatically — that's the whole product, not a side effect), (3) once
 * submitted, poll connection status rather than pretending linking is
 * instant — MetaApi deploying/connecting a real account takes real time.
 */
export default function LinkAccountStep() {
  const { flow, refreshFlow } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();

  const [broker, setBroker] = useState("");
  const [login, setLogin] = useState("");
  const [serverName, setServerName] = useState("");
  const [tradingPassword, setTradingPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(flow.mtAccount?.lastError ?? null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const [polling, setPolling] = useState(flow.stage === "linking");
  const [connectionStage, setConnectionStage] = useState(flow.mtAccount?.connectionStage ?? null);

  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    async function poll() {
      const status = await getAccountStatus().catch(() => null);
      if (cancelled || !status) return;
      setConnectionStage(status.connectionStage);
      if (status.connectionStage === "connected") {
        await refreshFlow();
        navigate("/onboarding/complete", { replace: true });
        return;
      }
      if (status.connectionStage === "failed") {
        setPolling(false);
        setError(status.lastError ?? "Couldn't connect to that account.");
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }
    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !consent) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      await linkAccount({ broker, login, serverName, tradingPassword, consent: true });
      setConnectionStage("deploying");
      setPolling(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start linking that account. Try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (polling) {
    return (
      <div>
        <h2 className="font-display text-h3 text-ink">Connecting your account…</h2>
        <p className="mt-4 text-body text-slate">
          {connectionStage === "connecting" ? "Verifying the connection to your broker…" : "Setting up your account…"} This can take a little
          while — feel free to leave this page, it'll pick up right where it left off when you come back.
        </p>
        <div className="mt-6 h-1 w-full overflow-hidden bg-paper-2">
          <div className="h-1 w-1/3 animate-pulse bg-gold-deep" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-h3 text-ink">Link your MT5 account</h2>
      <p className="mt-2 text-small text-slate">
        This connects your own broker account so trades from your chosen bot can be copied onto it. You'll need four things from your broker: the
        broker's name, your account login number, the server name (shown in your MT5 terminal under login details), and your account's trading
        password.
      </p>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      <RiseIn index={1}>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
          <TextField label="Broker name" name="broker" type="text" required value={broker} onChange={(e) => setBroker(e.target.value)} />
          <TextField label="Account login" name="login" type="text" required value={login} onChange={(e) => setLogin(e.target.value)} />
          <TextField
            label="Server name"
            name="serverName"
            type="text"
            required
            placeholder="e.g. ICMarkets-Live01"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
          />
          <TextField
            label="Trading password"
            name="tradingPassword"
            type="password"
            required
            autoComplete="off"
            value={tradingPassword}
            onChange={(e) => setTradingPassword(e.target.value)}
          />

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="peer sr-only"
              aria-describedby="link-consent-text"
            />
            <span
              aria-hidden="true"
              className={clsx(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-navy-line/50 transition-colors duration-200",
                "peer-checked:border-ink peer-checked:bg-ink"
              )}
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-paper stroke-[2]" style={{ opacity: consent ? 1 : 0 }}>
                <path d="M3 8.5L6.5 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span id="link-consent-text" className="text-small text-slate">
              I understand that once linked, trades placed by my chosen bot will be copied onto this account automatically and in real time — not
              a preview or simulation.
            </span>
          </label>

          <SubmitButton disabled={!consent || submitting}>{submitting ? "Connecting…" : "Link account"}</SubmitButton>
        </form>
      </RiseIn>
    </div>
  );
}
