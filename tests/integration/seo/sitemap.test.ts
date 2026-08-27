import { describe, expect, it } from "vitest";

import {
  assertSitemapCapacity,
  localizedSitemapAlternates,
  sitemapReadinessLimit,
} from "@/features/seo/sitemap";

describe("localized sitemap contracts", () => {
  it("groups only real translation slugs and selects Georgian as x-default", () => {
    const alternates = localizedSitemapAlternates(
      "https://example.com",
      [
        { locale: "ka", slug: "ქართული-სლაგი" },
        { locale: "en", slug: "english-slug" },
        { locale: "de", slug: "deutscher-slug" },
      ],
      (row) => `/${row.locale}/products/${row.slug}`,
    );

    expect(alternates).toEqual({
      ka: "https://example.com/ka/products/ქართული-სლაგი",
      en: "https://example.com/en/products/english-slug",
      de: "https://example.com/de/products/deutscher-slug",
      "x-default": "https://example.com/ka/products/ქართული-სლაგი",
    });
    expect(alternates).not.toHaveProperty("ru");
  });

  it("fails before Google's hard URL limit requires emergency sharding", () => {
    expect(
      assertSitemapCapacity(new Array(sitemapReadinessLimit - 1)),
    ).toHaveLength(sitemapReadinessLimit - 1);
    expect(() =>
      assertSitemapCapacity(new Array(sitemapReadinessLimit)),
    ).toThrow("SITEMAP_SHARDING_REQUIRED");
  });
});
