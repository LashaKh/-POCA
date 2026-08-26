import type { ReactNode } from "react";

import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import { getPublishedCurrencies } from "@/features/pricing/queries";
import type { AppLocale } from "@/i18n/routing";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { StorefrontMotion } from "./storefront-motion";

type SiteShellProps = {
  children: ReactNode;
  locale: AppLocale;
};

export async function SiteShell({ children, locale }: SiteShellProps) {
  const [currency, currencySettings] = await Promise.all([
    getEffectiveCurrencyPreference(),
    getPublishedCurrencies(),
  ]);

  return (
    <div className="site-frame">
      <SiteHeader
        locale={locale}
        currency={currency}
        currencies={currencySettings
          .map((setting) => setting.currency)
          .filter(
            (candidate): candidate is "GEL" | "USD" | "EUR" =>
              candidate === "GEL" || candidate === "USD" || candidate === "EUR",
          )}
      />
      {children}
      <SiteFooter locale={locale} />
      <StorefrontMotion />
    </div>
  );
}
