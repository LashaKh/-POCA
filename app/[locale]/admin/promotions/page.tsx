import { getTranslations } from "next-intl/server";

import { PromotionEditor } from "@/components/admin/commerce/promotion-editor";
import { formatPromotionEnd } from "@/features/promotions/domain";
import { getPromotions } from "@/features/promotions/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function PromotionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, promotions] = await Promise.all([
    getTranslations({ locale, namespace: "admin.worldwide" }),
    getPromotions(),
  ]);
  const labels = t.raw("labels") as Record<string, string>;
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("promotionsTitle")}</h1>
        <p>{t("promotionsIntro")}</p>
      </header>
      <section className="admin-panel">
        <h2 id="current-promotions-title">{labels.currentPromotions}</h2>
        <div
          className="table-scroll"
          role="region"
          aria-labelledby="current-promotions-title"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>{labels.code}</th>
                <th>{labels.status}</th>
                <th>{labels.usage}</th>
                <th>{labels.ends}</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td>
                    <Link
                      href={`/admin/promotions/${promotion.id}`}
                      locale={locale}
                    >
                      {promotion.code}
                    </Link>
                  </td>
                  <td>{promotion.configuration_status}</td>
                  <td>
                    {promotion.used_count}/{promotion.usage_limit ?? "∞"}
                  </td>
                  <td>{formatPromotionEnd(promotion.ends_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>{labels.newPromotion}</h2>
        <PromotionEditor locale={locale} labels={labels} />
      </section>
    </main>
  );
}
