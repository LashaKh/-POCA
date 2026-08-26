"use client";

import { useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import { prepareCheckoutAction } from "@/app/[locale]/(store)/checkout/actions";

export function DeliverySelector({
  locale,
  labels,
  options,
}: {
  locale: AppLocale;
  options: Array<{
    country_code: string | null;
    method_code: string | null;
    name_i18n: unknown;
    manual_quote: boolean | null;
  }>;
  labels: {
    country: string;
    method: string;
    continue: string;
    standard: string;
    worldwide: string;
    manualQuoteLink: string;
  };
}) {
  const regionNames = new Intl.DisplayNames(locale, { type: "region" });
  const countryCodes = useMemo(
    () => [
      ...new Set(
        options
          .map((option) => option.country_code)
          .filter((code): code is string => Boolean(code)),
      ),
    ],
    [options],
  );
  const [country, setCountry] = useState(
    countryCodes.includes("GE") ? "GE" : (countryCodes[0] ?? "GE"),
  );
  const available = options.filter(
    (option) => option.country_code === country && option.method_code,
  );
  const localizedName = (value: unknown) =>
    value && typeof value === "object" && locale in value
      ? String((value as Record<string, unknown>)[locale])
      : undefined;
  return (
    <div>
      <form className="checkout-form" action={prepareCheckoutAction}>
        <input type="hidden" name="locale" value={locale} />
        <label>
          <span>{labels.country}</span>
          <select
            name="countryCode"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            {countryCodes.map((code) => (
              <option key={code} value={code}>
                {regionNames.of(code) ?? code}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{labels.method}</span>
          <select
            key={country}
            name="methodCode"
            defaultValue={available[0]?.method_code ?? ""}
          >
            {available.map((option) => (
              <option key={option.method_code} value={option.method_code ?? ""}>
                {localizedName(option.name_i18n) ??
                  (option.manual_quote ? labels.worldwide : labels.standard)}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit" disabled={!available.length}>
          {labels.continue}
        </button>
      </form>
      <Link href="/quote" locale={locale}>
        {labels.manualQuoteLink}
      </Link>
    </div>
  );
}
