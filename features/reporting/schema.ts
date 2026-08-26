import { z } from "zod";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

export const reportCurrencySchema = z.enum(["GEL", "USD", "EUR"]);

export const operationalReportSchema = z.object({
  period: z.object({
    // PostgreSQL serializes timestamptz values with a numeric UTC offset,
    // while JavaScript commonly emits a trailing Z. Both are valid ISO 8601.
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    timeZone: z.literal("Asia/Tbilisi"),
    currency: reportCurrencySchema,
  }),
  sales: z.object({
    orderCount: z.number().nonnegative(),
    grossMinor: z.number().nonnegative(),
    netMinor: z.number().nonnegative(),
    discountMinor: z.number().nonnegative(),
    taxMinor: z.number().nonnegative(),
    deliveryMinor: z.number().nonnegative(),
    statusCounts: z.record(z.string(), z.number().nonnegative()),
  }),
  payments: z.object({
    attemptCount: z.number().nonnegative(),
    amountMinor: z.number().nonnegative(),
    statusCounts: z.record(z.string(), z.number().nonnegative()),
  }),
  stock: z.object({
    outOfStock: z.number().nonnegative(),
    lowStock: z.number().nonnegative(),
    availableUnits: z.number().nonnegative(),
  }),
  ingestion: z.object({
    batchCount: z.number().nonnegative(),
    completed: z.number().nonnegative(),
    failed: z.number().nonnegative(),
    registeredFiles: z.number().nonnegative(),
    readyFiles: z.number().nonnegative(),
    failedFiles: z.number().nonnegative(),
  }),
  returns: z.object({
    requestCount: z.number().nonnegative(),
    open: z.number().nonnegative(),
    refunded: z.number().nonnegative(),
    statusCounts: z.record(z.string(), z.number().nonnegative()),
  }),
  operations: z.object({
    openAlerts: z.number().nonnegative(),
    criticalAlerts: z.number().nonnegative(),
    queuedMediaJobs: z.number().nonnegative(),
    queuedExports: z.number().nonnegative(),
    dueScheduledActions: z.number().nonnegative(),
  }),
});

export type OperationalReport = z.infer<typeof operationalReportSchema>;

function dateOnlyValue(value: unknown, fallback: string) {
  return typeof value === "string" && dateOnly.test(value) ? value : fallback;
}

function addOneDay(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function parseReportFilters(
  raw: Record<string, string | string[] | undefined>,
  now = new Date(),
) {
  const today = now.toISOString().slice(0, 10);
  const previous = new Date(now);
  previous.setUTCDate(previous.getUTCDate() - 29);
  const fromDate = dateOnlyValue(raw.from, previous.toISOString().slice(0, 10));
  const toDate = dateOnlyValue(raw.to, today);
  const currency = reportCurrencySchema.catch("GEL").parse(raw.currency);
  const from = new Date(`${fromDate}T00:00:00+04:00`);
  const to = new Date(`${addOneDay(toDate)}T00:00:00+04:00`);
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from >= to ||
    to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("INVALID_REPORT_WINDOW");
  }
  return {
    fromDate,
    toDate,
    from: from.toISOString(),
    to: to.toISOString(),
    currency,
  };
}
