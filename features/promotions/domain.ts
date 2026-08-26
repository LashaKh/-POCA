import { requireExactMinorAmount } from "@/features/pricing/domain";

export const openEndedPromotionTimestamp = "9999-12-31T23:59:59.999Z";

export function normalizePromotionTimestamp(
  value: string | undefined,
  fallback: string,
) {
  if (value === "infinity") return openEndedPromotionTimestamp;
  if (!value) return fallback;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? fallback : timestamp.toISOString();
}

export function formatPromotionEnd(value: string, locale: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? "∞"
    : new Intl.DateTimeFormat(locale).format(timestamp);
}

export function calculatePromotionDiscount(input: {
  eligibleSubtotalMinor: number;
  kind: "percentage" | "fixed";
  percentageBasisPoints?: number;
  fixedAmountMinor?: number;
  maximumDiscountMinor?: number;
}) {
  const subtotal = requireExactMinorAmount(input.eligibleSubtotalMinor);
  const raw =
    input.kind === "percentage"
      ? Math.floor(
          (subtotal * (input.percentageBasisPoints ?? 0) + 5000) / 10000,
        )
      : Math.min(subtotal, input.fixedAmountMinor ?? 0);
  return Math.min(subtotal, raw, input.maximumDiscountMinor ?? raw);
}

export function explainPromotionEligibility(input: {
  enabled: boolean;
  startsAt: Date;
  endsAt: Date;
  at: Date;
  subtotalMinor: number;
  minimumSubtotalMinor: number;
  usageLimit?: number;
  usedCount: number;
}) {
  if (!input.enabled) return "disabled" as const;
  if (input.at < input.startsAt) return "not-started" as const;
  if (input.at >= input.endsAt) return "expired" as const;
  if (input.subtotalMinor < input.minimumSubtotalMinor)
    return "minimum-not-met" as const;
  if (input.usageLimit !== undefined && input.usedCount >= input.usageLimit)
    return "usage-exhausted" as const;
  return "eligible" as const;
}
