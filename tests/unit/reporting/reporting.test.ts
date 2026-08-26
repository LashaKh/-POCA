import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildOperationalReportCsv } from "@/features/reporting/exporter";
import {
  operationalReportSchema,
  parseReportFilters,
} from "@/features/reporting/schema";

const report = operationalReportSchema.parse({
  period: {
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-09-01T00:00:00.000Z",
    timeZone: "Asia/Tbilisi",
    currency: "GEL",
  },
  sales: {
    orderCount: 3,
    grossMinor: 12000,
    netMinor: 11000,
    discountMinor: 1000,
    taxMinor: 0,
    deliveryMinor: 500,
    statusCounts: { confirmed: 3 },
  },
  payments: { attemptCount: 3, amountMinor: 11000, statusCounts: { paid: 3 } },
  stock: { outOfStock: 1, lowStock: 2, availableUnits: 10 },
  ingestion: {
    batchCount: 2,
    completed: 1,
    failed: 1,
    registeredFiles: 12,
    readyFiles: 10,
    failedFiles: 2,
  },
  returns: {
    requestCount: 1,
    open: 1,
    refunded: 0,
    statusCounts: { requested: 1 },
  },
  operations: {
    openAlerts: 0,
    criticalAlerts: 0,
    queuedMediaJobs: 1,
    queuedExports: 0,
    dueScheduledActions: 0,
  },
});

describe("operational reporting", () => {
  it("turns inclusive business dates into bounded Tbilisi instants", () => {
    expect(
      parseReportFilters(
        { from: "2026-08-01", to: "2026-08-31", currency: "EUR" },
        new Date("2026-08-31T12:00:00Z"),
      ),
    ).toEqual({
      fromDate: "2026-08-01",
      toDate: "2026-08-31",
      from: "2026-07-31T20:00:00.000Z",
      to: "2026-08-31T20:00:00.000Z",
      currency: "EUR",
    });
  });

  it("accepts PostgreSQL timestamptz offsets at the database boundary", () => {
    expect(
      operationalReportSchema.parse({
        ...report,
        period: {
          ...report.period,
          from: "2026-07-31T20:00:00+00:00",
          to: "2026-08-31T20:00:00+00:00",
        },
      }).period,
    ).toMatchObject({
      from: "2026-07-31T20:00:00+00:00",
      to: "2026-08-31T20:00:00+00:00",
    });
  });

  it("rejects reversed and overlong windows", () => {
    expect(() =>
      parseReportFilters({ from: "2026-08-02", to: "2026-08-01" }),
    ).toThrow("INVALID_REPORT_WINDOW");
    expect(() =>
      parseReportFilters({ from: "2025-01-01", to: "2026-08-01" }),
    ).toThrow("INVALID_REPORT_WINDOW");
  });

  it("creates a transparent metric/value CSV without buyer data", () => {
    const csv = buildOperationalReportCsv(report);
    expect(csv).toContain('"period.timeZone","Asia/Tbilisi"');
    expect(csv).toContain('"sales.statusCounts.confirmed","3"');
    expect(csv).toContain('"operations.queuedMediaJobs","1"');
    expect(csv).not.toMatch(/email|address|phone/i);
  });
});
