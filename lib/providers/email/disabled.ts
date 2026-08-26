import { EmailProviderError, type EmailProvider } from "./types";

export class DisabledEmailProvider implements EmailProvider {
  readonly name = "disabled";
  readonly available = false;

  async send(): Promise<never> {
    throw new EmailProviderError("EMAIL_PROVIDER_DISABLED", false);
  }
}
