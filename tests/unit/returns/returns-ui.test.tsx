import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReturnOperations } from "@/components/admin/returns/return-operations";
import { ReturnPolicyEditor } from "@/components/admin/returns/return-policy-editor";
import { ReturnRequestForm } from "@/components/returns/request-form";
import { ReturnStatus } from "@/components/returns/return-status";
import { buyerReturnLabelKeys } from "@/features/returns/copy";
import enMessages from "@/messages/en.json";

vi.mock("@/features/returns/actions", () => ({
  submitReturnRequestAction: vi.fn(),
  applyReturnRestockAction: vi.fn(),
  decideReturnRequestAction: vi.fn(),
  inspectReturnAction: vi.fn(),
  markReturnInTransitAction: vi.fn(),
  processReturnRefundAction: vi.fn(),
  recordReturnReceiptAction: vi.fn(),
  requestReturnInformationAction: vi.fn(),
}));

vi.mock("@/features/returns/evidence", () => ({
  uploadReturnEvidenceAction: vi.fn(),
  removeReturnEvidenceAction: vi.fn(),
}));

vi.mock("@/features/returns/policy-actions", () => ({
  configureReturnPolicyAction: vi.fn(),
}));

const labels = Object.fromEntries(
  buyerReturnLabelKeys.map((key) => [key, key.replaceAll("_", " ")]),
);
const adminLabels = enMessages.admin.returns;

describe("returns UI", () => {
  it("shows policy status, bounded buyer inputs, and a useful ineligible state", () => {
    const props = {
      locale: "en" as const,
      orderReference: "EPO-ABCDEFGHIJKL",
      requestKind: "return" as const,
      idempotencyToken: crypto.randomUUID(),
      lines: [{ id: crypto.randomUUID(), name: "Indigo rug", quantity: 1 }],
      labels,
    };
    const { rerender } = render(
      <ReturnRequestForm
        {...props}
        eligibility={{
          eligible: true,
          reasonCode: "eligible",
          deadline: "2026-09-01T00:00:00.000Z",
          legalStatus: "draft_unapproved",
          allowedReasons: ["damaged", "other"],
          allowedEvidenceTypes: ["image/jpeg"],
          buyerCopy: {},
        }}
      />,
    );
    expect(screen.getByText("legalDraft")).toBeInTheDocument();
    expect(screen.getByLabelText("item")).toBeRequired();
    expect(screen.getByLabelText("quantity")).toHaveAttribute("max", "20");
    expect(screen.getByLabelText("note")).toHaveAttribute("maxlength", "2000");

    rerender(
      <ReturnRequestForm
        {...props}
        eligibility={{
          eligible: false,
          reasonCode: "return_window_expired",
          allowedReasons: [],
          allowedEvidenceTypes: [],
          buyerCopy: {},
        }}
      />,
    );
    expect(screen.getByText("ineligible")).toBeInTheDocument();
    expect(
      screen.getByText("reason return window expired"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "submit" }),
    ).not.toBeInTheDocument();
  });

  it("shows a private buyer timeline, evidence link, and upload controls only while editable", () => {
    render(
      <ReturnStatus
        locale="en"
        orderReference="EPO-ABCDEFGHIJKL"
        labels={labels}
        request={{
          id: crypto.randomUUID(),
          reference: "RET-ABCDEFGHIJKL",
          request_kind: "return",
          status: "requested",
          reason_code: "damaged",
          buyer_note: "Damaged corner",
          policy_version: "returns-v1-draft",
          policy_snapshot: {},
          created_at: "2026-08-26T00:00:00.000Z",
          return_events: [
            {
              id: 1,
              event_type: "request-submitted",
              occurred_at: "2026-08-26T00:00:00.000Z",
            },
          ],
          return_messages: [],
          return_evidence: [
            {
              id: crypto.randomUUID(),
              original_filename: "damage.jpg",
              status: "attached",
              signedUrl: "https://storage.example/private-token",
            },
          ],
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "damage.jpg" })).toHaveAttribute(
      "href",
      "https://storage.example/private-token",
    );
    expect(screen.getByLabelText("file")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(screen.getByRole("button", { name: "remove" })).toBeInTheDocument();
  });

  it("renders complete staff receipt, inspection, refund, and restock states", () => {
    const request = {
      id: crypto.randomUUID(),
      version: 4,
      status: "received",
      request_kind: "return",
      orders: { currency: "GEL", total_minor: 102_500 },
      return_items: [
        {
          id: crypto.randomUUID(),
          quantity: 1,
          refund_amount_minor: null,
          order_lines: {
            localized_name: "Indigo rug",
            total_minor: 100_000,
          },
        },
      ],
    };
    const { rerender } = render(
      <ReturnOperations
        locale="en"
        request={request}
        labels={adminLabels.operations}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Record inspection" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Condition")).toBeInTheDocument();
    expect(screen.getByLabelText(/Refund in minor units/)).toHaveAttribute(
      "max",
      "100000",
    );

    rerender(
      <ReturnOperations
        locale="en"
        labels={adminLabels.operations}
        request={{
          ...request,
          status: "inspected",
          return_items: [
            { ...request.return_items[0], refund_amount_minor: 50_000 },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Issue refund" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Apply restock" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/50000 GEL minor units/)).toBeInTheDocument();
  });

  it("keeps operational policy changes separate from legal approval", () => {
    render(
      <ReturnPolicyEditor
        locale="en"
        labels={adminLabels.policyEditor}
        policy={{
          version: "returns-v1-draft",
          cancellation_window_hours: 24,
          return_window_days: 14,
          allowed_reasons: ["damaged", "other"],
          max_evidence_files: 5,
          max_evidence_bytes: 8_388_608,
          restock_mode: "after_inspection",
          legal_status: "draft_unapproved",
        }}
      />,
    );
    expect(screen.getByText(/draft_unapproved/)).toBeInTheDocument();
    expect(screen.getByLabelText("Cancellation window (hours)")).toHaveValue(
      24,
    );
    expect(screen.getByLabelText("Damaged")).toBeChecked();
  });
});
