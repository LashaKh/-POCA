import "server-only";

import { readGuestSecretHash } from "@/features/cart/guest";
import { getCustomerContext } from "@/features/customer/context";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { guestWishlistViewSchema } from "./schema";

export async function getWishlistProductIds() {
  const { client, context } = await getCustomerContext();
  if (context.kind === "customer") {
    const list = await client
      .from("wishlists")
      .select("id")
      .eq("customer_profile_id", context.profileId)
      .eq("status", "active")
      .maybeSingle();
    if (list.error) throw list.error;
    if (!list.data) return new Set<string>();
    const items = await client
      .from("wishlist_items")
      .select("product_id")
      .eq("wishlist_id", list.data.id)
      .order("added_at", { ascending: false });
    if (items.error) throw items.error;
    return new Set(items.data.map((item) => item.product_id));
  }

  const secretHash = await readGuestSecretHash();
  if (!secretHash) return new Set<string>();
  const service = createServiceSupabaseClient();
  const result = await service.rpc("read_guest_wishlist", {
    p_secret_hash: secretHash,
  });
  if (result.error) throw result.error;
  return new Set(guestWishlistViewSchema.parse(result.data).productIds);
}

export async function getWishlistSummary() {
  const productIds = await getWishlistProductIds();
  return { count: productIds.size, productIds };
}
