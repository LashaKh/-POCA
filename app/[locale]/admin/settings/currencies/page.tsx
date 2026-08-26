import { getTranslations } from "next-intl/server";

import { CurrencySettings } from "@/components/admin/commerce/currency-settings";
import { PriceMatrix } from "@/components/admin/commerce/price-matrix";
import {
  getCurrencyAdministration,
  getPriceMatrix,
} from "@/features/pricing/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function CurrencySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const query = await searchParams;
  const [t, settings, matrix] = await Promise.all([
    getTranslations({ locale, namespace: "admin.worldwide" }),
    getCurrencyAdministration(),
    getPriceMatrix(query.q),
  ]);
  const labels = t.raw("labels") as Record<string, string>;
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("currenciesTitle")}</h1>
        <p>{t("currenciesIntro")}</p>
      </header>
      <CurrencySettings locale={locale} settings={settings} labels={labels} />
      <form className="filter-bar">
        <label>
          <span>{labels.searchProducts}</span>
          <input name="q" defaultValue={query.q ?? ""} />
        </label>
        <button className="button" type="submit">
          {labels.search}
        </button>
      </form>
      <PriceMatrix
        locale={locale}
        products={matrix.products}
        prices={matrix.prices}
        labels={labels}
      />
    </main>
  );
}
