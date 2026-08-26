import { getTranslations } from "next-intl/server";

import { getStaffQuoteQueue } from "@/features/quotes/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function AdminQuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, quotes] = await Promise.all([
    getTranslations({ locale, namespace: "quotes" }),
    getStaffQuoteQueue(),
  ]);
  const labels = t.raw("labels") as Record<string, string>;
  return (
    <main className="admin-main" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("adminTitle")}</h1>
        <p>{t("adminIntro")}</p>
      </header>
      <div
        className="table-scroll"
        role="region"
        aria-label={t("adminTitle")}
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>{labels.reference}</th>
              <th>{labels.status}</th>
              <th>{labels.destination}</th>
              <th>{labels.contact}</th>
              <th>{labels.created}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>
                  <Link href={`/admin/quotes/${quote.id}`} locale={locale}>
                    {quote.reference}
                  </Link>
                </td>
                <td>{labels[`status_${quote.status}`] ?? quote.status}</td>
                <td>{quote.destination_country_code}</td>
                <td>{quote.masked_email}</td>
                <td>
                  {new Intl.DateTimeFormat(locale).format(
                    new Date(quote.created_at!),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!quotes.length ? <p className="empty-state">{labels.empty}</p> : null}
    </main>
  );
}
