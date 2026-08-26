import { describe, expect, it } from "vitest";

import { customerSignUpSchema } from "@/features/auth/customer-schema";
import {
  customerAddressSchema,
  customerPreferencesSchema,
  customerPrivacySchema,
  orderReferenceSchema,
} from "@/features/customer/schema";
import {
  guestWishlistViewSchema,
  wishlistToggleSchema,
} from "@/features/wishlist/schema";

describe("customer account validation", () => {
  it("accepts an international address and normalizes its country", () => {
    const address = customerAddressSchema.parse({
      locale: "en",
      addressId: "",
      expectedVersion: "",
      label: "Home",
      fullName: "Ada Collector",
      organization: "",
      line1: "1 Rug Street",
      line2: "",
      city: "Tbilisi",
      region: "",
      postalCode: "0105",
      countryCode: "ge",
      phone: "+995555000000",
      instructions: "",
      isDefault: "on",
    });
    expect(address.countryCode).toBe("GE");
    expect(address.organization).toBeUndefined();
    expect(address.isDefault).toBe(true);
  });

  it("requires matching strong sign-up passwords and explicit terms", () => {
    const valid = customerSignUpSchema.safeParse({
      locale: "de",
      email: "buyer@example.test",
      password: "A-unique-passphrase-2026!",
      confirmation: "A-unique-passphrase-2026!",
      displayName: "Buyer",
      termsAccepted: "on",
      marketingAccepted: false,
      returnTo: "/account",
    });
    const mismatch = customerSignUpSchema.safeParse({
      locale: "de",
      email: "buyer@example.test",
      password: "A-unique-passphrase-2026!",
      confirmation: "A-different-passphrase!",
      displayName: "Buyer",
      termsAccepted: "on",
      marketingAccepted: false,
      returnTo: "/account",
    });
    expect(valid.success).toBe(true);
    expect(mismatch.success).toBe(false);
  });

  it("bounds preferences and privacy request inputs", () => {
    expect(
      customerPreferencesSchema.parse({
        locale: "ru",
        displayName: "Collector",
        displayCurrency: "EUR",
        marketingChoice: "withdrawn",
      }).marketingChoice,
    ).toBe("withdrawn");
    expect(
      customerPrivacySchema.safeParse({
        locale: "en",
        requestType: "deletion",
        reason: "Close my account",
      }).success,
    ).toBe(true);
    expect(
      customerPrivacySchema.safeParse({
        locale: "en",
        requestType: "deletion",
        reason: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("accepts only safe order references and wishlist identities", () => {
    expect(orderReferenceSchema.safeParse("EPO-AB12CD34EF56").success).toBe(
      true,
    );
    expect(orderReferenceSchema.safeParse("../admin").success).toBe(false);
    expect(
      wishlistToggleSchema.safeParse({
        locale: "ka",
        productId: "62000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
    expect(
      guestWishlistViewSchema.parse({
        id: null,
        productIds: [],
      }).productIds,
    ).toEqual([]);
  });
});
