import { createHash, randomUUID } from "node:crypto";

import {
  PaymentProviderError,
  type CreatePaymentInput,
  type PaymentProvider,
  type PaymentResult,
  type RefundPaymentInput,
  type RefundResult,
  type VerifiedPaymentCallback,
} from "./types";

type FixturePayment = PaymentResult & {
  idempotencyKey: string;
  currency: string;
};

const fixturePayments = new Map<string, FixturePayment>();
const fixtureIdempotency = new Map<string, string>();
const fixtureRefunds = new Map<string, RefundResult>();

export class FixturePaymentProvider implements PaymentProvider {
  readonly name = "fixture";
  readonly available = true;

  constructor(private readonly siteUrl: string) {}

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const existingReference = fixtureIdempotency.get(input.idempotencyKey);
    if (existingReference) {
      const existing = fixturePayments.get(existingReference);
      if (!existing) {
        throw new PaymentProviderError("PAYMENT_PROVIDER_UNAVAILABLE", true);
      }
      return existing;
    }
    const providerReference = `fixture-${randomUUID()}`;
    const payment: FixturePayment = {
      provider: this.name,
      providerReference,
      state: "pending",
      approvalUrl: `${this.siteUrl}/${input.locale}/payment/fixture/${providerReference}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      idempotencyKey: input.idempotencyKey,
      currency: input.currency,
    };
    fixturePayments.set(providerReference, payment);
    fixtureIdempotency.set(input.idempotencyKey, providerReference);
    return payment;
  }

  async getPayment(providerReference: string): Promise<PaymentResult> {
    const payment = fixturePayments.get(providerReference);
    if (!payment) {
      throw new PaymentProviderError("PAYMENT_PROVIDER_REJECTED", false);
    }
    return payment;
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundResult> {
    const existing = fixtureRefunds.get(input.idempotencyKey);
    if (existing) return existing;
    const payment = fixturePayments.get(input.providerReference);
    if (!payment || payment.currency !== input.currency) {
      throw new PaymentProviderError("PAYMENT_PROVIDER_REJECTED", false);
    }
    const refund = {
      provider: this.name,
      providerReference: input.providerReference,
      refundReference: `fixture-refund-${randomUUID()}`,
      state: "succeeded" as const,
    };
    fixtureRefunds.set(input.idempotencyKey, refund);
    return refund;
  }

  async verifyCallback(input: {
    body: unknown;
  }): Promise<VerifiedPaymentCallback> {
    if (!input.body || typeof input.body !== "object") {
      throw new PaymentProviderError("PAYMENT_CALLBACK_INVALID", false);
    }
    const body = input.body as Record<string, unknown>;
    if (
      typeof body.paymentId !== "string" ||
      !fixturePayments.has(body.paymentId)
    ) {
      throw new PaymentProviderError("PAYMENT_CALLBACK_INVALID", false);
    }
    const canonical = JSON.stringify({ paymentId: body.paymentId });
    return {
      provider: this.name,
      providerReference: body.paymentId,
      eventKey: `fixture:${body.paymentId}`,
      eventType: "payment.updated",
      payloadHash: createHash("sha256").update(canonical).digest("hex"),
      safeMetadata: { source: "fixture-callback" },
    };
  }
}

export function setFixturePaymentState(
  providerReference: string,
  state: PaymentResult["state"],
) {
  const payment = fixturePayments.get(providerReference);
  if (!payment) return false;
  fixturePayments.set(providerReference, { ...payment, state });
  return true;
}

export function clearFixturePayments() {
  fixturePayments.clear();
  fixtureIdempotency.clear();
  fixtureRefunds.clear();
}
