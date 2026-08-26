import { describe, expect, it } from "vitest";

import { planScheduledCatchUp } from "@/features/operations/scheduler-domain";

describe("scheduler catch-up planning", () => {
  it("returns bounded missed windows oldest first without duplicating the last success", () => {
    const result = planScheduledCatchUp({
      now: new Date("2026-08-26T01:00:00.000Z"),
      jobs: [
        {
          key: "reconciliation",
          intervalSeconds: 300,
          maxCatchUp: 3,
          lastSuccessfulAt: new Date("2026-08-26T00:30:00.000Z"),
        },
      ],
    });
    expect(result).toEqual([
      { key: "reconciliation", scheduledFor: "2026-08-26T00:50:00.000Z" },
      { key: "reconciliation", scheduledFor: "2026-08-26T00:55:00.000Z" },
      { key: "reconciliation", scheduledFor: "2026-08-26T01:00:00.000Z" },
    ]);
  });

  it("does not schedule a future or already-current window", () => {
    expect(
      planScheduledCatchUp({
        now: new Date("2026-08-26T01:00:00.000Z"),
        jobs: [
          {
            key: "cleanup",
            intervalSeconds: 300,
            maxCatchUp: 2,
            lastSuccessfulAt: new Date("2026-08-26T01:00:00.000Z"),
          },
        ],
      }),
    ).toEqual([]);
  });
});
