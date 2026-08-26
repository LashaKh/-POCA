import "server-only";

import { cookies } from "next/headers";

import {
  guestCookieName,
  ensureGuestContext,
  readGuestSecretHash,
} from "@/features/cart/guest";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import type { AppLocale } from "@/i18n/routing";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { createOpaqueToken, sha256 } from "@/features/orders/guest-proof";

export async function mergeCurrentGuestIntoCustomer(
  profileId: string,
  locale: AppLocale,
) {
  const currency = await getEffectiveCurrencyPreference();
  const current = await ensureGuestContext(locale, currency);
  const service = createServiceSupabaseClient();
  const linked = await service
    .from("guest_sessions")
    .select("customer_profile_id")
    .eq("secret_hash", current.secretHash)
    .maybeSingle();
  if (linked.error) throw linked.error;
  if (linked.data?.customer_profile_id === profileId) {
    return { merged: false, replayed: true };
  }

  const nextSecret = createOpaqueToken();
  const result = await service.rpc("merge_customer_guest_data", {
    p_secret_hash: current.secretHash,
    p_new_secret_hash: sha256(nextSecret),
    p_customer_profile_id: profileId,
    p_idempotency_key_hash: sha256(
      `account-merge:${profileId}:${current.secretHash}`,
    ),
  });
  if (result.error) throw result.error;
  (await cookies()).set(guestCookieName, nextSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.DEPLOY_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return { merged: true, result: result.data };
}

export async function syncCurrentCustomerCart(profileId: string) {
  const secretHash = await readGuestSecretHash();
  if (!secretHash) return;
  const service = createServiceSupabaseClient();
  const result = await service.rpc("sync_customer_cart_from_guest", {
    p_secret_hash: secretHash,
    p_customer_profile_id: profileId,
  });
  if (
    result.error &&
    !result.error.message.includes("GUEST_CONTEXT_NOT_FOUND")
  ) {
    throw result.error;
  }
}
