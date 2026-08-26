import { PaymentProviderError, type PaymentProvider } from "./types";

export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = "disabled";
  readonly available = false;

  async createPayment(): Promise<never> {
    throw new PaymentProviderError("PAYMENT_PROVIDER_DISABLED", false);
  }

  async getPayment(): Promise<never> {
    throw new PaymentProviderError("PAYMENT_PROVIDER_DISABLED", false);
  }

  async refundPayment(): Promise<never> {
    throw new PaymentProviderError("PAYMENT_PROVIDER_DISABLED", false);
  }

  async verifyCallback(): Promise<never> {
    throw new PaymentProviderError("PAYMENT_CALLBACK_INVALID", false);
  }
}
