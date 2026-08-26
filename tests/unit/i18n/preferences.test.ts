import { describe, expect, it } from "vitest";

import {
  parseCurrencyPreference,
  parseLocalePreference,
} from "@/i18n/preferences";
import { parseLocalizedPath } from "@/i18n/routing";

describe("localized preferences", () => {
  it("accepts each supported locale and rejects unlisted values", () => {
    expect(["ka", "en", "de", "ru"].map(parseLocalePreference)).toEqual([
      "ka",
      "en",
      "de",
      "ru",
    ]);
    expect(parseLocalePreference("fr")).toBeUndefined();
  });

  it("keeps language and currency as independent preferences", () => {
    expect(parseCurrencyPreference("EUR")).toBe("EUR");
    expect(parseCurrencyPreference("eur")).toBeUndefined();
    expect(parseLocalePreference("de")).toBe("de");
  });

  it("finds protected route segments after a locale", () => {
    expect(parseLocalizedPath("/ru/admin/products")).toEqual({
      locale: "ru",
      segment: "admin",
      pathname: "/admin/products",
    });
    expect(parseLocalizedPath("/account/orders")).toEqual({
      locale: "ka",
      segment: "account",
      pathname: "/account/orders",
    });
  });
});
