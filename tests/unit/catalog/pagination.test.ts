import { describe, expect, it } from "vitest";

import { paginationWindow } from "@/features/catalog/pagination";

describe("bounded catalogue pagination", () => {
  it("shows every page for a short result", () => {
    expect(paginationWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("keeps first, nearby, and final pages without hundreds of links", () => {
    expect(paginationWindow(125, 250)).toEqual([
      1,
      "ellipsis",
      123,
      124,
      125,
      126,
      127,
      "ellipsis",
      250,
    ]);
  });

  it("rejects an invalid page instead of generating a misleading control", () => {
    expect(() => paginationWindow(0, 3)).toThrowError(
      "PAGINATION_RANGE_INVALID",
    );
    expect(() => paginationWindow(4, 3)).toThrowError(
      "PAGINATION_RANGE_INVALID",
    );
  });
});
