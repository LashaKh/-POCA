import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import enMessages from "@/messages/en.json";

vi.mock("@/features/pricing/admin-actions", () => ({
  configureCurrencyAction: vi.fn(),
  saveMarketPriceAction: vi.fn(),
}));
vi.mock("@/features/promotions/admin-actions", () => ({
  savePromotionAction: vi.fn(),
}));
vi.mock("@/features/delivery/admin-actions", () => ({
  saveShippingZoneAction: vi.fn(),
  saveShippingMethodAction: vi.fn(),
  saveShippingRateAction: vi.fn(),
  saveMarketSettingAction: vi.fn(),
}));
vi.mock("@/features/quotes/actions", () => ({
  submitManualQuoteAction: vi.fn(),
  requestManualQuoteInformationAction: vi.fn(),
  resolveManualQuoteAction: vi.fn(),
  respondManualQuoteAction: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CurrencySettings } from "@/components/admin/commerce/currency-settings";
import { DeliveryEditor } from "@/components/admin/commerce/delivery-editor";
import { MarketEditor } from "@/components/admin/commerce/market-editor";
import { PromotionEditor } from "@/components/admin/commerce/promotion-editor";
import { ManualQuoteForm } from "@/components/quotes/manual-quote-form";

const labels = enMessages.admin.worldwide.labels;
const quoteLabels = enMessages.quotes.labels;

describe("worldwide selling administration", () => {
  it("shows independent currency enablement, checkout, default, source, and reason controls", () => {
    render(
      <CurrencySettings
        locale="en"
        labels={labels}
        settings={[
          {
            currency: "EUR",
            enabled: true,
            checkout_enabled: true,
            is_default: false,
            display_order: 30,
            price_source_mode: "explicit_only",
            approved_rate_reference: null,
            configuration_status: "published",
            version: 1,
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "EUR" })).toBeInTheDocument();
    expect(screen.getByLabelText(labels.checkoutEnabled)).toBeChecked();
    expect(screen.getByLabelText(labels.defaultCurrency)).not.toBeChecked();
    expect(screen.getByLabelText(labels.reason)).toBeRequired();
  });

  it("bounds promotion value, usage, window, combination, locale copy, and revision reason", () => {
    render(<PromotionEditor locale="en" labels={labels} />);
    expect(screen.getByLabelText(labels.basisPoints)).toHaveAttribute(
      "max",
      "10000",
    );
    expect(screen.getByLabelText(labels.subjectLimit)).toHaveAttribute(
      "max",
      "100",
    );
    expect(screen.getByLabelText(`${labels.publicName} · KA`)).toBeRequired();
    expect(screen.getByLabelText(labels.reason)).toBeRequired();
  });

  it("offers zone, method, and rate controls with explicit legal and manual-quote states", () => {
    render(
      <DeliveryEditor
        locale="en"
        labels={labels}
        data={{ zones: [], countries: [], methods: [], rates: [] }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: labels.newZone }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: labels.newMethod }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: labels.newRate }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(labels.manualQuote)).toBeInTheDocument();
    expect(screen.getAllByLabelText(labels.reason).length).toBe(3);
  });

  it("keeps market tax/customs wording in four locales with visible legal status", () => {
    render(<MarketEditor locale="en" markets={[]} labels={labels} />);
    expect(screen.getByLabelText(`${labels.customs} · KA`)).toBeRequired();
    expect(screen.getByLabelText(`${labels.customs} · RU`)).toBeRequired();
    expect(screen.getByLabelText(labels.legalStatus)).toHaveValue(
      "draft_unapproved",
    );
  });

  it("gives unsupported buyers a bounded international address and no-promise disclosure", () => {
    render(
      <ManualQuoteForm locale="en" initialCountry="AQ" labels={quoteLabels} />,
    );
    expect(screen.getByLabelText(quoteLabels.country)).toHaveValue("AQ");
    expect(screen.getByLabelText(quoteLabels.country)).toHaveAttribute(
      "maxlength",
      "2",
    );
    expect(screen.getByText(quoteLabels.noPromise)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: quoteLabels.submit }),
    ).toBeInTheDocument();
  });
});
