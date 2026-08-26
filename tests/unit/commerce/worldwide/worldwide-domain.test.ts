import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  customsDisclosure,
  deliveryFallback,
  resolveDeliveryRule,
} from "@/features/delivery/domain";
import { internationalAddressSchema } from "@/features/checkout/schema";
import {
  requireExactMinorAmount,
  resolveMarketPrice,
} from "@/features/pricing/domain";
import {
  calculatePromotionDiscount,
  explainPromotionEligibility,
  formatPromotionEnd,
  normalizePromotionTimestamp,
  openEndedPromotionTimestamp,
} from "@/features/promotions/domain";

describe("worldwide commerce rules", () => {
  it("uses exact minor units and never invents a missing conversion", () => {
    const prices = [
      {
        currency: "GEL" as const,
        amountMinor: 125_001,
        enabled: true,
        activeFrom: new Date("2026-01-01T00:00:00Z"),
        activeUntil: new Date("2027-01-01T00:00:00Z"),
        source: "explicit" as const,
      },
    ];
    expect(
      resolveMarketPrice(prices, {
        currency: "GEL",
        at: new Date("2026-08-26T00:00:00Z"),
      })?.amountMinor,
    ).toBe(125_001);
    expect(
      resolveMarketPrice(prices, {
        currency: "EUR",
        at: new Date("2026-08-26T00:00:00Z"),
      }),
    ).toBeUndefined();
  });

  it("accepts an approved rate snapshot only with the matching reference", () => {
    const prices = [
      {
        currency: "USD" as const,
        amountMinor: 40_000,
        enabled: true,
        activeFrom: new Date("2026-01-01T00:00:00Z"),
        activeUntil: new Date("2027-01-01T00:00:00Z"),
        source: "approved_rate_snapshot" as const,
        sourceReference: "treasury-2026-08-26",
      },
    ];
    expect(
      resolveMarketPrice(prices, {
        currency: "USD",
        at: new Date("2026-08-26T00:00:00Z"),
      }),
    ).toBeUndefined();
    expect(
      resolveMarketPrice(prices, {
        currency: "USD",
        approvedRateReference: "treasury-2026-08-26",
        at: new Date("2026-08-26T00:00:00Z"),
      })?.amountMinor,
    ).toBe(40_000);
  });

  it("keeps percentage discount allocation bounded for arbitrary safe subtotals", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 10_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (subtotal, basisPoints, cap) => {
          const discount = calculatePromotionDiscount({
            eligibleSubtotalMinor: subtotal,
            kind: "percentage",
            percentageBasisPoints: basisPoints,
            maximumDiscountMinor: cap,
          });
          expect(Number.isInteger(discount)).toBe(true);
          expect(discount).toBeGreaterThanOrEqual(0);
          expect(discount).toBeLessThanOrEqual(subtotal);
          expect(discount).toBeLessThanOrEqual(cap);
        },
      ),
    );
  });

  it("explains invalid promotion windows and limits without altering totals", () => {
    const base = {
      enabled: true,
      startsAt: new Date("2026-08-01T00:00:00Z"),
      endsAt: new Date("2026-09-01T00:00:00Z"),
      at: new Date("2026-08-26T00:00:00Z"),
      subtotalMinor: 10_000,
      minimumSubtotalMinor: 20_000,
      usageLimit: 10,
      usedCount: 0,
    };
    expect(explainPromotionEligibility(base)).toBe("minimum-not-met");
    expect(
      explainPromotionEligibility({
        ...base,
        minimumSubtotalMinor: 0,
        usedCount: 10,
      }),
    ).toBe("usage-exhausted");
  });

  it("renders legacy open-ended promotion windows without crashing admin", () => {
    expect(formatPromotionEnd("infinity", "en")).toBe("∞");
    expect(
      normalizePromotionTimestamp("infinity", "2026-09-01T00:00:00.000Z"),
    ).toBe(openEndedPromotionTimestamp);
  });

  it("resolves delivery by zone then rate priority and falls back honestly", () => {
    const rules = [
      {
        zonePriority: 10,
        ratePriority: 100,
        countryCode: "DE",
        currency: "EUR" as const,
        minimumSubtotalMinor: 0,
        deliveryClasses: ["parcel"],
        manualQuote: false,
        amountMinor: 5_000,
        methodCode: "lower-zone",
      },
      {
        zonePriority: 50,
        ratePriority: 1,
        countryCode: "DE",
        currency: "EUR" as const,
        minimumSubtotalMinor: 0,
        deliveryClasses: ["parcel"],
        manualQuote: false,
        amountMinor: 7_000,
        methodCode: "higher-zone",
      },
    ];
    const resolved = resolveDeliveryRule(rules, {
      countryCode: "DE",
      currency: "EUR",
      subtotalMinor: 100_000,
      deliveryClasses: ["parcel"],
    });
    expect(resolved?.methodCode).toBe("higher-zone");
    expect(deliveryFallback(resolved)).toBe("checkout");
    expect(
      deliveryFallback(
        resolveDeliveryRule(rules, {
          countryCode: "AQ",
          currency: "EUR",
          subtotalMinor: 100_000,
          deliveryClasses: ["oversized"],
        }),
      ),
    ).toBe("manual-quote");
  });

  it("accepts international address shapes without Georgia-only assumptions", () => {
    expect(
      internationalAddressSchema.parse({
        fullName: "Alexandra Very Long Collector Name",
        organization: "Research Station 12",
        line1: "Building 7, Ice Shelf Logistics Compound",
        line2: "Care of International Freight Office",
        city: "McMurdo",
        region: "Ross Dependency",
        postalCode: "00000",
        countryCode: "AQ",
        instructions: "Contact before carrier handoff.",
      }).countryCode,
    ).toBe("AQ");
  });

  it("does not present unapproved customs responsibility as a promise", () => {
    expect(
      customsDisclosure({
        responsibility: "seller",
        legalStatus: "draft_unapproved",
      }),
    ).toEqual({ state: "pending-review", promiseMade: false });
    expect(
      customsDisclosure({
        responsibility: "buyer_unless_confirmed",
        legalStatus: "approved",
      }),
    ).toEqual({ state: "buyer_unless_confirmed", promiseMade: false });
  });

  it("rejects fractional, negative, and unsafe minor-unit values", () => {
    expect(() => requireExactMinorAmount(1.5)).toThrow("INVALID_MINOR_AMOUNT");
    expect(() => requireExactMinorAmount(-1)).toThrow("INVALID_MINOR_AMOUNT");
    expect(() => requireExactMinorAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "INVALID_MINOR_AMOUNT",
    );
  });
});
