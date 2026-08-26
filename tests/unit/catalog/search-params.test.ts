import { describe, expect, it } from "vitest";

import {
  parseCatalogSearchParams,
  serializeCatalogSearchParams,
} from "@/features/catalog/search-params";

describe("catalog search parameters", () => {
  it("normalizes whitespace and punctuation without erasing mixed scripts", () => {
    const parsed = parseCatalogSearchParams({
      q: "  Kilim — თბილისი  ковёр  ",
      page: "2",
    });

    expect(parsed.query).toBe("Kilim თბილისი ковёр");
    expect(parsed.page).toBe(2);
  });

  it("preserves a canonical SKU hyphen for exact indexed lookup", () => {
    expect(parseCatalogSearchParams({ q: "SYN-00001" }).query).toBe(
      "SYN-00001",
    );
  });

  it("defaults invalid or unknown values to a bounded canonical query", () => {
    expect(
      parseCatalogSearchParams({
        page: "-9",
        sort: "hidden",
        currency: "BTC",
        unknown: "value",
      }),
    ).toEqual({
      query: "",
      page: 1,
      sort: "relevance",
      currency: "GEL",
      collection: undefined,
      material: [],
      color: [],
      availability: "all",
    });
  });

  it("serializes filters in stable canonical order", () => {
    const value = parseCatalogSearchParams({
      q: "wool",
      page: "3",
      sort: "price-desc",
      currency: "EUR",
      material: ["silk", "wool", "silk"],
      color: ["red", "blue"],
      availability: "in-stock",
    });

    expect(serializeCatalogSearchParams(value)).toBe(
      "q=wool&sort=price-desc&currency=EUR&material=silk&material=wool&color=blue&color=red&availability=in-stock&page=3",
    );
  });

  it("bounds repeated filters and individual filter lengths", () => {
    const parsed = parseCatalogSearchParams({
      material: Array.from(
        { length: 25 },
        (_, index) =>
          `MATERIAL-${String(index).padStart(2, "0")}-${"x".repeat(80)}`,
      ),
    });

    expect(parsed.material).toHaveLength(20);
    expect(parsed.material.every((value) => value.length <= 60)).toBe(true);
  });
});
