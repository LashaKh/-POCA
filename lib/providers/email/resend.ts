import {
  EmailProviderError,
  type EmailProvider,
  type SendEmailInput,
} from "./types";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  readonly available = true;

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 8_000,
  ) {}

  async send(input: SendEmailInput) {
    let response: Response;
    try {
      response = await this.fetcher("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          from: input.from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
          tags: input.tags,
        }),
      });
    } catch (error) {
      const name =
        error && typeof error === "object" && "name" in error
          ? String(error.name)
          : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new EmailProviderError("EMAIL_PROVIDER_TIMEOUT", true);
      }
      throw new EmailProviderError("EMAIL_PROVIDER_UNAVAILABLE", true);
    }
    if (!response.ok) {
      throw new EmailProviderError(
        response.status >= 500
          ? "EMAIL_PROVIDER_UNAVAILABLE"
          : "EMAIL_PROVIDER_REJECTED",
        response.status >= 500 || response.status === 429,
      );
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new EmailProviderError("EMAIL_PROVIDER_REJECTED", false);
    }
    const providerReference =
      body &&
      typeof body === "object" &&
      "id" in body &&
      typeof body.id === "string"
        ? body.id
        : undefined;
    if (!providerReference) {
      throw new EmailProviderError("EMAIL_PROVIDER_REJECTED", false);
    }
    return { provider: this.name, providerReference, outcome: "sent" as const };
  }
}
