import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

function localSupabaseEnvironment() {
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

const local = localSupabaseEnvironment();

describe.skipIf(!local)("local Supabase guest checkout boundary", () => {
  it("rotates an opaque guest identity without losing its cart", async () => {
    const client = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const currentHash = crypto.randomUUID().replaceAll("-", "").repeat(2);
    const nextHash = crypto.randomUUID().replaceAll("-", "").repeat(2);
    const { data: context, error: contextError } = await client.rpc(
      "create_guest_context",
      { p_secret_hash: currentHash, p_locale: "de", p_currency: "EUR" },
    );
    expect(contextError).toBeNull();
    expect(context).toHaveLength(1);

    const { data: product, error: productError } = await client
      .from("products")
      .select("id")
      .eq("sku", "SYN-00006")
      .single();
    expect(productError).toBeNull();
    const { error: addError } = await client.rpc("add_guest_cart_item", {
      p_secret_hash: currentHash,
      p_product_id: product!.id,
      p_quantity: 1,
    });
    expect(addError).toBeNull();
    const { data: guestId, error: rotateError } = await client.rpc(
      "rotate_guest_context",
      { p_current_secret_hash: currentHash, p_new_secret_hash: nextHash },
    );
    expect(rotateError).toBeNull();
    expect(guestId).toBe(context![0].guest_session_id);

    const oldRead = await client.rpc("read_guest_cart", {
      p_secret_hash: currentHash,
    });
    expect(oldRead.error?.message).toContain("CART_NOT_FOUND");
    const currentRead = await client.rpc("read_guest_cart", {
      p_secret_hash: nextHash,
    });
    expect(currentRead.error).toBeNull();
    expect(currentRead.data).toMatchObject({
      id: context![0].cart_id,
      currency: "EUR",
    });
    expect(currentRead.data).toHaveProperty("items.0.productId", product!.id);
  });
});
