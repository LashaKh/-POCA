export type PaymentProviderState =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "uncertain";

export type CreatePaymentInput = {
  orderId: string;
  orderReference: string;
  amountMinor: number;
  currency: string;
  locale: "ka" | "en" | "de" | "ru";
  returnUrl: string;
  callbackUrl: string;
  idempotencyKey: string;
};

export type PaymentResult = {
  provider: string;
  providerReference: string;
  state: PaymentProviderState;
  approvalUrl?: string;
  expiresAt?: string;
};

export type RefundPaymentInput = {
  providerReference: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
};

export type RefundResult = {
  provider: string;
  providerReference: string;
  refundReference: string;
  state: "succeeded" | "pending" | "failed" | "uncertain";
};

export type VerifiedPaymentCallback = {
  provider: string;
  eventKey: string;
  eventType: string;
  providerReference: string;
  payloadHash: string;
  safeMetadata: Record<string, string>;
};

export interface PaymentProvider {
  readonly name: string;
  readonly available: boolean;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  getPayment(providerReference: string): Promise<PaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundResult>;
  verifyCallback(input: {
    body: unknown;
    sourceIp?: string;
  }): Promise<VerifiedPaymentCallback>;
}

export class PaymentProviderError extends Error {
  constructor(
    readonly code:
      | "PAYMENT_PROVIDER_DISABLED"
      | "PAYMENT_PROVIDER_UNAVAILABLE"
      | "PAYMENT_PROVIDER_TIMEOUT"
      | "PAYMENT_PROVIDER_REJECTED"
      | "PAYMENT_CALLBACK_INVALID",
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "PaymentProviderError";
  }
}
