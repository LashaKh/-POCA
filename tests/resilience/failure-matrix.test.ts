import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { catalogExportFailureRecord } from "@/features/catalog/exporter";
import { requireManager } from "@/features/auth/authorization";
import type { ActorContext } from "@/features/auth/context";
import { inspectImageBuffer } from "@/features/media/processor";
import { planScheduledCatchUp } from "@/features/operations/scheduler-domain";
import { DisabledEmailProvider } from "@/lib/providers/email/disabled";
import { DisabledPaymentProvider } from "@/lib/providers/payment/disabled";
import {
  clearFixturePayments,
  FixturePaymentProvider,
  setFixturePaymentState,
} from "@/lib/providers/payment/fixture";

const paymentInput = {
  orderId: "00000000-0000-4000-8000-000000000001",
  orderReference: "EPO-RESILIENCE001",
  amountMinor: 102_500,
  currency: "GEL",
  locale: "en" as const,
  returnUrl: "https://epoca.example/en/payment/return",
  callbackUrl: "https://epoca.example/api/webhooks/tbc",
  idempotencyKey: "resilience-payment-0001",
};

describe("final resilience failure matrix", () => {
  it("keeps payment replay and uncertain state authoritative and idempotent", async () => {
    clearFixturePayments();
    const provider = new FixturePaymentProvider("https://epoca.example");
    const first = await provider.createPayment(paymentInput);
    const replay = await provider.createPayment(paymentInput);

    expect(replay).toEqual(first);
    expect(setFixturePaymentState(first.providerReference, "uncertain")).toBe(
      true,
    );
    await expect(
      provider.getPayment(first.providerReference),
    ).resolves.toMatchObject({ state: "uncertain" });

    const refundInput = {
      providerReference: first.providerReference,
      amountMinor: 2_500,
      currency: "GEL",
      idempotencyKey: "resilience-refund-0001",
    };
    expect(await provider.refundPayment(refundInput)).toEqual(
      await provider.refundPayment(refundInput),
    );
  });

  it("rejects an interrupted image before it can enter the rendition pipeline", async () => {
    const truncatedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01]);
    await expect(
      inspectImageBuffer(truncatedJpeg, "image/jpeg"),
    ).rejects.toBeDefined();
  });

  it("bounds schedule catch-up after a missed execution window", () => {
    expect(
      planScheduledCatchUp({
        now: new Date("2026-08-26T12:10:00.000Z"),
        jobs: [
          {
            key: "notification",
            intervalSeconds: 60,
            maxCatchUp: 2,
            lastSuccessfulAt: new Date("2026-08-26T12:00:00.000Z"),
          },
        ],
      }),
    ).toEqual([
      {
        key: "notification",
        scheduledFor: "2026-08-26T12:09:00.000Z",
      },
      {
        key: "notification",
        scheduledFor: "2026-08-26T12:10:00.000Z",
      },
    ]);
  });

  it("fails closed when payment and notification providers are unavailable", async () => {
    await expect(
      new DisabledPaymentProvider().createPayment(),
    ).rejects.toMatchObject({
      code: "PAYMENT_PROVIDER_DISABLED",
      retryable: false,
    });
    await expect(new DisabledEmailProvider().send()).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_DISABLED",
      retryable: false,
    });
  });

  it("records export failure safely and releases the worker lease", () => {
    const completedAt = "2026-08-26T12:00:00.000Z";
    expect(catalogExportFailureRecord(completedAt)).toEqual({
      status: "failed",
      safe_error_code: "CATALOG_EXPORT_FAILED",
      completed_at: completedAt,
      lease_owner: null,
      lease_expires_at: null,
    });
  });

  it("rejects a revoked session at the command boundary", () => {
    const revokedManager: ActorContext = {
      kind: "staff",
      profileId: "resilience-manager",
      role: "manager",
      active: true,
      assuranceLevel: "aal1",
      sessionState: "revoked",
    };
    expect(() => requireManager(revokedManager)).toThrowError(
      "SESSION_REVOKED",
    );
  });
});
