"use client";

import { useSearchParams } from "next/navigation";
import { useRef } from "react";

import { setCurrencyPreference } from "@/features/auth/preferences.actions";
import type { SupportedCurrency } from "@/i18n/preferences";
import { Link, usePathname } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";

const languageNames: Record<AppLocale, string> = {
  ka: "ქართული",
  en: "English",
  de: "Deutsch",
  ru: "Русский",
};

export function LocaleNavigation({
  locale,
  label,
}: {
  locale: AppLocale;
  label: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <nav className="locale-navigation" aria-label={label}>
      <ul>
        {locales.map((candidate) => (
          <li key={candidate}>
            <Link
              href={href}
              locale={candidate}
              aria-current={candidate === locale ? "page" : undefined}
              lang={candidate}
            >
              {languageNames[candidate]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CurrencyControl({
  currency,
  currencies,
  label,
  applyLabel,
}: {
  currency: SupportedCurrency;
  currencies: SupportedCurrency[];
  label: string;
  applyLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setCurrencyPreference}>
      <label className="visually-hidden" htmlFor="site-currency">
        {label}
      </label>
      <select
        id="site-currency"
        name="currency"
        defaultValue={currency}
        aria-label={label}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {currencies.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}
          </option>
        ))}
      </select>
      <button className="visually-hidden" type="submit">
        {applyLabel}
      </button>
    </form>
  );
}
