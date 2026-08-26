import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/orders/admin-actions", () => ({
  reviewTransferFormAction: vi.fn(),
  createShipmentFormAction: vi.fn(),
  recordDeliveryFormAction: vi.fn(),
  issueRefundFormAction: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    "aria-label": ariaLabel,
  }: {
    href: string | object;
    children: ReactNode;
    "aria-label"?: string;
  }) => (
    <a href={typeof href === "string" ? href : "#"} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

import { FulfillmentPanel } from "@/components/admin/orders/fulfillment-panel";
import { OrderTimeline } from "@/components/admin/orders/order-timeline";
import { PaymentPanel } from "@/components/admin/orders/payment-panel";
import { TransferReview } from "@/components/admin/orders/transfer-review";
import { OperationsDashboard } from "@/components/admin/operations/dashboard";

const orderId = "80000000-0000-4000-8000-000000000001";

describe("order operations controls", () => {
  it("explains independent transfer confirmation and preserves matched values", () => {
    render(
      <TransferReview
        locale="en"
        orderId={orderId}
        amountMinor={102500}
        currency="GEL"
        pendingReconciliation={{
          id: "80000000-0000-4000-8000-000000000002",
          external_reference: "TRANSFER-001",
          amount_minor: 102500,
          currency: "GEL",
        }}
      />,
    );
    expect(screen.getByText(/different Manager/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Transfer reference")).toHaveValue(
      "TRANSFER-001",
    );
    expect(
      screen.getByRole("button", { name: "Independently confirm" }),
    ).toBeInTheDocument();
  });

  it("shows provider facts and never offers a force-paid override", () => {
    render(
      <PaymentPanel
        locale="en"
        orderId={orderId}
        paymentStatus="uncertain"
        paymentMethod="hosted_payment"
        provider="tbc"
        providerReference="pay-001"
        refundableMinor={0}
      />,
    );
    expect(screen.getByText("pay-001")).toBeInTheDocument();
    expect(
      screen.getByText(/no unsafe “force paid” override/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /refund/i }),
    ).not.toBeInTheDocument();
  });

  it("bounds refund input to the remaining captured amount", () => {
    render(
      <PaymentPanel
        locale="en"
        orderId={orderId}
        paymentStatus="paid"
        paymentMethod="bank_transfer"
        provider="bank-transfer"
        refundableMinor={100000}
      />,
    );
    expect(screen.getByLabelText(/Refund amount/)).toHaveAttribute(
      "max",
      "100000",
    );
    expect(screen.getByLabelText(/External refund reference/)).toBeRequired();
  });

  it("blocks shipment controls until payment and preparation are valid", () => {
    render(
      <FulfillmentPanel
        locale="en"
        orderId={orderId}
        orderVersion={1}
        orderStatus="payment_pending"
        paymentStatus="pending"
      />,
    );
    expect(
      screen.getByText(/only after authoritative payment/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /dispatch/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes carrier and tracking fields for a shippable order", () => {
    render(
      <FulfillmentPanel
        locale="en"
        orderId={orderId}
        orderVersion={3}
        orderStatus="processing"
        paymentStatus="paid"
      />,
    );
    expect(screen.getByLabelText("Carrier")).toBeRequired();
    expect(screen.getByLabelText("Tracking reference")).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Dispatch shipment" }),
    ).toBeInTheDocument();
  });

  it("renders an immutable chronological timeline", () => {
    render(
      <OrderTimeline
        events={[
          {
            id: 1,
            event_type: "accepted",
            from_status: null,
            to_status: "payment_pending",
            actor_class: "guest",
            occurred_at: "2026-08-25T10:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("accepted")).toBeInTheDocument();
    expect(screen.getByText("start → payment_pending")).toBeInTheDocument();
  });

  it("makes exception counts actionable and displays queue age", () => {
    render(
      <OperationsDashboard
        locale="en"
        summary={{
          pendingPayments: 3,
          transferReviews: 2,
          fulfillment: 4,
          failedNotifications: 1,
          providerFailures: 1,
          alerts: 2,
          lowStock: 0,
          missingTranslations: 0,
          failedIngestion: 0,
          openReturns: 2,
          oldestOpenMinutes: 47,
        }}
      />,
    );
    expect(screen.getByText("Oldest open · 47 min")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Payment attention: 3/i }),
    ).toBeInTheDocument();
  });
});
