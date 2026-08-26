import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import enMessages from "@/messages/en.json";

vi.mock("@/features/content/admin-actions", () => ({
  saveContentEntryAction: vi.fn(),
  transitionContentEntryAction: vi.fn(),
  createContentPreviewAction: vi.fn(),
  publishContentMenuAction: vi.fn(),
  configureContentRedirectAction: vi.fn(),
  configureContactChannelAction: vi.fn(),
}));
vi.mock("@/features/contact/actions", () => ({
  submitContactMessageAction: vi.fn(),
}));
vi.mock("@/features/newsletter/actions", () => ({
  subscribeNewsletterAction: vi.fn(),
  withdrawNewsletterAction: vi.fn(),
}));
vi.mock("@/features/consent/actions", () => ({
  saveConsentPreferencesAction: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ContentEditor } from "@/components/admin/content/content-editor";
import {
  MenuEditor,
  RedirectEditor,
} from "@/components/admin/content/menu-editor";
import { ConsentPreferences } from "@/components/content/consent-preferences";
import { ContactForm } from "@/components/content/contact-form";
import { ContentRenderer } from "@/components/content/content-renderer";
import { NewsletterForm } from "@/components/content/newsletter-form";

const labels = enMessages.content;
const { errors: adminErrors, ...adminLabels } = enMessages.admin.content;
void adminErrors;

describe("content administration and public controls", () => {
  it("renders portable content as React text without interpreting markup", () => {
    render(
      <ContentRenderer
        blocks={[
          { type: "heading", level: 2, text: "Materials" },
          { type: "paragraph", text: "<script>alert(1)</script>" },
          {
            type: "callout",
            tone: "warning",
            title: "Review",
            text: "Draft wording",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Materials" }),
    ).toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("provides four translation editors, review states, version reason, workflow, and preview", () => {
    render(
      <ContentEditor
        locale="en"
        entry={{
          id: crypto.randomUUID(),
          entry_key: "about-epoca",
          content_type: "about",
          status: "draft",
          fallback_policy: "strict",
          legal_status: "not_applicable",
          publish_at: null,
          unpublish_at: null,
          version: 3,
        }}
        translations={[]}
        labels={adminLabels}
      />,
    );
    expect(screen.getAllByRole("group")).toHaveLength(4);
    expect(screen.getAllByLabelText(adminLabels.reason)).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: adminLabels.createPreview }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText(adminLabels.review)).toHaveLength(4);
  });

  it("shows revisioned menu JSON and redirect lifecycle controls", () => {
    const { rerender } = render(
      <MenuEditor
        locale="en"
        menu={{ menu_key: "header", status: "draft", version: 1 }}
        initialItems={[]}
        labels={adminLabels}
      />,
    );
    expect(screen.getByLabelText(adminLabels.menuItems)).toHaveValue("[]");
    expect(screen.getByLabelText(adminLabels.reason)).toBeRequired();
    rerender(<RedirectEditor locale="en" labels={adminLabels} />);
    expect(screen.getByLabelText(adminLabels.source)).toBeRequired();
    expect(screen.getByLabelText(adminLabels.httpStatus)).toHaveValue("308");
  });

  it("makes contact disclosure and recoverable submission fields visible", () => {
    render(
      <ContactForm
        locale="en"
        disclosureVersion="contact-v1"
        disclosure="Stored for support."
        labels={labels}
      />,
    );
    expect(screen.getByLabelText(labels.email)).toHaveAttribute(
      "type",
      "email",
    );
    expect(screen.getByLabelText(labels.message)).toHaveAttribute(
      "maxlength",
      "5000",
    );
    expect(screen.getByText("Stored for support.")).toBeInTheDocument();
  });

  it("separates newsletter opt-in from withdrawal and states abandoned messaging is disabled", () => {
    render(
      <NewsletterForm
        locale="en"
        disclosureVersion="newsletter-v1"
        disclosure="Optional and withdrawable."
        labels={labels}
      />,
    );
    expect(
      screen.getByRole("button", { name: labels.subscribe }),
    ).toBeInTheDocument();
    expect(screen.getByText(labels.newsletterIntro)).toHaveTextContent(
      "No abandoned-cart messages",
    );
    expect(screen.getAllByText(labels.withdraw)).toHaveLength(2);
  });

  it("keeps essential services fixed while analytics and preferences have independent choices", () => {
    render(
      <ConsentPreferences
        locale="en"
        disclosures={{
          analytics: { version: "analytics-v1", copy: "Optional analytics" },
          preferences: {
            version: "preferences-v1",
            copy: "Optional preferences",
          },
        }}
        current={{ analytics: "refused", preferences: "granted" }}
        labels={labels}
      />,
    );
    screen.getByText(labels.manageChoices).click();
    expect(
      screen.getByRole("heading", { name: labels.essential }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText(labels.grant)).toHaveLength(2);
    expect(screen.getAllByLabelText(labels.refuse)).toHaveLength(2);
  });
});
