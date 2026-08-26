import { describe, expect, it } from "vitest";

import {
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessDateTimeInput,
} from "@/lib/datetime/format";

describe("deterministic Asia/Tbilisi date formatting", () => {
  it("uses the business timezone without runtime ICU data", () => {
    const instant = "2026-08-25T21:30:00.000Z";
    expect(formatBusinessDate(instant)).toBe("2026-08-26");
    expect(formatBusinessDateTime(instant)).toBe("2026-08-26 01:30 GET");
    expect(formatBusinessDateTimeInput(instant)).toBe("2026-08-26T01:30");
  });

  it("fails safely for absent or invalid values", () => {
    expect(formatBusinessDate("not-a-date")).toBe("—");
    expect(formatBusinessDateTime("not-a-date")).toBe("—");
    expect(formatBusinessDateTimeInput(null)).toBe("");
  });
});
