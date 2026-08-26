import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

function localEnvironment() {
  try {
    const executable = resolve(process.cwd(), "node_modules/.bin/supabase");
    const output = execFileSync(executable, ["status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return Object.fromEntries(
      output
        .split("\n")
        .filter((line) => line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [
            line.slice(0, separator),
            JSON.parse(line.slice(separator + 1)),
          ];
        }),
    ) as Record<string, string>;
  } catch {
    return undefined;
  }
}

const local = localEnvironment();

describe.skipIf(!local)("local order operations", () => {
  it("reconciles a hosted payment once and fulfills it through delivery", async () => {
    const client = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const productId = crypto.randomUUID();
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const sku = `OPS-${suffix.toUpperCase()}`;
    expect(
      (
        await client.from("products").insert({
          id: productId,
          sku,
          status: "published",
          readiness_passed: true,
          published_at: new Date().toISOString(),
          width_mm: 1600,
          length_mm: 2400,
          shape: "rectangle",
          materials: ["wool"],
          construction: "hand-knotted",
          colors: ["blue"],
          styles: ["traditional"],
          condition: "excellent",
          care_code: "professional-clean",
          delivery_class: "parcel",
          search_visible: true,
        })
      ).error,
    ).toBeNull();
    await Promise.all([
      client.from("product_translations").insert({
        product_id: productId,
        locale: "en",
        slug: `operations-${suffix}`,
        name: "Operations integration carpet",
        short_description: "Integration fixture",
        long_description: "Synthetic integration fixture.",
        search_text: "operations integration",
        alt_text_ready: true,
        status: "published",
      }),
      client.from("product_prices").insert({
        product_id: productId,
        currency: "GEL",
        amount_minor: 123400,
        enabled: true,
      }),
      client.from("inventory_items").insert({
        product_id: productId,
        stock_model: "unique",
        on_hand_quantity: 1,
      }),
    ]).then((results) =>
      results.forEach((result) => expect(result.error).toBeNull()),
    );

    const secretHash = crypto.randomUUID().replaceAll("-", "").repeat(2);
    expect(
      (
        await client.rpc("create_guest_context", {
          p_secret_hash: secretHash,
          p_locale: "en",
          p_currency: "GEL",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await client.rpc("add_guest_cart_item", {
          p_secret_hash: secretHash,
          p_product_id: productId,
          p_quantity: 1,
        })
      ).error,
    ).toBeNull();
    const reserved = await client.rpc("reserve_guest_checkout", {
      p_secret_hash: secretHash,
      p_country_code: "GE",
      p_method_code: "standard-test",
    });
    expect(reserved.error).toBeNull();
    const quote = await client
      .from("delivery_quotes")
      .select("total_minor")
      .eq("id", reserved.data!.quote_id)
      .single();
    expect(quote.error).toBeNull();
    const accepted = await client.rpc("accept_guest_order", {
      p_secret_hash: secretHash,
      p_checkout_session_id: reserved.data!.id,
      p_expected_total_minor: quote.data!.total_minor,
      p_accept_changes: false,
      p_idempotency_key_hash: "1".repeat(64),
      p_request_hash: "2".repeat(64),
      p_guest_proof_hash: "3".repeat(64),
      p_contact_email: `buyer-${suffix}@example.test`,
      p_contact_phone: "",
      p_address: {
        fullName: "Operations Buyer",
        line1: "1 Test Street",
        city: "Tbilisi",
        countryCode: "GE",
      },
      p_payment_method: "hosted_payment",
      p_terms_version: "terms-test-v1",
    });
    expect(accepted.error).toBeNull();
    expect(accepted.data).toMatchObject({
      status: "payment_pending",
      payment_status: "pending",
    });

    const providerReference = `fixture-${suffix}`;
    const attached = await client.rpc("attach_hosted_payment", {
      p_order_id: accepted.data!.id,
      p_provider: "fixture",
      p_provider_reference: providerReference,
    });
    expect(attached.error).toBeNull();
    expect(
      (
        await client.rpc("attach_hosted_payment", {
          p_order_id: accepted.data!.id,
          p_provider: "fixture",
          p_provider_reference: providerReference,
        })
      ).data?.id,
    ).toBe(attached.data!.id);

    const inbox = await client.rpc("record_provider_event", {
      p_provider: "fixture",
      p_event_key: `fixture-event-${suffix}`,
      p_event_type: "payment.updated",
      p_subject_reference: providerReference,
      p_payload_hash: "a".repeat(64),
      p_signature_valid: true,
      p_safe_metadata: { source: "integration" },
    });
    expect(inbox.error).toBeNull();
    const reconciled = await client.rpc("reconcile_payment", {
      p_order_id: accepted.data!.id,
      p_provider_event_key: `fixture-event-${suffix}`,
      p_target_status: "paid",
      p_amount_minor: quote.data!.total_minor,
      p_currency: "GEL",
      p_provider_reference: providerReference,
      p_provider_event_inbox_id: inbox.data!.id,
    });
    expect(reconciled.error).toBeNull();
    expect(reconciled.data).toMatchObject({
      status: "confirmed",
      payment_status: "paid",
    });
    const replay = await client.rpc("reconcile_payment", {
      p_order_id: accepted.data!.id,
      p_provider_event_key: `fixture-event-${suffix}`,
      p_target_status: "paid",
      p_amount_minor: quote.data!.total_minor,
      p_currency: "GEL",
      p_provider_reference: providerReference,
      p_provider_event_inbox_id: inbox.data!.id,
    });
    expect(replay.error).toBeNull();

    const prepared = await client.rpc("transition_order", {
      p_order_id: accepted.data!.id,
      p_expected_version: reconciled.data!.version,
      p_target_status: "processing",
      p_reason: "Integration preparation",
      p_idempotency_key: `prepare-${suffix}-0001`,
    });
    expect(prepared.error).toBeNull();
    const shipped = await client.rpc("create_shipment", {
      p_order_id: accepted.data!.id,
      p_expected_version: prepared.data!.version,
      p_carrier: "Integration Carrier",
      p_service_level: "Worldwide",
      p_tracking_reference: `TRACK-${suffix}`,
      p_tracking_url: "https://carrier.example/track",
      p_idempotency_key: `shipment-${suffix}-0001`,
    });
    expect(shipped.error).toBeNull();
    const delivered = await client.rpc("record_delivery_event", {
      p_fulfillment_id: shipped.data!.id,
      p_event_key: `delivery-${suffix}-0001`,
      p_safe_location: "Tbilisi",
    });
    expect(delivered.error).toBeNull();
    expect(delivered.data!.status).toBe("delivered");

    const finalOrder = await client
      .from("orders")
      .select("status")
      .eq("id", accepted.data!.id)
      .single();
    expect(finalOrder.data?.status).toBe("delivered");
    const sold = await client
      .from("inventory_items")
      .select("on_hand_quantity,reserved_quantity")
      .eq("product_id", productId)
      .single();
    expect(sold.error).toBeNull();
    expect(sold.data).toEqual({ on_hand_quantity: 0, reserved_quantity: 0 });
  });
});
