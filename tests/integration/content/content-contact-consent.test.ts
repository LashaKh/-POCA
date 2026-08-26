import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import {
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

const local = (() => {
  try {
    return localEnvironment();
  } catch {
    return undefined;
  }
})();

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

describe.skipIf(!local)("local content, contact, and consent", () => {
  it("publishes safely, rejects redirect loops, deduplicates contact, and honors withdrawal", async () => {
    const service = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const managerIdentity = await createManager(service, `Content-${marker}`);
    const manager = createClient<Database>(
      local!.API_URL,
      local!.PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (
        await manager.auth.signInWithPassword({
          email: managerIdentity.email,
          password: managerIdentity.password,
        })
      ).error,
    ).toBeNull();

    const entryKey = `story-${marker}`;
    const translations = (["ka", "en", "de", "ru"] as const).map((locale) => ({
      locale,
      slug: `${entryKey}-${locale}`,
      title: `Story ${locale}`,
      summary: `Summary ${locale}`,
      blocks: [{ type: "paragraph", text: `Reviewed ${locale}` }],
      metaTitle: `Story ${locale}`,
      metaDescription: `Reviewed integration story ${locale}`,
      socialImageUrl: "",
      reviewStatus: "approved",
    }));
    const saved = await manager.rpc("save_content_entry", {
      p_content_entry_id: undefined,
      p_entry_key: entryKey,
      p_content_type: "journal",
      p_fallback_policy: "strict",
      p_legal_status: "not_applicable",
      p_translations: translations,
      p_expected_version: 0,
      p_reason: "Integration content creation",
    });
    expect(saved.error).toBeNull();
    const token = `${marker}:preview-token`;
    const preview = await manager.rpc("create_content_preview_token", {
      p_content_entry_id: saved.data!.id,
      p_token_hash: sha256(token),
      p_ttl_minutes: 30,
    });
    expect(preview.error).toBeNull();
    expect(
      (
        await service.rpc("read_content_preview", {
          p_token_hash: sha256(token),
          p_locale: "de",
        })
      ).data,
    ).toMatchObject({
      requestedLocale: "de",
      resolvedLocale: "de",
      fallbackDisclosed: false,
    });

    const scheduled = await manager.rpc("transition_content_entry", {
      p_content_entry_id: saved.data!.id,
      p_target_status: "scheduled",
      p_publish_at: new Date(Date.now() + 60_000).toISOString(),
      p_unpublish_at: new Date(Date.now() + 3_600_000).toISOString(),
      p_expected_version: saved.data!.version,
      p_reason: "Schedule integration story",
    });
    expect(scheduled.error).toBeNull();
    expect(
      (
        await service
          .from("content_entries")
          .update({ publish_at: new Date(Date.now() - 60_000).toISOString() })
          .eq("id", saved.data!.id)
      ).error,
    ).toBeNull();
    const maintenance = await service.rpc(
      "run_content_contact_consent_maintenance",
      { p_delete_limit: 100 },
    );
    expect(maintenance.error).toBeNull();
    expect(maintenance.data).toMatchObject({ published: 1 });
    expect(
      (
        await service.rpc("read_published_content", {
          p_entry_key: entryKey,
          p_locale: "ru",
        })
      ).data,
    ).toMatchObject({ resolvedLocale: "ru", fallbackDisclosed: false });

    const redirectSource = `/old-${marker}`;
    const redirectDestination = `/new-${marker}`;
    const firstRedirect = await manager.rpc("configure_content_redirect", {
      p_redirect_id: undefined,
      p_source_path: redirectSource,
      p_destination_path: redirectDestination,
      p_http_status: 308,
      p_status: "published",
      p_active_from: new Date(Date.now() - 60_000).toISOString(),
      p_active_until: "infinity",
      p_expected_version: 0,
      p_reason: "Integration redirect",
    });
    expect(firstRedirect.error).toBeNull();
    const loop = await manager.rpc("configure_content_redirect", {
      p_redirect_id: undefined,
      p_source_path: redirectDestination,
      p_destination_path: redirectSource,
      p_http_status: 308,
      p_status: "published",
      p_active_from: new Date(Date.now() - 60_000).toISOString(),
      p_active_until: "infinity",
      p_expected_version: 0,
      p_reason: "Integration loop attempt",
    });
    expect(loop.error?.message).toContain("CONTENT_REDIRECT_LOOP");

    const guestHash = sha256(`${marker}:guest`);
    const contact = await service.rpc("submit_contact_message", {
      p_guest_subject_hash: guestHash,
      p_guest_proof_hash: sha256(`${marker}:proof`),
      p_locale: "en",
      p_contact_email: `content-${marker}@epoca.test`,
      p_full_name: "Content Buyer",
      p_subject: "Integration support",
      p_message: "Please confirm the reviewed content route.",
      p_message_fingerprint: sha256(`${marker}:message`),
      p_order_reference: "",
      p_disclosure_version: "contact-v1",
      p_idempotency_key_hash: sha256(`${marker}:contact`),
    });
    expect(contact.error).toBeNull();
    const replay = await service.rpc("submit_contact_message", {
      p_guest_subject_hash: guestHash,
      p_guest_proof_hash: sha256(`${marker}:proof`),
      p_locale: "en",
      p_contact_email: `content-${marker}@epoca.test`,
      p_full_name: "Content Buyer",
      p_subject: "Integration support",
      p_message: "Please confirm the reviewed content route.",
      p_message_fingerprint: sha256(`${marker}:message`),
      p_order_reference: "",
      p_disclosure_version: "contact-v1",
      p_idempotency_key_hash: sha256(`${marker}:contact`),
    });
    expect(replay.data!.id).toBe(contact.data!.id);
    expect(
      (
        await service.rpc("read_contact_message_status", {
          p_reference: contact.data!.reference,
          p_guest_proof_hash: sha256("wrong"),
        })
      ).data,
    ).toBeNull();
    expect(
      (
        await service.rpc("mark_contact_notification_failed", {
          p_contact_submission_id: contact.data!.id,
          p_safe_error_code: "TEST_DELIVERY_FAILED",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service
          .from("operational_alerts")
          .select("id")
          .eq("fingerprint", `contact-notification:${contact.data!.id}`)
      ).data,
    ).toHaveLength(1);

    for (let index = 2; index <= 5; index += 1) {
      const additional = await service.rpc("submit_contact_message", {
        p_guest_subject_hash: guestHash,
        p_guest_proof_hash: sha256(`${marker}:proof`),
        p_locale: "en",
        p_contact_email: `content-${marker}@epoca.test`,
        p_full_name: "Content Buyer",
        p_subject: `Integration support ${index}`,
        p_message: `Distinct bounded message ${index}`,
        p_message_fingerprint: sha256(`${marker}:message:${index}`),
        p_order_reference: "",
        p_disclosure_version: "contact-v1",
        p_idempotency_key_hash: sha256(`${marker}:contact:${index}`),
      });
      expect(additional.error).toBeNull();
    }
    const rateLimited = await service.rpc("submit_contact_message", {
      p_guest_subject_hash: guestHash,
      p_guest_proof_hash: sha256(`${marker}:proof`),
      p_locale: "en",
      p_contact_email: `content-${marker}@epoca.test`,
      p_full_name: "Content Buyer",
      p_subject: "Integration support 6",
      p_message: "This sixth message should be rate limited.",
      p_message_fingerprint: sha256(`${marker}:message:6`),
      p_order_reference: "",
      p_disclosure_version: "contact-v1",
      p_idempotency_key_hash: sha256(`${marker}:contact:6`),
    });
    expect(rateLimited.error?.message).toContain("CONTACT_RATE_LIMITED");
    expect(
      (
        await service
          .from("contact_submissions")
          .update({
            status: "closed",
            retention_due_at: new Date(Date.now() - 60_000).toISOString(),
          })
          .eq("guest_subject_hash", guestHash)
      ).error,
    ).toBeNull();
    const cleaned = await service.rpc(
      "run_content_contact_consent_maintenance",
      { p_delete_limit: 100 },
    );
    expect(cleaned.data).toMatchObject({ contactRecordsDeleted: 5 });

    const consent = await service.rpc("record_visitor_consent", {
      p_guest_subject_hash: guestHash,
      p_locale: "en",
      p_choices: { analytics: "granted", preferences: "refused" },
      p_disclosure_versions: {
        analytics: "analytics-v1",
        preferences: "preferences-v1",
      },
      p_preference_metadata: {},
      p_source: "integration-test",
    });
    expect(consent.error).toBeNull();
    const withdrawn = await service.rpc("record_visitor_consent", {
      p_guest_subject_hash: guestHash,
      p_locale: "en",
      p_choices: { analytics: "withdrawn" },
      p_disclosure_versions: { analytics: "analytics-v1" },
      p_preference_metadata: {},
      p_source: "integration-withdrawal",
    });
    expect(withdrawn.data).toMatchObject({
      analytics: { choice: "withdrawn" },
    });

    const newsletterProof = sha256(`${marker}:newsletter-proof`);
    const subscription = await service.rpc("subscribe_newsletter", {
      p_email: `news-${marker}@epoca.test`,
      p_guest_subject_hash: guestHash,
      p_manage_proof_hash: newsletterProof,
      p_locale: "de",
      p_disclosure_version: "newsletter-v1",
    });
    expect(subscription.error).toBeNull();
    expect(
      (
        await service.rpc("withdraw_newsletter", {
          p_email: subscription.data!.email,
          p_manage_proof_hash: newsletterProof,
          p_locale: "de",
        })
      ).data,
    ).toBe(true);
    expect(
      (
        await service
          .from("newsletter_subscriptions")
          .select("status")
          .eq("id", subscription.data!.id)
          .single()
      ).data?.status,
    ).toBe("withdrawn");
    expect(
      (
        await service
          .from("notifications")
          .select("template_key")
          .eq("template_key", "newsletter-withdrawn")
          .contains("payload", {
            subscriptionReference: subscription.data!.reference,
          })
      ).data,
    ).toHaveLength(1);
  });
});
