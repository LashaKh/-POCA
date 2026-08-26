import { beforeEach, describe, expect, it, vi } from "vitest";

import { DisabledPaymentProvider } from "@/lib/providers/payment/disabled";
import {
  clearFixturePayments,
  FixturePaymentProvider,
  setFixturePaymentState,
} from "@/lib/providers/payment/fixture";
import { TbcPaymentProvider } from "@/lib/providers/payment/tbc";
import { PaymentProviderError } from "@/lib/providers/payment/types";

const createInput = {
  orderId: "00000000-0000-4000-8000-000000000001",
  orderReference: "EPO-TEST00000001",
  amountMinor: 102_500,
  currency: "GEL",
  locale: "de" as const,
  returnUrl: "https://epoca.example/en/payment/return",
  callbackUrl: "https://epoca.example/api/webhooks/tbc",
  idempotencyKey: "payment-idempotency-0001",
};

describe("payment provider contract", () => {
  beforeEach(() => clearFixturePayments());

  it("fails closed when payment integration is disabled", async () => {
    const provider = new DisabledPaymentProvider();
    await expect(provider.createPayment()).rejects.toMatchObject({
      code: "PAYMENT_PROVIDER_DISABLED",
      retryable: false,
    });
  });

  it("creates fixture payments idempotently and exposes only a hosted URL", async () => {
    const provider = new FixturePaymentProvider("https://epoca.example");
    const first = await provider.createPayment(createInput);
    const second = await provider.createPayment(createInput);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ provider: "fixture", state: "pending" });
    expect(first.approvalUrl).toBe(
      `https://epoca.example/de/payment/fixture/${first.providerReference}`,
    );
  });

  it("reads authoritative fixture state and refunds idempotently", async () => {
    const provider = new FixturePaymentProvider("https://epoca.example");
    const created = await provider.createPayment(createInput);
    expect(setFixturePaymentState(created.providerReference, "paid")).toBe(
      true,
    );
    await expect(
      provider.getPayment(created.providerReference),
    ).resolves.toMatchObject({
      state: "paid",
    });
    const input = {
      providerReference: created.providerReference,
      amountMinor: 2_500,
      currency: "GEL",
      idempotencyKey: "refund-idempotency-0001",
    };
    expect(await provider.refundPayment(input)).toEqual(
      await provider.refundPayment(input),
    );
  });

  it("rejects malformed fixture callbacks", async () => {
    const provider = new FixturePaymentProvider("https://epoca.example");
    await expect(provider.verifyCallback({ body: {} })).rejects.toMatchObject({
      code: "PAYMENT_CALLBACK_INVALID",
    });
  });

  it("uses a token, two-decimal money, EN fallback, and approval link for TBC", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token-value", expires_in: 3600 }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            payId: "tbc-pay-001",
            status: "Created",
            links: [{ rel: "approval_url", uri: "https://pay.example/001" }],
          }),
          { status: 200 },
        ),
      );
    const provider = new TbcPaymentProvider({
      clientId: "client-id-value-000000",
      clientSecret: "client-secret-value-000000",
      apiKey: "api-key-value-000000000",
      fetch: fetcher,
    });
    await expect(provider.createPayment(createInput)).resolves.toEqual({
      provider: "tbc",
      providerReference: "tbc-pay-001",
      state: "pending",
      approvalUrl: "https://pay.example/001",
    });
    const request = fetcher.mock.calls[1];
    expect(request?.[0]).toBe("https://api.tbcbank.ge/v1/tpay/payments");
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      amount: { currency: "GEL", total: 1025 },
      language: "EN",
      merchantPaymentId: "EPO-TEST00000001",
    });
  });

  it("normalizes authoritative TBC status", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-value" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ payId: "tbc-pay-001", status: "Succeeded" }),
          {
            status: 200,
          },
        ),
      );
    const provider = new TbcPaymentProvider({
      clientId: "client-id-value-000000",
      clientSecret: "client-secret-value-000000",
      apiKey: "api-key-value-000000000",
      fetch: fetcher,
    });
    await expect(provider.getPayment("tbc-pay-001")).resolves.toMatchObject({
      state: "paid",
    });
  });

  it("maps confirmed TBC refunds without leaking payloads", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-value" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ refundId: "refund-001", status: "Succeeded" }),
          {
            status: 200,
          },
        ),
      );
    const provider = new TbcPaymentProvider({
      clientId: "client-id-value-000000",
      clientSecret: "client-secret-value-000000",
      apiKey: "api-key-value-000000000",
      fetch: fetcher,
    });
    await expect(
      provider.refundPayment({
        providerReference: "tbc-pay-001",
        amountMinor: 2_500,
        currency: "GEL",
        idempotencyKey: "refund-idempotency-0001",
      }),
    ).resolves.toEqual({
      provider: "tbc",
      providerReference: "tbc-pay-001",
      refundReference: "refund-001",
      state: "succeeded",
    });
  });

  it("accepts callbacks only from TBC and stores a hash, never the raw body", async () => {
    const provider = new TbcPaymentProvider({
      clientId: "client-id-value-000000",
      clientSecret: "client-secret-value-000000",
      apiKey: "api-key-value-000000000",
    });
    await expect(
      provider.verifyCallback({
        body: { PaymentId: "tbc-pay-001", ignored: "private" },
        sourceIp: "193.104.20.44",
      }),
    ).resolves.toMatchObject({
      eventKey: "tbc:tbc-pay-001",
      providerReference: "tbc-pay-001",
      payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      safeMetadata: { source: "tbc-callback" },
    });
    await expect(
      provider.verifyCallback({
        body: { PaymentId: "tbc-pay-001" },
        sourceIp: "203.0.113.10",
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_CALLBACK_INVALID" });
  });

  it("maps network timeouts to a retryable safe error", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(
        new DOMException("private provider detail", "TimeoutError"),
      );
    const provider = new TbcPaymentProvider({
      clientId: "client-id-value-000000",
      clientSecret: "client-secret-value-000000",
      apiKey: "api-key-value-000000000",
      fetch: fetcher,
    });
    const error = await provider
      .getPayment("tbc-pay-001")
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(PaymentProviderError);
    expect(error).toMatchObject({
      code: "PAYMENT_PROVIDER_TIMEOUT",
      retryable: true,
    });
    expect(String(error)).not.toContain("private provider detail");
  });
});
