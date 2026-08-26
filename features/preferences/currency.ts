import "server-only";

import { getCurrencyPreference } from "@/features/auth/preferences";
import type { SupportedCurrency } from "@/i18n/preferences";

import { getPublishedCurrencies } from "@/features/pricing/queries";

export async function getEffectiveCurrencyPreference(): Promise<SupportedCurrency> {
  const [preferred, settings] = await Promise.all([
    getCurrencyPreference(),
    getPublishedCurrencies(),
  ]);
  if (settings.some((setting) => setting.currency === preferred)) {
    return preferred;
  }
  const defaultCurrency = settings.find(
    (setting) => setting.is_default,
  )?.currency;
  return defaultCurrency === "USD" || defaultCurrency === "EUR"
    ? defaultCurrency
    : "GEL";
}
