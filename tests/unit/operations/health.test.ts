import { describe, expect, it } from "vitest";

import { aggregateHealth } from "@/features/operations/health-domain";

describe("health aggregation", () => {
  it("distinguishes healthy, degraded, and unavailable dependencies", () => {
    expect(
      aggregateHealth([
        { key: "database", status: "ok", critical: true },
        { key: "email", status: "disabled", critical: false },
        {
          key: "notification-queue",
          status: "ok",
          critical: false,
          ageSeconds: 30,
          warningAgeSeconds: 300,
        },
      ]),
    ).toMatchObject({ liveness: "ok", readiness: "ok", overall: "ok" });

    expect(
      aggregateHealth([
        { key: "database", status: "ok", critical: true },
        { key: "email", status: "degraded", critical: false },
      ]),
    ).toMatchObject({ readiness: "degraded", overall: "degraded" });

    expect(
      aggregateHealth([{ key: "database", status: "down", critical: true }]),
    ).toMatchObject({ liveness: "ok", readiness: "down", overall: "down" });
  });

  it("degrades when a queue or scheduler breaches its age budget", () => {
    const result = aggregateHealth([
      { key: "database", status: "ok", critical: true },
      {
        key: "scheduler",
        status: "ok",
        critical: true,
        ageSeconds: 901,
        warningAgeSeconds: 600,
        downAgeSeconds: 1800,
      },
    ]);
    expect(result.overall).toBe("degraded");
    expect(
      result.checks.find((check) => check.key === "scheduler")?.status,
    ).toBe("degraded");
  });
});
