import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

vi.mock("server-only", () => ({}));

function environment() {
  try {
    const output = execFileSync(
      resolve(process.cwd(), "node_modules/.bin/supabase"),
      ["status", "-o", "env"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return Object.fromEntries(
      output
        .split("\n")
        .filter((line) => line.includes("="))
        .map((line) => {
          const split = line.indexOf("=");
          return [line.slice(0, split), JSON.parse(line.slice(split + 1))];
        }),
    ) as Record<string, string>;
  } catch {
    return undefined;
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const local = environment();

describe.skipIf(!local)("customer account boundary", () => {
  it("merges, isolates, preserves snapshots, revokes sessions, and records privacy state", async () => {
    const service = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const credentials = [1, 2].map((index) => ({
      email: `customer-${marker}-${index}@epoca.test`,
      password: `Customer-${marker}-${index}-Secure!`,
    }));
    const userIds: string[] = [];
    for (const credential of credentials) {
      const created = await service.auth.admin.createUser({
        ...credential,
        email_confirm: true,
      });
      expect(created.error).toBeNull();
      userIds.push(created.data.user!.id);
    }
    const customers = credentials.map(() =>
      createClient<Database>(local!.API_URL, local!.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
    for (const [index, customer] of customers.entries()) {
      expect(
        (await customer.auth.signInWithPassword(credentials[index]!)).error,
      ).toBeNull();
      expect(
        (
          await customer.rpc("initialize_customer_profile", {
            p_display_name: `Integration Customer ${index + 1}`,
            p_locale: index === 0 ? "en" : "de",
            p_currency: index === 0 ? "GEL" : "EUR",
          })
        ).error,
      ).toBeNull();
    }

    const productId = crypto.randomUUID();
    const sku = `ACCOUNT-${marker.toUpperCase()}`;
    expect(
      (
        await service.from("products").insert({
          id: productId,
          sku,
          status: "published",
          readiness_passed: true,
          published_at: new Date().toISOString(),
          width_mm: 1700,
          length_mm: 2400,
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
    expect(
      (
        await service.from("product_translations").insert({
          product_id: productId,
          locale: "en",
          slug: `account-${marker}`,
          name: "Account integration carpet",
          short_description: "Synthetic account fixture",
          long_description: "Synthetic account integration fixture.",
          search_text: "account integration carpet",
          alt_text_ready: true,
          status: "published",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service.from("product_prices").insert({
          product_id: productId,
          currency: "GEL",
          amount_minor: 145000,
          enabled: true,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service.from("inventory_items").insert({
          product_id: productId,
          stock_model: "unique",
          on_hand_quantity: 1,
        })
      ).error,
    ).toBeNull();

    const originalHash = sha256(`guest-original:${marker}`);
    const rotatedHash = sha256(`guest-rotated:${marker}`);
    expect(
      (
        await service.rpc("create_guest_context", {
          p_secret_hash: originalHash,
          p_locale: "en",
          p_currency: "GEL",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service.rpc("toggle_guest_wishlist_item", {
          p_secret_hash: originalHash,
          p_product_id: productId,
        })
      ).data,
    ).toBe(true);
    expect(
      (
        await service.rpc("add_guest_cart_item", {
          p_secret_hash: originalHash,
          p_product_id: productId,
          p_quantity: 1,
        })
      ).error,
    ).toBeNull();

    const mergeKey = sha256(`merge:${marker}`);
    const firstMerge = await service.rpc("merge_customer_guest_data", {
      p_secret_hash: originalHash,
      p_new_secret_hash: rotatedHash,
      p_customer_profile_id: userIds[0]!,
      p_idempotency_key_hash: mergeKey,
    });
    expect(firstMerge.error).toBeNull();
    expect(firstMerge.data).toMatchObject({ replayed: false });
    const replay = await service.rpc("merge_customer_guest_data", {
      p_secret_hash: originalHash,
      p_new_secret_hash: rotatedHash,
      p_customer_profile_id: userIds[0]!,
      p_idempotency_key_hash: mergeKey,
    });
    expect(replay.data).toMatchObject({ replayed: true });
    expect(
      (
        await service.rpc("read_guest_wishlist", {
          p_secret_hash: originalHash,
        })
      ).data,
    ).toMatchObject({ productIds: [] });
    expect(
      (await customers[0]!.from("wishlist_items").select("product_id")).data,
    ).toEqual([{ product_id: productId }]);
    expect(
      (await customers[1]!.from("wishlist_items").select("product_id")).data,
    ).toEqual([]);

    const firstAddress = await customers[0]!.rpc("save_customer_address", {
      p_address_id: "00000000-0000-0000-0000-000000000000",
      p_expected_version: 0,
      p_label: "Home",
      p_full_name: "Integration Customer",
      p_organization: "",
      p_line1: "1 Original Street",
      p_line2: "",
      p_city: "Tbilisi",
      p_region: "",
      p_postal_code: "0105",
      p_country_code: "GE",
      p_phone: "+995555000000",
      p_instructions: "",
      p_is_default: true,
    });
    expect(firstAddress.error).toBeNull();
    expect(
      (await customers[1]!.from("customer_addresses").select("id")).data,
    ).toEqual([]);

    const reserved = await service.rpc("reserve_guest_checkout", {
      p_secret_hash: rotatedHash,
      p_country_code: "GE",
      p_method_code: "standard-test",
    });
    expect(reserved.error).toBeNull();
    const quote = await service
      .from("delivery_quotes")
      .select("total_minor")
      .eq("id", reserved.data!.quote_id)
      .single();
    const accepted = await service.rpc("accept_guest_order", {
      p_secret_hash: rotatedHash,
      p_checkout_session_id: reserved.data!.id,
      p_expected_total_minor: quote.data!.total_minor,
      p_accept_changes: false,
      p_idempotency_key_hash: sha256(`accept:${marker}`),
      p_request_hash: sha256(`request:${marker}`),
      p_guest_proof_hash: sha256(`proof:${marker}`),
      p_contact_email: credentials[0]!.email,
      p_contact_phone: "+995555000000",
      p_address: {
        fullName: "Integration Customer",
        line1: "1 Original Street",
        city: "Tbilisi",
        postalCode: "0105",
        countryCode: "GE",
      },
      p_payment_method: "bank_transfer",
      p_terms_version: "terms-test-v1",
    });
    expect(accepted.error).toBeNull();
    expect(
      (
        await service.rpc("claim_guest_order_for_customer", {
          p_order_id: accepted.data!.id,
          p_secret_hash: rotatedHash,
          p_customer_profile_id: userIds[0]!,
        })
      ).data,
    ).toBe(true);
    expect(
      (await customers[0]!.from("orders").select("reference")).data,
    ).toHaveLength(1);
    expect(
      (await customers[1]!.from("orders").select("reference")).data,
    ).toEqual([]);

    const updatedAddress = await customers[0]!.rpc("save_customer_address", {
      p_address_id: firstAddress.data!.id,
      p_expected_version: firstAddress.data!.version,
      p_label: "Home",
      p_full_name: "Integration Customer",
      p_organization: "",
      p_line1: "99 Updated Street",
      p_line2: "",
      p_city: "Tbilisi",
      p_region: "",
      p_postal_code: "0105",
      p_country_code: "GE",
      p_phone: "+995555000000",
      p_instructions: "",
      p_is_default: true,
    });
    expect(updatedAddress.error).toBeNull();
    expect(
      (
        await customers[0]!
          .from("order_addresses")
          .select("line1")
          .eq("order_id", accepted.data!.id)
          .single()
      ).data?.line1,
    ).toBe("1 Original Street");

    const claims = await customers[0]!.auth.getClaims();
    const sessionId = String(claims.data!.claims.session_id);
    const expiresAt = Number(claims.data!.claims.exp);
    expect(
      (
        await customers[0]!.rpc("record_current_session", {
          p_auth_session_id: sessionId,
          p_assurance_level: "aal1",
          p_user_agent_summary: "Integration browser",
          p_ip_prefix_hash: "a".repeat(64),
          p_expires_at: new Date(expiresAt * 1000).toISOString(),
          p_device_label: "Integration device",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await customers[0]!.rpc("revoke_current_session", {
          p_reason: "Customer security test",
        })
      ).data,
    ).toBe(true);
    expect(
      (
        await customers[0]!.rpc("request_customer_privacy", {
          p_request_type: "deletion",
          p_reason: "Close integration account",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service
          .from("customer_accounts")
          .select("status")
          .eq("profile_id", userIds[0]!)
          .single()
      ).data?.status,
    ).toBe("deletion_requested");
  });
});
