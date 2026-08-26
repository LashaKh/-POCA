import "server-only";

import type { AppLocale } from "@/i18n/routing";

import { getCustomerContext, requireCustomerPage } from "./context";
import { orderReferenceSchema } from "./schema";

export async function getCustomerAccountOverview(locale: AppLocale) {
  const { client, context } = await requireCustomerPage(locale);
  const [profile, account, addresses, orders, sessions, privacy, wishlist] =
    await Promise.all([
      client.from("profiles").select("*").eq("id", context.profileId).single(),
      client
        .from("customer_accounts")
        .select("*")
        .eq("profile_id", context.profileId)
        .single(),
      client
        .from("customer_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at"),
      client
        .from("orders")
        .select("*,order_lines(*)")
        .order("accepted_at", { ascending: false })
        .limit(50),
      client
        .from("app_sessions")
        .select(
          "auth_session_id,device_label,assurance_level,last_seen_at,expires_at,revoked_at",
        )
        .eq("profile_id", context.profileId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("last_seen_at", { ascending: false })
        .limit(20),
      client
        .from("privacy_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      client
        .from("wishlists")
        .select("id,wishlist_items(product_id)")
        .eq("customer_profile_id", context.profileId)
        .eq("status", "active")
        .maybeSingle(),
    ]);
  for (const result of [
    profile,
    account,
    addresses,
    orders,
    sessions,
    privacy,
    wishlist,
  ]) {
    if (result.error) throw result.error;
  }
  if (!profile.data || !account.data)
    throw new Error("CUSTOMER_ACCOUNT_INCOMPLETE");
  return {
    context,
    profile: profile.data,
    account: account.data,
    addresses: addresses.data ?? [],
    orders: orders.data ?? [],
    sessions: sessions.data ?? [],
    privacyRequests: privacy.data ?? [],
    wishlistProductIds:
      wishlist.data?.wishlist_items.map((item) => item.product_id) ?? [],
  };
}

export async function getCustomerOrder(locale: AppLocale, reference: string) {
  if (!orderReferenceSchema.safeParse(reference).success) return undefined;
  const { client } = await requireCustomerPage(locale);
  const result = await client
    .from("orders")
    .select(
      "*,order_lines(*),order_addresses(*),order_events(*),payment_attempts(*)",
    )
    .eq("reference", reference)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function getCheckoutCustomerDefaults() {
  const { client, context } = await getCustomerContext();
  if (context.kind !== "customer") return undefined;
  const [address, user] = await Promise.all([
    client
      .from("customer_addresses")
      .select("*")
      .eq("is_default", true)
      .maybeSingle(),
    client.auth.getUser(),
  ]);
  if (address.error) throw address.error;
  return { email: user.data.user?.email ?? "", address: address.data };
}
