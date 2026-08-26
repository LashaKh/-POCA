export type SendEmailInput = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult = {
  provider: string;
  providerReference: string;
  outcome: "sent" | "delivered";
};

export interface EmailProvider {
  readonly name: string;
  readonly available: boolean;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export class EmailProviderError extends Error {
  constructor(
    readonly code:
      | "EMAIL_PROVIDER_DISABLED"
      | "EMAIL_PROVIDER_UNAVAILABLE"
      | "EMAIL_PROVIDER_REJECTED"
      | "EMAIL_PROVIDER_TIMEOUT",
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "EmailProviderError";
  }
}
