import "server-only";

import { cookies } from "next/headers";

import { parseCurrencyPreference, preferenceCookies } from "@/i18n/preferences";

export async function getCurrencyPreference() {
  const cookieStore = await cookies();
  return (
    parseCurrencyPreference(
      cookieStore.get(preferenceCookies.currency)?.value,
    ) ?? "GEL"
  );
}
