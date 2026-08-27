import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManualQuoteForm } from "@/components/quotes/manual-quote-form";
import { isAppLocale } from "@/i18n/routing";

export const metadata = { robots: { index: false, follow: false } };

export default async function ManualQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "quotes" });
  return (
    <main className="commerce-page" id="main-content">
      <header className="commerce-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <ManualQuoteForm
        locale={locale}
        initialCountry={query.country}
        labels={t.raw("labels")}
      />
    </main>
  );
}
