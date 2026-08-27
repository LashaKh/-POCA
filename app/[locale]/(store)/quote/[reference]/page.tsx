import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ManualQuoteStatus } from "@/components/quotes/manual-quote-status";
import { getBuyerManualQuote } from "@/features/quotes/queries";
import { isAppLocale } from "@/i18n/routing";

export const metadata = { robots: { index: false, follow: false } };

export default async function ManualQuoteStatusPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, quote] = await Promise.all([
    getTranslations({ locale, namespace: "quotes" }),
    getBuyerManualQuote(reference),
  ]);
  if (!quote) notFound();
  return (
    <main className="commerce-page" id="main-content">
      <header className="commerce-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("statusTitle")}</h1>
      </header>
      <ManualQuoteStatus
        quote={quote}
        locale={locale}
        labels={t.raw("labels")}
      />
    </main>
  );
}
