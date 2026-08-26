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

describe.skipIf(!local)("local worldwide selling", () => {
  it("keeps supported, disabled, manual, promotion, and scheduled outcomes truthful", async () => {
    const service = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const productId = crypto.randomUUID();
    const managerIdentity = await createManager(service, `World-${marker}`);
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

    expect(
      (
        await service.from("products").insert({
          id: productId,
          sku: `WORLD-${marker.toUpperCase()}`,
          status: "published",
          readiness_passed: true,
          published_at: new Date().toISOString(),
          width_mm: 1900,
          length_mm: 2800,
          shape: "rectangle",
          materials: ["wool"],
          construction: "hand-knotted",
          colors: ["indigo"],
          styles: ["traditional"],
          condition: "excellent",
          care_code: "professional-clean",
          delivery_class: "parcel",
          search_visible: true,
        })
      ).error,
    ).toBeNull();
    const productParts = await Promise.all([
      service.from("product_translations").insert({
        product_id: productId,
        locale: "en",
        slug: `world-${marker}`,
        name: `World ${marker}`,
        short_description: "Worldwide integration fixture.",
        long_description: "Synthetic fixture for international commerce.",
        search_text: `world ${marker}`,
        alt_text_ready: true,
        status: "published",
      }),
      service.from("product_prices").insert([
        {
          product_id: productId,
          currency: "GEL",
          amount_minor: 100_000,
          enabled: true,
        },
        {
          product_id: productId,
          currency: "EUR",
          amount_minor: 35_000,
          enabled: true,
        },
        {
          product_id: productId,
          currency: "USD",
          amount_minor: 40_000,
          enabled: true,
        },
      ]),
      service.from("inventory_items").insert({
        product_id: productId,
        stock_model: "stocked",
        on_hand_quantity: 20,
      }),
    ]);
    for (const result of productParts) expect(result.error).toBeNull();

    async function cart(currency: "GEL" | "EUR" | "USD", suffix: string) {
      const secretHash = sha256(`${marker}:${suffix}`);
      expect(
        (
          await service.rpc("create_guest_context", {
            p_secret_hash: secretHash,
            p_locale: "en",
            p_currency: currency,
          })
        ).error,
      ).toBeNull();
      expect(
        (
          await service.rpc("add_guest_cart_item", {
            p_secret_hash: secretHash,
            p_product_id: productId,
            p_quantity: 1,
          })
        ).error,
      ).toBeNull();
      return secretHash;
    }

    const gelSecret = await cart("GEL", "gel");
    const geQuote = await service.rpc("quote_guest_cart", {
      p_secret_hash: gelSecret,
      p_country_code: "GE",
      p_method_code: "standard-test",
    });
    expect(geQuote.error).toBeNull();
    expect(geQuote.data!.delivery_minor).toBe(2_500);
    expect(geQuote.data!.breakdown).toMatchObject({
      taxDisplayMode: "pending_legal_review",
      marketLegalStatus: "draft_unapproved",
    });

    const eurSecret = await cart("EUR", "eur");
    const eurQuote = await service.rpc("quote_guest_cart", {
      p_secret_hash: eurSecret,
      p_country_code: "GE",
      p_method_code: "standard-test",
    });
    expect(eurQuote.error).toBeNull();
    expect(eurQuote.data!.currency).toBe("EUR");
    expect(eurQuote.data!.subtotal_minor).toBe(35_000);

    const manual = await service.rpc("quote_guest_cart", {
      p_secret_hash: gelSecret,
      p_country_code: "US",
      p_method_code: "manual-worldwide-test",
    });
    expect(manual.error).toBeNull();
    expect(manual.data!.manual_quote).toBe(true);
    expect(
      (
        await service.rpc("quote_guest_cart", {
          p_secret_hash: gelSecret,
          p_country_code: "AQ",
          p_method_code: undefined,
        })
      ).error?.message,
    ).toContain("DELIVERY_QUOTE_REQUIRED");

    const promotionCode = `W${marker.toUpperCase()}`;
    const promotion = await manager.rpc("configure_promotion", {
      p_discount_id: undefined,
      p_code: promotionCode,
      p_kind: "percentage",
      p_percentage_basis_points: 5000,
      p_fixed_amount_minor: undefined,
      p_currency: undefined,
      p_minimum_subtotal_minor: 0,
      p_maximum_discount_minor: 12_345,
      p_usage_limit: 100,
      p_per_subject_limit: 1,
      p_starts_at: new Date(Date.now() - 60_000).toISOString(),
      p_ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      p_combinability: "exclusive",
      p_stacking_group: undefined,
      p_priority: 100,
      p_public_name_i18n: {
        ka: "სატესტო აქცია",
        en: "Test promotion",
        de: "Testaktion",
        ru: "Тестовая акция",
      },
      p_description_i18n: { ka: "", en: "", de: "", ru: "" },
      p_configuration_status: "published",
      p_expected_version: 0,
      p_reason: "Integration promotion",
    });
    expect(promotion.error).toBeNull();
    expect(
      (
        await service.rpc("apply_guest_cart_discount", {
          p_secret_hash: gelSecret,
          p_code: promotionCode,
        })
      ).error,
    ).toBeNull();
    const capped = await service.rpc("quote_guest_cart", {
      p_secret_hash: gelSecret,
      p_country_code: "GE",
      p_method_code: "standard-test",
    });
    expect(capped.error).toBeNull();
    expect(capped.data!.discount_minor).toBe(12_345);

    const quoteProof = sha256(`${marker}:proof`);
    const manualRequest = await service.rpc("submit_manual_quote", {
      p_secret_hash: gelSecret,
      p_quote_proof_hash: quoteProof,
      p_country_code: "AQ",
      p_contact_email: `world-${marker}@epoca.test`,
      p_contact_phone: "",
      p_address: {
        fullName: "World Integration",
        line1: "1 Research Station",
        city: "McMurdo",
        countryCode: "AQ",
      },
      p_buyer_note: "Oversized route review",
      p_idempotency_key_hash: sha256(`${marker}:submit`),
    });
    expect(manualRequest.error).toBeNull();
    const resolved = await manager.rpc("resolve_manual_quote", {
      p_quote_id: manualRequest.data!.id,
      p_expected_version: manualRequest.data!.version,
      p_amount_minor: 25_000,
      p_currency: "GEL",
      p_method_i18n: {
        ka: "საერთაშორისო",
        en: "International",
        de: "International",
        ru: "Международная",
      },
      p_estimate_min_days: 10,
      p_estimate_max_days: 18,
      p_customs_snapshot: {
        responsibility: "pending_legal_review",
        legalStatus: "draft_unapproved",
      },
      p_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      p_staff_note: "Integration carrier",
      p_buyer_message: "Quote prepared for private review.",
      p_idempotency_key_hash: sha256(`${marker}:resolve`),
    });
    expect(resolved.error).toBeNull();
    expect(
      (
        await service.rpc("respond_manual_quote", {
          p_quote_id: resolved.data!.id,
          p_proof_hash: sha256("wrong-proof"),
          p_accept: true,
          p_expected_version: resolved.data!.version,
          p_idempotency_key_hash: sha256(`${marker}:wrong-response`),
        })
      ).error?.message,
    ).toContain("QUOTE_NOT_FOUND");

    const dueRequest = await service.rpc("submit_manual_quote", {
      p_secret_hash: eurSecret,
      p_quote_proof_hash: sha256(`${marker}:due-proof`),
      p_country_code: "AQ",
      p_contact_email: `due-${marker}@epoca.test`,
      p_contact_phone: "",
      p_address: {
        fullName: "Due Integration",
        line1: "2 Research Station",
        city: "McMurdo",
        countryCode: "AQ",
      },
      p_buyer_note: "Expiry test",
      p_idempotency_key_hash: sha256(`${marker}:due-submit`),
    });
    expect(dueRequest.error).toBeNull();
    const dueResolved = await manager.rpc("resolve_manual_quote", {
      p_quote_id: dueRequest.data!.id,
      p_expected_version: dueRequest.data!.version,
      p_amount_minor: 20_000,
      p_currency: "EUR",
      p_method_i18n: {
        ka: "საერთაშორისო",
        en: "International",
        de: "International",
        ru: "Международная",
      },
      p_estimate_min_days: 10,
      p_estimate_max_days: 18,
      p_customs_snapshot: {
        responsibility: "pending_legal_review",
        legalStatus: "draft_unapproved",
      },
      p_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      p_staff_note: "Expiry fixture",
      p_buyer_message: "Short-lived fixture.",
      p_idempotency_key_hash: sha256(`${marker}:due-resolve`),
    });
    expect(dueResolved.error).toBeNull();
    expect(
      (
        await service
          .from("manual_quote_requests")
          .update({
            created_at: new Date(Date.now() - 7_200_000).toISOString(),
            expires_at: new Date(Date.now() - 3_600_000).toISOString(),
          })
          .eq("id", dueResolved.data!.id)
      ).error,
    ).toBeNull();
    expect(
      (
        await service.rpc("run_worldwide_selling_maintenance", {
          p_limit: 100,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service
          .from("manual_quote_requests")
          .select("status")
          .eq("id", dueResolved.data!.id)
          .single()
      ).data?.status,
    ).toBe("expired");

    const usdSetting = await service
      .from("currency_settings")
      .select("version")
      .eq("currency", "USD")
      .single();
    expect(usdSetting.error).toBeNull();
    const disabled = await manager.rpc("configure_currency_setting", {
      p_currency: "USD",
      p_enabled: false,
      p_checkout_enabled: false,
      p_is_default: false,
      p_display_order: 20,
      p_price_source_mode: "explicit_only",
      p_approved_rate_reference: "",
      p_configuration_status: "disabled",
      p_expected_version: usdSetting.data!.version,
      p_reason: "Integration disabled-currency check",
    });
    expect(disabled.error).toBeNull();
    const usdSecret = await cart("USD", "usd");
    expect(
      (
        await service.rpc("quote_guest_cart", {
          p_secret_hash: usdSecret,
          p_country_code: "GE",
          p_method_code: "standard-test",
        })
      ).error?.message,
    ).toContain("CURRENCY_DISABLED");
    const restored = await manager.rpc("configure_currency_setting", {
      p_currency: "USD",
      p_enabled: true,
      p_checkout_enabled: true,
      p_is_default: false,
      p_display_order: 20,
      p_price_source_mode: "explicit_only",
      p_approved_rate_reference: "",
      p_configuration_status: "published",
      p_expected_version: disabled.data!.version,
      p_reason: "Restore integration currency",
    });
    expect(restored.error).toBeNull();
  });
});
