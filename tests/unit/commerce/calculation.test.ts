import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { renderOrderEmail } from "@/emails/order";
import {
  calculateCheckoutTotal,
  decideReconciliation,
  deliveryDecision,
} from "@/features/checkout/calculation";
import {
  internationalAddressSchema,
  quoteBreakdownSchema,
} from "@/features/checkout/schema";
import { locales } from "@/i18n/routing";
import { allocateMinor, minorAmount } from "@/lib/money/minor";

describe("commerce calculations", () => {
  it("preserves every minor unit during proportional allocation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc
          .array(fc.integer({ min: 0, max: 100_000 }), {
            minLength: 1,
            maxLength: 20,
          })
          .filter((weights) => weights.some((weight) => weight > 0)),
        (total, weights) => {
          const allocated = allocateMinor(minorAmount(total), weights);
          expect(allocated.reduce((sum, value) => sum + value, 0)).toBe(total);
          expect(allocated.every((value) => value >= 0)).toBe(true);
        },
      ),
    );
  });

  it("reconciles exact totals and caps discounts at subtotal", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (subtotalValue, discountValue, taxValue, deliveryValue) => {
          const discount = Math.min(subtotalValue, discountValue);
          expect(
            calculateCheckoutTotal({
              subtotal: minorAmount(subtotalValue),
              discount: minorAmount(discount),
              tax: minorAmount(taxValue),
              delivery: minorAmount(deliveryValue),
            }),
          ).toBe(subtotalValue - discount + taxValue + deliveryValue);
        },
      ),
    );
    expect(() =>
      calculateCheckoutTotal({
        subtotal: minorAmount(100),
        discount: minorAmount(101),
        tax: minorAmount(0),
        delivery: minorAmount(0),
      }),
    ).toThrow("Discount cannot exceed subtotal");
  });

  it("requires acknowledgement only when a value changed", () => {
    expect(
      decideReconciliation(minorAmount(100), minorAmount(100), false),
    ).toBe("unchanged");
    expect(
      decideReconciliation(minorAmount(100), minorAmount(110), false),
    ).toBe("acknowledgement-required");
    expect(decideReconciliation(minorAmount(100), minorAmount(110), true)).toBe(
      "accepted-change",
    );
  });

  it("distinguishes unavailable, manual-quote, and purchasable delivery", () => {
    expect(
      deliveryDecision({ methodAvailable: false, manualQuote: false }),
    ).toBe("unavailable");
    expect(deliveryDecision({ methodAvailable: true, manualQuote: true })).toBe(
      "manual-quote",
    );
    expect(
      deliveryDecision({ methodAvailable: true, manualQuote: false }),
    ).toBe("purchasable");
  });

  it("accepts Unicode international addresses without inventing postal codes", () => {
    expect(
      internationalAddressSchema.parse({
        fullName: "ლაშა Иванов",
        line1: "ул. მშვიდობა 12",
        city: "თბილისი",
        countryCode: "ge",
        postalCode: "",
      }),
    ).toEqual({
      fullName: "ლაშა Иванов",
      line1: "ул. მშვიდობა 12",
      city: "თბილისი",
      countryCode: "GE",
      postalCode: undefined,
    });
  });

  it("validates included-tax display and exact quote state", () => {
    const quote = quoteBreakdownSchema.parse({
      lines: [
        {
          cartItemId: crypto.randomUUID(),
          productId: crypto.randomUUID(),
          sku: "TEST-1",
          slug: "test-1",
          name: "Test",
          quantity: 1,
          unitAmountMinor: 100,
          previousUnitAmountMinor: 90,
          availableQuantity: 1,
          deliveryClass: "parcel",
        },
      ],
      changed: true,
      includedTaxMinor: 15,
      taxRateBasisPoints: 1800,
      taxIncluded: true,
      discountCode: null,
      deliveryMethodCode: "standard",
      deliveryMethodName: { ka: "ა", en: "A", de: "A", ru: "А" },
      estimateMinDays: 1,
      estimateMaxDays: 3,
      customsResponsibility: "buyer-unless-confirmed-otherwise",
    });
    expect(quote.taxIncluded).toBe(true);
    expect(quote.includedTaxMinor).toBe(15);
    expect(quote.changed).toBe(true);
  });
});

describe("localized bank-transfer notices", () => {
  it.each(locales)("renders a safe, complete %s template", (locale) => {
    const message = renderOrderEmail(locale, {
      orderReference: "EPO-ABC123ABC123",
      amount: "₾1,000.00",
      dueAt: "28 August 2026",
      beneficiary: "ÉPOCA <script>",
      bank: "Test Bank",
      iban: "GE00TEST",
      instructions: "Do not transfer in fixture mode.",
    });
    expect(message.subject).toContain("EPO-ABC123ABC123");
    expect(message.text).toContain("GE00TEST");
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});
