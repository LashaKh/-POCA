"use server";

import { cookies } from "next/headers";

import { parseCurrencyPreference, preferenceCookies } from "@/i18n/preferences";

export async function setCurrencyPreference(formData: FormData) {
  const currency = parseCurrencyPreference(formData.get("currency"));
  if (!currency) return;

  const cookieStore = await cookies();
  cookieStore.set(preferenceCookies.currency, currency, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.DEPLOY_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
