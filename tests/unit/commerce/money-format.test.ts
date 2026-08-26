import { describe, expect, it } from "vitest";

import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

describe("deterministic money formatting", () => {
  it.each([
    ["en", "GEL 1,535.40"],
    ["de", "1.535,40\u00a0GEL"],
    ["ru", "1\u00a0535,40\u00a0GEL"],
    ["ka", "1\u00a0535.40\u00a0GEL"],
  ] as const)(
    "formats %s without runtime-specific currency symbols",
    (locale, expected) => {
      expect(formatMinorMoney(minorAmount(153_540), "GEL", locale)).toBe(
        expected,
      );
    },
  );
});
