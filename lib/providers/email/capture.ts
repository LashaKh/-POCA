import type { RenderedOrderEmail } from "@/emails/order/types";
import type { EmailProvider, SendEmailInput } from "./types";

export type CapturedEmail = RenderedOrderEmail & {
  id: string;
  to: string;
  capturedAt: string;
};

const captures = new Map<string, CapturedEmail>();

export function captureEmail(
  input: RenderedOrderEmail & { to: string; idempotencyKey: string },
) {
  const existing = captures.get(input.idempotencyKey);
  if (existing) return existing;
  const captured = {
    id: `capture:${input.idempotencyKey}`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    capturedAt: new Date().toISOString(),
  };
  captures.set(input.idempotencyKey, captured);
  return captured;
}

export function readCapturedEmail(idempotencyKey: string) {
  return captures.get(idempotencyKey);
}

export function clearCapturedEmails() {
  captures.clear();
}

export class CaptureEmailProvider implements EmailProvider {
  readonly name = "capture";
  readonly available = true;

  async send(input: SendEmailInput) {
    const captured = captureEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      idempotencyKey: input.idempotencyKey,
    });
    return {
      provider: this.name,
      providerReference: captured.id,
      outcome: "delivered" as const,
    };
  }
}
