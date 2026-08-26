import { describe, expect, it } from "vitest";

import {
  createCorrelationId,
  createLogRecord,
} from "@/lib/observability/logger";
import { isKnownEvent, validateNamedEvent } from "@/lib/observability/events";
import { recordMetric } from "@/lib/observability/metrics";

describe("production observability contracts", () => {
  it("creates valid correlation references and privacy-safe log records", () => {
    const correlationId = createCorrelationId();
    expect(correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    const record = createLogRecord(
      "error",
      {
        correlationId,
        event: "payment.create",
        actorClass: "guest",
        metadata: {
          provider: "fixture",
          email: "buyer@example.test",
          payload: { cardNumber: "4111111111111111" },
        },
      },
      new Date("2026-08-26T00:00:00.000Z"),
    );

    expect(record).toMatchObject({
      timestamp: "2026-08-26T00:00:00.000Z",
      level: "error",
      event: "payment.create",
      correlationId,
    });
    expect(JSON.stringify(record)).not.toContain("buyer@example.test");
    expect(JSON.stringify(record)).not.toContain("4111111111111111");
  });

  it("enforces the named analytics event dictionary and property allowlist", () => {
    expect(isKnownEvent("checkout_started")).toBe(true);
    expect(isKnownEvent("made_up_event")).toBe(false);
    expect(
      validateNamedEvent({
        name: "checkout_started",
        properties: {
          locale: "en",
          displayCurrency: "GEL",
          itemCountBucket: "2-3",
          buyerClass: "guest",
          destinationRegion: "domestic",
        },
      }),
    ).toMatchObject({ ok: true });
    expect(
      validateNamedEvent({
        name: "checkout_started",
        properties: { email: "buyer@example.test" },
      }),
    ).toMatchObject({ ok: false, code: "PROHIBITED_PROPERTY" });
  });

  it("accepts only bounded metric names, types, and labels", () => {
    expect(
      recordMetric({
        name: "queue_depth",
        type: "gauge",
        value: 12,
        labels: { queue: "notifications" },
      }),
    ).toEqual({
      name: "queue_depth",
      type: "gauge",
      value: 12,
      labels: { queue: "notifications" },
    });
    expect(() =>
      recordMetric({
        name: "queue_depth",
        type: "counter",
        value: 1,
        labels: { orderId: crypto.randomUUID() },
      }),
    ).toThrow("INVALID_METRIC");
  });
});
