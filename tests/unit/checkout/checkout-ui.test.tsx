import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CartSummary } from "@/components/commerce/cart/cart-summary";
import { CheckoutSummary } from "@/components/commerce/checkout/checkout-summary";
import { Notice } from "@/components/ui";

const breakdown = {
  lines: [
    {
      cartItemId: "10000000-0000-4000-8000-000000000001",
      productId: "10000000-0000-4000-8000-000000000002",
      sku: "TEST-1",
      slug: "test-1",
      name: "Long verified carpet name",
      quantity: 2,
      unitAmountMinor: 10000,
      previousUnitAmountMinor: 9000,
      availableQuantity: 2,
      deliveryClass: "parcel",
    },
  ],
  changed: true,
  includedTaxMinor: 0,
  taxRateBasisPoints: 0,
  taxIncluded: false,
  discountCode: "TEST10",
  deliveryMethodCode: "standard-test",
  deliveryMethodName: { ka: "ტესტი", en: "Test", de: "Test", ru: "Тест" },
  estimateMinDays: 1,
  estimateMaxDays: 3,
  customsResponsibility: "buyer-unless-confirmed-otherwise",
};

describe("checkout UI", () => {
  it("renders exact reconciled line and totals without floating-point labels", () => {
    render(
      <CheckoutSummary
        quote={{
          currency: "GEL",
          subtotal_minor: 20000,
          discount_minor: 2000,
          tax_minor: 0,
          delivery_minor: 2500,
          total_minor: 20500,
        }}
        breakdown={breakdown}
        locale="en"
        labels={{
          subtotal: "Subtotal",
          discount: "Discount",
          tax: "Tax",
          delivery: "Delivery",
          total: "Total",
        }}
      />,
    );
    expect(
      screen.getByText("Long verified carpet name × 2"),
    ).toBeInTheDocument();
    expect(screen.getByText("GEL 205.00")).toBeInTheDocument();
    expect(screen.getByText("−GEL 20.00")).toBeInTheDocument();
  });

  it("keeps cart estimates visibly separate from the authoritative checkout", () => {
    render(
      <CartSummary
        locale="en"
        cart={{
          id: "10000000-0000-4000-8000-000000000003",
          currency: "GEL",
          discountCode: null,
          version: 1,
          expiresAt: "2026-09-01T00:00:00+00:00",
          items: [
            {
              id: "10000000-0000-4000-8000-000000000004",
              productId: "10000000-0000-4000-8000-000000000002",
              quantity: 2,
              sku: "TEST-1",
              slug: "test-1",
              name: "Test",
              locale: "en",
              unitAmountMinor: 10000,
              observedUnitAmountMinor: 10000,
              availableQuantity: 2,
              productStatus: "published",
              productVersion: 1,
            },
          ],
        }}
        labels={{
          subtotal: "Subtotal",
          exactAtCheckout: "Exact total at checkout",
        }}
      />,
    );
    expect(screen.getByText("GEL 200.00")).toBeInTheDocument();
    expect(screen.getByText("Exact total at checkout")).toBeInTheDocument();
  });

  it("announces changed totals and disabled payment states", () => {
    const { rerender } = render(
      <Notice tone="warning">Review changed total</Notice>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Review changed total",
    );
    rerender(<Notice tone="error">Payment disabled</Notice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Payment disabled");
  });
});
