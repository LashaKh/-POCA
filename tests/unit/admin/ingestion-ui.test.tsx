import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/ingestion/review.actions", () => ({
  approveMediaAction: vi.fn(),
  requestSuggestionAction: vi.fn(),
}));

import { CropEditor } from "@/components/admin/ingestion/crop-editor";
import { ReadinessPanel } from "@/components/admin/ingestion/readiness-panel";

describe("ingestion review controls", () => {
  it("supports keyboard-operable focal controls with announced output", () => {
    render(
      <CropEditor
        previewUrl="/preview.webp"
        alt="Preview"
        labels={{
          focalX: "Horizontal focus",
          focalY: "Vertical focus",
          preview: "Crop preview",
        }}
      />,
    );
    const horizontal = screen.getByRole("slider", { name: "Horizontal focus" });
    fireEvent.change(horizontal, { target: { value: "0.75" } });
    expect(horizontal).toHaveValue("0.75");
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("groups readiness blockers and never renders a publish control itself", () => {
    render(
      <ReadinessPanel
        readiness={{
          ready: false,
          productId: "12345678-1234-4123-8123-123456789abc",
          productVersion: 1,
          blockers: [{ group: "media", code: "MEDIA_REVIEW_REQUIRED" }],
          warnings: [],
        }}
        labels={{
          title: "Readiness",
          ready: "Ready",
          blocked: "Blocked",
          confirm: "Confirm",
          publish: "Publish",
          MEDIA_REVIEW_REQUIRED: "Review media",
        }}
      />,
    );
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText(/Review media/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeInTheDocument();
  });
});
