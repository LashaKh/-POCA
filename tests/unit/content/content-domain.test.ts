import { describe, expect, it } from "vitest";

import { analyticsConsentFromCookie } from "@/lib/providers/analytics/consent-boundary";
import {
  normalizePublishedContent,
  redirectGraphHasLoop,
  scheduleIsValid,
} from "@/features/content/domain";
import {
  contentBlockSchema,
  contentEntrySchema,
  parseBlocksJson,
} from "@/features/content/schema";
import {
  abandonedCartMessagingEnabled,
  newsletterSubscriptionSchema,
} from "@/features/newsletter/schema";
import { contactSubmissionSchema } from "@/features/contact/schema";

const translations = (["ka", "en", "de", "ru"] as const).map((locale) => ({
  locale,
  slug: `about-${locale}`,
  title: `About ${locale}`,
  blocks: [{ type: "paragraph" as const, text: "Reviewed copy" }],
  reviewStatus: "approved" as const,
}));

describe("content, contact, and consent domain", () => {
  it("accepts constrained portable blocks and rejects executable block types", () => {
    expect(
      contentBlockSchema.safeParse({ type: "paragraph", text: "Safe text" })
        .success,
    ).toBe(true);
    expect(
      contentBlockSchema.safeParse({
        type: "html",
        html: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);
    expect(
      parseBlocksJson('[{"type":"heading","level":2,"text":"Story"}]'),
    ).toHaveLength(1);
    expect(parseBlocksJson("not json")).toBeUndefined();
  });

  it("requires all four translation workspaces and exact version/reason evidence", () => {
    expect(
      contentEntrySchema.safeParse({
        locale: "en",
        entryKey: "about-epoca",
        contentType: "about",
        fallbackPolicy: "strict",
        legalStatus: "not_applicable",
        expectedVersion: 0,
        reason: "Create reviewed page",
        translations,
      }).success,
    ).toBe(true);
    expect(
      contentEntrySchema.safeParse({
        locale: "en",
        entryKey: "about-epoca",
        contentType: "about",
        fallbackPolicy: "strict",
        legalStatus: "not_applicable",
        expectedVersion: 0,
        reason: "x",
        translations: translations.slice(0, 3),
      }).success,
    ).toBe(false);
  });

  it("detects direct and multi-hop redirect cycles", () => {
    expect(
      redirectGraphHasLoop([
        { sourcePath: "/a", destinationPath: "/b" },
        { sourcePath: "/b", destinationPath: "/c" },
      ]),
    ).toBe(false);
    expect(
      redirectGraphHasLoop([
        { sourcePath: "/a", destinationPath: "/b" },
        { sourcePath: "/b", destinationPath: "/a" },
      ]),
    ).toBe(true);
  });

  it("validates publication windows as absolute instants", () => {
    expect(
      scheduleIsValid("2027-01-01T10:00:00+04:00", "2027-01-01T11:00:00+04:00"),
    ).toBe(true);
    expect(
      scheduleIsValid("2027-01-01T11:00:00+04:00", "2027-01-01T10:00:00+04:00"),
    ).toBe(false);
    expect(scheduleIsValid("invalid")).toBe(false);
  });

  it("normalizes fallback evidence without hiding the resolved locale", () => {
    const content = normalizePublishedContent({
      entryKey: "about",
      contentType: "about",
      legalStatus: "approved",
      requestedLocale: "ru",
      resolvedLocale: "en",
      fallbackDisclosed: true,
      fallbackPolicy: "disclose",
      publishedAt: "2026-01-01T00:00:00Z",
      translation: {
        slug: "about",
        title: "About",
        summary: null,
        blocks: [{ type: "paragraph", text: "Safe" }],
        meta_title: null,
        meta_description: null,
        social_image_url: null,
      },
    });
    expect(content).toMatchObject({
      requestedLocale: "ru",
      resolvedLocale: "en",
      fallbackDisclosed: true,
    });
  });

  it("bounds contact/newsletter input and keeps abandoned-cart messaging hard disabled", () => {
    expect(
      contactSubmissionSchema.safeParse({
        locale: "en",
        email: "buyer@example.com",
        fullName: "Buyer",
        subject: "Question",
        message: "Hello",
        disclosureVersion: "contact-v1",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true);
    expect(
      contactSubmissionSchema.safeParse({
        locale: "en",
        email: "not-email",
        fullName: "Buyer",
        subject: "Q",
        message: "x",
        disclosureVersion: "contact-v1",
        idempotencyKey: "short",
      }).success,
    ).toBe(false);
    expect(
      newsletterSubscriptionSchema.safeParse({
        locale: "de",
        email: "buyer@example.com",
        disclosureVersion: "newsletter-v1",
      }).success,
    ).toBe(true);
    expect(abandonedCartMessagingEnabled).toBe(false);
  });

  it("reads current optional analytics choice on every event boundary", () => {
    expect(
      analyticsConsentFromCookie(
        `epoca_optional_consent=${encodeURIComponent(JSON.stringify({ analytics: "granted" }))}`,
      ),
    ).toBe("granted");
    expect(
      analyticsConsentFromCookie(
        `epoca_optional_consent=${encodeURIComponent(JSON.stringify({ analytics: "withdrawn" }))}`,
      ),
    ).toBe("withdrawn");
    expect(analyticsConsentFromCookie("other=value")).toBe("refused");
  });
});
