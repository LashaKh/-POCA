import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DependencyState } from "@/components/ui/dependency-state";
import { StatePanel } from "@/components/ui/state-panel";

describe("safe system states", () => {
  it("exposes reusable loading and success semantics", () => {
    const { rerender } = render(
      <StatePanel title="Publishing" loading>
        <p>Preparing reviewed content.</p>
      </StatePanel>,
    );
    expect(screen.getByRole("status", { name: "Publishing" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    rerender(
      <StatePanel title="Published" tone="success">
        <p>The reviewed version is live.</p>
      </StatePanel>,
    );
    expect(
      screen.getByRole("status", { name: "Published" }),
    ).not.toHaveAttribute("aria-busy");
  });

  it("announces an unavailable dependency and gives a recovery action", () => {
    render(
      <DependencyState
        state="unavailable"
        title="Payment unavailable"
        action={<button type="button">Return to cart</button>}
      >
        <p>No payment was taken.</p>
      </DependencyState>,
    );
    expect(
      screen.getByRole("alert", { name: "Payment unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Return to cart" }),
    ).toBeVisible();
  });

  it("ships noindex, four-language offline and maintenance fallbacks", () => {
    for (const filename of ["offline.html", "maintenance.html"]) {
      const html = fs.readFileSync(path.resolve("public", filename), "utf8");
      expect(html).toContain('name="robots" content="noindex"');
      for (const locale of ["ka", "en", "de", "ru"]) {
        expect(html).toContain(`lang="${locale}"`);
      }
      expect(html).toMatch(/No order|არც შეკვეთა|Bestellungen|Заказ/);
    }
  });
});
