import { describe, expect, it } from "vitest";

import {
  buildCatalogMetadata,
  buildProductStructuredData,
  serializeStructuredData,
} from "@/features/catalog/metadata";
import { minorAmount } from "@/lib/money/minor";
import { buildLocalizedRouteSet } from "@/features/seo/routes";

describe("catalog metadata", () => {
  it("builds canonical and four-language relationships", () => {
    const metadata = buildCatalogMetadata({
      locale: "de",
      pathname: "/products/indigo-rug",
      title: "Indigo Rug",
      description: "Verified product record.",
    });

    expect(metadata.alternates?.canonical).toBe(
      "http://127.0.0.1:3000/de/products/indigo-rug",
    );
    expect(metadata.alternates?.languages).toMatchObject({
      ka: expect.any(String),
      en: expect.any(String),
      de: expect.any(String),
      ru: expect.any(String),
      "x-default": "http://127.0.0.1:3000/ka/products/indigo-rug",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Indigo Rug",
    });
  });

  it("emits exact factual offer data and omits absent claims", () => {
    const routeSet = buildLocalizedRouteSet({
      origin: "http://127.0.0.1:3000",
      requestedLocale: "en",
      resolvedLocale: "en",
      routes: [{ locale: "en", slug: "indigo-rug" }],
      pathFor: (route) => `/en/products/${route.slug}`,
    });
    const value = buildProductStructuredData({
      id: "10000000-0000-4000-8000-000000000001",
      sku: "EPOCA-001",
      slug: "indigo-rug",
      name: "Indigo Rug",
      contentLocale: "en",
      requestedLocale: "en",
      usedFallback: false,
      price: { amountMinor: minorAmount(250000), currency: "GEL" },
      availability: "available",
      materials: ["wool"],
      colors: ["indigo"],
      shortDescription: "Verified product record.",
      condition: "vintage",
      structuredDataEligible: true,
      identifierExists: false,
      primaryImagePath: "https://cdn.example/indigo.webp",
      routeSet,
    });

    expect(value?.offers).toMatchObject({
      price: "2500.00",
      priceCurrency: "GEL",
    });
    expect(value).not.toHaveProperty("countryOfOrigin");
    expect(value).not.toHaveProperty("brand");
  });

  it("omits Product claims when the explicit eligibility gate is closed", () => {
    expect(
      buildProductStructuredData({
        id: "10000000-0000-4000-8000-000000000001",
        sku: "EPOCA-001",
        slug: "indigo-rug",
        name: "Indigo Rug",
        contentLocale: "en",
        requestedLocale: "en",
        usedFallback: false,
        price: { amountMinor: minorAmount(250000), currency: "GEL" },
        availability: "available",
        materials: ["wool"],
        colors: ["indigo"],
        structuredDataEligible: false,
        identifierExists: null,
      }),
    ).toBeUndefined();
  });

  it("escapes markup in structured data", () => {
    expect(serializeStructuredData({ name: "</script>" })).not.toContain(
      "</script>",
    );
  });
});
