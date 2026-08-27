import "server-only";

import { getCurrencyPreference } from "@/features/auth/preferences";
import type { SupportedCurrency } from "@/i18n/preferences";

import { getPublishedCurrencies } from "@/features/pricing/queries";

function requestedCurrency(value: unknown): SupportedCurrency | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "GEL" || candidate === "USD" || candidate === "EUR"
    ? candidate
    : undefined;
}

export async function getEffectiveCurrencyPreference(
  requested?: unknown,
): Promise<SupportedCurrency> {
  const [preferred, settings] = await Promise.all([
    getCurrencyPreference(),
    getPublishedCurrencies(),
  ]);
  const requestOverride = requestedCurrency(requested);
  if (
    requestOverride &&
    settings.some((setting) => setting.currency === requestOverride)
  ) {
    return requestOverride;
  }
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
