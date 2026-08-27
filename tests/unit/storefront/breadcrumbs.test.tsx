import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";

describe("Collector's Index breadcrumbs", () => {
  it("provides one labelled navigation and a non-linked current page", () => {
    render(
      <Breadcrumbs
        locale="en"
        label="Breadcrumbs"
        items={[
          { label: "Collection", href: "/" },
          { label: "All collections", href: "/collections" },
          { label: "Indigo Rug" },
        ]}
      />,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Breadcrumbs",
    });
    expect(within(navigation).getAllByRole("listitem")).toHaveLength(3);
    expect(within(navigation).getByText("Indigo Rug")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(navigation).queryByRole("link", { name: "Indigo Rug" }),
    ).not.toBeInTheDocument();
  });
});
