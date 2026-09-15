import type { EmailAdapter, EmailMessage } from "./EmailAdapter";

/** No real email provider (SendGrid, Postmark, etc.) is configured yet —
 *  this logs to stdout instead, so the password-reset flow is fully
 *  testable end to end without one. Swap for a real adapter behind the same
 *  interface when a provider is chosen; nothing calling `EmailAdapter`
 *  needs to change. */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}
