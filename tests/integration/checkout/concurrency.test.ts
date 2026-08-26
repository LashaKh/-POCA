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

describe.skipIf(!local)("checkout concurrency", () => {
  it("allows only one buyer to reserve a unique last item", async () => {
    const createService = () =>
      createClient<Database>(local!.API_URL, local!.SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    const admin = createService();
    const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const productId = crypto.randomUUID();
    const created = await admin.from("products").insert({
      id: productId,
      sku: `RACE-${marker.toUpperCase()}`,
      status: "published",
      readiness_passed: true,
      published_at: new Date().toISOString(),
      width_mm: 1600,
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
    });
    expect(created.error).toBeNull();
    const related = await Promise.all([
      admin.from("product_translations").insert({
        product_id: productId,
        locale: "en",
        slug: `concurrency-${marker}`,
        name: "Concurrency test rug",
        short_description: "A unique inventory race fixture.",
        long_description: "A repeat-safe checkout concurrency fixture.",
        search_text: "concurrency rug",
        alt_text_ready: true,
        status: "published",
      }),
      admin.from("product_prices").insert({
        product_id: productId,
        currency: "GEL",
        amount_minor: 100_000,
        enabled: true,
      }),
      admin.from("inventory_items").insert({
        product_id: productId,
        stock_model: "unique",
        on_hand_quantity: 1,
      }),
    ]);
    for (const result of related) expect(result.error).toBeNull();
    const secrets = [
      crypto.randomUUID().replaceAll("-", "").repeat(2),
      crypto.randomUUID().replaceAll("-", "").repeat(2),
    ];
    await Promise.all(
      secrets.map(async (secret) => {
        const client = createService();
        const context = await client.rpc("create_guest_context", {
          p_secret_hash: secret,
          p_locale: "en",
          p_currency: "GEL",
        });
        expect(context.error).toBeNull();
        const added = await client.rpc("add_guest_cart_item", {
          p_secret_hash: secret,
          p_product_id: productId,
          p_quantity: 1,
        });
        expect(added.error).toBeNull();
      }),
    );

    const outcomes = await Promise.all(
      secrets.map((secret) =>
        createService().rpc("reserve_guest_checkout", {
          p_secret_hash: secret,
          p_country_code: "GE",
          p_method_code: "standard-test",
        }),
      ),
    );
    const successes = outcomes.filter((outcome) => !outcome.error);
    const failures = outcomes.filter((outcome) => outcome.error);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].error?.message).toMatch(
      /INSUFFICIENT_STOCK|CART_ITEM_UNAVAILABLE/,
    );

    const checkout = successes[0].data;
    expect(checkout).not.toBeNull();
    const released = await admin.rpc("release_checkout_session", {
      p_checkout_session_id: checkout!.id,
      p_reason: "integration-test-cleanup",
      p_expired: false,
    });
    expect(released.error).toBeNull();
    expect(released.data).toBe(true);
  });
});
