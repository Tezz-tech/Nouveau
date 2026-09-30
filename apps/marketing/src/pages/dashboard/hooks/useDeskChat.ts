import { useEffect, useRef, useState } from "react";
import { getDeskMessages, postDeskMessage, subscribeToDesk, type DeskChatMessage } from "@/lib/deskApi";
import { ApiError } from "@/lib/api";

export interface DeskChatState {
  messages: DeskChatMessage[];
  connected: boolean;
  sending: boolean;
  error: string | null;
  send: (body: string) => Promise<boolean>;
}

/**
 * Shared trading-desk chat state for the Overview strip (both tracks).
 * History loads once over REST; new messages arrive live over SSE and are
 * appended id-first (no duplicates when our own POST echoes back).
 */
export function useDeskChat(): DeskChatState {
  const [messages, setMessages] = useState<DeskChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    getDeskMessages()
      .then((res) => {
        if (cancelled) return;
        ids.current = new Set(res.messages.map((m) => m.id));
        setMessages(res.messages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load desk chat.");
      });

    const unsubscribe = subscribeToDesk((message) => {
      if (cancelled) return;
      setConnected(true);
      if (ids.current.has(message.id)) return;
      ids.current.add(message.id);
      setMessages((current) => [...current.slice(-49), message]);
    });

    // SSE "hello" has no message frame — treat any open stream as connected
    // after a beat; a failed stream just leaves polling of history.
    const timer = window.setTimeout(() => {
      if (!cancelled) setConnected(true);
    }, 5_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  async function send(body: string): Promise<boolean> {
    const text = body.trim();
    if (!text || sending) return false;
    setSending(true);
    setError(null);
    try {
      const { message } = await postDeskMessage(text);
      if (!ids.current.has(message.id)) {
        ids.current.add(message.id);
        setMessages((current) => [...current.slice(-49), message]);
      }
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that message.");
      return false;
    } finally {
      setSending(false);
    }
  }

  return { messages, connected, sending, error, send };
}

