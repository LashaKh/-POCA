import { describe, expect, it } from "vitest";

import {
  addMinor,
  allocateMinor,
  applyBasisPoints,
  minorAmount,
  subtractMinor,
} from "@/lib/money/minor";

describe("minor money", () => {
  it("rejects fractions and negative amounts", () => {
    expect(() => minorAmount(1.5)).toThrow(RangeError);
    expect(() => minorAmount(-1)).toThrow(RangeError);
  });

  it("adds and subtracts without binary fractions", () => {
    expect(addMinor(minorAmount(120), minorAmount(80))).toBe(200);
    expect(subtractMinor(minorAmount(200), minorAmount(80))).toBe(120);
  });

  it("rounds basis points to the nearest minor unit", () => {
    expect(applyBasisPoints(minorAmount(999), 1_500)).toBe(150);
  });

  it("allocates every minor unit deterministically", () => {
    expect(allocateMinor(minorAmount(10), [1, 1, 1])).toEqual([4, 3, 3]);
    expect(allocateMinor(minorAmount(5), [0, 1, 1])).toEqual([0, 3, 2]);
  });
});
