import "server-only";

import { cookies } from "next/headers";

import type { SupportedCurrency } from "@/i18n/preferences";
import type { AppLocale } from "@/i18n/routing";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import {
  createOpaqueToken,
  isOpaqueToken,
  sha256,
} from "../orders/guest-proof";

export const guestCookieName = "epoca_guest";
const guestMaxAgeSeconds = 60 * 60 * 24 * 30;

export async function readGuestSecret() {
  const value = (await cookies()).get(guestCookieName)?.value;
  return isOpaqueToken(value) ? value : undefined;
}

export async function readGuestSecretHash() {
  const secret = await readGuestSecret();
  return secret ? sha256(secret) : undefined;
}

export async function ensureGuestContext(
  locale: AppLocale,
  currency: SupportedCurrency,
) {
  const cookieStore = await cookies();
  const current = cookieStore.get(guestCookieName)?.value;
  const secret = isOpaqueToken(current) ? current : createOpaqueToken();
  const secretHash = sha256(secret);
  const client = createServiceSupabaseClient();
  const { data, error } = await client.rpc("create_guest_context", {
    p_secret_hash: secretHash,
    p_locale: locale,
    p_currency: currency,
  });
  if (error) throw error;
  if (!isOpaqueToken(current)) {
    cookieStore.set(guestCookieName, secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.DEPLOY_ENV === "production",
      maxAge: guestMaxAgeSeconds,
      path: "/",
    });
  }
  return { secret, secretHash, context: data[0] };
}
