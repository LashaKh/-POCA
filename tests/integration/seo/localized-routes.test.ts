import { describe, expect, it } from "vitest";

import {
  absoluteStorefrontUrl,
  buildLocalizedRouteSet,
} from "@/features/seo/routes";

import { discoveryOrigin, translatedProductRoutes } from "./fixtures";

describe("localized route sets", () => {
  it("uses real translated slugs for canonical and reciprocal alternatives", () => {
    const routeSet = buildLocalizedRouteSet({
      origin: discoveryOrigin,
      requestedLocale: "de",
      resolvedLocale: "de",
      routes: translatedProductRoutes,
      pathFor: ({ locale, slug }) => `/${locale}/products/${slug}`,
    });

    expect(routeSet).toMatchObject({
      canonicalUrl: "https://epoca.example/de/products/indigo-teppich",
      xDefault: "https://epoca.example/ka/products/lurji-khali",
      indexable: true,
      alternates: {
        ka: "https://epoca.example/ka/products/lurji-khali",
        en: "https://epoca.example/en/products/indigo-rug",
        de: "https://epoca.example/de/products/indigo-teppich",
      },
    });
    expect(routeSet.alternates).not.toHaveProperty("ru");
  });

  it("makes a fallback render non-indexable and canonicalizes to the real page", () => {
    const routeSet = buildLocalizedRouteSet({
      origin: discoveryOrigin,
      requestedLocale: "ru",
      resolvedLocale: "en",
      routes: translatedProductRoutes,
      pathFor: ({ locale, slug }) => `/${locale}/products/${slug}`,
    });

    expect(routeSet.indexable).toBe(false);
    expect(routeSet.canonicalUrl).toBe(
      "https://epoca.example/en/products/indigo-rug",
    );
  });

  it("removes query strings and fragments from organic URLs", () => {
    expect(
      absoluteStorefrontUrl(
        discoveryOrigin,
        "/de/products/indigo-teppich?currency=EUR#details",
      ),
    ).toBe("https://epoca.example/de/products/indigo-teppich");
  });
});
