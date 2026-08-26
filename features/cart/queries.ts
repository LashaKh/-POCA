import "server-only";

import type { SupportedCurrency } from "@/i18n/preferences";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { readGuestSecretHash } from "./guest";
import { cartViewSchema, type CartView } from "./schema";

export async function getGuestCart(): Promise<CartView | undefined> {
  const secretHash = await readGuestSecretHash();
  if (!secretHash) return undefined;
  const client = createServiceSupabaseClient();
  const { data, error } = await client.rpc("read_guest_cart", {
    p_secret_hash: secretHash,
  });
  if (error) {
    if (error.message.includes("CART_NOT_FOUND")) return undefined;
    throw error;
  }
  return cartViewSchema.parse(data);
}

export async function getCartSummary(currency: SupportedCurrency) {
  const cart = await getGuestCart();
  return {
    currency: cart?.currency ?? currency,
    quantity:
      cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
    status: cart?.items.length ? ("active" as const) : ("empty" as const),
  };
}
