import { z } from "zod";

import { isAppLocale, type AppLocale } from "./routing";

export const supportedCurrencies = ["GEL", "USD", "EUR"] as const;
export type SupportedCurrency = (typeof supportedCurrencies)[number];

export const currencyPreferenceSchema = z.enum(supportedCurrencies);

export function parseLocalePreference(value: unknown): AppLocale | undefined {
  return isAppLocale(value) ? value : undefined;
}

export function parseCurrencyPreference(
  value: unknown,
): SupportedCurrency | undefined {
  const result = currencyPreferenceSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export const preferenceCookies = {
  locale: "epoca_locale",
  currency: "epoca_currency",
} as const;
