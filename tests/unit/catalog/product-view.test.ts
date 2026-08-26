import { describe, expect, it } from "vitest";

import {
  mapCatalogProduct,
  selectLocalizedTranslation,
} from "@/features/catalog/types";

describe("catalog product view", () => {
  it("uses an explicit fallback locale diagnostic", () => {
    expect(
      selectLocalizedTranslation(
        [
          { locale: "ka", name: "ქართული" },
          { locale: "en", name: "English" },
        ],
        "de",
      ),
    ).toEqual({ locale: "en", name: "English", usedFallback: true });
  });

  it("maps exact minor money and omits unverified optional facts", () => {
    const product = mapCatalogProduct({
      id: "10000000-0000-4000-8000-000000000001",
      sku: "EPOCA-001",
      slug: "indigo-rug",
      name: "Indigo Rug",
      contentLocale: "en",
      requestedLocale: "en",
      amountMinor: 250000,
      currency: "GEL",
      availableQuantity: 1,
      origin: "Georgia",
      originVerified: false,
    });

    expect(product.price).toEqual({ amountMinor: 250000, currency: "GEL" });
    expect(product.availability).toBe("available");
    expect(product.origin).toBeUndefined();
  });
});
