import { api } from "./api";

export interface DeskChatMessage {
  id: string;
  displayName: string;
  accountType: string;
  body: string;
  createdAt: string;
}

export function getDeskMessages(): Promise<{ messages: DeskChatMessage[] }> {
  return api.get<{ messages: DeskChatMessage[] }>("/desk/messages");
}

export function postDeskMessage(body: string): Promise<{ message: DeskChatMessage }> {
  return api.post<{ message: DeskChatMessage }>("/desk/messages", { body });
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

/** Live desk chat over SSE (`GET /desk/stream`). Returns an unsubscribe fn. */
export function subscribeToDesk(onMessage: (message: DeskChatMessage) => void): () => void {
  const source = new EventSource(`${API_BASE_URL}/desk/stream`, { withCredentials: true });
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data as string) as
        | { type: "message"; message: DeskChatMessage }
        | { type: "hello"; at: number };
      if (payload.type === "message") onMessage(payload.message);
    } catch {
      // a malformed SSE frame must never kill the stream
    }
  };
  return () => source.close();
}
