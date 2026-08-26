import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/customer/actions", () => ({
  deleteCustomerAddressAction: vi.fn(async () => undefined),
  requestCustomerPrivacyAction: vi.fn(async () => undefined),
  revokeCustomerSessionAction: vi.fn(async () => undefined),
  saveCustomerAddressAction: vi.fn(async () => undefined),
  saveCustomerPreferencesAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/auth/actions", () => ({
  signOutAction: vi.fn(async () => undefined),
  signOutAllSessionsAction: vi.fn(async () => undefined),
  signOutOtherSessionsAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/auth/customer-actions", () => ({
  signUpCustomerAction: vi.fn(async () => undefined),
}));
vi.mock("@/features/wishlist/actions", () => ({
  toggleWishlistAction: vi.fn(async () => undefined),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
  }: {
    href: string | { pathname: string };
    children: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : href.pathname}>{children}</a>
  ),
}));

import { CustomerSignUpForm } from "@/components/auth/customer-sign-up-form";
import { AccountNavigation } from "@/components/customer/account-navigation";
import { AddressBook } from "@/components/customer/address-book";
import { CustomerSessionManager } from "@/components/customer/customer-session-manager";
import { OrderHistory } from "@/components/customer/order-history";
import { PreferencesForm } from "@/components/customer/preferences-form";
import { PrivacyControls } from "@/components/customer/privacy-controls";
import { WishlistButton } from "@/components/commerce/wishlist-button";

const addressLabels = Object.fromEntries(
  [
    "label",
    "fullName",
    "organization",
    "line1",
    "line2",
    "city",
    "region",
    "postalCode",
    "country",
    "phone",
    "instructions",
    "default",
    "save",
    "saved",
    "failed",
    "delete",
    "add",
  ].map((key) => [key, key]),
);

describe("customer account UI", () => {
  it("exposes all account destinations in one labeled navigation", () => {
    render(
      <AccountNavigation
        locale="en"
        labels={{
          overview: "Account",
          orders: "Orders",
          addresses: "Addresses",
          wishlist: "Wishlist",
          settings: "Settings",
        }}
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/account/orders",
    );
    expect(screen.getByRole("link", { name: "Wishlist" })).toBeInTheDocument();
  });

  it("renders verification-aware sign-up without making accounts mandatory", () => {
    render(
      <CustomerSignUpForm
        locale="en"
        returnTo="/account"
        labels={{
          name: "Name",
          email: "Email",
          password: "Password",
          confirmation: "Confirm password",
          terms: "Accept terms",
          marketing: "Marketing optional",
          submit: "Create account",
          generic: "Check email",
          failed: "Try again",
          signIn: "Sign in",
        }}
      />,
    );
    expect(screen.getByLabelText("Accept terms")).toBeRequired();
    expect(screen.getByLabelText("Marketing optional")).not.toBeRequired();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "minlength",
      "14",
    );
  });

  it("renders an editable address book while labeling its default", () => {
    render(
      <AddressBook
        locale="en"
        labels={addressLabels}
        addresses={[
          {
            id: "62000000-0000-4000-8000-000000000010",
            profile_id: "62000000-0000-4000-8000-000000000011",
            label: "Home",
            full_name: "Buyer",
            organization: null,
            line1: "1 Street",
            line2: null,
            city: "Tbilisi",
            region: null,
            postal_code: "0105",
            country_code: "GE",
            phone: null,
            instructions: null,
            is_default: true,
            created_at: "2026-08-25T00:00:00Z",
            updated_at: "2026-08-25T00:00:00Z",
            version: 1,
          },
        ]}
      />,
    );
    expect(screen.getByText(/Home · default/)).toBeInTheDocument();
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("renders order history with bounded customer detail links", () => {
    render(
      <OrderHistory
        locale="en"
        labels={{ empty: "No orders", status: "Status", items: "items" }}
        orders={[
          {
            reference: "EPO-AB12CD34EF56",
            status: "confirmed",
            total_minor: 12500,
            currency: "GEL",
            accepted_at: "2026-08-25T00:00:00Z",
            order_lines: [{ id: "line" }],
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("link", { name: "EPO-AB12CD34EF56" }),
    ).toHaveAttribute("href", "/account/orders/EPO-AB12CD34EF56");
    expect(screen.getByText(/confirmed/)).toBeInTheDocument();
  });

  it("renders preference, session, privacy, and wishlist controls", () => {
    const { rerender } = render(
      <PreferencesForm
        locale="en"
        profile={{ display_name: "Buyer", display_currency: "GEL" }}
        labels={{
          name: "Name",
          currency: "Currency",
          marketing: "Marketing",
          marketingGranted: "Allow",
          marketingDenied: "Deny",
          marketingWithdrawn: "Withdraw",
          save: "Save",
          saved: "Saved",
          failed: "Failed",
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    rerender(
      <CustomerSessionManager
        locale="en"
        sessions={[
          {
            auth_session_id: "one",
            device_label: "Safari on Mac",
            assurance_level: "aal1",
            last_seen_at: "2026-08-25T00:00:00Z",
            expires_at: "2099-01-01T00:00:00Z",
            revoked_at: null,
          },
        ]}
        labels={{
          title: "Sessions",
          browser: "Browser",
          revoke: "Revoke",
          empty: "Empty",
          other: "Other",
          all: "All",
          current: "Current",
        }}
      />,
    );
    expect(screen.getByText(/Safari on Mac/)).toBeInTheDocument();
    rerender(
      <PrivacyControls
        locale="en"
        labels={{
          requestType: "Request type",
          access: "Access",
          export: "Export",
          correction: "Correction",
          deletion: "Deletion",
          reason: "Reason",
          retention: "Orders remain retained",
          submit: "Submit",
          requested: "Requested",
          failed: "Failed",
        }}
      />,
    );
    expect(screen.getByText("Orders remain retained")).toBeInTheDocument();
    rerender(
      <WishlistButton
        productId="62000000-0000-4000-8000-000000000001"
        locale="en"
        initialSaved
        labels={{ save: "Save", remove: "Remove", failed: "Failed" }}
      />,
    );
    expect(screen.getByRole("button", { name: /Remove/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
