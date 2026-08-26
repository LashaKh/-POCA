import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationState } from "@/components/storefront/foundation-state";

describe("FoundationPage", () => {
  it("does not imply that an unverified catalog is open", () => {
    render(
      <FoundationState
        eyebrow="ÉPOCA · Collector’s Index"
        title="The collection is being prepared."
        body="The public catalog will open only when its product facts, imagery, prices, availability, and delivery information are verified."
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "The collection is being prepared.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/only when its product facts/i),
    ).toBeInTheDocument();
  });
});
