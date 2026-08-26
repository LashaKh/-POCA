import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Button,
  DataTable,
  Field,
  MediaFallback,
  Notice,
  SkipLink,
} from "@/components/ui";

describe("shared semantic primitives", () => {
  it("connects field labels, hints, and errors without relying on color", () => {
    render(
      <Field
        label="Email"
        hint="Order updates only"
        error="Enter a valid email"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription(
      "Order updates only Enter a valid email",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
  });

  it("provides operable controls and named non-text media", async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink>Skip to content</SkipLink>
        <Button>Continue</Button>
        <Notice>Saved</Notice>
        <MediaFallback label="Product image unavailable" />
      </>,
    );

    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(
      screen.getByRole("img", { name: "Product image unavailable" }),
    ).toBeVisible();
  });

  it("keeps tabular comparisons semantic inside a scroll region", () => {
    render(
      <DataTable caption="Inventory">
        <thead>
          <tr>
            <th scope="col">Item</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rug 01</td>
          </tr>
        </tbody>
      </DataTable>,
    );

    expect(screen.getByRole("table", { name: "Inventory" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Item" })).toBeVisible();
  });
});
