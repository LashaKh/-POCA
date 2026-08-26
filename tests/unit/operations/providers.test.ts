import { describe, expect, it, vi } from "vitest";

import { createAnalyticsAdapter } from "@/lib/providers/analytics";
import { createMonitoringAdapter } from "@/lib/providers/monitoring";

describe("privacy-safe operations providers", () => {
  it("gates optional analytics on consent and rejects unnamed or unsafe events", async () => {
    const transport = vi
      .fn<(payload: unknown) => Promise<void>>()
      .mockResolvedValue(undefined);
    const analytics = createAnalyticsAdapter({
      mode: "posthog",
      publicKey: "phc_synthetic_public_key_1234567890",
      host: "https://eu.i.posthog.com",
      release: "test-release",
      transport,
    });
    expect(analytics.capabilities).toEqual({
      autocapture: false,
      sessionReplay: false,
      personProfiles: false,
    });

    expect(
      await analytics.track({
        consent: "refused",
        name: "checkout_started",
        properties: { itemCountBucket: "1" },
      }),
    ).toMatchObject({ accepted: false, reason: "CONSENT_REQUIRED" });
    expect(transport).not.toHaveBeenCalled();

    expect(
      await analytics.track({
        consent: "granted",
        name: "checkout_started",
        properties: {
          locale: "en",
          displayCurrency: "GEL",
          itemCountBucket: "1",
          buyerClass: "guest",
          destinationRegion: "domestic",
        },
      }),
    ).toMatchObject({ accepted: true });
    expect(transport).toHaveBeenCalledTimes(1);

    expect(
      await analytics.track({
        consent: "granted",
        name: "unknown_event",
        properties: {},
      }),
    ).toMatchObject({ accepted: false, reason: "UNKNOWN_EVENT" });
  });

  it("scrubs errors and arbitrary metadata before monitoring transport", async () => {
    const transport = vi
      .fn<(payload: unknown) => Promise<void>>()
      .mockResolvedValue(undefined);
    const monitoring = createMonitoringAdapter({
      mode: "sentry",
      dsn: "https://public@example.invalid/123",
      release: "test-release",
      environment: "test",
      transport,
    });
    expect(monitoring.privacy).toEqual({
      sendDefaultPii: false,
      includeRequestBody: false,
      includeUser: false,
    });

    const result = await monitoring.capture({
      correlationId: crypto.randomUUID(),
      event: "payment.create",
      error: new Error("buyer@example.test failed with card 4111111111111111"),
      safeErrorCode: "PROVIDER_UNAVAILABLE",
      metadata: {
        provider: "fixture",
        email: "buyer@example.test",
        payload: { cardNumber: "4111111111111111" },
      },
    });
    expect(result.accepted).toBe(true);
    const body = JSON.stringify(transport.mock.calls[0]?.[0]);
    expect(body).toContain("PROVIDER_UNAVAILABLE");
    expect(body).not.toContain("buyer@example.test");
    expect(body).not.toContain("4111111111111111");
    expect(body).not.toContain("failed with card");
  });

  it("provides deterministic disabled and fixture adapters", async () => {
    const disabled = createAnalyticsAdapter({ mode: "disabled" });
    expect(
      await disabled.track({
        consent: "granted",
        name: "product_viewed",
        properties: {},
      }),
    ).toEqual({ accepted: false, reason: "DISABLED" });

    const fixture = createMonitoringAdapter({ mode: "fixture" });
    await fixture.capture({
      correlationId: crypto.randomUUID(),
      event: "notification.send",
      error: new Error("synthetic"),
      safeErrorCode: "FIXTURE_FAILURE",
    });
    expect(fixture.captured()).toHaveLength(1);
  });
});
