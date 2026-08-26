import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    locale,
    ...props
  }: Omit<ComponentProps<"a">, "href"> & {
    href: string;
    locale: string;
  }) => <a href={`/${locale}${href}`} {...props} />,
}));
vi.mock("@/features/wishlist/actions", () => ({
  toggleWishlistAction: vi.fn(async () => undefined),
}));

import { ProductCard } from "@/components/storefront/product-card";
import {
  CatalogControls,
  CatalogPagination,
} from "@/components/storefront/catalog-controls";
import { ProductFacts } from "@/components/storefront/product-facts";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { parseCatalogSearchParams } from "@/features/catalog/search-params";
import { minorAmount } from "@/lib/money/minor";

const product = {
  id: "10000000-0000-4000-8000-000000000001",
  sku: "EPOCA-001",
  slug: "indigo-rug",
  name: "Indigo Rug",
  shortDescription: "Verified wool rug",
  contentLocale: "en" as const,
  requestedLocale: "en" as const,
  usedFallback: false,
  price: { amountMinor: minorAmount(250000), currency: "GEL" as const },
  availability: "available" as const,
  dimensions: { widthMm: 1600, lengthMm: 2400 },
  materials: ["Wool"],
  colors: ["Indigo"],
};

describe("catalog components", () => {
  it("renders a product record without badges or fabricated facts", () => {
    render(<ProductCard locale="en" product={product} />);

    expect(screen.getByRole("heading", { name: "Indigo Rug" })).toBeVisible();
    expect(screen.getByText(/GEL.*2,500\.00/)).toBeVisible();
    expect(
      screen.queryByText(/limited|authentic|sustainable/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /image unavailable/i }),
    ).toBeVisible();
  });

  it("lists only provided verified facts", () => {
    render(
      <ProductFacts
        product={product}
        labels={{
          dimensions: "Dimensions",
          materials: "Materials",
          colors: "Colors",
          origin: "Origin",
        }}
      />,
    );

    expect(screen.getByText("160 × 240 cm")).toBeVisible();
    expect(screen.getByText("Wool")).toBeVisible();
    expect(screen.queryByText("Origin")).not.toBeInTheDocument();
  });

  it("supports keyboard gallery selection and missing media", async () => {
    const user = userEvent.setup();
    render(
      <ProductGallery
        name="Indigo Rug"
        images={[
          { id: "one", alt: "Full indigo rug", src: "/fixture-one.jpg" },
          { id: "two", alt: "Image unavailable", src: null },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Image unavailable" }));
    expect(
      screen.getByRole("img", { name: "Image unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Image unavailable" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("renders canonical filter state and available facet counts", () => {
    render(
      <CatalogControls
        locale="en"
        slug="rugs"
        parsed={parseCatalogSearchParams({
          q: "wool",
          sort: "price-desc",
          material: "silk",
          availability: "in-stock",
        })}
        facets={[
          { key: "material", value: "silk", count: 12 },
          { key: "color", value: "indigo", count: 8 },
        ]}
        labels={{
          search: "Search",
          sort: "Sort",
          relevance: "Relevance",
          newest: "Newest",
          priceAsc: "Price ascending",
          priceDesc: "Price descending",
          inStock: "In stock only",
          material: "Material",
          color: "Color",
          all: "All",
          apply: "Apply",
        }}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue(
      "wool",
    );
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveValue(
      "price-desc",
    );
    expect(screen.getByRole("combobox", { name: "Material" })).toHaveValue(
      "silk",
    );
    expect(
      screen.getByRole("checkbox", { name: "In stock only" }),
    ).toBeChecked();
    expect(screen.getByRole("option", { name: "silk (12)" })).toBeVisible();
  });

  it("keeps active filters in previous and next pagination links", () => {
    render(
      <CatalogPagination
        locale="en"
        pathname="/collections/rugs"
        parsed={parseCatalogSearchParams({
          q: "wool",
          page: "2",
          color: "indigo",
        })}
        totalCount={75}
        label="Catalog pages"
        labels={{ previous: "Previous", next: "Next" }}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Catalog pages" }),
    ).toHaveTextContent("2 / 4");
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/en/collections/rugs?q=wool&color=indigo",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/en/collections/rugs?q=wool&color=indigo&page=3",
    );
  });
});
