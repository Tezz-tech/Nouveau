import { useEffect, useRef, useState, type FormEvent } from "react";
import RiseIn from "@/components/motion/RiseIn";
import { Card, DarkErrorBanner, SectionHeading, LiveDot } from "./DashboardUI";
import { useDeskChat } from "../hooks/useDeskChat";

export default function DeskChat() {
  const desk = useDeskChat();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [desk.messages.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void desk.send(text);
  }

  return (
    <RiseIn index={8}>
      <Card className="flex min-h-[18rem] flex-col">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading>Trading floor chat</SectionHeading>
          <span className="flex items-center gap-2 text-caption text-slate-light">
            <LiveDot tone={desk.connected ? "gain" : "gold"} />
            {desk.connected ? "Live" : "Connecting…"}
          </span>
        </div>
        <p className="mt-1 text-caption text-slate-light">
          Live desk chatter for investors and traders. Community talk only — never trade instructions.
        </p>
        {desk.error && <div className="mt-3"><DarkErrorBanner message={desk.error} /></div>}
        <div ref={scrollRef} className="mt-4 max-h-64 flex-1 space-y-2.5 overflow-y-auto" aria-live="polite" aria-label="Trading floor messages">
          {desk.messages.map((m) => (
            <div key={m.id} className="border border-navy-line/40 bg-navy-deep/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-light">
                {m.displayName} · {m.accountType} · {new Date(m.createdAt).toLocaleTimeString()}
              </p>
              <p className="mt-0.5 text-small text-paper">{m.body}</p>
            </div>
          ))}
          {desk.messages.length === 0 && !desk.error && (
            <p className="text-caption text-slate-light">No messages yet — say hello to the floor.</p>
          )}
        </div>
        <form onSubmit={submit} className="mt-4 flex gap-2 border-t border-navy-line/40 pt-4">
          <input
            aria-label="Message the trading floor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder="Message the floor… (500 chars)"
            className="min-w-0 flex-1 border border-navy-line bg-navy-deep px-3 py-2.5 text-small text-paper placeholder:text-slate-light/60 outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={desk.sending || !draft.trim()}
            className="bg-gold px-4 py-2.5 text-small font-medium text-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </Card>
    </RiseIn>
  );
}
