import { getTranslations } from "next-intl/server";

import { QuoteOperations } from "@/components/admin/quotes/quote-operations";
import { getStaffManualQuote } from "@/features/quotes/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; quoteId: string }>;
}) {
  const { locale, quoteId } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "quotes" }),
    getStaffManualQuote(quoteId),
  ]);
  const labels = t.raw("labels") as Record<string, string>;
  return (
    <main className="admin-main" id="main-content">
      <header className="admin-page-header">
        <Link href="/admin/quotes" locale={locale}>
          {labels.back}
        </Link>
        <p className="eyebrow">{data.quote.reference}</p>
        <h1>{t("detailTitle")}</h1>
      </header>
      <section className="admin-panel">
        <dl className="commerce-totals">
          <div>
            <dt>{labels.status}</dt>
            <dd>
              {labels[`status_${data.quote.status}`] ?? data.quote.status}
            </dd>
          </div>
          <div>
            <dt>{labels.contact}</dt>
            <dd>{data.quote.contact_email}</dd>
          </div>
          <div>
            <dt>{labels.destination}</dt>
            <dd>{data.quote.destination_country_code}</dd>
          </div>
          <div>
            <dt>{labels.items}</dt>
            <dd>
              {Array.isArray(
                (data.quote.cart_snapshot as { lines?: unknown[] }).lines,
              )
                ? (data.quote.cart_snapshot as { lines: unknown[] }).lines
                    .length
                : 0}
            </dd>
          </div>
        </dl>
        <p>{data.quote.buyer_note}</p>
      </section>
      <QuoteOperations quote={data.quote} locale={locale} labels={labels} />
      <section className="admin-panel">
        <h2>{labels.timeline}</h2>
        <ol>
          {data.events.map((event) => (
            <li key={event.id}>
              {event.event_type} ·{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(event.occurred_at))}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
