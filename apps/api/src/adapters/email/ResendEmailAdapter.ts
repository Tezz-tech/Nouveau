import type { EmailAdapter, EmailMessage } from "./EmailAdapter";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Talks to Resend's REST API directly over `fetch` rather than adding their
 * SDK as a dependency — the request is three JSON fields, and one fewer npm
 * package (with its own install scripts to vet) matters for a codebase
 * handling financial data.
 */
export class ResendEmailAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      // Never include the API key (it's in this request's own header) or
      // Resend's raw response body (which can echo request details back)
      // in a thrown error — both would risk ending up in logs.
      throw new Error(`Resend email send failed with status ${response.status}`);
    }
  }
}
